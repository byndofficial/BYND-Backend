import { Router } from 'express';
import { createOrder, getMyOrders, getOrderById, cancelOrder, downloadInvoice } from '../controllers/order.controller.js';
import { placeOrderValidator, orderIdParamValidator } from '../validators/order.validator.js';
import validate from '../middleware/validate.js';
import verifyFirebaseToken from '../middleware/verifyFirebaseToken.js';

const router = Router();

// Every order route requires a logged-in user.
router.use(verifyFirebaseToken);

router.get('/', getMyOrders);
router.post('/', placeOrderValidator, validate, createOrder);
router.get('/:orderId', orderIdParamValidator, validate, getOrderById);
router.patch('/:orderId/cancel', orderIdParamValidator, validate, cancelOrder);
router.get('/:orderId/invoice', orderIdParamValidator, validate, downloadInvoice);

export default router;