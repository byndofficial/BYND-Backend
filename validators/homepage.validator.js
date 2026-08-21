import { body, param } from 'express-validator';

const HEADLINE_COLORS = ['white', 'yellow', 'custom'];
const HEADLINE_SIZES = ['sm', 'md', 'lg', 'xl'];
const MAX_LINES = 4;
const MAX_SEGMENTS_PER_LINE = 6;

// headlineLines arrives as a JSON string (multipart can't carry nested
// arrays) — parse and shape-check it here, once, so the controller can
// trust it. Throwing inside a custom validator fails the field with that
// message.
const validateHeadlineLines = (value) => {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Headline data is malformed.');
  }
  if (!Array.isArray(parsed)) throw new Error('Headline must be a list of lines.');
  if (parsed.length > MAX_LINES) throw new Error(`Headline can have at most ${MAX_LINES} lines.`);

  parsed.forEach((line) => {
    if (!line || !Array.isArray(line.segments)) throw new Error('Each headline line needs a list of words/phrases.');
    if (line.segments.length > MAX_SEGMENTS_PER_LINE) {
      throw new Error(`Each line can have at most ${MAX_SEGMENTS_PER_LINE} words/phrases.`);
    }
    line.segments.forEach((seg) => {
      if (typeof seg.text !== 'string' || seg.text.length > 40) {
        throw new Error('Headline text is invalid or too long.');
      }
      if (seg.color !== undefined && !HEADLINE_COLORS.includes(seg.color)) {
        throw new Error('Invalid headline color.');
      }
      if (seg.size !== undefined && !HEADLINE_SIZES.includes(seg.size)) {
        throw new Error('Invalid headline size.');
      }
    });
  });
  return true;
};

export const heroSlideIdParamValidator = [param('slideId').isMongoId().withMessage('Invalid slide id.')];

export const createHeroSlideValidator = [
  body('eyebrow').optional().trim().isLength({ max: 40 }),
  body('headlineLines').optional().custom(validateHeadlineLines),
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