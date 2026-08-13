import mongoose from 'mongoose';

// Homepage hero slider slides, managed from the admin Homepage Manager.
// Mirrors homepageHeroSeed.js exactly. `order` (not array position) drives
// display sequence so reordering never requires reshuffling every doc's
// other fields — same reasoning as Category's `order` field.

const heroSlideSchema = new mongoose.Schema(
  {
    eyebrow: { type: String, trim: true, maxlength: 40, default: '' },
    titlePre: { type: String, trim: true, maxlength: 40, default: '' },
    titleAccent: { type: String, trim: true, maxlength: 40, default: '' },
    titlePost: { type: String, trim: true, maxlength: 40, default: '' },
    subtext: { type: String, trim: true, maxlength: 300, default: '' },

    // Cloudinary URL — null falls back to the icon-based placeholder the
    // frontend already renders when no image has been uploaded yet.
    image: { type: String, default: null },

    badgeLine1: { type: String, trim: true, maxlength: 20, default: '' },
    badgeLine2: { type: String, trim: true, maxlength: 20, default: '' },

    primaryCtaLabel: { type: String, trim: true, maxlength: 40, default: '' },
    primaryCtaLink: { type: String, trim: true, default: '' },
    secondaryCtaLabel: { type: String, trim: true, maxlength: 40, default: '' },
    secondaryCtaLink: { type: String, trim: true, default: '' },

    contentVAlign: { type: String, enum: ['top', 'center', 'bottom'], default: 'bottom' },
    contentHAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },

    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

heroSlideSchema.index({ order: 1 });

const HeroSlide = mongoose.model('HeroSlide', heroSlideSchema);

export default HeroSlide;