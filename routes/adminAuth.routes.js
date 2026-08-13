import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import { adminLoginValidator } from '../validators/adminAuth.validator.js';
import { login, refresh, getMe, logout, logoutAll } from '../controllers/adminAuth.controller.js';

const router = Router();

router.post('/login', authLimiter, adminLoginValidator, validate, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

router.use(verifyAdminToken);
router.get('/me', getMe);
router.post('/logout-all', logoutAll);

export default router;