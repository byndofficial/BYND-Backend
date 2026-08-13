import mongoose from 'mongoose';

// Two kinds share one collection, distinguished by `kind`:
// - 'system'   — fixed transactional emails (welcome, order lifecycle,
//                refund/replace). One live doc per `type`, looked up as
//                findOne({ type, isActive: true }). Type/sender are fixed;
//                only wording is admin-editable. Mirrors
//                systemEmailTemplates.js. Account Deletion is intentionally
//                NOT here — it's hardcoded in the codebase, never sent
//                from this collection.
// - 'campaign' — announcement/promotion/update/newsletter/alert. Multiple
//                saved versions allowed per `type`, exactly one
//                isActive: true per type at a time (enforced below).
//                Mirrors campaignEmailTemplatesSeed.js.
//
// Sent history for campaign sends is embedded as `sentLog` rather than a
// separate collection — each send snapshots subject/title/audience so the
// log stays accurate even if the template is edited afterward.

const sentLogEntrySchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    audience: {
      type: String,
      enum: ['all', 'orders', 'wishlist', 'inactive-30d', 'new-signups'],
      required: true,
    },
    sentAt: { type: Date, default: Date.now },
    recipientEstimate: { type: Number, default: null, min: 0 },
  },
  { _id: true },
);

const emailTemplateSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['system', 'campaign'], required: true },

    // --- system-only fields ---
    type: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      // system: welcome, order_confirmed, order_shipped,
      // order_out_for_delivery, order_delivered, order_cancelled,
      // refunded, replaced. campaign: announcement, promotion, update,
      // newsletter, alert. Not enum-locked here since campaign types share
      // the pool but system types are the fixed set the seed defines.
    },
    statusKey: { type: String, trim: true, default: null }, // e.g. 'shipped', for order-linked system emails
    label: { type: String, trim: true, default: null }, // e.g. 'Order Shipped'
    description: { type: String, trim: true, default: null },
    sender: { type: String, trim: true, default: null }, // fixed sender identity, read-only in UI

    // --- campaign-only fields ---
    internalLabel: { type: String, trim: true, maxlength: 80, default: null },
    isActive: { type: Boolean, default: true }, // exactly one true per (kind: 'campaign', type)

    // --- shared content fields ---
    placeholders: { type: [String], default: [] },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true },
    buttonText: { type: String, trim: true, default: '' },
    buttonLink: { type: String, trim: true, default: '' },
    footerText: { type: String, trim: true, default: '' },

    sentLog: { type: [sentLogEntrySchema], default: [] },
  },
  { timestamps: true },
);

// System: one live doc per type. Campaign: id + type + isActive is what's
// actually managed (no unique index — versioning is intentional there).
emailTemplateSchema.index(
  { type: 1 },
  { unique: true, partialFilterExpression: { kind: 'system' } },
);
emailTemplateSchema.index({ kind: 1, type: 1 });

emailTemplateSchema.statics.extractPlaceholders = (text = '') => {
  const matches = text.match(/\{(\w+)\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
};

// Ensures only one campaign template per `type` is ever flagged active —
// mirrors deactivateSiblings()/setActiveCampaignTemplate() on the frontend.
emailTemplateSchema.statics.setActiveCampaign = async function setActiveCampaign(id) {
  const target = await this.findOne({ _id: id, kind: 'campaign' });
  if (!target) return null;
  await this.updateMany(
    { kind: 'campaign', type: target.type, _id: { $ne: id } },
    { $set: { isActive: false } },
  );
  target.isActive = true;
  await target.save();
  return target;
};

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);

export default EmailTemplate;