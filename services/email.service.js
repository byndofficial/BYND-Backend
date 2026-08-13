import resend from '../config/resend.js';
import env from '../config/env.js';
import EmailTemplate from '../models/EmailTemplate.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';

// Substitutes {token} placeholders with real values — server-side
// counterpart to renderPreview() in adminEmailStore.js, except this uses
// the actual recipient's data instead of placeholderSampleValues.
const renderText = (text = '', data = {}) =>
  (text || '').replace(/\{(\w+)\}/g, (match, token) =>
    Object.prototype.hasOwnProperty.call(data, token) ? data[token] : match,
  );

const wrapAsHtml = ({ title, message, buttonText, buttonLink, footerText }) => {
  const button =
    buttonText && buttonLink
      ? `<p><a href="${buttonLink}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;">${buttonText}</a></p>`
      : '';
  const footer = footerText ? `<p style="color:#888;font-size:12px;">${footerText}</p>` : '';
  const body = message.replace(/\n/g, '<br/>');
  return `<div><h2>${title}</h2><p>${body}</p>${button}${footer}<hr/><p style="color:#888;font-size:12px;">© ${new Date().getFullYear()} BYND Official. All rights reserved.</p></div>`;
};

// Sends a fixed transactional email (welcome, order lifecycle, refund/
// replace) for the given `type`, using whatever the admin currently has
// saved for it. `to` is the recipient address; `data` fills placeholders
// (orderId, productDetails, trackingUrl, etc). Never throws to the caller
// on send failure — a failed transactional email shouldn't roll back the
// order/user action that triggered it; it just gets logged.
export const sendSystemEmail = async (type, { to, data = {} }) => {
  const template = await EmailTemplate.findOne({ kind: 'system', type, isActive: { $ne: false } });
  if (!template) {
    logger.warn(`No system email template found for type "${type}" — skipping send.`);
    return null;
  }

  const subject = renderText(template.subject, data);
  const html = wrapAsHtml({
    title: renderText(template.title, data),
    message: renderText(template.message, data),
    buttonText: template.buttonText,
    buttonLink: renderText(template.buttonLink, data),
    footerText: template.footerText,
  });

  try {
    await resend.emails.send({
      from: template.sender || env.resend.fromSupport,
      to,
      subject,
      html,
    });
  } catch (err) {
    logger.error(`Failed to send "${type}" email to ${to}: ${err.message}`);
  }
  return null;
};

// Sends a campaign template to a resolved list of recipients (already
// filtered by audience — see notification.service.js for the equivalent
// audience-resolution pattern). Logs the send in the template's embedded
// sentLog. `recipients` is an array of { to, data } so each recipient can
// get personalized placeholder values (firstName, etc).
export const sendCampaignEmail = async (templateId, recipients = []) => {
  const template = await EmailTemplate.findOne({ _id: templateId, kind: 'campaign' });
  if (!template) throw ApiError.notFound('Campaign email template not found.');

  const results = await Promise.allSettled(
    recipients.map(({ to, data = {} }) =>
      resend.emails.send({
        from: env.resend.fromSupport,
        to,
        subject: renderText(template.subject, data),
        html: wrapAsHtml({
          title: renderText(template.title, data),
          message: renderText(template.message, data),
          buttonText: template.buttonText,
          buttonLink: renderText(template.buttonLink, data),
          footerText: template.footerText,
        }),
      }),
    ),
  );

  const sentCount = results.filter((r) => r.status === 'fulfilled').length;
  const failedCount = results.length - sentCount;
  if (failedCount > 0) {
    logger.warn(`Campaign email "${template.internalLabel}": ${failedCount} of ${results.length} sends failed.`);
  }

  template.sentLog.push({
    subject: template.subject,
    title: template.title,
    audience: recipients.audience || 'all',
    sentAt: new Date(),
    recipientEstimate: sentCount,
  });
  await template.save();

  return { sentCount, failedCount };
};

export { renderText };