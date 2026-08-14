import { Router } from 'express';
import { body } from 'express-validator';
import verifyFirebaseToken from '../middleware/verifyFirebaseToken.js';
import validate from '../middleware/validate.js';
import { sensitiveLimiter } from '../middleware/rateLimiter.js';
import { requestAccountDeletionOtp, deleteAccount } from '../controllers/user.controller.js';

const router = Router();

// Separate from auth.routes.js on purpose — auth.routes.js is "identity /
// profile / addresses", this is "destructive self-service account
// actions", both gated by the same Firebase session.
router.use(verifyFirebaseToken);

router.post('/me/deletion-otp', sensitiveLimiter, requestAccountDeletionOtp);

router.delete(
  '/me',
  sensitiveLimiter,
  [body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the 6-digit code.')],
  validate,
  deleteAccount,
);

export default router;