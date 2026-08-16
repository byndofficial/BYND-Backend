import Admin from '../models/Admin.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logAdminAction } from '../services/audit.service.js';

// GET /api/admin/management/admins — any signed-in admin can view the
// roster (AdminManagement.jsx shows it read-only to non-super-admins).
export const listAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find().sort({ role: 1, createdAt: 1 });
  res.status(200).json({ success: true, data: admins });
});

// POST /api/admin/management/admins — super_admin only (enforced by
// requireRole in the route). Created accounts are always role 'admin' —
// there is exactly one super_admin, seeded once via scripts/seedAdmin.js,
// never created through this API.
export const createAdminAccount = asyncHandler(async (req, res) => {
  const { name, mobile, password } = req.body;

  const existing = await Admin.findOne({ mobile });
  if (existing) throw ApiError.conflict('An admin with this mobile number already exists.');

  const passwordHash = await Admin.hashPassword(password);
  const admin = await Admin.create({ name, mobile, passwordHash, role: 'admin' });

  await logAdminAction({
    req,
    action: 'admin.create',
    entityType: 'Admin',
    entityId: admin._id,
    changes: { name: admin.name, mobile: admin.mobile, role: admin.role },
  });

  res.status(201).json({ success: true, data: admin });
});

// PATCH /api/admin/management/admins/:adminId — name only. Role can never
// be changed through this API; the super_admin account is untouchable.
export const updateAdminAccount = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.params.adminId);
  if (!admin) throw ApiError.notFound('Admin not found.');
  if (admin.role === 'super_admin') throw ApiError.forbidden('The super admin account cannot be edited here.');

  if (req.body.name !== undefined) admin.name = req.body.name.trim();
  await admin.save();

  await logAdminAction({
    req,
    action: 'admin.update',
    entityType: 'Admin',
    entityId: admin._id,
    changes: { name: admin.name },
  });

  res.status(200).json({ success: true, data: admin });
});

// PATCH /api/admin/management/admins/:adminId/password
export const resetAdminPassword = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.params.adminId);
  if (!admin) throw ApiError.notFound('Admin not found.');
  if (admin.role === 'super_admin') throw ApiError.forbidden('The super admin account cannot be edited here.');

  admin.passwordHash = await Admin.hashPassword(req.body.password);
  await admin.save();

  await logAdminAction({
    req,
    action: 'admin.reset_password',
    entityType: 'Admin',
    entityId: admin._id,
    changes: {}, // deliberately never logs the password itself
  });

  res.status(200).json({ success: true, data: admin });
});

// PATCH /api/admin/management/admins/:adminId/status — toggle active/suspended.
export const toggleAdminStatus = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.params.adminId);
  if (!admin) throw ApiError.notFound('Admin not found.');
  if (admin.role === 'super_admin') throw ApiError.forbidden('The super admin account cannot be edited here.');
  if (admin._id.equals(req.admin._id)) throw ApiError.badRequest('You cannot suspend your own account.');

  admin.status = admin.status === 'suspended' ? 'active' : 'suspended';
  await admin.save();

  await logAdminAction({
    req,
    action: 'admin.status_change',
    entityType: 'Admin',
    entityId: admin._id,
    changes: { status: admin.status },
  });

  res.status(200).json({ success: true, data: admin });
});

// DELETE /api/admin/management/admins/:adminId
export const deleteAdminAccount = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.params.adminId);
  if (!admin) throw ApiError.notFound('Admin not found.');
  if (admin.role === 'super_admin') throw ApiError.forbidden('The super admin account cannot be removed.');
  if (admin._id.equals(req.admin._id)) throw ApiError.badRequest('You cannot remove your own account.');

  await admin.deleteOne();

  await logAdminAction({
    req,
    action: 'admin.delete',
    entityType: 'Admin',
    entityId: admin._id,
    changes: { name: admin.name, mobile: admin.mobile },
  });

  res.status(200).json({ success: true, message: 'Admin removed.' });
});