import { Router } from 'express';
import { query } from 'express-validator';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import requireRole from '../middleware/requireRole.js';
import validate from '../middleware/validate.js';
import { getAuditLogs } from '../controllers/adminAuditLog.controller.js';

const router = Router();

// Who did what, when — restricted to super_admin since it can reveal
// other admins' activity and every sensitive action taken in the panel.
router.use(verifyAdminToken);
router.use(requireRole('super_admin'));

router.get(
  '/',
  [
    query('actorType').optional().isIn(['admin', 'system']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  validate,
  getAuditLogs,
);

export default router;