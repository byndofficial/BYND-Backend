import { Router } from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  mergeWishlist,
} from '../controllers/wishlist.controller.js';
import verifyFirebaseToken from '../middleware/verifyFirebaseToken.js';

const router = Router();

// Every wishlist route requires a logged-in user — guests never touch the server wishlist.
router.use(verifyFirebaseToken);

router.get('/', getWishlist);
router.post('/', addToWishlist);
router.post('/merge', mergeWishlist);
router.delete('/:productId', removeFromWishlist);
router.delete('/', clearWishlist);

export default router;