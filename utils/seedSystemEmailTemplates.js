// Auto-seeds any missing 'system' EmailTemplate docs from
// utils/emailDefaults.js on every server boot. Idempotent — only creates
// a type that doesn't exist yet; never touches or overwrites a template
// an admin has already edited. This is what lets new default templates
// (e.g. account_deletion) show up automatically without a manual seed
// script run.
import EmailTemplate from '../models/EmailTemplate.js';
import SYSTEM_EMAIL_DEFAULTS from './emailDefaults.js';
import logger from './logger.js';

const seedSystemEmailTemplates = async () => {
  let seededCount = 0;

  // eslint-disable-next-line no-restricted-syntax
  for (const def of SYSTEM_EMAIL_DEFAULTS) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await EmailTemplate.exists({ kind: 'system', type: def.type });
    if (exists) continue;

    // eslint-disable-next-line no-await-in-loop
    await EmailTemplate.create({
      kind: 'system',
      type: def.type,
      statusKey: def.statusKey ?? null,
      label: def.label,
      description: def.description,
      sender: def.sender,
      subject: def.subject,
      title: def.title,
      message: def.message,
      buttonText: def.buttonText || '',
      buttonLink: def.buttonLink || '',
      footerText: def.footerText || '',
      placeholders: EmailTemplate.extractPlaceholders(
        `${def.subject} ${def.title} ${def.message} ${def.buttonLink || ''}`,
      ),
    });
    seededCount += 1;
  }

  if (seededCount > 0) {
    logger.info(`Seeded ${seededCount} missing system email template(s).`);
  }
};

export default seedSystemEmailTemplates;