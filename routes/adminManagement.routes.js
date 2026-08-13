import { Router } from 'express';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import requireRole from '../middleware/requireRole.js';
import validate from '../middleware/validate.js';
import {
  createAdminValidator,
  updateAdminValidator,
  resetAdminPasswordValidator,
  adminIdParamValidator,
} from '../validators/user.validator.js';
import {
  listAdmins,
  createAdminAccount,
  updateAdminAccount,
  resetAdminPassword,
  toggleAdminStatus,
  deleteAdminAccount,
} from '../controllers/adminManagement.controller.js';

const router = Router();

router.use(verifyAdminToken);

router.get('/admins', listAdmins);

router.use(requireRole('super_admin'));

router.post('/admins', createAdminValidator, validate, createAdminAccount);
router.patch('/admins/:adminId', updateAdminValidator, validate, updateAdminAccount);
router.patch('/admins/:adminId/password', resetAdminPasswordValidator, validate, resetAdminPassword);
router.patch('/admins/:adminId/status', adminIdParamValidator, validate, toggleAdminStatus);
router.delete('/admins/:adminId', adminIdParamValidator, validate, deleteAdminAccount);

export default router;