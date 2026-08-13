import crypto from 'crypto';
import razorpay from '../config/razorpay.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

// Creates a Razorpay order for checkout. `amount` is in rupees (this
// service handles the paise conversion) — never trust an amount computed
// client-side; callers must pass the server-recalculated order total.
export const createOrder = async ({ amount, receipt, notes = {} }) => {
  try {
    return await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt,
      notes,
    });
  } catch (err) {
    logger.error(`Razorpay order creation failed: ${err.message}`);
    throw ApiError.internal('Could not initiate payment — please try again.');
  }
};

// Verifies the signature Razorpay's checkout returns to the client after a
// successful payment, before the order is marked paid. This is the
// standard HMAC-SHA256 of `${razorpayOrderId}|${razorpayPaymentId}` keyed
// with the account's key secret — payment status is NEVER trusted from the
// client without this check passing.
export const verifyPaymentSignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return expected === razorpaySignature;
};

// Verifies the signature on an incoming Razorpay webhook payload (raw body
// required — route must use express.raw() for this endpoint, mounted
// before the global express.json() parser; see app.js's note on this).
// Keyed with the separate webhook secret, not the API key secret.
export const verifyWebhookSignature = (rawBody, signature) => {
  const expected = crypto
    .createHmac('sha256', env.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
};

export default razorpay;