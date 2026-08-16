import asyncHandler from '../utils/asyncHandler.js';
import { listAuditLogs } from '../services/audit.service.js';

// GET /api/admin/audit-logs?actorType=&admin=&action=&entityType=&page=&limit=
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { actorType, admin, action, entityType, page, limit } = req.query;
  const { logs, meta } = await listAuditLogs({ actorType, admin, action, entityType, page, limit });
  res.status(200).json({ success: true, data: logs, meta });
});