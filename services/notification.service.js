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
      return User.find({ ...baseFilter, _id: { $in: userIds } }).select('_id');
    }
    case 'wishlist': {
      const userIds = await Wishlist.distinct('user', { 'items.0': { $exists: true } });
      return User.find({ ...baseFilter, _id: { $in: userIds } }).select('_id');
    }
    case 'inactive-30d': {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return User.find({ ...baseFilter, lastLoginAt: { $lt: cutoff } }).select('_id');
    }
    case 'new-signups': {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return User.find({ ...baseFilter, createdAt: { $gte: cutoff } }).select('_id');
    }
    case 'all':
    default:
      return User.find(baseFilter).select('_id');
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
// resolves the matching template by event/statusKey (falls back to
// order-fallback if no exact statusKey match exists) and substitutes
// {orderNumber}/{status}.
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
    link: data.orderNumber ? `/orders/${data.orderNumber}` : null,
    channels: ['inApp'],
    sourceTemplate: template._id,
  });
};