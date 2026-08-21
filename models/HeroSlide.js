import mongoose from 'mongoose';

// Homepage hero slider slides, managed from the admin Homepage Manager.
//
// Headline is a list of lines, each a list of styled segments — replaces
// the old fixed titlePre/titleAccent/titlePost trio (single accent word,
// fixed white/yellow/white coloring, one size). Spacing between segments
// is inserted at render time (HeroSlider.jsx), never relies on the admin
// typing trailing/leading spaces into a text field — that was the root
// cause of headlines running together (express-validator's .trim() was
// silently stripping those manually-typed spaces on save).
//
// titlePre/titleAccent/titlePost are kept below, but ONLY as legacy
// read-only fields — old slides saved before this change still carry
// them, and the frontend falls back to them (wrapped into one line) when
// headlineLines is empty. Nothing new writes to them.
//
// focalDesktopX/Y and focalMobileX/Y let the admin pick, per breakpoint,
// which part of the single uploaded image stays in frame (0-100%, used as
// CSS background-position). overlayStrength (0-100) controls how dark the
// text-readability scrim over the image is.

const headlineSegmentSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, maxlength: 40, default: '' },
    color: { type: String, enum: ['white', 'yellow', 'custom'], default: 'white' },
    customColor: { type: String, trim: true, maxlength: 20, default: '' }, // hex, used when color === 'custom'
    size: { type: String, enum: ['sm', 'md', 'lg', 'xl'], default: 'md' },
    bold: { type: Boolean, default: true },
  },
  { _id: false },
);

const headlineLineSchema = new mongoose.Schema(
  {
    segments: { type: [headlineSegmentSchema], default: [] },
  },
  { _id: false },
);

const heroSlideSchema = new mongoose.Schema(
  {
    eyebrow: { type: String, trim: true, maxlength: 40, default: '' },

    headlineLines: { type: [headlineLineSchema], default: [] },

    // ---- legacy, read-only — see comment above ----
    titlePre: { type: String, trim: true, maxlength: 40, default: '' },
    titleAccent: { type: String, trim: true, maxlength: 40, default: '' },
    titlePost: { type: String, trim: true, maxlength: 40, default: '' },
    // ---- end legacy ----

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

    // 0 = no darkening at all, 100 = heaviest.
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