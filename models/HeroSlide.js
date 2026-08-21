import mongoose from 'mongoose';

// Homepage hero slider slides, managed from the admin Homepage Manager.
// Mirrors homepageHeroSeed.js exactly. `order` (not array position) drives
// display sequence so reordering never requires reshuffling every doc's
// other fields — same reasoning as Category's `order` field.
//
// focalDesktopX/Y and focalMobileX/Y let the admin pick, per breakpoint,
// which part of the single uploaded image stays in frame (0-100%, used as
// CSS background-position). overlayStrength (0-100) controls how dark the
// text-readability scrim over the image is, since a single fixed gradient
// either washes out bright photos or leaves dark ones unreadable.

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

    // Where the image is "anchored" at each breakpoint — same image, two
    // crops. Defaults to dead-center, matching plain `background-position: center`.
    focalDesktopX: { type: Number, default: 50, min: 0, max: 100 },
    focalDesktopY: { type: Number, default: 50, min: 0, max: 100 },
    focalMobileX: { type: Number, default: 50, min: 0, max: 100 },
    focalMobileY: { type: Number, default: 50, min: 0, max: 100 },

    // 0 = no darkening at all, 100 = heaviest. Default lands in a
    // moderate spot that reads fine over most photos.
    overlayStrength: { type: Number, default: 55, min: 0, max: 100 },

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