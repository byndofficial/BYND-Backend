// Minimal in-process scheduler — deliberately not node-cron/agenda. This
// project runs as a single long-lived process (server.js), so a plain
// setInterval loop is enough to actually invoke jobs/*.js on a schedule
// instead of them sitting unused. If this ever needs precise cron syntax,
// multiple instances, or persistence across restarts, swap this file for
// node-cron or a real job queue — nothing outside this file would need to
// change, since server.js only calls startScheduledJobs()/stopScheduledJobs().

import logger from '../utils/logger.js';
import { runCleanupUnverifiedCarts } from './cleanupUnverifiedCarts.js';
import { runExpireDiscounts } from './expireDiscounts.js';

const HOUR_MS = 60 * 60 * 1000;

// Expiry check is cheap and time-sensitive (a coupon should stop working
// close to midnight on its end date) — hourly. Cart cleanup is a hygiene
// task with no urgency — once a day is plenty.
const EXPIRE_DISCOUNTS_INTERVAL_MS = Number(process.env.EXPIRE_DISCOUNTS_INTERVAL_MS) || HOUR_MS;
const CLEANUP_CARTS_INTERVAL_MS = Number(process.env.CLEANUP_CARTS_INTERVAL_MS) || 24 * HOUR_MS;

const runSafely = (name, fn) => async () => {
  try {
    await fn();
  } catch (err) {
    logger.error(`Scheduled job "${name}" failed: ${err.message}`, err.stack);
  }
};

let timers = [];

export const startScheduledJobs = () => {
  const expireJob = runSafely('expireDiscounts', runExpireDiscounts);
  const cleanupJob = runSafely('cleanupUnverifiedCarts', runCleanupUnverifiedCarts);

  // Run once shortly after boot (don't block server startup on it), then
  // on their own intervals.
  setTimeout(expireJob, 10_000);
  setTimeout(cleanupJob, 30_000);

  timers = [
    setInterval(expireJob, EXPIRE_DISCOUNTS_INTERVAL_MS),
    setInterval(cleanupJob, CLEANUP_CARTS_INTERVAL_MS),
  ];

  logger.info(
    `Scheduled jobs started — expireDiscounts every ${EXPIRE_DISCOUNTS_INTERVAL_MS / 60000}min, ` +
      `cleanupUnverifiedCarts every ${CLEANUP_CARTS_INTERVAL_MS / 60000}min.`,
  );
};

export const stopScheduledJobs = () => {
  timers.forEach(clearInterval);
  timers = [];
};