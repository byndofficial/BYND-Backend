import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

// Records one admin-initiated action. Never throws — an audit-log write
// failing must not roll back or block the real action it's describing;
// worst case is a missing log entry, logged loudly here instead.
export const logAdminAction = async ({ req, action, entityType, entityId = null, changes = {} }) => {
  try {
    await AuditLog.create({
      actorType: 'admin',
      admin: req?.admin?._id || null,
      adminName: req?.admin?.name || null,
      action,
      entityType,
      entityId,
      changes,
      ip: req?.ip || null,
      userAgent: req?.headers?.['user-agent'] || null,
    });
  } catch (err) {
    logger.error(`Audit log failed for admin action "${action}": ${err.message}`);
  }
};

// Records one system/cron-initiated action (no admin in the loop) — used
// by jobs/cleanupUnverifiedCarts.js and jobs/expireDiscounts.js.
export const logSystemAction = async ({ action, entityType, entityId = null, changes = {} }) => {
  try {
    await AuditLog.create({
      actorType: 'system',
      action,
      entityType,
      entityId,
      changes,
    });
  } catch (err) {
    logger.error(`Audit log failed for system action "${action}": ${err.message}`);
  }
};

// GET /admin/audit-logs — filtered, paginated read used by
// adminAuditLog.controller.js.
export const listAuditLogs = async ({ actorType, admin, action, entityType, page = 1, limit = 50 } = {}) => {
  const filter = {};
  if (actorType) filter.actorType = actorType;
  if (admin) filter.admin = admin;
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('admin', 'name mobile role'),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 } };
};