import { body } from 'express-validator';

export const adminLoginValidator = [
  body('mobile')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number.'),
  body('password').notEmpty().withMessage('Password is required.'),
];