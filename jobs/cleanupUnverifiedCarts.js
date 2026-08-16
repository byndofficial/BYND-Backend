// Deletes stale, abandoned server-side carts.
//
// NOTE on naming: Cart.js has no "verified"/"unverified" flag — every
// server-side cart belongs to an authenticated user (guests stay in
// localStorage, see Cart.js's header comment). So "unverified" here is
// read as "never converted to an order, sitting untouched for a long
// time" — an abandoned cart, not a literal verification state. Renaming
// the file would be a bigger diff than this fix needs; this comment is
// the source of truth for what the job actually does.
//
// Runnable two ways:
//   1. In-process, on a schedule — see jobs/scheduler.js, started from
//      server.js.
//   2. Standalone, e.g. from a host-level cron (Render Cron Jobs, etc):
//        node jobs/cleanupUnverifiedCarts.js
//      In that mode this file connects to Mongo itself and exits when done.

import mongoose from 'mongoose';
import env from '../config/env.js';
import connectDB from '../config/db.js';
import logger from '../utils/logger.js';
import Cart from '../models/Cart.js';
import { logSystemAction } from '../services/audit.service.js';

// How long a cart can sit untouched before it's considered abandoned.
// Overridable via env so this doesn't need a code change to tune.
const STALE_CART_DAYS = Number(process.env.CART_CLEANUP_STALE_DAYS) || 30;

export const runCleanupUnverifiedCarts = async () => {
  const cutoff = new Date(Date.now() - STALE_CART_DAYS * 24 * 60 * 60 * 1000);

  // Two independent conditions worth clearing out:
  // - carts with items that haven't been touched in STALE_CART_DAYS
  //   (genuinely abandoned — never checked out)
  // - carts with zero items, regardless of age (dead weight; created by
  //   findOrCreateCart in cart.controller.js and then never used)
  const result = await Cart.deleteMany({
    $or: [{ updatedAt: { $lt: cutoff } }, { items: { $size: 0 } }],
  });

  logger.info(`cleanupUnverifiedCarts: removed ${result.deletedCount} stale/empty cart(s).`);

  await logSystemAction({
    action: 'cart.cleanup',
    entityType: 'Cart',
    changes: { deletedCount: result.deletedCount, staleCartDays: STALE_CART_DAYS },
  });

  return result.deletedCount;
};

const isRunDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isRunDirectly) {
  (async () => {
    try {
      await connectDB();
      await runCleanupUnverifiedCarts();
    } catch (err) {
      logger.error(`cleanupUnverifiedCarts failed: ${err.message}`, err.stack);
      process.exitCode = 1;
    } finally {
      await mongoose.connection.close();
    }
  })();
}