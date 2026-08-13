import { body, param } from 'express-validator';
import { DISCOUNT_TYPES } from '../utils/constants.js';

// Covers adminDiscount.routes.js — full coupon create/update. Mirrors
// Discount.js's schema and discountsSeed.js's field shape exactly.

export const createDiscountValidator = [
  body('code').trim().notEmpty().withMessage('Code is required.').isLength({ max: 30 }),
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 80 }),
  body('description').optional().trim().isLength({ max: 300 }),
  body('type').isIn(DISCOUNT_TYPES).withMessage('Type must be "percent" or "flat".'),
  body('value').isFloat({ min: 0 }).withMessage('Enter a valid value.'),
  body('maxDiscountAmount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('minPurchaseAmount').optional().isFloat({ min: 0 }),
  body('maxPurchaseAmount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('startDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Start date must be YYYY-MM-DD.'),
  body('endDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('End date must be YYYY-MM-DD.'),
  body('usageLimit').optional({ nullable: true }).isInt({ min: 1 }),
  body('perUserLimit').optional({ nullable: true }).isInt({ min: 1 }),
  body('isEnabled').optional().isBoolean(),
  body('isPublic').optional().isBoolean(),
];

export const updateDiscountValidator = [
  param('discountId').isMongoId().withMessage('Invalid discount id.'),
  ...createDiscountValidator.map((rule) => rule.optional({ checkFalsy: false, nullable: true })),
];

export const discountIdParamValidator = [param('discountId').isMongoId().withMessage('Invalid discount id.')];