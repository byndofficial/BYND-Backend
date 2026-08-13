import Order from '../models/Order.js';
import { verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpay.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

// Called by the frontend right after Razorpay Checkout's success handler
// fires. This is the ONLY place an order flips to paid/confirmed on the
// happy path — the webhook below is the backstop for cases where the user
// closes the tab before this fires.
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { razorpayPaymentId, razorpaySignature } = req.body;

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found.');
  if (!order.razorpayOrderId) throw new ApiError(400, 'This order was not set up for online payment.');

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

  res.json({ success: true, data: order });
});

// Razorpay webhook — unauthenticated, signature-verified instead. Route
// must be mounted with express.raw() ahead of the global express.json()
// parser (see app.js) so `req.body` here is the raw Buffer the signature
// was computed over, not a parsed object.
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
    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.razorpayPaymentId = paymentEntity.id;
      order.status = 'confirmed';
      await order.save();
    }
  }

  if (event === 'payment.failed' && paymentEntity?.order_id) {
    const order = await Order.findOne({ razorpayOrderId: paymentEntity.order_id });
    if (order && order.paymentStatus === 'pending') {
      order.paymentStatus = 'failed';
      await order.save();
    }
  }

  // Always 200 — Razorpay retries on non-2xx, and we've already handled
  // (or intentionally ignored) whatever event this was.
  res.json({ success: true });
});