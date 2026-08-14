import { Router } from 'express';
import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';
// ⚠️ Adjust this import to match whatever admin-auth middleware
// adminProduct.routes.js / adminOrder.routes.js actually use — I don't have
// those two route files, so this is a best guess at the name/path.
import { requireAdmin } from '../middlewares/adminAuth.middleware.js';
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

router.use(requireAdmin);

router.get('/', listDiscounts);
router.get('/:discountId', discountIdParamValidator, runValidation, getDiscountById);
router.post('/', createDiscountValidator, runValidation, createDiscount);
router.patch('/:discountId', updateDiscountValidator, runValidation, updateDiscount);
router.delete('/:discountId', discountIdParamValidator, runValidation, deleteDiscount);

export default router;