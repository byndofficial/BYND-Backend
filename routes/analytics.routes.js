import { Router } from 'express';
import { query } from 'express-validator';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import validate from '../middleware/validate.js';
import { getAnalytics } from '../controllers/analytics.controller.js';

const router = Router();

router.use(verifyAdminToken);

router.get(
  '/',
  [query('range').optional().isIn(['7d', '30d', '90d', 'all']).withMessage('Invalid range.')],
  validate,
  getAnalytics,
);

export default router;