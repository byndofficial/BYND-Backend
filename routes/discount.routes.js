import { Router } from 'express';
import { listPublicDiscounts, validateCoupon } from '../controllers/discount.controller.js';
import { applyDiscountCodeValidator } from '../validators/discountCode.validator.js';
import validate from '../middleware/validate.js';
import { couponLimiter } from '../middleware/rateLimiter.js';
import attachUserIfPresent from '../middleware/attachUserIfPresent.js';

const router = Router();

// Public — active, public-facing coupons for storefront display (PDP
// offers, promo banners, checkout chips). attachUserIfPresent populates
// req.user when the visitor is logged in, WITHOUT requiring login (guests
// browsing the PDP still get the list) — listPublicDiscounts uses it to
// drop coupons this user has already exhausted their perUserLimit on.
router.get('/public', attachUserIfPresent, listPublicDiscounts);

// Public — no login required to preview a coupon at checkout, but
// attachUserIfPresent lets validateCoupon enforce perUserLimit when the
// visitor IS logged in, so a manually-typed code can't slip past a limit
// the chip list already hides. Rate-limited tighter than general traffic
// since an unauthenticated endpoint that echoes back "valid/invalid" is
// exactly what code-grinding targets.
router.post('/validate', couponLimiter, attachUserIfPresent, applyDiscountCodeValidator, validate, validateCoupon);

export default router;