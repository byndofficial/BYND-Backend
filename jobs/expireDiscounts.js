// Discount.getStatus() already derives 'expired' from endDate on every
// read (see models/Discount.js), so nothing is functionally broken while
// this job doesn't run — an expired coupon is already rejected at
// checkout. What this job adds:
//   - isEnabled flips to false on expiry, so the admin Discounts table's
//     enable/disable toggle reflects reality instead of showing an
//     "enabled" coupon that's actually dead.
//   - a durable audit trail (via logSystemAction) of what expired and
//     when, instead of expiry only ever being inferred implicitly.
//
// Runnable two ways — same pattern as cleanupUnverifiedCarts.js:
//   1. In-process, on a schedule (see jobs/scheduler.js).
//   2. Standalone: node jobs/expireDiscounts.js

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import logger from '../utils/logger.js';
import Discount from '../models/Discount.js';
import { logSystemAction } from '../services/audit.service.js';

const todayDateOnly = () => new Date().toISOString().slice(0, 10);

export const runExpireDiscounts = async () => {
  const today = todayDateOnly();

  const expiring = await Discount.find({ isEnabled: true, endDate: { $lt: today } }).select('code endDate');
  if (expiring.length === 0) {
    logger.info('expireDiscounts: nothing to expire.');
    return 0;
  }

  const ids = expiring.map((d) => d._id);
  await Discount.updateMany({ _id: { $in: ids } }, { $set: { isEnabled: false } });

  logger.info(`expireDiscounts: disabled ${expiring.length} expired coupon(s).`);

  await logSystemAction({
    action: 'discount.auto_expire',
    entityType: 'Discount',
    changes: { count: expiring.length, codes: expiring.map((d) => d.code) },
  });

  return expiring.length;
};

const isRunDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isRunDirectly) {
  (async () => {
    try {
      await connectDB();
      await runExpireDiscounts();
    } catch (err) {
      logger.error(`expireDiscounts failed: ${err.message}`, err.stack);
      process.exitCode = 1;
    } finally {
      await mongoose.connection.close();
    }
  })();
}