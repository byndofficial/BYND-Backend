import { body, param } from 'express-validator';

export const slugParamValidator = [param('slug').trim().notEmpty().withMessage('Slug is required.')];

export const categoryIdParamValidator = [param('categoryId').isMongoId().withMessage('Invalid category id.')];

export const subCategoryIdParamValidator = [
  param('categoryId').isMongoId().withMessage('Invalid category id.'),
  param('subCategoryId').isMongoId().withMessage('Invalid sub-category id.'),
];

export const createCategoryValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 40 }),
  body('icon').optional().trim(),
  body('order').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

export const updateCategoryValidator = [
  param('categoryId').isMongoId().withMessage('Invalid category id.'),
  body('name').optional().trim().notEmpty().isLength({ max: 40 }),
  body('icon').optional().trim(),
  body('order').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

export const createSubCategoryValidator = [
  param('categoryId').isMongoId().withMessage('Invalid category id.'),
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 40 }),
  body('icon').optional().trim(),
  body('image').optional({ nullable: true }).isString(),
  body('order').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

export const updateSubCategoryValidator = [
  param('categoryId').isMongoId().withMessage('Invalid category id.'),
  param('subCategoryId').isMongoId().withMessage('Invalid sub-category id.'),
  body('name').optional().trim().notEmpty().isLength({ max: 40 }),
  body('icon').optional().trim(),
  body('image').optional({ nullable: true }).isString(),
  body('order').optional().isInt(),
  body('isActive').optional().isBoolean(),
];