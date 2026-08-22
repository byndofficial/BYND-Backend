import mongoose from 'mongoose';

export const FIXED_SECTION_TYPES = ['hero', 'categories', 'bestSellers', 'newArrivals'];
export const SECTION_TYPES = [...FIXED_SECTION_TYPES, 'banner', 'ticker'];
export const SPACING_OPTIONS = ['none', 'sm', 'md', 'lg'];
const HEIGHT_MODES = ['auto', 'small', 'medium', 'large', 'fullscreen', 'custom'];

const bannerSlideContentSchema = new mongoose.Schema(
  {
    heading: { type: String, trim: true, maxlength: 80, default: '' },
    subheading: { type: String, trim: true, maxlength: 140, default: '' },
    buttonText: { type: String, trim: true, maxlength: 30, default: '' },
    buttonLink: { type: String, trim: true, maxlength: 300, default: '' },
    textColor: { type: String, default: '#ffffff' },
    align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  },
  { _id: false },
);

// One image within a banner — called a "slide" because with 2+ of these
// and layout==='single', the banner behaves as a rotating carousel, the
// same way HeroSlide.js's slides do. Single image only (no mobile crop) —
// admin uses one upload per slide.
const bannerSlideSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    image: { type: String, required: true },
    focalX: { type: Number, min: 0, max: 100, default: 50 },
    focalY: { type: Number, min: 0, max: 100, default: 50 },
    link: { type: String, trim: true, default: '' },
    altText: { type: String, trim: true, maxlength: 120, default: '' },
    overlayStrength: { type: Number, min: 0, max: 100, default: 0 },
    content: { type: bannerSlideContentSchema, default: () => ({}) },
  },
  { _id: false },
);

// No spacingTop/spacingBottom — banners use the same fixed spacing as
// every other homepage section (Home.css's .home-section-equivalent
// padding baked into BannerSection.css), only the gap between split
// columns stays adjustable.
const bannerSettingsSchema = new mongoose.Schema(
  {
    layout: { type: String, enum: ['single', 'split'], default: 'single' },
    heightMode: { type: String, enum: HEIGHT_MODES, default: 'medium' },
    customHeight: { type: Number, min: 80, max: 1000, default: 320 },
    fullBleed: { type: Boolean, default: true },
    gap: { type: String, enum: SPACING_OPTIONS, default: 'md' },
    autoplay: { type: Boolean, default: true },
    autoplayDelay: { type: Number, min: 2000, max: 15000, default: 5000 },
    blocks: { type: [bannerSlideSchema], default: [] },
  },
  { _id: false },
);

const heroSettingsSchema = new mongoose.Schema(
  {
    heightMode: { type: String, enum: ['default', 'custom'], default: 'default' },
    customHeightDesktop: { type: Number, min: 240, max: 900, default: 480 },
    customHeightMobile: { type: Number, min: 180, max: 600, default: 320 },
  },
  { _id: false },
);

const tickerMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, trim: true, maxlength: 200, required: true },
    link: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const tickerSettingsSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['scroll', 'static'], default: 'scroll' },
    speed: { type: Number, min: 10, max: 120, default: 40 }, // seconds per full loop, scroll mode only
    direction: { type: String, enum: ['left', 'right'], default: 'left' },
    backgroundColor: { type: String, default: '#000000' },
    textColor: { type: String, default: '#ffffff' },
    fontSize: { type: Number, min: 10, max: 24, default: 14 },
    separator: { type: String, trim: true, maxlength: 10, default: '•' },
    messages: { type: [tickerMessageSchema], default: [] },
  },
  { _id: false },
);

const sectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: SECTION_TYPES, required: true },
    isActive: { type: Boolean, default: true },
    heroSettings: { type: heroSettingsSchema, default: undefined },
    bannerSettings: { type: bannerSettingsSchema, default: undefined },
    tickerSettings: { type: tickerSettingsSchema, default: undefined },
  },
  { _id: false },
);

const homepageLayoutSchema = new mongoose.Schema(
  {
    sections: { type: [sectionSchema], default: [] },
  },
  { timestamps: true },
);

const HomepageLayout = mongoose.model('HomepageLayout', homepageLayoutSchema);

export default HomepageLayout;