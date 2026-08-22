import HeroSlide from '../models/HeroSlide.js';
import AuthHeroContent from '../models/AuthHeroContent.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadImage, deleteImage, publicIdFromUrl } from '../services/cloudinary.service.js';

// Plain scalar fields, copied straight from req.body when present.
// `elements` is handled separately below — it arrives as a JSON string
// (FormData can't carry nested arrays) and needs parsing before it can
// be assigned, unlike everything else in this list.
const HERO_SLIDE_FIELDS = [
  'focalDesktopX',
  'focalDesktopY',
  'focalMobileX',
  'focalMobileY',
  'overlayStrength',
  'order',
  'isActive',
];

// The homepage.validator.js custom validator already confirmed this
// parses and fits within size/shape limits before this ever runs — this
// try/catch is just defense in depth against an unexpected shape.
const parseElements = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/* =========================================================
   PUBLIC (storefront) — Home.jsx / Login.jsx / Signup.jsx
   ========================================================= */

// GET /api/homepage/hero-slides — active slides only, in display order.
export const getPublicHeroSlides = asyncHandler(async (req, res) => {
  const slides = await HeroSlide.find({ isActive: true }).sort({ order: 1 });
  res.status(200).json({ success: true, data: slides });
});

// GET /api/homepage/auth-hero — singleton doc; never 404s, just returns
// nulls if nothing's been uploaded yet so Login/Signup can fall back to
// their branded gradient. Also serves the admin panel (adminAuthHeroStore
// reads this same public endpoint — no separate admin GET exists).
export const getPublicAuthHero = asyncHandler(async (req, res) => {
  const doc = await AuthHeroContent.findOne();
  res.status(200).json({
    success: true,
    data: {
      login: doc?.login || { image: null, focalX: 50, focalY: 50, paneWidth: 50 },
      signup: doc?.signup || { image: null, focalX: 50, focalY: 50, paneWidth: 50 },
    },
  });
});

/* =========================================================
   ADMIN — HomepageManager.jsx
   ========================================================= */

// GET /api/homepage/admin/hero-slides — every slide, active or hidden.
export const listHeroSlides = asyncHandler(async (req, res) => {
  const slides = await HeroSlide.find().sort({ order: 1 });
  res.status(200).json({ success: true, data: slides });
});

// POST /api/homepage/admin/hero-slides — multipart, `image` file optional.
export const createHeroSlide = asyncHandler(async (req, res) => {
  let image = null;
  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, 'hero-slides');
    image = uploaded.url;
  }

  const lastSlide = await HeroSlide.findOne().sort({ order: -1 });
  const nextOrder = req.body.order !== undefined ? Number(req.body.order) : (lastSlide?.order ?? -1) + 1;

  const payload = {};
  HERO_SLIDE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
  });
  if (req.body.elements !== undefined) {
    payload.elements = parseElements(req.body.elements);
  }

  const slide = await HeroSlide.create({ ...payload, order: nextOrder, image });
  res.status(201).json({ success: true, data: slide });
});

// PATCH /api/homepage/admin/hero-slides/:slideId — partial update. A new
// `image` file replaces (and deletes) the old Cloudinary asset; sending
// image: 'null' with no file clears it back to the gradient fallback.
export const updateHeroSlide = asyncHandler(async (req, res) => {
  const slide = await HeroSlide.findById(req.params.slideId);
  if (!slide) throw ApiError.notFound('Hero slide not found.');

  HERO_SLIDE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) slide[field] = req.body[field];
  });
  if (req.body.elements !== undefined) {
    slide.elements = parseElements(req.body.elements);
  }

  if (req.file) {
    const previousPublicId = publicIdFromUrl(slide.image);
    const uploaded = await uploadImage(req.file.buffer, 'hero-slides');
    slide.image = uploaded.url;
    if (previousPublicId) await deleteImage(previousPublicId);
  } else if (req.body.image === 'null') {
    const previousPublicId = publicIdFromUrl(slide.image);
    if (previousPublicId) await deleteImage(previousPublicId);
    slide.image = null;
  }

  await slide.save();
  res.status(200).json({ success: true, data: slide });
});

// DELETE /api/homepage/admin/hero-slides/:slideId
export const deleteHeroSlide = asyncHandler(async (req, res) => {
  const slide = await HeroSlide.findById(req.params.slideId);
  if (!slide) throw ApiError.notFound('Hero slide not found.');

  const publicId = publicIdFromUrl(slide.image);
  await slide.deleteOne();
  if (publicId) await deleteImage(publicId);

  res.status(200).json({ success: true, message: 'Slide deleted.' });
});

// PATCH /api/homepage/admin/hero-slides/reorder   { order: [id, id, ...] }
export const reorderHeroSlides = asyncHandler(async (req, res) => {
  const { order } = req.body;

  const matched = await HeroSlide.countDocuments({ _id: { $in: order } });
  if (matched !== order.length) {
    throw ApiError.badRequest('One or more slide ids were not found.');
  }

  await Promise.all(order.map((id, index) => HeroSlide.updateOne({ _id: id }, { order: index })));

  const updated = await HeroSlide.find().sort({ order: 1 });
  res.status(200).json({ success: true, data: updated });
});

// PATCH /api/homepage/admin/auth-hero/:page   (page: 'login' | 'signup')
export const updateAuthHeroImage = asyncHandler(async (req, res) => {
  const { page } = req.params;

  let doc = await AuthHeroContent.findOne();
  if (!doc) {
    doc = await AuthHeroContent.create({
      login: { image: null, focalX: 50, focalY: 50, paneWidth: 50 },
      signup: { image: null, focalX: 50, focalY: 50, paneWidth: 50 },
    });
  }

  const previousPublicId = publicIdFromUrl(doc[page]?.image);
  const nextFocalX = req.body.focalX !== undefined ? Number(req.body.focalX) : doc[page]?.focalX ?? 50;
  const nextFocalY = req.body.focalY !== undefined ? Number(req.body.focalY) : doc[page]?.focalY ?? 50;
  const nextPaneWidth = req.body.paneWidth !== undefined ? Number(req.body.paneWidth) : doc[page]?.paneWidth ?? 50;

  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, 'auth-hero');
    doc[page] = { image: uploaded.url, focalX: nextFocalX, focalY: nextFocalY, paneWidth: nextPaneWidth };
    if (previousPublicId) await deleteImage(previousPublicId);
  } else if (req.body.image === 'null') {
    doc[page] = { image: null, focalX: 50, focalY: 50, paneWidth: nextPaneWidth };
    if (previousPublicId) await deleteImage(previousPublicId);
  } else {
    doc[page] = { image: doc[page]?.image ?? null, focalX: nextFocalX, focalY: nextFocalY, paneWidth: nextPaneWidth };
  }

  await doc.save();
  res.status(200).json({ success: true, data: { login: doc.login, signup: doc.signup } });
});