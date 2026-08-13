import mongoose from 'mongoose';
import { DISCOUNT_TYPES } from '../utils/constants.js';

// Mirrors discountsSeed.js / adminDiscountStore.js exactly. Status
// (active/scheduled/expired/exhausted/disabled) is DERIVED, never stored —
// see statics.getStatus — so it can never drift out of sync with
// isEnabled/dates/usedCount. Dates are calendar-day only (no time
// component), matching the <input type="date"> the admin form uses.
//
// usedCount must only ever be incremented server-side on successful order
// placement — never trusted from the client.

const discountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: '' },

    type: { type: String, enum: DISCOUNT_TYPES, required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number, default: null, min: 0 },
    minPurchaseAmount: { type: Number, default: 0, min: 0 },
    maxPurchaseAmount: { type: Number, default: null, min: 0 },

    // Plain 'YYYY-MM-DD' — a coupon's validity is a calendar-day concept.
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },

    usageLimit: { type: Number, default: null, min: 1 },
    perUserLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },

    isEnabled: { type: Boolean, default: true },
    // Whether the coupon is ever advertised (e.g. storefront "Available
    // Offers"). false = still redeemable if the exact code is entered —
    // "friends & family" behavior, not a real access restriction.
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const todayDateOnly = () => new Date().toISOString().slice(0, 10);

// Single source of truth for "is this coupon usable right now" — mirrors
// getDiscountStatus() on the frontend so admin UI, storefront, and
// checkout validation can never disagree.
discountSchema.methods.getStatus = function getStatus() {
  if (!this.isEnabled) return 'disabled';
  const today = todayDateOnly();
  if (this.endDate < today) return 'expired';
  if (this.startDate > today) return 'scheduled';
  if (this.usageLimit != null && this.usedCount >= this.usageLimit) return 'exhausted';
  return 'active';
};

discountSchema.statics.isCodeTaken = async function isCodeTaken(code, excludeId) {
  const upper = code.trim().toUpperCase();
  return this.exists({ code: upper, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
};

discountSchema.statics.findByCode = function findByCode(code) {
  if (!code) return null;
  return this.findOne({ code: code.trim().toUpperCase() });
};

const Discount = mongoose.model('Discount', discountSchema);

export default Discount;