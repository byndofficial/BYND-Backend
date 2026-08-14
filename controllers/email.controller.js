import EmailTemplate from '../models/EmailTemplate.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendCampaignEmail as sendCampaignEmailService } from '../services/email.service.js';
import { resolveAudience } from '../services/notification.service.js';
import SYSTEM_EMAIL_DEFAULTS from '../utils/emailDefaults.js';

/* ---------- System (transactional) templates ---------- */

export const listSystemTemplates = asyncHandler(async (req, res) => {
  const templates = await EmailTemplate.find({ kind: 'system' }).sort({ createdAt: 1 });
  res.json({ success: true, data: templates });
});

export const updateSystemTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOne({ type: req.params.type, kind: 'system' });
  if (!template) throw ApiError.notFound('System email template not found.');

  const { subject, title, message, buttonText, buttonLink, footerText } = req.body;
  template.subject = subject;
  template.title = title;
  template.message = message;
  template.buttonText = buttonText || '';
  template.buttonLink = buttonLink || '';
  template.footerText = footerText || '';
  template.placeholders = EmailTemplate.extractPlaceholders(`${subject} ${title} ${message} ${buttonLink || ''}`);
  await template.save();

  res.json({ success: true, data: template });
});

export const resetSystemTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOne({ type: req.params.type, kind: 'system' });
  if (!template) throw ApiError.notFound('System email template not found.');

  const original = SYSTEM_EMAIL_DEFAULTS.find((d) => d.type === template.type);
  if (!original) throw ApiError.badRequest('No default exists for this template.');

  template.subject = original.subject;
  template.title = original.title;
  template.message = original.message;
  template.buttonText = original.buttonText;
  template.buttonLink = original.buttonLink;
  template.footerText = original.footerText;
  template.placeholders = EmailTemplate.extractPlaceholders(
    `${original.subject} ${original.title} ${original.message} ${original.buttonLink || ''}`,
  );
  await template.save();

  res.json({ success: true, data: template });
});

/* ---------- Campaign templates ---------- */

export const listCampaignTemplates = asyncHandler(async (req, res) => {
  const templates = await EmailTemplate.find({ kind: 'campaign' }).sort({ createdAt: -1 });
  res.json({ success: true, data: templates });
});

export const createCampaignTemplate = asyncHandler(async (req, res) => {
  const { type, internalLabel, subject, title, message, buttonText, buttonLink, footerText, isActive } = req.body;

  // First template of a type becomes active automatically — mirrors the
  // frontend's old isFirstOfType behavior, so findOne({ type, isActive })
  // always has something to return once a type has at least one version.
  const isFirstOfType = !(await EmailTemplate.exists({ kind: 'campaign', type }));

  const template = await EmailTemplate.create({
    kind: 'campaign',
    type,
    internalLabel,
    isActive: isFirstOfType ? true : Boolean(isActive),
    subject,
    title,
    message,
    buttonText: buttonText || '',
    buttonLink: buttonLink || '',
    footerText: footerText || '',
    placeholders: EmailTemplate.extractPlaceholders(`${subject} ${title} ${message} ${buttonLink || ''}`),
  });

  if (template.isActive && !isFirstOfType) {
    await EmailTemplate.setActiveCampaign(template._id);
  }

  res.status(201).json({ success: true, data: template });
});

export const updateCampaignTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOne({ _id: req.params.templateId, kind: 'campaign' });
  if (!template) throw ApiError.notFound('Campaign email template not found.');

  const { internalLabel, subject, title, message, buttonText, buttonLink, footerText } = req.body;
  template.internalLabel = internalLabel;
  template.subject = subject;
  template.title = title;
  template.message = message;
  template.buttonText = buttonText || '';
  template.buttonLink = buttonLink || '';
  template.footerText = footerText || '';
  template.placeholders = EmailTemplate.extractPlaceholders(`${subject} ${title} ${message} ${buttonLink || ''}`);
  await template.save();

  res.json({ success: true, data: template });
});

export const setActiveCampaignTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.setActiveCampaign(req.params.templateId);
  if (!template) throw ApiError.notFound('Campaign email template not found.');
  res.json({ success: true, data: template });
});

export const deleteCampaignTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOne({ _id: req.params.templateId, kind: 'campaign' });
  if (!template) throw ApiError.notFound('Campaign email template not found.');
  await template.deleteOne();
  res.json({ success: true, message: 'Template deleted.' });
});

/* ---------- Send ---------- */

export const sendCampaignEmail = asyncHandler(async (req, res) => {
  const { templateId, audience } = req.body;

  const audienceUsers = await resolveAudience(audience);
  const recipients = audienceUsers
    .filter((user) => user.email)
    .map((user) => {
      const [firstName, ...rest] = (user.name || '').split(' ');
      return {
        to: user.email,
        data: { firstName: firstName || 'there', lastName: rest.join(' '), email: user.email },
      };
    });

  const { sentCount, failedCount } = await sendCampaignEmailService(templateId, recipients);

  res.status(201).json({
    success: true,
    data: { sentCount, failedCount, recipientEstimate: recipients.length },
  });
});
/* ---------- Sent history ---------- */

export const listSentHistory = asyncHandler(async (req, res) => {
  const templates = await EmailTemplate.find({ kind: 'campaign', 'sentLog.0': { $exists: true } }).select(
    'type internalLabel sentLog',
  );

  const history = templates
    .flatMap((template) =>
      template.sentLog.map((entry) => ({
        id: entry._id,
        templateId: template._id,
        type: template.type,
        internalLabel: template.internalLabel,
        subject: entry.subject,
        title: entry.title,
        audience: entry.audience,
        sentAt: entry.sentAt,
        recipientEstimate: entry.recipientEstimate,
      })),
    )
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  res.json({ success: true, data: history });
});