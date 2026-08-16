// Auto-seeds any missing 'system' NotificationTemplate docs from
// utils/adminNotificationDefaults.js on every server boot. Idempotent —
// only creates an (event, statusKey) pair that doesn't exist yet; never
// touches or overwrites a template an admin has already edited.
import NotificationTemplate from '../models/NotificationTemplate.js';
import SYSTEM_NOTIFICATION_DEFAULTS from './adminNotificationDefaults.js';
import logger from './logger.js';

const seedSystemNotificationTemplates = async () => {
  let seededCount = 0;

  // eslint-disable-next-line no-restricted-syntax
  for (const def of SYSTEM_NOTIFICATION_DEFAULTS) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await NotificationTemplate.exists({
      kind: 'system',
      event: def.event,
      statusKey: def.statusKey ?? null,
    });
    if (exists) continue;

    // eslint-disable-next-line no-await-in-loop
    await NotificationTemplate.create({
      kind: 'system',
      event: def.event,
      statusKey: def.statusKey ?? null,
      label: def.label,
      description: def.description,
      title: def.title,
      message: def.message,
    });
    seededCount += 1;
  }

  if (seededCount > 0) {
    logger.info(`Seeded ${seededCount} missing system notification template(s).`);
  }
};

export default seedSystemNotificationTemplates;