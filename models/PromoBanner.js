import mongoose from 'mongoose';

// A single full-width promotional image block the admin can drop anywhere
// in the homepage order (see HomepageLayout.js) — the "10% Cashback" /
// "Buy 3 Get 10% Off" style strips. `mobileImage` is optional; the
// storefront falls back to `image` when it's not set.
const promoBannerSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    mobileImage: { type: String, default: null },
    link: { type: String, trim: true, default: '' }, // internal path or full URL; empty = not clickable
    altText: { type: String, trim: true, maxlength: 120, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const PromoBanner = mongoose.model('PromoBanner', promoBannerSchema);

export default PromoBanner;