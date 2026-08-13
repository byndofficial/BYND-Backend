import { body, param, query } from 'express-validator';
import { SIZE_OPTIONS } from '../utils/constants.js';

// Covers both product.routes.js (storefront — read-only, so just query/
// param checks) and adminProduct.routes.js (admin — full create/update
// body validation). Mirrors the exact shape AddProduct.jsx / EditProduct.jsx
// already validate client-side, plus the server-side rules ProductFamily.js
// enforces (one color per family, SKU per size, etc).

const highlightValidator = [
  body('highlights').optional().isArray(),
  body('highlights.*.label').if(body('highlights').exists()).trim().notEmpty().isLength({ max: 40 }),
  body('highlights.*.value').if(body('highlights').exists()).trim().notEmpty().isLength({ max: 100 }),
];

const variantValidator = [
  body('variants')
    .isArray({ min: 1 })
    .withMessage('A product needs at least one color variant.'),
  body('variants.*.color').trim().notEmpty().withMessage('Each variant needs a color.'),
  body('variants.*.colorCode')
    .trim()
    .matches(/^#[0-9a-fA-F]{6}$/)
    .withMessage('Each variant needs a valid hex color code.'),
  body('variants.*.images').isArray({ min: 1 }).withMessage('Upload at least one image per color.'),
  body('variants.*.sizes').isArray({ min: 1 }).withMessage('Select at least one size per color.'),
  body('variants.*.sizes.*.size').isIn(SIZE_OPTIONS).withMessage('Invalid size.'),
  body('variants.*.sizes.*.sku').trim().notEmpty().withMessage('Every size needs a SKU.'),
];

export const createProductValidator = [
  body('baseName').trim().notEmpty().withMessage('Product name is required.').isLength({ max: 80 }),
  body('styleCode').trim().notEmpty().withMessage('Style code is required.').isLength({ max: 20 }),
  body('category').trim().notEmpty().withMessage('Choose a category.'),
  body('subCategory').trim().notEmpty().withMessage('Choose a sub-category.'),
  body('price').isFloat({ min: 0 }).withMessage('Enter a valid price.'),
  body('costPrice').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Enter a valid cost price.'),
  body('badge').optional({ nullable: true }).isIn(['NEW', 'BEST SELLER', 'SALE']),
  body('description').optional().trim().isLength({ max: 600 }),
  body('sizeChartId').optional({ nullable: true }).isMongoId(),
  ...variantValidator,
  ...highlightValidator,
];

export const updateProductValidator = [param('productId').isMongoId().withMessage('Invalid product id.'), ...createProductValidator];

export const productIdParamValidator = [param('productId').isMongoId().withMessage('Invalid product id.')];

// Storefront listing/filter query params — everything optional, since the
// catalog page works with zero filters applied.
export const listProductsQueryValidator = [
  query('category').optional().trim(),
  query('subCategory').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('color').optional().trim(),
  query('size').optional().isIn(SIZE_OPTIONS),
  query('search').optional().trim().isLength({ max: 100 }),
  query('sort').optional().isIn(['newest', 'price-asc', 'price-desc', 'popular']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];