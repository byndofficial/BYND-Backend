import Order from '../models/Order.js';
import Discount from '../models/Discount.js';
import { verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpay.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

// Awards the coupon usedCount — deferred until here because this is the
// only place we know the payment (and therefore the order) is actually
// real. Guarded by paymentStatus so verifyPayment and the webhook racing
// each other never double-counts a single coupon use.
const awardCouponIfPresent = async (order) => {
  if (!order.couponCode) return;
  const discount = await Discount.findByCode(order.couponCode);
  if (discount) {
    await Discount.updateOne({ _id: discount._id }, { $inc: { usedCount: 1 } }).catch((err) =>
      logger.error('Failed to increment coupon usedCount on payment confirmation', err),
    );
  }
};

// Called by the frontend right after Razorpay Checkout's success handler
// fires. The order already exists (created as paymentStatus: 'pending' in
// order.controller.js) but stays invisible to the customer/admin until
// this flips it to 'paid' — see visibleToCustomer in order.controller.js
// and the equivalent filter in adminOrder.controller.js.
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { razorpayPaymentId, razorpaySignature } = req.body;

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found.');
  if (!order.razorpayOrderId) throw new ApiError(400, 'This order was not set up for online payment.');

  // Already confirmed (e.g. webhook beat this call to it) — idempotent.
  if (order.paymentStatus === 'paid') {
    return res.json({ success: true, data: order });
  }

  const isValid = verifyPaymentSignature({
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!isValid) {
    order.paymentStatus = 'failed';
    await order.save();
    throw new ApiError(400, 'Payment verification failed.');
  }

  order.paymentStatus = 'paid';
  order.razorpayPaymentId = razorpayPaymentId;
  order.status = 'confirmed';
  await order.save();
  await awardCouponIfPresent(order);

  res.json({ success: true, data: order });
});

// Razorpay webhook — unauthenticated, signature-verified instead. Route
// must be mounted with express.raw() ahead of the global express.json()
// parser (see app.js).
export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const isValid = verifyWebhookSignature(req.body, signature);

  if (!isValid) {
    logger.error('Razorpay webhook signature mismatch — rejecting.');
    return res.status(400).json({ success: false, message: 'Invalid signature.' });
  }

  const payload = JSON.parse(req.body.toString());
  const event = payload.event;
  const paymentEntity = payload.payload?.payment?.entity;

  if (event === 'payment.captured' && paymentEntity?.order_id) {
    const order = await Order.findOne({ razorpayOrderId: paymentEntity.order_id });
    // Backstop for when the frontend's verifyPayment never fired (tab
    // closed, network drop) — this may be the only place the order gets
    // marked paid, so it re-does the same work verifyPayment would have.
    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.razorpayPaymentId = paymentEntity.id;
      order.status = 'confirmed';
      await order.save();
      await awardCouponIfPresent(order);
    }
  }

  if (event === 'payment.failed' && paymentEntity?.order_id) {
    const order = await Order.findOne({ razorpayOrderId: paymentEntity.order_id });
    if (order && order.paymentStatus === 'pending') {
      order.paymentStatus = 'failed';
      await order.save();
    }
  }

  res.json({ success: true });
});