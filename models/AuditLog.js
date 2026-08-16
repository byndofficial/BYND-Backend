import mongoose from 'mongoose';

// One row per meaningful write — admin actions (create/update/delete on
// admins, users, discounts, products, orders) and system/cron actions
// (cleanupUnverifiedCarts, expireDiscounts). Written through
// services/audit.service.js only; nothing should call AuditLog.create()
// directly, so every entry goes through the same shape/error-handling.
//
// `admin` is optional because system jobs run with no signed-in admin —
// `actorType` tells you which kind of row you're looking at. `changes` is
// a free-form snapshot (before/after, or a summary count for bulk jobs)
// rather than a strict diff schema, since the shape varies a lot by action.

const auditLogSchema = new mongoose.Schema(
  {
    actorType: { type: String, enum: ['admin', 'system'], required: true, default: 'admin' },

    // Set only when actorType is 'admin'. Name is snapshotted at write
    // time so the log still reads sensibly if that admin is later deleted.
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null, index: true },
    adminName: { type: String, trim: true, default: null },

    // e.g. 'discount.create', 'user.erase', 'admin.suspend', 'cart.cleanup'
    action: { type: String, required: true, trim: true, index: true },

    // e.g. 'Discount', 'User', 'Admin', 'Order', 'Cart'
    entityType: { type: String, required: true, trim: true, index: true },
    // Mixed on purpose: a single doc id for per-record actions, or null
    // for bulk/system actions that don't target one record.
    entityId: { type: mongoose.Schema.Types.Mixed, default: null },

    changes: { type: mongoose.Schema.Types.Mixed, default: {} },

    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true },
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;