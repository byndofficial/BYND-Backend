import mongoose from 'mongoose';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ORDER_STATUSES } from '../utils/constants.js';
import { logAdminAction } from '../services/audit.service.js';
import InvoiceService from '../services/invoice.service.js';
import { sendSystemNotification } from '../services/notification.service.js';
import { sendSystemEmail } from '../services/email.service.js';
import logger from '../utils/logger.js';

// Orders older than these two states are considered final — an admin can
// still add notes, but the status itself shouldn't move any further.
const terminalStatuses = ['delivered', 'cancelled'];

// Human-readable label per status — used to fill {status} in the fallback
// notification template (see adminNotificationDefaults.js: statusKey: null
// covers 'processing' and 'cancelled', which don't have a dedicated
// template of their own).
const STATUS_LABELS = {
  processing: 'Processing',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  'out-for-delivery': 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// Only statuses with a matching system email template in
// emailDefaults.js. 'processing' is intentionally absent — that's the
// order's starting state, not something an admin transitions it into, so
// there's nothing to notify about.
const STATUS_EMAIL_TYPE = {
  confirmed: 'order_confirmed',
  shipped: 'order_shipped',
  'out-for-delivery': 'order_out_for_delivery',
  delivered: 'order_delivered',
  cancelled: 'order_cancelled',
};

const formatINR = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatProductDetails = (items = []) =>
  items.map((item) => `${item.name}${item.size ? ` (${item.size})` : ''} x${item.quantity}`).join('\n');

// COD never charges anything up front, so a cancelled COD order has
// nothing to refund. An online order that was already paid gets a refund
// note instead.
const buildRefundMessage = (order) => {
  if (order.paymentMethod !== 'cod' && order.paymentStatus === 'paid') {
    return 'Your payment will be refunded to the original payment method within 5-7 business days.';
  }
  return 'No charge was made for this order.';
};

// Shared payload for both the in-app notification and the transactional
// email triggered by an order status change. `orderId` (the Mongo _id) is
// what notification.service.js's sendSystemNotification links to — NOT
// orderCode, since the customer-facing GET /orders/:orderId route only
// looks up by _id, not by the human-facing code.
const buildOrderEventData = (order, status) => ({
  orderId: String(order._id),
  orderNumber: order.orderCode,
  status: STATUS_LABELS[status] || status,
  productDetails: formatProductDetails(order.items),
  totalAmount: formatINR(order.total),
  trackingUrl: order.trackingLink || '',
  refundMessage: status === 'cancelled' ? buildRefundMessage(order) : '',
});

// Fires the in-app notification + transactional email for a status
// change. Never throws — a failed notification/email must not roll back
// or block the status update that triggered it; failures are logged and
// swallowed here (sendSystemNotification/sendSystemEmail already do their
// own internal error handling, this is just a second safety net).
const notifyOrderStatusChange = async (order, status) => {
  const data = buildOrderEventData(order, status);

  try {
    await sendSystemNotification({
      userId: order.user._id || order.user,
      event: 'order.status_changed',
      statusKey: status,
      data,
    });
  } catch (err) {
    logger.error(`Failed to send order.status_changed notification for order ${order.orderCode}: ${err.message}`);
  }

  const emailType = STATUS_EMAIL_TYPE[status];
  const recipientEmail = order.user?.email;
  if (emailType && recipientEmail) {
    try {
      await sendSystemEmail(emailType, { to: recipientEmail, data });
    } catch (err) {
      logger.error(`Failed to send "${emailType}" email for order ${order.orderCode}: ${err.message}`);
    }
  }
};

// Fires the in-app "tracking available" notification. No matching email
// template exists for a standalone tracking-link update (the shipped
// email already carries {trackingUrl} when status flips to Shipped), so
// this is notification-only.
const notifyTrackingAdded = async (order) => {
  try {
    await sendSystemNotification({
      userId: order.user._id || order.user,
      event: 'order.tracking_added',
      statusKey: null,
      data: buildOrderEventData(order, order.status),
    });
  } catch (err) {
    logger.error(`Failed to send order.tracking_added notification for order ${order.orderCode}: ${err.message}`);
  }
};

const populateCustomer = (query) => query.populate('user', 'name email phone');

// Shapes a populated order doc into what the admin frontend expects:
// order.customer instead of a raw user ref, order.items[].productId
// instead of the schema's productFamily (matches the storefront's own
// naming so both admin and customer OrderDetails can share intuition).
const serializeOrder = (order) => {
  const obj = order.toObject ? order.toObject() : order;
  return {
    ...obj,
    customer: obj.user
      ? { userId: obj.user._id, name: obj.user.name, email: obj.user.email, phone: obj.user.phone }
      : null,
    items: obj.items.map((item) => ({ ...item, productId: item.productFamily })),
  };
};

// Same reasoning as visibleToCustomer in order.controller.js — a UPI/Card
// order that hasn't been confirmed as paid yet (or that failed) isn't a
// real order. It shouldn't clutter the admin's order list, and an admin
// shouldn't be able to action it (change status, etc.) since the customer
// never actually completed the purchase.
const isRealOrder = { $or: [{ paymentMethod: 'cod' }, { paymentStatus: 'paid' }] };

// GET /api/admin/orders?status=&user=&page=&limit=
// `user` (a customer's Mongo _id) backs UserDetails.jsx's Order History
// section — filtering server-side instead of shipping every order to the
// client and matching customer.userId in the browser.
export const listOrders = asyncHandler(async (req, res) => {
  const { status, user, page = 1, limit = 50 } = req.query;

  const filter = { ...isRealOrder };
  if (status && ORDER_STATUSES.includes(status)) filter.status = status;
  if (user && mongoose.isValidObjectId(user)) filter.user = user;

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    populateCustomer(Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: orders.map(serializeOrder),
    meta: { total, page: Number(page), limit: Number(limit) },
  });
});

