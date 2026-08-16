import Order from '../models/Order.js';
import ProductFamily from '../models/ProductFamily.js';
import Discount from '../models/Discount.js';
import User from '../models/User.js';
import { createOrder as createRazorpayOrder } from '../services/razorpay.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import InvoiceService from '../services/invoice.service.js';

const DELIVERY_FEE = 40;

// Same resolution pattern as cart.controller.js — never trust price/name/sku
// from the client, always re-read them from ProductFamily at order time.
// Field name here (`productFamily`) matches order.validator.js and
// Order.js's schema — NOT the `productFamilyId` used by cartApi.js, so the
// frontend must map item.productId -> productFamily when calling createOrder.
const resolveOrderItem = async (line) => {
  const { productFamily: productFamilyId, variantId, size, quantity = 1 } = line;
  const family = await ProductFamily.findById(productFamilyId).lean();
  if (!family || !family.isActive) throw new ApiError(404, 'Product not found.');

  const variant = (family.variants || []).find((v) => String(v._id) === String(variantId));
  if (!variant) throw new ApiError(404, 'Product variant not found.');

  const sizeRow = (variant.sizes || []).find((s) => s.size === size);
  if (!sizeRow) throw new ApiError(404, `Selected size is not available for ${family.baseName}.`);

  const qty = Math.min(10, Math.max(1, Number(quantity) || 1));

  return {
    productFamily: family._id,
    variantId: variant._id,
    sku: sizeRow.sku,
    name: family.baseName,
    image: variant.images?.[0] || null,
    category: family.category || null,
    color: variant.color || null,
    size,
    price: family.price,
    quantity: qty,
  };
};

// Re-validates a coupon against the real Discount schema and, when a user
// is known, enforces perUserLimit against their past orders. Returns
// { discountAmount, couponCode, discountDoc } — discountDoc is null when
// no code was applied, and is used afterward to increment usedCount.
const resolveCoupon = async (code, subtotal, userId) => {
  if (!code) return { discountAmount: 0, couponCode: null, discountDoc: null };

  const discount = await Discount.findByCode(code);
  if (!discount) throw new ApiError(400, 'This coupon code is invalid or has expired.');

  const status = discount.getStatus();
  if (status !== 'active') {
    throw new ApiError(400, 'This coupon is no longer available.');
  }

  if (discount.minPurchaseAmount && subtotal < discount.minPurchaseAmount) {
    throw new ApiError(400, `Minimum order value for this coupon is ₹${discount.minPurchaseAmount}.`);
  }
  if (discount.maxPurchaseAmount && subtotal > discount.maxPurchaseAmount) {
    throw new ApiError(400, `This coupon only applies to orders up to ₹${discount.maxPurchaseAmount}.`);
  }

  if (discount.perUserLimit) {
    const timesUsed = await Order.countDocuments({
      user: userId,
      couponCode: discount.code,
      status: { $ne: 'cancelled' },
    });
    if (timesUsed >= discount.perUserLimit) {
      throw new ApiError(400, 'You have already used this coupon the maximum number of times.');
    }
  }

  let discountAmount =
    discount.type === 'flat' ? discount.value : Math.round((subtotal * discount.value) / 100);
  if (discount.maxDiscountAmount) discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
  discountAmount = Math.min(discountAmount, subtotal);

  return { discountAmount, couponCode: discount.code, discountDoc: discount };
};

const generateOrderCode = () => `BYND${Date.now().toString().slice(-8)}`;

export const createOrder = asyncHandler(async (req, res) => {
  const { items = [], addressId, address, paymentMethod, couponCode } = req.body;

  if (!items.length) throw new ApiError(400, 'An order needs at least one item.');
  if (!['cod', 'upi', 'card'].includes(paymentMethod)) {
    throw new ApiError(400, 'Invalid payment method.');
  }

  // Address can be a saved address id (looked up from the user's profile)
  // or a fresh inline address — either way it's snapshotted onto the order.
  let orderAddress = address;
  if (addressId) {
    const user = await User.findById(req.user._id).lean();
    const saved = user?.addresses?.find((a) => String(a._id) === String(addressId));
    if (!saved) throw new ApiError(404, 'Delivery address not found.');
    orderAddress = saved;
  }
  if (!orderAddress) throw new ApiError(400, 'A delivery address is required.');

  const resolvedItems = await Promise.all(items.map(resolveOrderItem));
  const subtotal = resolvedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = DELIVERY_FEE;
  const { discountAmount, couponCode: appliedCode, discountDoc } = await resolveCoupon(
    couponCode,
    subtotal,
    req.user._id,
  );
  const total = Math.max(0, subtotal - discountAmount) + deliveryFee;

  const order = await Order.create({
    orderCode: generateOrderCode(),
    user: req.user._id,
    items: resolvedItems,
    address: orderAddress,
    paymentMethod,
    paymentStatus: 'pending',
    subtotal,
    discountAmount,
    couponCode: appliedCode,
    deliveryFee,
    total,
  });

  // Coupon is "spent" once an order successfully exists against it —
  // mirrors the admin panel's usedCount, which must only ever move
  // server-side on real order placement.
  if (discountDoc) {
    await Discount.updateOne({ _id: discountDoc._id }, { $inc: { usedCount: 1 } });
  }

  // COD confirms immediately. UPI/Card need a Razorpay order first — the
  // frontend opens Razorpay Checkout with this, then calls
  // POST /payments/orders/:id/verify once the user completes payment.
  let razorpayOrder = null;
  if (paymentMethod !== 'cod') {
    razorpayOrder = await createRazorpayOrder({
      amount: total,
      receipt: order.orderCode,
      notes: { orderId: String(order._id) },
    });
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();
  }

  res.status(201).json({ success: true, data: { order, razorpayOrder } });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: orders });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id }).lean();
  if (!order) throw new ApiError(404, 'Order not found.');
  res.json({ success: true, data: order });
});

const cancellableStatuses = ['processing', 'confirmed'];

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found.');
  if (!cancellableStatuses.includes(order.status)) {
    throw new ApiError(400, 'This order can no longer be cancelled.');
  }
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  await order.save();
  res.json({ success: true, data: order });
});

export const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id }).populate(
    'user',
    'name email phone',
  );
  if (!order) throw new ApiError(404, 'Order not found.');
  if (order.status !== 'delivered') {
    throw new ApiError(400, 'Invoice is only available once your order is delivered.');
  }

  const { pdfBuffer, fileName } = await InvoiceService.generateInvoicePDF(order, order.user);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`,
  });
  res.send(pdfBuffer);
});