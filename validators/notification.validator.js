import { body, param } from 'express-validator';

// Covers notification.routes.js (storefront — mark read, list own feed)
// and adminNotification.routes.js (manage system/custom templates, send
// broadcasts). Mirrors NotificationTemplate.js / Notification.js and the
// options defined in adminNotificationStore.js.

const CATEGORY_OPTIONS = ['offer', 'wish', 'reminder', 'announcement'];
const AUDIENCE_OPTIONS = ['all', 'orders', 'wishlist', 'inactive-30d', 'new-signups'];
const CHANNEL_OPTIONS = ['inApp', 'email', 'push'];

/* ---------- Storefront: own notification feed ---------- */

export const notificationIdParamValidator = [
  param('notificationId').isMongoId().withMessage('Invalid notification id.'),
];

/* ---------- Admin: system templates (wording only) ---------- */

export const updateSystemTemplateValidator = [
  param('templateId').isMongoId().withMessage('Invalid template id.'),
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 120 }),
  body('message').trim().notEmpty().withMessage('Message is required.').isLength({ max: 500 }),
];

/* ---------- Admin: custom template library ---------- */

export const createCustomTemplateValidator = [
  body('category').isIn(CATEGORY_OPTIONS).withMessage('Invalid category.'),
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 80 }),
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 120 }),
  body('message').trim().notEmpty().withMessage('Message is required.').isLength({ max: 500 }),
];

export const updateCustomTemplateValidator = [
  param('templateId').isMongoId().withMessage('Invalid template id.'),
  ...createCustomTemplateValidator,
];

export const templateIdParamValidator = [param('templateId').isMongoId().withMessage('Invalid template id.')];

/* ---------- Admin: send / broadcast ---------- */

export const sendBroadcastValidator = [
  body('templateId').isMongoId().withMessage('Choose a template to send.'),
  body('audience').isIn(AUDIENCE_OPTIONS).withMessage('Invalid audience.'),
  body('channels').isArray({ min: 1 }).withMessage('Choose at least one channel.'),
  body('channels.*').isIn(CHANNEL_OPTIONS).withMessage('Invalid channel.'),
];