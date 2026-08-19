import Discount from '../models/Discount.js';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Shared by listPublicDiscounts and validateCoupon — mirrors the perUserLimit
// check in order.controller.js's resolveCoupon exactly, so a coupon can
// never look usable here and then get rejected at actual order placement.
// Returns true if this user has already used `discount` perUserLimit times.
const isExhaustedForUser = async (discount, userId) => {
  if (!discount.perUserLimit || !userId) return false;
  const timesUsed = await Order.countDocuments({
    user: userId,
    couponCode: discount.code,
    status: { $ne: 'cancelled' },
  });
  return timesUsed >= discount.perUserLimit;
};

// GET /discounts/public — active, public-facing coupons for storefront
// display (e.g. PDP "Available Offers", checkout chips). Only exposes
// fields safe to show to anyone; usage counters, perUserLimit, etc. stay
// admin-only. When the request is authenticated (req.user set by
// attachUserIfPresent), coupons this user has already exhausted their
// personal limit on are left out entirely — they'd just fail at checkout
// anyway, so showing them as tappable is misleading.
export const listPublicDiscounts = asyncHandler(async (req, res) => {
  const discounts = await Discount.find({ isPublic: true, isEnabled: true });
  const active = discounts.filter((d) => d.getStatus() === 'active');

  const availableForUser = [];
  for (const d of active) {
    if (await isExhaustedForUser(d, req.user?._id)) continue;
    availableForUser.push(d);
  }

  res.json({
    success: true,
    data: availableForUser.map((d) => ({
      code: d.code,
      name: d.name,
      description: d.description,
      type: d.type,
      value: d.value,
      maxDiscountAmount: d.maxDiscountAmount,
      minPurchaseAmount: d.minPurchaseAmount,
    })),
  });
});

// Public — lets checkout preview a discount before the order is placed.
// order.controller.js re-validates independently (and enforces
// perUserLimit + usedCount) at order creation time, so this is a UX
// convenience, not the source of truth — but it now also checks
// perUserLimit itself (when req.user is available) so a manually-typed
// code someone has already exhausted fails here with a clear message,
// instead of only failing later at order placement.
export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, cartSubtotal } = req.body;

  const discount = await Discount.findByCode(code);
  if (!discount) throw new ApiError(400, 'This coupon code is invalid or has expired.');

  const status = discount.getStatus();
  if (status !== 'active') {
    const messages = {
      disabled: 'This coupon is no longer available.',
      expired: 'This coupon has expired.',
      scheduled: 'This coupon is not active yet.',
      exhausted: 'This coupon has reached its usage limit.',
    };
    throw new ApiError(400, messages[status] || 'This coupon code is invalid or has expired.');
  }

  if (await isExhaustedForUser(discount, req.user?._id)) {
    throw new ApiError(400, "You've already used this coupon the maximum number of times.");
  }

  if (discount.minPurchaseAmount && cartSubtotal < discount.minPurchaseAmount) {
    throw new ApiError(400, `Minimum order value for this coupon is ₹${discount.minPurchaseAmount}.`);
  }
  if (discount.maxPurchaseAmount && cartSubtotal > discount.maxPurchaseAmount) {
    throw new ApiError(400, `This coupon only applies to orders up to ₹${discount.maxPurchaseAmount}.`);
  }

  let discountAmount =
    discount.type === 'flat' ? discount.value : Math.round((cartSubtotal * discount.value) / 100);
  if (discount.maxDiscountAmount) discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
  discountAmount = Math.min(discountAmount, cartSubtotal);

  res.json({
    success: true,
    data: {
      code: discount.code,
      type: discount.type,
      value: discount.value,
      discountAmount,
    },
  });
});