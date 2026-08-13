import { Router } from 'express';
import { validateCoupon } from '../controllers/discount.controller.js';
import { applyDiscountCodeValidator } from '../validators/discountCode.validator.js';
import validate from '../middleware/validate.js';

const router = Router();

// Public — no auth required to preview a coupon at checkout.
router.post('/validate', applyDiscountCodeValidator, validate, validateCoupon);

export default router;