import mongoose from 'mongoose';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../utils/constants.js';

// Items and address are SNAPSHOTS, not live refs — mirrors orders.js on
// the storefront exactly, since a product's price/name or a user's saved
// address can change after the order is placed.

const orderItemSchema = new mongoose.Schema(
  {
    productFamily: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductFamily', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: null },
    category: { type: String, trim: true, lowercase: true },
    color: { type: String, trim: true },
    size: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const orderAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true, match: [/^\d{6}$/, 'Enter a valid 6-digit pincode'] },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    // Human-facing order code (e.g. "BYND24081201") — generated server-side,
    // guaranteed unique, used in URLs/emails instead of the raw _id.
    orderCode: { type: String, required: true, unique: true, trim: true, uppercase: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    items: {
      type: [orderItemSchema],
      default: [],
      validate: { validator: (v) => v.length > 0, message: 'An order needs at least one item.' },
    },
    address: { type: orderAddressSchema, required: true },

    status: { type: String, enum: ORDER_STATUSES, default: 'processing', index: true },

    paymentMethod: { type: String, required: true, trim: true },
    // 'pending'  -> UPI/Card order created but payment not yet confirmed.
    //               Invisible to the customer and to the main admin list
    //               (see visibleToCustomer / isRealOrder filters in the
    //               controllers) until it flips to 'paid'.
    // 'paid'     -> UPI/Card, payment confirmed by Razorpay.
    // 'failed'   -> UPI/Card, payment explicitly failed or signature
    //               mismatch. Left in place for support visibility, then
    //               swept up by the TTL index below.
    // 'cod'      -> Cash on Delivery, confirmed at placement. Flips to
    //               'paid' only once the admin marks the order delivered
    //               (payment is collected at the doorstep).
    // 'refunded' -> reserved for future use (cancellations/returns).
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },

    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, default: null, trim: true, uppercase: true },
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    placedAt: { type: Date, default: Date.now },
    expectedDelivery: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    invoiceNumber: { type: String, default: null },

    // Admin-only, never exposed to the storefront API.
    adminNotes: { type: String, trim: true, maxlength: 1000, default: '' },

    trackingLink: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });

// Auto-deletes an order that never got paid — closed tab, expired
// checkout, or a payment that failed. Only applies to orders still
// waiting on UPI/Card confirmation; COD orders and paid orders are
// untouched (the partial filter is what makes it conditional).
orderSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 3600, // 1 hour grace period for slow checkouts
    partialFilterExpression: {
      paymentStatus: { $in: ['pending', 'failed'] },
      paymentMethod: { $in: ['upi', 'card'] },
    },
  },
);

const Order = mongoose.model('Order', orderSchema);

export default Order;