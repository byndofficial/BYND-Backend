// scripts/seedAdmin.js
//
// One-time script to create the initial super_admin account. Run with:
//   npm run seed:admin
//
// Safe to run more than once — if an admin with this mobile already
// exists, it just updates the password/role instead of creating a
// duplicate (Admin.mobile has a unique index, so a blind create() would
// otherwise throw).

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';
import logger from '../utils/logger.js';

// Change these, or better, pass them via env vars so the real password
// never sits in source control:
//   SEED_ADMIN_MOBILE=7574919453 SEED_ADMIN_PASSWORD='Xiaomired@0' npm run seed:admin
const MOBILE = process.env.SEED_ADMIN_MOBILE || '7574919453';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Xiaomired@0';
const NAME = process.env.SEED_ADMIN_NAME || 'Super Admin';

const run = async () => {
  await connectDB();

  try {
    const passwordHash = await Admin.hashPassword(PASSWORD);
    const existing = await Admin.findOne({ mobile: MOBILE });

    if (existing) {
      existing.passwordHash = passwordHash;
      existing.role = 'super_admin';
      existing.status = 'active';
      existing.name = NAME;
      await existing.save();
      logger.info(`Updated existing admin (${MOBILE}) to super_admin with the given password.`);
    } else {
      await Admin.create({
        name: NAME,
        mobile: MOBILE,
        passwordHash,
        role: 'super_admin',
        status: 'active',
      });
      logger.info(`Created super_admin account for mobile ${MOBILE}.`);
    }
  } catch (err) {
    logger.error(`Seeding admin failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();