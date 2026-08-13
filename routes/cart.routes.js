import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeCart,
} from '../controllers/cart.controller.js';
import verifyFirebaseToken from '../middleware/verifyFirebaseToken.js';

const router = Router();

// Every cart route requires a logged-in user — guests never touch the server cart.
router.use(verifyFirebaseToken);

router.get('/', getCart);
router.post('/', addToCart);
router.post('/merge', mergeCart);
router.patch('/:lineId', updateCartItem);
router.delete('/:lineId', removeCartItem);
router.delete('/', clearCart);

export default router;