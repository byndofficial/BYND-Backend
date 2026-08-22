import { body, param } from 'express-validator';
import { SPACING_OPTIONS } from '../models/HomepageLayout.js';

const ELEMENT_TYPES = ['heading', 'subheading', 'paragraph', 'button'];
const ALIGNS = ['left', 'center', 'right'];
const MAX_ELEMENTS = 14;
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const BANNER_HEIGHT_MODES = ['auto', 'small', 'medium', 'large', 'custom'];

/* =========================================================
   Hero slides
   ========================================================= */

const validateLayout = (layout, label) => {
  if (!layout || typeof layout !== 'object') throw new Error(`Element ${label} layout is missing.`);
  ['x', 'y', 'width', 'fontSize'].forEach((field) => {
    if (layout[field] !== undefined && (typeof layout[field] !== 'number' || Number.isNaN(layout[field]))) {
      throw new Error(`Element ${label} ${field} must be a number.`);
    }
  });
  if (layout.x !== undefined && (layout.x < 0 || layout.x > 100)) throw new Error(`Element ${label} x must be between 0 and 100.`);
  if (layout.y !== undefined && (layout.y < 0 || layout.y > 100)) throw new Error(`Element ${label} y must be between 0 and 100.`);
  if (layout.width !== undefined && (layout.width < 5 || layout.width > 100)) {
    throw new Error(`Element ${label} width must be between 5 and 100.`);
  }
  if (layout.fontSize !== undefined && (layout.fontSize < 8 || layout.fontSize > 120)) {
    throw new Error(`Element ${label} font size must be between 8 and 120.`);
  }
};

// `elements` arrives as a JSON string (FormData can't carry nested
// arrays) — parse and shape-check it here, once, so the controller can
// trust it. Throwing inside a custom validator fails the field with that
// message.
const validateElements = (value) => {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Slide layout data is malformed.');
  }
  if (!Array.isArray(parsed)) throw new Error('Slide layout must be a list of elements.');
  if (parsed.length > MAX_ELEMENTS) throw new Error(`A slide can have at most ${MAX_ELEMENTS} elements.`);

  parsed.forEach((el) => {
    if (!el || typeof el.id !== 'string' || !el.id) throw new Error('Each element needs an id.');
    if (!ELEMENT_TYPES.includes(el.type)) throw new Error('Invalid element type.');
    if (typeof el.text !== 'string' || el.text.length > 300) throw new Error('Element text is invalid or too long.');
    if (el.link !== undefined && (typeof el.link !== 'string' || el.link.length > 300)) {
      throw new Error('Element link is invalid.');
    }
    if (el.align !== undefined && !ALIGNS.includes(el.align)) throw new Error('Invalid element alignment.');
    if (el.color !== undefined && !HEX_COLOR.test(el.color)) throw new Error('Invalid element color.');
    if (el.bgColor !== undefined && !HEX_COLOR.test(el.bgColor)) throw new Error('Invalid element background color.');

    validateLayout(el.desktop, 'desktop');
    validateLayout(el.mobile, 'mobile');
  });
  return true;
};

export const heroSlideIdParamValidator = [param('slideId').isMongoId().withMessage('Invalid slide id.')];

export const createHeroSlideValidator = [
  body('elements').optional().custom(validateElements),
  body('focalDesktopX').optional().isFloat({ min: 0, max: 100 }),
  body('focalDesktopY').optional().isFloat({ min: 0, max: 100 }),
  body('focalMobileX').optional().isFloat({ min: 0, max: 100 }),
  body('focalMobileY').optional().isFloat({ min: 0, max: 100 }),
  body('overlayStrength').optional().isFloat({ min: 0, max: 100 }),
  body('order').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

export const updateHeroSlideValidator = [
  param('slideId').isMongoId().withMessage('Invalid slide id.'),
  ...createHeroSlideValidator,
];

export const reorderHeroSlidesValidator = [
  body('order').isArray({ min: 1 }).withMessage('Order list is required.'),
  body('order.*').isMongoId().withMessage('Invalid slide id in order list.'),
];

export const updateAuthHeroValidator = [
  param('page').isIn(['login', 'signup']).withMessage('Page must be "login" or "signup".'),
  body('focalX').optional().isFloat({ min: 0, max: 100 }),
  body('focalY').optional().isFloat({ min: 0, max: 100 }),
  body('paneWidth').optional().isFloat({ min: 20, max: 80 }),
];

/* =========================================================
   Homepage Builder (sections layout)
   ========================================================= */

const HEIGHT_MODES = ['auto', 'small', 'medium', 'large', 'fullscreen', 'custom'];

export const saveHomepageLayoutValidator = [
  body('sections').isArray({ min: 1 }).withMessage('Sections list is required.'),
  body('sections.*.id').isString().notEmpty(),
  body('sections.*.type').isIn(['hero', 'categories', 'bestSellers', 'newArrivals', 'banner']),
  body('sections.*.isActive').optional().isBoolean(),

  body('sections.*.heroSettings.heightMode').optional().isIn(['default', 'custom']),
  body('sections.*.heroSettings.customHeightDesktop').optional().isInt({ min: 240, max: 900 }),
  body('sections.*.heroSettings.customHeightMobile').optional().isInt({ min: 180, max: 600 }),

  body('sections.*.bannerSettings.layout').optional().isIn(['single', 'split']),
  body('sections.*.bannerSettings.heightMode').optional().isIn(HEIGHT_MODES),
  body('sections.*.bannerSettings.customHeight').optional().isInt({ min: 80, max: 1000 }),
  body('sections.*.bannerSettings.fullBleed').optional().isBoolean(),
  body('sections.*.bannerSettings.spacingTop').optional().isIn(SPACING_OPTIONS),
  body('sections.*.bannerSettings.spacingBottom').optional().isIn(SPACING_OPTIONS),
  body('sections.*.bannerSettings.gap').optional().isIn(SPACING_OPTIONS),
  body('sections.*.bannerSettings.autoplay').optional().isBoolean(),
  body('sections.*.bannerSettings.autoplayDelay').optional().isInt({ min: 2000, max: 15000 }),
  body('sections.*.bannerSettings.blocks').optional().isArray(),
  body('sections.*.bannerSettings.blocks.*.id').if(body('sections.*.bannerSettings.blocks').exists()).isString().notEmpty(),
  body('sections.*.bannerSettings.blocks.*.image').if(body('sections.*.bannerSettings.blocks').exists()).isString().notEmpty(),
  body('sections.*.bannerSettings.blocks.*.focalX').optional().isFloat({ min: 0, max: 100 }),
  body('sections.*.bannerSettings.blocks.*.focalY').optional().isFloat({ min: 0, max: 100 }),
];
/* =========================================================
   Featured products (Best Sellers / New Arrivals picks)
   ========================================================= */

export const productPicksSectionParamValidator = [
  param('section').isIn(['bestSellers', 'newArrivals']).withMessage('Invalid section.'),
];

export const updateProductPicksValidator = [
  ...productPicksSectionParamValidator,
  body('picks').isArray().withMessage('Picks must be an array.'),
  body('picks.*.familyId').isMongoId().withMessage('Invalid product id.'),
  body('picks.*.variantId').isString().notEmpty().withMessage('Invalid variant id.'),
];