import Discount from '../models/Discount.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Public — lets checkout preview a discount before the order is placed.
// order.controller.js re-validates independently (and enforces
// perUserLimit + usedCount) at order creation time, so this is a UX
// convenience, not the source of truth.
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