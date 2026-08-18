import { Router } from 'express';
import verifyFirebaseToken from '../middleware/verifyFirebaseToken.js';
import validate from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  signup,
  login,
  checkMobile,
  getMe,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/auth.controller.js';
import {
  signupValidator,
  updateProfileValidator,
  addressValidator,
  addressIdParamValidator,
  checkMobileValidator,
} from '../validators/auth.validator.js';

const router = Router();

// Public — pre-checks, run before any Firebase token exists.
router.post('/check-mobile', authLimiter, checkMobileValidator, validate, checkMobile);

// No verifyFirebaseToken here on purpose — signup verifies the token
// itself and is the one route allowed to run without an existing User doc.
router.post('/signup', authLimiter, signupValidator, validate, signup);

// Verifies the token but never creates — see auth.controller.js.
router.post('/login', authLimiter, login);

// Everything below requires an existing account.
router.use(verifyFirebaseToken);

router.get('/me', getMe);
router.patch('/me', updateProfileValidator, validate, updateProfile);

router.post('/addresses', addressValidator, validate, addAddress);
router.patch('/addresses/:addressId', addressIdParamValidator, addressValidator, validate, updateAddress);
router.delete('/addresses/:addressId', addressIdParamValidator, validate, deleteAddress);
router.patch('/addresses/:addressId/default', addressIdParamValidator, validate, setDefaultAddress);

export default router;