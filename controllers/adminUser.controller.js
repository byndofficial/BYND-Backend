import { firebaseAuth } from '../config/firebaseAdmin.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logAdminAction } from '../services/audit.service.js';

// Best-effort session revocation — the account's real access is already
// gated by User.status in verifyFirebaseToken.js, so a failure here just
// means an already-issued token stays valid until its own (short) expiry
// instead of being killed immediately. Never let this block the response.
const revokeSessions = async (firebaseUid) => {
  try {
    await firebaseAuth.revokeRefreshTokens(firebaseUid);
  } catch {
    // Non-fatal — see comment above.
  }
};

const ALLOWED_STATUSES = ['active', 'suspended', 'deleted'];

// GET /api/admin/users?status=&search=&page=&limit=
// Backs UserManagement.jsx — the seed/localStorage store (adminUserStore.js)
// is retired now that this exists.
export const listUsers = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 100 } = req.query;

  const filter = {};
  if (status && ALLOWED_STATUSES.includes(status)) filter.status = status;
  if (search) {
    const term = search.trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
      { phone: { $regex: term, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 100));

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: users,
    meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 },
  });
});

// GET /api/admin/users/:userId
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) throw ApiError.notFound('User not found.');
  res.status(200).json({ success: true, data: user });
});

// PATCH /api/admin/users/:userId/status  { status: 'active' | 'suspended' | 'deleted' }
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const user = await User.findById(req.params.userId);
  if (!user) throw ApiError.notFound('User not found.');
  if (user.status === 'deleted') throw ApiError.badRequest('This account has already been erased.');

  user.status = status;
  await user.save();

  if (status === 'suspended') {
    await revokeSessions(user.firebaseUid);
  }

  await logAdminAction({
    req,
    action: 'user.status_change',
    entityType: 'User',
    entityId: user._id,
    changes: { status },
  });

  res.status(200).json({ success: true, data: user });
});

// PATCH /api/admin/users/:userId/notes  { adminNotes: string }
export const updateUserNotes = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) throw ApiError.notFound('User not found.');

  user.adminNotes = req.body.adminNotes ?? '';
  await user.save();

  res.status(200).json({ success: true, data: user });
});

// PATCH /api/admin/users/:userId/marketing-opt-in  { marketingOptIn: boolean }
export const updateMarketingOptIn = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) throw ApiError.notFound('User not found.');
  if (user.status === 'deleted') throw ApiError.badRequest('This account has already been erased.');

  user.marketingOptIn = Boolean(req.body.marketingOptIn);
  await user.save();

  res.status(200).json({ success: true, data: user });
});

// POST /api/admin/users/:userId/erase
// "Right to erasure" — scrubs directly-identifying fields instead of
// deleting the row, so past orders referencing this user (needed for
// accounting/tax/fraud-prevention) don't dangle a broken reference.
// Mirrors the client-only version that used to live in adminUserStore.js.
export const eraseUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) throw ApiError.notFound('User not found.');
  if (user.status === 'deleted') throw ApiError.badRequest('This account has already been erased.');

  const eraseNote = `Account erased on ${new Date().toISOString().slice(0, 10)}. Order records retained for accounting/tax purposes only.`;

  user.name = 'Deleted User';
  user.email = null;
  user.phone = null;
  user.addresses = [];
  user.marketingOptIn = false;
  user.status = 'deleted';
  user.adminNotes = user.adminNotes ? `${user.adminNotes} — ${eraseNote}` : eraseNote;

  await user.save();
  await revokeSessions(user.firebaseUid);

  await logAdminAction({
    req,
    action: 'user.erase',
    entityType: 'User',
    entityId: user._id,
    changes: { note: eraseNote },
  });

  // TODO: scrub from any mailing-list/analytics tooling once that
  // integration exists.

  res.status(200).json({ success: true, data: user });
});