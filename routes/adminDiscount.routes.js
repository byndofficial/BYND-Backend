import { Router } from 'express';
import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import {
  listDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} from '../controllers/adminDiscount.controller.js';
import {
  createDiscountValidator,
  updateDiscountValidator,
  discountIdParamValidator,
} from '../validators/discount.validator.js';

const router = Router();

// Self-contained validation check so this file doesn't assume a shared
// middleware name I haven't seen. Swap for your existing one if you already
// have a shared validate step used by product/order routes.
const runValidation = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    throw new ApiError(422, result.array()[0].msg);
  }
  next();
};

router.use(verifyAdminToken);

router.get('/', listDiscounts);
router.get('/:discountId', discountIdParamValidator, runValidation, getDiscountById);
router.post('/', createDiscountValidator, runValidation, createDiscount);
router.patch('/:discountId', updateDiscountValidator, runValidation, updateDiscount);
router.delete('/:discountId', discountIdParamValidator, runValidation, deleteDiscount);

export default router;