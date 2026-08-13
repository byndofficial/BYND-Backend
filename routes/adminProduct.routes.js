import { Router } from 'express';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import validate from '../middleware/validate.js';
import { createProductValidator, updateProductValidator, productIdParamValidator } from '../validators/product.validator.js';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
} from '../controllers/adminProduct.controller.js';

const router = Router();

router.use(verifyAdminToken);

router.get('/', listProducts);
router.get('/:productId', productIdParamValidator, validate, getProductById);
router.post('/', createProductValidator, validate, createProduct);
router.patch('/:productId', updateProductValidator, validate, updateProduct);
router.delete('/:productId', productIdParamValidator, validate, deleteProduct);
router.post('/:productId/duplicate', productIdParamValidator, validate, duplicateProduct);

export default router;