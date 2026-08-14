import { Router } from 'express';
import { body } from 'express-validator';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import validate from '../middleware/validate.js';
import {
  userIdParamValidator,
  updateUserStatusValidator,
  updateUserNotesValidator,
  listUsersQueryValidator,
} from '../validators/user.validator.js';
import {
  listUsers,
  getUserById,
  updateUserStatus,
  updateUserNotes,
  updateMarketingOptIn,
  eraseUser,
} from '../controllers/adminUser.controller.js';

const router = Router();

// Every route here manages CUSTOMER accounts (User.js), as opposed to
// adminManagement.routes.js which manages other ADMIN accounts.
router.use(verifyAdminToken);

router.get('/', listUsersQueryValidator, validate, listUsers);
router.get('/:userId', userIdParamValidator, validate, getUserById);

router.patch('/:userId/status', updateUserStatusValidator, validate, updateUserStatus);
router.patch('/:userId/notes', updateUserNotesValidator, validate, updateUserNotes);
router.patch(
  '/:userId/marketing-opt-in',
  [...userIdParamValidator, body('marketingOptIn').isBoolean().withMessage('marketingOptIn must be a boolean.')],
  validate,
  updateMarketingOptIn,
);

router.post('/:userId/erase', userIdParamValidator, validate, eraseUser);

export default router;