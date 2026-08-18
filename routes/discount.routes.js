import { Router } from 'express';
import { listPublicDiscounts, validateCoupon } from '../controllers/discount.controller.js';
import { applyDiscountCodeValidator } from '../validators/discountCode.validator.js';
import validate from '../middleware/validate.js';
import { couponLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public — active, public-facing coupons for storefront display (PDP
// offers, promo banners, etc). Not rate-limited like /validate since it
// doesn't echo back valid/invalid for an arbitrary code — it's just a list.
router.get('/public', listPublicDiscounts);

// Public — no auth required to preview a coupon at checkout. Rate-limited
// tighter than general traffic since an unauthenticated endpoint that
// echoes back "valid/invalid" is exactly what code-grinding targets.
router.post('/validate', couponLimiter, applyDiscountCodeValidator, validate, validateCoupon);

export default router;