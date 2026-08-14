import crypto from 'crypto';
import { firebaseAuth } from '../config/firebaseAdmin.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSystemEmail } from '../services/email.service.js';
import User from '../models/User.js';

// Backs Settings.jsx's "Delete My Account" modal. Two steps, matching the
// UI exactly: request a code, then confirm with it + type DELETE.

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');
const generateOtp = () => crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');

// POST /api/users/me/deletion-otp
// Sits behind verifyFirebaseToken + sensitiveLimiter (see user.routes.js)
// so the OTP is always generated for *this* session's account — the
// client never gets to choose which account it's deleting.
export const requestAccountDeletionOtp = asyncHandler(async (req, res) => {
  if (!req.user.email) {
    throw ApiError.badRequest('This account has no email on file — contact support to delete it.');
  }

  const otp = generateOtp();
  req.user.deletionOtpHash = hashOtp(otp);
  req.user.deletionOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  req.user.deletionOtpAttempts = 0;
  await req.user.save();

  // TODO: add an 'account-deletion-otp' system email template (same place
  // 'welcome' lives, per auth.controller.js's signup) — { firstName, otp }.
  await sendSystemEmail('account-deletion-otp', {
    to: req.user.email,
    data: { firstName: req.user.name.split(' ')[0] || 'there', otp },
  });

  res.status(200).json({ success: true, message: 'Verification code sent.' });
});

// DELETE /api/users/me   { otp }
// The real security gate — everything Settings.jsx checks client-side
// (OTP length, DELETE confirm text) is UX only, never trusted here.
// Scrubs PII the same way the admin "erase" action does (keeps the row so
// past order line items don't dangle a broken reference), then revokes
// every Firebase session and deletes the Firebase auth user itself so the
// credential can never sign back into this account again.
export const deleteAccount = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  const user = await User.findById(req.user._id).select(
    '+deletionOtpHash +deletionOtpExpiresAt +deletionOtpAttempts',
  );
  if (!user) throw ApiError.notFound('Account not found.');

  if (!user.deletionOtpHash || !user.deletionOtpExpiresAt || user.deletionOtpExpiresAt < new Date()) {
    throw ApiError.badRequest('This code has expired — request a new one.');
  }
  if (user.deletionOtpAttempts >= MAX_OTP_ATTEMPTS) {
    throw ApiError.badRequest('Too many incorrect attempts — request a new code.');
  }
  if (hashOtp(otp) !== user.deletionOtpHash) {
    user.deletionOtpAttempts += 1;
    await user.save();
    throw ApiError.badRequest('Incorrect code.');
  }

  const eraseNote = `Account deleted by customer on ${new Date().toISOString().slice(0, 10)}. Order records retained for accounting/tax purposes only.`;

  user.name = 'Deleted User';
  user.email = null;
  user.phone = null;
  user.addresses = [];
  user.marketingOptIn = false;
  user.status = 'deleted';
  user.adminNotes = user.adminNotes ? `${user.adminNotes} — ${eraseNote}` : eraseNote;
  user.deletionOtpHash = null;
  user.deletionOtpExpiresAt = null;
  user.deletionOtpAttempts = 0;
  await user.save();

  try {
    await firebaseAuth.revokeRefreshTokens(user.firebaseUid);
    await firebaseAuth.deleteUser(user.firebaseUid);
  } catch {
    // Non-fatal — the Mongo side (the data that actually matters for
    // privacy) is already scrubbed even if the Firebase cleanup call fails.
  }

  res.status(200).json({ success: true, message: 'Account deleted.' });
});