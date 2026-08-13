import { Router } from 'express';
import {
  listOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderNotes,
} from '../controllers/adminOrder.controller.js';
import {
  orderIdParamValidator,
  updateOrderStatusValidator,
  updateOrderNotesValidator,
  listOrdersQueryValidator,
} from '../validators/order.validator.js';
import validate from '../middleware/validate.js';
import verifyAdminToken from '../middleware/verifyAdminToken.js';

const router = Router();

// Every admin order route requires a valid admin session.
router.use(verifyAdminToken);

router.get('/', listOrdersQueryValidator, validate, listOrders);
router.get('/:orderId', orderIdParamValidator, validate, getOrderById);
router.patch('/:orderId/status', updateOrderStatusValidator, validate, updateOrderStatus);
router.patch('/:orderId/notes', updateOrderNotesValidator, validate, updateOrderNotes);

export default router;