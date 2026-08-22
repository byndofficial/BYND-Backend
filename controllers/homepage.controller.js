import HeroSlide from '../models/HeroSlide.js';
import AuthHeroContent from '../models/AuthHeroContent.js';
import HomepageLayout, { FIXED_SECTION_TYPES } from '../models/HomepageLayout.js';
import HomepageProductPicks from '../models/HomepageProductPicks.js';
import ProductFamily from '../models/ProductFamily.js';
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
// their branded gradient.
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
   ADMIN: Hero slides — HomepageManager.jsx
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

/* =========================================================
   Homepage Builder (sections layout)
   ========================================================= */
const defaultSections = () => [
  { id: 'hero', type: 'hero', isActive: true, heroSettings: {} },
  { id: 'categories', type: 'categories', isActive: true },
  { id: 'bestSellers', type: 'bestSellers', isActive: true },
  { id: 'newArrivals', type: 'newArrivals', isActive: true },
];

const isValidSection = (s) =>
  s && typeof s === 'object' && ['hero', 'categories', 'bestSellers', 'newArrivals', 'banner'].includes(s.type);

const getOrCreateLayout = async () => {
  let layout = await HomepageLayout.findOne();
  if (!layout) {
    layout = await HomepageLayout.create({ sections: defaultSections() });
    return layout;
  }
  const hasStaleShape = layout.sections.length > 0 && !layout.sections.every(isValidSection);
  if (hasStaleShape) {
    layout.sections = defaultSections();
    await layout.save();
  }
  return layout;
};

// GET /api/homepage/layout
export const getPublicHomepageLayout = asyncHandler(async (req, res) => {
  const layout = await getOrCreateLayout();
  const sections = layout.sections.filter((s) => s.isActive).map((s) => s.toObject());
  res.status(200).json({ success: true, data: sections });
});

// GET /api/homepage/admin/layout — full sections list, including hidden.
export const getAdminHomepageLayout = asyncHandler(async (req, res) => {
  const layout = await getOrCreateLayout();
  res.status(200).json({ success: true, data: layout.sections });
});

// PUT /api/homepage/admin/layout   { sections: [...] } — full replace.
export const saveHomepageLayout = asyncHandler(async (req, res) => {
  const { sections } = req.body;

  const seenTypes = new Set();
  sections.forEach((section) => {
    if (FIXED_SECTION_TYPES.includes(section.type)) {
      if (seenTypes.has(section.type)) {
        throw ApiError.badRequest(`The "${section.type}" section can only appear once.`);
      }
      seenTypes.add(section.type);
    }
  });
  const missingFixed = FIXED_SECTION_TYPES.filter((t) => !seenTypes.has(t));
  if (missingFixed.length) {
    throw ApiError.badRequest(`Missing required section(s): ${missingFixed.join(', ')}.`);
  }

  const layout = await getOrCreateLayout();
  layout.sections = sections;
  await layout.save();

  res.status(200).json({ success: true, data: layout.sections });
});

// POST /api/homepage/admin/layout/upload-image — multipart, `image`.
export const uploadLayoutImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('An image file is required.');
  const uploaded = await uploadImage(req.file.buffer, 'homepage-banners');
  res.status(200).json({ success: true, data: { url: uploaded.url } });
});

/* =========================================================
   Featured products (Best Sellers / New Arrivals picks)
   ========================================================= */

const PRODUCT_PICK_SECTIONS = ['bestSellers', 'newArrivals'];

const getOrCreateProductPicks = async () => {
  let doc = await HomepageProductPicks.findOne();
  if (!doc) doc = await HomepageProductPicks.create({ bestSellers: [], newArrivals: [] });
  return doc;
};

// Resolves stored {family, variantId} refs into full display data.
// Drops any pick whose family or variant no longer exists (e.g. product
// deleted after being picked) instead of throwing.
const resolvePicks = async (picks) => {
  if (!picks.length) return [];
  const familyIds = [...new Set(picks.map((p) => String(p.family)))];
  const families = await ProductFamily.find({ _id: { $in: familyIds } });
  const familyById = new Map(families.map((f) => [String(f._id), f]));

  return picks
    .map((pick) => {
      const family = familyById.get(String(pick.family));
      const variant = family?.variants.id(pick.variantId);
      if (!family || !variant) return null;
      return {
        familyId: family._id,
        variantId: variant._id,
        displayName: variant.displayName,
        color: variant.color,
        price: family.price,
        badge: family.badge,
        category: family.category,
        subCategory: family.subCategory,
        image: variant.images?.[0] || null,
      };
    })
    .filter(Boolean);
};

// GET /api/homepage/product-picks — public, resolved for Home.jsx.
export const getPublicProductPicks = asyncHandler(async (req, res) => {
  const doc = await getOrCreateProductPicks();
  const [bestSellers, newArrivals] = await Promise.all([resolvePicks(doc.bestSellers), resolvePicks(doc.newArrivals)]);
  res.status(200).json({ success: true, data: { bestSellers, newArrivals } });
});

// GET /api/homepage/admin/product-picks
export const getAdminProductPicks = asyncHandler(async (req, res) => {
  const doc = await getOrCreateProductPicks();
  const [bestSellers, newArrivals] = await Promise.all([resolvePicks(doc.bestSellers), resolvePicks(doc.newArrivals)]);
  res.status(200).json({ success: true, data: { bestSellers, newArrivals } });
});

// PATCH /api/homepage/admin/product-picks/:section   { picks: [{familyId, variantId}, ...] }
// Full replace of that section's ordered list — covers add, remove, and
// reorder alike since the admin UI always sends the complete current list.
export const updateProductPicks = asyncHandler(async (req, res) => {
  const { section } = req.params;
  if (!PRODUCT_PICK_SECTIONS.includes(section)) throw ApiError.badRequest('Invalid section.');

  const { picks } = req.body;

  const familyIds = [...new Set(picks.map((p) => p.familyId))];
  const families = await ProductFamily.find({ _id: { $in: familyIds } });
  const familyById = new Map(families.map((f) => [String(f._id), f]));

  picks.forEach((pick) => {
    const family = familyById.get(pick.familyId);
    if (!family) throw ApiError.badRequest('One of the selected products no longer exists.');
    if (!family.variants.id(pick.variantId)) {
      throw ApiError.badRequest('One of the selected color variants no longer exists.');
    }
  });

  const doc = await getOrCreateProductPicks();
  doc[section] = picks.map((p) => ({ family: p.familyId, variantId: p.variantId }));
  await doc.save();

  res.status(200).json({ success: true, data: await resolvePicks(doc[section]) });
});