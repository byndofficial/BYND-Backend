import { body, param } from 'express-validator';

// Covers homepage.routes.js — admin Homepage Manager: hero slider CRUD/
// reorder, and the Login/Signup auth-hero images. Mirrors HeroSlide.js and
// AuthHeroContent.js. Image files themselves go through middleware/
// upload.js (multipart) — these validators cover the text/layout fields
// submitted alongside.

export const heroSlideIdParamValidator = [param('slideId').isMongoId().withMessage('Invalid slide id.')];

export const createHeroSlideValidator = [
  body('eyebrow').optional().trim().isLength({ max: 40 }),
  body('titlePre').optional().trim().isLength({ max: 40 }),
  body('titleAccent').optional().trim().isLength({ max: 40 }),
  body('titlePost').optional().trim().isLength({ max: 40 }),
  body('subtext').optional().trim().isLength({ max: 300 }),
  body('badgeLine1').optional().trim().isLength({ max: 20 }),
  body('badgeLine2').optional().trim().isLength({ max: 20 }),
  body('primaryCtaLabel').optional().trim().isLength({ max: 40 }),
  body('primaryCtaLink').optional().trim(),
  body('secondaryCtaLabel').optional().trim().isLength({ max: 40 }),
  body('secondaryCtaLink').optional().trim(),
  body('contentVAlign').optional().isIn(['top', 'center', 'bottom']),
  body('contentHAlign').optional().isIn(['left', 'center', 'right']),
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
];