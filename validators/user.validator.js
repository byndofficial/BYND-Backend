import { body, param, query } from 'express-validator';
import { ADMIN_ROLES } from '../utils/constants.js';

// Two concerns, matching UserManagement.jsx and AdminManagement.jsx:
// 1. Admin viewing/updating CUSTOMER accounts (User.js) — status, notes.
// 2. Admin managing other ADMIN accounts (Admin.js) — create/update role,
//    status, password reset. Kept in one file since both are admin-side
//    "manage an account" flows, mirroring adminUser.routes.js /
//    adminManagement.routes.js sharing this validator module.

/* ---------- Customer accounts (User) ---------- */

export const userIdParamValidator = [param('userId').isMongoId().withMessage('Invalid user id.')];

export const updateUserStatusValidator = [
  param('userId').isMongoId().withMessage('Invalid user id.'),
  body('status').isIn(['active', 'suspended', 'deleted']).withMessage('Invalid status.'),
];

export const updateUserNotesValidator = [
  param('userId').isMongoId().withMessage('Invalid user id.'),
  body('adminNotes').trim().isLength({ max: 1000 }),
];

export const listUsersQueryValidator = [
  query('status').optional().isIn(['active', 'suspended', 'deleted']),
  query('search').optional().trim().isLength({ max: 100 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

/* ---------- Admin accounts (Admin) ---------- */

export const createAdminValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 60 }),
  body('mobile')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role').optional().isIn(ADMIN_ROLES).withMessage('Invalid role.'),
];

export const updateAdminValidator = [
  param('adminId').isMongoId().withMessage('Invalid admin id.'),
  body('name').optional().trim().notEmpty().isLength({ max: 60 }),
  body('role').optional().isIn(ADMIN_ROLES).withMessage('Invalid role.'),
  body('status').optional().isIn(['active', 'suspended']).withMessage('Invalid status.'),
];

export const resetAdminPasswordValidator = [
  param('adminId').isMongoId().withMessage('Invalid admin id.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
];

export const adminIdParamValidator = [param('adminId').isMongoId().withMessage('Invalid admin id.')];