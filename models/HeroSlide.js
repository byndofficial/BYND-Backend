import mongoose from 'mongoose';

// A slide is a background image + a free-form list of "elements"
// (heading / subheading / paragraph / button). Each element carries a
// fully independent desktop layout and mobile layout — position, box
// width and font size are never shared between breakpoints, matching the
// admin's two separate drag canvases (HeroSlideFormModal.jsx). Text,
// color, boldness, alignment and (for buttons) link/background color are
// shared across both.

const HERO_ELEMENT_TYPES = ['heading', 'subheading', 'paragraph', 'button'];

// One breakpoint's geometry for an element.
const heroElementLayoutSchema = new mongoose.Schema(
  {
    // Top-left corner, as a percentage of the slide's own width/height —
    // resolution-independent and drag-and-drop friendly.
    x: { type: Number, default: 10, min: 0, max: 100 },
    y: { type: Number, default: 40, min: 0, max: 100 },
    // Text box width as a percentage of slide width (ignored for
    // buttons, which size to their own text).
    width: { type: Number, default: 40, min: 5, max: 100 },
    // Real pixels at this breakpoint's reference viewport width.
    fontSize: { type: Number, default: 32, min: 8, max: 120 },
  },
  { _id: false },
);

const heroElementSchema = new mongoose.Schema(
  {
    // Client-generated id (e.g. `el_<timestamp>_<rand>`) — stable across
    // edits so drag updates and deletes target the right element.
    id: { type: String, required: true },
    type: { type: String, enum: HERO_ELEMENT_TYPES, required: true },
    text: { type: String, trim: true, maxlength: 300, default: '' },

    color: { type: String, default: '#ffffff' },
    bold: { type: Boolean, default: true },
    align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },

    // Button-only fields — harmless/unused on other types.
    link: { type: String, trim: true, default: '' },
    bgColor: { type: String, default: '#ffffff' },

    desktop: { type: heroElementLayoutSchema, default: () => ({}) },
    mobile: { type: heroElementLayoutSchema, default: () => ({}) },
  },
  { _id: false },
);

const heroSlideSchema = new mongoose.Schema(
  {
    image: { type: String, default: null },

    // Desktop + mobile focal points for the background image crop.
    focalDesktopX: { type: Number, default: 50, min: 0, max: 100 },
    focalDesktopY: { type: Number, default: 50, min: 0, max: 100 },
    focalMobileX: { type: Number, default: 50, min: 0, max: 100 },
    focalMobileY: { type: Number, default: 50, min: 0, max: 100 },

    overlayStrength: { type: Number, default: 45, min: 0, max: 100 },

    elements: { type: [heroElementSchema], default: [] },

    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

heroSlideSchema.index({ order: 1 });

const HeroSlide = mongoose.model('HeroSlide', heroSlideSchema);

export default HeroSlide;