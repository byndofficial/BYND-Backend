import NotificationTemplate from '../models/NotificationTemplate.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendBroadcast } from '../services/notification.service.js';
import SYSTEM_NOTIFICATION_DEFAULTS from '../utils/adminNotificationDefaults.js';

/* ---------- System templates ---------- */

export const listSystemTemplates = asyncHandler(async (req, res) => {
  const templates = await NotificationTemplate.find({ kind: 'system' }).sort({ createdAt: 1 });
  res.json({ success: true, data: templates });
});

export const updateSystemTemplate = asyncHandler(async (req, res) => {
  const template = await NotificationTemplate.findOne({ _id: req.params.templateId, kind: 'system' });
  if (!template) throw ApiError.notFound('System notification template not found.');

  template.title = req.body.title;
  template.message = req.body.message;
  await template.save();

  res.json({ success: true, data: template });
});

/* ---------- Custom templates ---------- */

export const listCustomTemplates = asyncHandler(async (req, res) => {
  const templates = await NotificationTemplate.find({ kind: 'custom' }).sort({ createdAt: -1 });
  res.json({ success: true, data: templates });
});

export const createCustomTemplate = asyncHandler(async (req, res) => {
  const { category, name, title, message } = req.body;
  const template = await NotificationTemplate.create({ kind: 'custom', category, name, title, message });
  res.status(201).json({ success: true, data: template });
});

export const updateCustomTemplate = asyncHandler(async (req, res) => {
  const template = await NotificationTemplate.findOne({ _id: req.params.templateId, kind: 'custom' });
  if (!template) throw ApiError.notFound('Notification template not found.');

  const { category, name, title, message } = req.body;
  template.category = category;
  template.name = name;
  template.title = title;
  template.message = message;
  await template.save();

  res.json({ success: true, data: template });
});

export const deleteCustomTemplate = asyncHandler(async (req, res) => {
  const template = await NotificationTemplate.findOne({ _id: req.params.templateId, kind: 'custom' });
  if (!template) throw ApiError.notFound('Notification template not found.');
  await template.deleteOne();
  res.json({ success: true, message: 'Template deleted.' });
});

/* ---------- Send / broadcast ---------- */

export const sendTemplate = asyncHandler(async (req, res) => {
  const { templateId, audience, channels } = req.body;
  const result = await sendBroadcast({ templateId, audience, channels });
  res.status(201).json({ success: true, data: result });
});

/* ---------- Sent history ---------- */

export const listSentHistory = asyncHandler(async (req, res) => {
  const history = await Notification.aggregate([
    { $match: { broadcastId: { $ne: null } } },
    {
      $group: {
        _id: '$broadcastId',
        title: { $first: '$title' },
        message: { $first: '$message' },
        channels: { $first: '$channels' },
        sourceTemplate: { $first: '$sourceTemplate' },
        sentAt: { $min: '$createdAt' },
        recipientCount: { $sum: 1 },
      },
    },
    { $sort: { sentAt: -1 } },
    {
      $lookup: {
        from: 'notificationtemplates',
        localField: 'sourceTemplate',
        foreignField: '_id',
        as: 'template',
      },
    },
    {
      $project: {
        broadcastId: '$_id',
        _id: 0,
        title: 1,
        message: 1,
        channels: 1,
        sentAt: 1,
        recipientCount: 1,
        templateName: { $arrayElemAt: ['$template.name', 0] },
      },
    },
  ]);

  res.json({ success: true, data: history });
});

export const resetSystemTemplate = asyncHandler(async (req, res) => {
  const template = await NotificationTemplate.findOne({ _id: req.params.templateId, kind: 'system' });
  if (!template) throw ApiError.notFound('System notification template not found.');

  const original = SYSTEM_NOTIFICATION_DEFAULTS.find(
    (d) => d.event === template.event && d.statusKey === template.statusKey,
  );
  if (!original) throw ApiError.badRequest('No default exists for this template.');

  template.title = original.title;
  template.message = original.message;
  await template.save();

  res.json({ success: true, data: template });
});