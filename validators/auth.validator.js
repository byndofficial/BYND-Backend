import { body, param } from 'express-validator';

// Customer identity itself is verified by Firebase (see
// middleware/verifyFirebaseToken.js) — there's no password/login body to
// validate here. What DOES need validation is the profile/address data the
// customer submits once authenticated, matching User.js's schema exactly.

export const signupValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 80 }),
  body('email').optional({ nullable: true }).trim().isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('phone').optional({ nullable: true }).trim().isMobilePhone('en-IN').withMessage('Enter a valid phone number.'),
  body('marketingOptIn').optional().isBoolean(),
];

export const updateProfileValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.').isLength({ max: 80 }),
  body('email').optional({ nullable: true }).trim().isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('marketingOptIn').optional().isBoolean(),
];

export const addressValidator = [
  body('label').optional().trim().isLength({ max: 20 }),
  body('name').trim().notEmpty().withMessage('Recipient name is required.').isLength({ max: 60 }),
  body('phone').trim().isMobilePhone('en-IN').withMessage('Enter a valid phone number.'),
  body('line1').trim().notEmpty().withMessage('Address line 1 is required.').isLength({ max: 120 }),
  body('line2').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('city').trim().notEmpty().withMessage('City is required.').isLength({ max: 60 }),
  body('state').trim().notEmpty().withMessage('State is required.').isLength({ max: 60 }),
  body('pincode').trim().matches(/^\d{6}$/).withMessage('Enter a valid 6-digit pincode.'),
  body('isDefault').optional().isBoolean(),
];

export const addressIdParamValidator = [param('addressId').isMongoId().withMessage('Invalid address id.')];