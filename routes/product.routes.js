import { Router } from 'express';
import validate from '../middleware/validate.js';
import { listProductsQueryValidator, productIdParamValidator } from '../validators/product.validator.js';
import { listProducts, getProductById } from '../controllers/product.controller.js';
import { PRODUCT_COLORS, SIZE_OPTIONS } from '../utils/constants.js';

const router = Router();

router.get('/', listProductsQueryValidator, validate, listProducts);
router.get('/colors', (req, res) => res.status(200).json({ success: true, data: PRODUCT_COLORS }));
router.get('/sizes', (req, res) => res.status(200).json({ success: true, data: SIZE_OPTIONS }));
router.get('/:productId', productIdParamValidator, validate, getProductById);

export default router;