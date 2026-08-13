import { firebaseAuth } from '../config/firebaseAdmin.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSystemEmail } from '../services/email.service.js';

// POST /api/auth/signup
// The ONE route that legitimately runs without verifyFirebaseToken behind
// it — a valid Firebase token but no User doc yet is exactly what "signing
// up" means. Verifies the token itself, then creates the account (or just
// returns the existing one, so a retried/duplicate call is harmless).
export const signup = asyncHandler(async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Missing or invalid Authorization header.');

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired session.');
  }

  const existing = await User.findOne({ firebaseUid: decoded.uid });
  if (existing) {
    res.status(200).json({ success: true, data: existing });
    return;
  }

  const authProvider = decoded.firebase?.sign_in_provider === 'google.com' ? 'google' : 'mobile-otp';

  const user = await User.create({
    firebaseUid: decoded.uid,
    name: req.body.name?.trim() || decoded.name || '',
    email: (req.body.email || decoded.email || '').trim().toLowerCase() || null,
    phone: decoded.phone_number || null,
    authProvider,
    marketingOptIn: Boolean(req.body.marketingOptIn),
    lastLoginAt: new Date(),
  });

  await sendSystemEmail('welcome', {
    to: user.email,
    data: { firstName: user.name.split(' ')[0] || 'there', lastName: user.name.split(' ').slice(1).join(' ') },
  });

  res.status(201).json({ success: true, data: user });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  req.user.lastLoginAt = new Date();
  await req.user.save();
  res.status(200).json({ success: true, data: req.user });
});

// PATCH /api/auth/me
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, marketingOptIn } = req.body;
  if (name !== undefined) req.user.name = name.trim();
  if (email !== undefined) req.user.email = email ? email.trim().toLowerCase() : null;
  if (marketingOptIn !== undefined) req.user.marketingOptIn = Boolean(marketingOptIn);
  await req.user.save();
  res.status(200).json({ success: true, data: req.user });
});

/* ---------- Addresses (embedded subdocuments on User) ---------- */

// POST /api/auth/addresses
export const addAddress = asyncHandler(async (req, res) => {
  const isFirst = req.user.addresses.length === 0;
  const address = { ...req.body, isDefault: isFirst || Boolean(req.body.isDefault) };

  if (address.isDefault) {
    req.user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }
  req.user.addresses.push(address);
  await req.user.save();
  res.status(201).json({ success: true, data: req.user.addresses });
});

// PATCH /api/auth/addresses/:addressId
export const updateAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found.');

  if (req.body.isDefault) {
    req.user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }
  Object.assign(address, req.body);
  await req.user.save();
  res.status(200).json({ success: true, data: req.user.addresses });
});

// DELETE /api/auth/addresses/:addressId
export const deleteAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found.');

  const wasDefault = address.isDefault;
  address.deleteOne();

  if (wasDefault && req.user.addresses.length > 0) {
    req.user.addresses[0].isDefault = true;
  }
  await req.user.save();
  res.status(200).json({ success: true, data: req.user.addresses });
});

// PATCH /api/auth/addresses/:addressId/default
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const target = req.user.addresses.id(req.params.addressId);
  if (!target) throw ApiError.notFound('Address not found.');

  req.user.addresses.forEach((a) => {
    a.isDefault = a._id.equals(target._id);
  });
  await req.user.save();
  res.status(200).json({ success: true, data: req.user.addresses });
});