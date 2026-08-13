import { body, param } from 'express-validator';

// Covers email.routes.js — admin Email Manager: system (transactional)
// template edits, campaign template CRUD, and sending. Mirrors
// EmailTemplate.js and adminEmailStore.js's campaignEmailTypes/
// audienceOptions exactly. Account Deletion is intentionally absent —
// it's hardcoded, never editable through this API (see EmailTemplate.js).

const CAMPAIGN_TYPES = ['announcement', 'promotion', 'update', 'newsletter', 'alert'];
const AUDIENCE_OPTIONS = ['all', 'orders', 'wishlist', 'inactive-30d', 'new-signups'];

const contentFields = [
  body('subject').trim().notEmpty().withMessage('Subject is required.').isLength({ max: 150 }),
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 150 }),
  body('message').trim().notEmpty().withMessage('Message is required.'),
  body('buttonText').optional({ nullable: true }).trim().isLength({ max: 40 }),
  body('buttonLink').optional({ nullable: true }).trim(),
  body('footerText').optional({ nullable: true }).trim(),
];

/* ---------- System (transactional) templates ---------- */

export const emailTypeParamValidator = [param('type').trim().notEmpty().withMessage('Type is required.')];

export const updateSystemEmailValidator = [...emailTypeParamValidator, ...contentFields];

/* ---------- Campaign templates ---------- */

export const createCampaignEmailValidator = [
  body('type').isIn(CAMPAIGN_TYPES).withMessage('Invalid campaign type.'),
  body('internalLabel').trim().notEmpty().withMessage('Internal label is required.').isLength({ max: 80 }),
  body('isActive').optional().isBoolean(),
  ...contentFields,
];

export const updateCampaignEmailValidator = [
  param('templateId').isMongoId().withMessage('Invalid template id.'),
  ...createCampaignEmailValidator,
];

export const templateIdParamValidator = [param('templateId').isMongoId().withMessage('Invalid template id.')];

/* ---------- Send ---------- */

export const sendCampaignEmailValidator = [
  body('templateId').isMongoId().withMessage('Choose a template to send.'),
  body('audience').isIn(AUDIENCE_OPTIONS).withMessage('Invalid audience.'),
];