import { body, param } from 'express-validator';

export const sizeChartIdParamValidator = [param('chartId').isMongoId().withMessage('Invalid size chart id.')];

export const createSizeChartValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 80 }),
  body('image').notEmpty().withMessage('An image is required.'),
];

export const updateSizeChartValidator = [
  param('chartId').isMongoId().withMessage('Invalid size chart id.'),
  body('name').optional().trim().notEmpty().isLength({ max: 80 }),
  body('image').optional(),
];