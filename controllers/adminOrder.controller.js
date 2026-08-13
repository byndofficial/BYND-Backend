import mongoose from 'mongoose';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ORDER_STATUSES } from '../utils/constants.js';

// Orders older than these two states are considered final — an admin can
// still add notes, but the status itself shouldn't move any further.
const terminalStatuses = ['delivered', 'cancelled'];

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

export const listOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (status && ORDER_STATUSES.includes(status)) filter.status = status;

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

  order.status = status;
  if (status === 'delivered') order.deliveredAt = new Date();
  if (status === 'cancelled') order.cancelledAt = new Date();
  await order.save();

  const populated = await populateCustomer(Order.findById(order._id));
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