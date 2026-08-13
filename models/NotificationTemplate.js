import mongoose from 'mongoose';

// Two kinds share one collection, distinguished by `kind`:
// - 'system'  — fixed, event-triggered order templates (order.status_changed,
//               order.tracking_added). The trigger itself is never
//               admin-editable, only title/message — matches
//               systemNotificationTemplates.js exactly, one doc per event.
// - 'custom'  — a reusable library the admin fully manages (create/update/
//               delete) for offers, wishes, reminders, announcements.
//
// {placeholder} tokens in title/message are substituted server-side per
// recipient when a template is actually sent — never typed in by hand.

const notificationTemplateSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['system', 'custom'], required: true },

    // --- system-only fields ---
    event: { type: String, trim: true, default: null }, // e.g. 'order.status_changed'
    statusKey: { type: String, trim: true, default: null }, // e.g. 'shipped', null = fallback
    label: { type: String, trim: true, default: null }, // e.g. 'Order Shipped'
    description: { type: String, trim: true, default: null },

    // --- custom-only fields ---
    category: {
      type: String,
      enum: ['offer', 'wish', 'reminder', 'announcement', null],
      default: null,
    },
    name: { type: String, trim: true, maxlength: 80, default: null }, // internal template name

    // --- shared ---
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

notificationTemplateSchema.index({ kind: 1 });
notificationTemplateSchema.index({ event: 1, statusKey: 1 }, { sparse: true });

// Extracts every {token} from a string — used both for admin-side preview
// and server-side substitution before a send.
notificationTemplateSchema.statics.extractPlaceholders = (text = '') => {
  const matches = text.match(/\{(\w+)\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
};

const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);

export default NotificationTemplate;