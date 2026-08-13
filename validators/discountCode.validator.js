import { body } from 'express-validator';

// Covers discount.routes.js (storefront) — applying/validating a coupon
// code at checkout. Deliberately separate from discount.validator.js
// (admin CRUD) since the storefront only ever sends a code + cart total,
// never the coupon's own fields.

export const applyDiscountCodeValidator = [
  body('code').trim().notEmpty().withMessage('Enter a coupon code.').isLength({ max: 30 }),
  body('cartSubtotal').isFloat({ min: 0 }).withMessage('Invalid cart total.'),
];