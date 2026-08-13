import mongoose from 'mongoose';

// Per-user, in-app notification feed entry — mirrors notifications.js /
// notificationTypeConfig.js on the storefront exactly.
//
// Doubles as the admin "sent history" record: every recipient of an admin
// broadcast (see NotificationTemplate) gets one Notification doc, all
// sharing the same `broadcastId` — so admin history is just
// `Notification.find({ broadcastId }).countDocuments()` / distinct, and a
// user's feed is just `Notification.find({ user })`. System-triggered
// messages (order events) go through the same collection with
// broadcastId: null and sourceTemplate pointing at the system template.

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: {
      type: String,
      enum: ['order', 'promotion', 'wishlist', 'account', 'system'],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    link: { type: String, default: null },

    read: { type: Boolean, default: false },

    // Delivery channels this specific notification went out on.
    channels: { type: [String], enum: ['inApp', 'email', 'push'], default: ['inApp'] },

    // Set only for admin-initiated broadcasts (custom template sends) — a
    // shared id across every recipient of the same send, so admin history
    // can group/count without a separate collection.
    broadcastId: { type: String, default: null, index: true },
    sourceTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationTemplate', default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;