// Accepts either a Mongo _id or the human-facing orderCode (e.g.
// "BYND24080502") — the admin UI links by whichever it already has handy.
// Deliberately NOT filtered by isRealOrder — support staff occasionally
// need to look up a stuck/pending online payment by direct link even
// though it won't appear in the main list.
const findOrderFlexible = (orderId) => {
  const query = mongoose.isValidObjectId(orderId)
    ? { _id: orderId }
    : { orderCode: orderId.toUpperCase() };
  return populateCustomer(Order.findOne(query));
};

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await findOrderFlexible(req.params.orderId);
  if (!order) throw new ApiError(404, 'Order not found.');
  res.json({ success: true, data: serializeOrder(order) });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.orderId);
  if (!order) throw new ApiError(404, 'Order not found.');

  if (terminalStatuses.includes(order.status)) {
    throw new ApiError(400, `This order is already ${order.status} and cannot be moved further.`);
  }

  const previousStatus = order.status;
  order.status = status;
  if (status === 'delivered') {
    order.deliveredAt = new Date();
    // COD collects payment at the doorstep — delivery IS the payment
    // event, so this is the only place a COD order's paymentStatus moves
    // to 'paid'. Online orders (UPI/card) are already 'paid' by the time
    // they're visible at all, so this branch never touches them.
    if (order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
    }
    if (!order.invoiceNumber) {
      order.invoiceNumber = InvoiceService.generateInvoiceNumber(order._id, order.deliveredAt);
    }
  }
  if (status === 'cancelled') order.cancelledAt = new Date();
  await order.save();

  await logAdminAction({
    req,
    action: 'order.status_change',
    entityType: 'Order',
    entityId: order._id,
    changes: { orderCode: order.orderCode, from: previousStatus, to: status },
  });

  const populated = await populateCustomer(Order.findById(order._id));

  // Notify only on an actual transition — the frontend already disables
  // the "Update Status" button when nothing changed, but this guards the
  // API itself against sending a duplicate notification either way.
  if (previousStatus !== status) {
    await notifyOrderStatusChange(populated, status);
  }

  res.json({ success: true, data: serializeOrder(populated) });
});

export const updateOrderNotes = asyncHandler(async (req, res) => {
  const { adminNotes } = req.body;
  const order = await Order.findById(req.params.orderId);
  if (!order) throw new ApiError(404, 'Order not found.');

  order.adminNotes = adminNotes;
  await order.save();

  const populated = await populateCustomer(Order.findById(order._id));
  res.json({ success: true, data: serializeOrder(populated) });
});

export const updateOrderTracking = asyncHandler(async (req, res) => {
  const { trackingLink } = req.body;
  const order = await Order.findById(req.params.orderId);
  if (!order) throw new ApiError(404, 'Order not found.');

  order.trackingLink = trackingLink;
  await order.save();

  await logAdminAction({
    req,
    action: 'order.tracking_link_set',
    entityType: 'Order',
    entityId: order._id,
    changes: { orderCode: order.orderCode, trackingLink },
  });

  const populated = await populateCustomer(Order.findById(order._id));
  await notifyTrackingAdded(populated);

  res.json({ success: true, data: serializeOrder(populated) });
});

export const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await findOrderFlexible(req.params.orderId);
  if (!order) throw new ApiError(404, 'Order not found.');
  if (order.status !== 'delivered') {
    throw new ApiError(400, 'Invoice is only available once an order is delivered.');
  }

  const { pdfBuffer, fileName } = await InvoiceService.generateInvoicePDF(order, order.user);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`,
  });
  res.send(pdfBuffer);
});