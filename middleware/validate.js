import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

// Drop this after a chain of express-validator checks on any route:
//   router.post('/x', [body('email').isEmail()], validate, controller)
// Collects every failed check into ApiError.errors so the client gets one
// consistent 400 response shape instead of each route rolling its own.
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(ApiError.badRequest('Validation failed', errors));
};

export default validate;
