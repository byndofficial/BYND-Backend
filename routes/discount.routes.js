import { Router } from 'express';
import { validateCoupon } from '../controllers/discount.controller.js';
import { applyDiscountCodeValidator } from '../validators/discountCode.validator.js';
import validate from '../middleware/validate.js';
import { couponLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public — no auth required to preview a coupon at checkout. Rate-limited
// tighter than general traffic since an unauthenticated endpoint that
// echoes back "valid/invalid" is exactly what code-grinding targets.
router.post('/validate', couponLimiter, applyDiscountCodeValidator, validate, validateCoupon);

export default router;