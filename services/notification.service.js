import crypto from 'crypto';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Wishlist from '../models/Wishlist.js';
import Notification from '../models/Notification.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const renderText = (text = '', data = {}) =>
  (text || '').replace(/\{(\w+)\}/g, (match, token) =>
    Object.prototype.hasOwnProperty.call(data, token) ? data[token] : match,
  );

// Resolves an audience id (see audienceOptions in adminNotificationStore.js)
// into a list of active user _ids. Mirrors the same five audience
// definitions used for email campaigns, so admin UI stays consistent
// across both notification and email sends.
export const resolveAudience = async (audienceId) => {
  const baseFilter = { status: 'active' };

  switch (audienceId) {
    case 'orders': {
      const userIds = await Order.distinct('user');
      return User.find({ ...baseFilter, _id: { $in: userIds } }).select('name email');
    }
    case 'wishlist': {
      const userIds = await Wishlist.distinct('user', { 'items.0': { $exists: true } });
      return User.find({ ...baseFilter, _id: { $in: userIds } }).select('name email');
    }
    case 'inactive-30d': {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return User.find({ ...baseFilter, lastLoginAt: { $lt: cutoff } }).select('name email');
    }
    case 'new-signups': {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return User.find({ ...baseFilter, createdAt: { $gte: cutoff } }).select('name email');
    }
    case 'all':
    default:
      return User.find(baseFilter).select('name email');
  }
};

// Fans a custom template out to every user in the resolved audience,
// creating one Notification doc per recipient tagged with a shared
// broadcastId — this IS the "sent history" (see Notification.js's
// comment on this pattern). Returns { broadcastId, recipientCount }.
export const sendBroadcast = async ({ templateId, audience, channels = ['inApp'] }) => {
  const template = await NotificationTemplate.findOne({ _id: templateId, kind: 'custom' });
  if (!template) throw ApiError.notFound('Notification template not found.');

  const recipients = await resolveAudience(audience);
  if (recipients.length === 0) {
    logger.warn(`Broadcast for template "${template.name}" resolved to 0 recipients (audience: ${audience}).`);
  }

  const broadcastId = crypto.randomUUID();
  const docs = recipients.map((user) => ({
    user: user._id,
    type: template.category === 'offer' ? 'promotion' : 'system',
    title: template.title,
    message: template.message,
    channels,
    broadcastId,
    sourceTemplate: template._id,
  }));

  if (docs.length > 0) await Notification.insertMany(docs);
  return { broadcastId, recipientCount: docs.length };
};

// Fires a system (order-lifecycle) notification to a single user —
// resolves the matching template by event/statusKey (falls back to the
// statusKey: null default if no exact match exists) and substitutes
// {orderNumber}/{status}/etc. `data.orderId` (the Mongo _id) is what the
// link points at — the customer-facing GET /orders/:orderId route only
// looks orders up by _id, never by the human-facing orderCode, so linking
// to orderNumber here would 404 for the customer.
export const sendSystemNotification = async ({ userId, event, statusKey = null, data = {} }) => {
  const template =
    (await NotificationTemplate.findOne({ kind: 'system', event, statusKey })) ||
    (await NotificationTemplate.findOne({ kind: 'system', event, statusKey: null }));

  if (!template) {
    logger.warn(`No system notification template found for event "${event}" (statusKey: ${statusKey}).`);
    return null;
  }

  return Notification.create({
    user: userId,
    type: 'order',
    title: renderText(template.title, data),
    message: renderText(template.message, data),
    link: data.orderId ? `/orders/${data.orderId}` : null,
    channels: ['inApp'],
    sourceTemplate: template._id,
  });
};