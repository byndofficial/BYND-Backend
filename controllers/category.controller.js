import Category from '../models/Category.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadImage, deleteImage, publicIdFromUrl } from '../services/cloudinary.service.js';

// Sub-category images arrive as base64 data URLs in the JSON body (the
// admin form reads the file client-side via FileReader), not multipart —
// keeps the modal components untouched. Anything that isn't a fresh data
// URL (already-uploaded https URL, or null) passes through unchanged.
const isDataUrl = (value) => typeof value === 'string' && /^data:image\/\w+;base64,/.test(value);

const uploadIfDataUrl = async (image) => {
  if (!isDataUrl(image)) return { url: image ?? null, changed: false };
  const buffer = Buffer.from(image.split(',')[1], 'base64');
  const result = await uploadImage(buffer, 'categories');
  return { url: result.url, changed: true };
};

/* ---------- Reads (storefront + admin) ---------- */

// GET /categories — full tree
export const getCategoryTree = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ order: 1, name: 1 });
  res.status(200).json({ success: true, data: categories });
});

// GET /categories/flat — every sub-category, flattened, tagged with parent
export const getFlatSubCategories = asyncHandler(async (req, res) => {
  const flat = await Category.getFlatSubCategories();
  res.status(200).json({ success: true, data: flat });
});

/* ---------- Main categories (admin) ---------- */

export const createMainCategory = asyncHandler(async (req, res) => {
  const { name, icon, order, isActive } = req.body;
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  if (await Category.isSlugTaken(slug)) {
    throw ApiError.conflict('A category with this name already exists.');
  }

  // Auto-append to the end of the current order unless the caller
  // explicitly specifies one (e.g. a future drag-to-reorder UI).
  let nextOrder = order;
  if (nextOrder === undefined) {
    const last = await Category.findOne().sort({ order: -1 }).select('order');
    nextOrder = last ? last.order + 1 : 0;
  }

  const category = await Category.create({ name, slug, icon, order: nextOrder, isActive });
  res.status(201).json({ success: true, data: category });
});

export const updateMainCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (!category) throw ApiError.notFound('Category not found.');

  const { name, icon, order, isActive } = req.body;

  if (name !== undefined && name.trim() !== category.name) {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (await Category.isSlugTaken(slug, { excludeMainId: category._id })) {
      throw ApiError.conflict('A category with this name already exists.');
    }
    category.name = name.trim();
    category.slug = slug;
  }
  if (icon !== undefined) category.icon = icon;
  if (order !== undefined) category.order = order;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();
  res.status(200).json({ success: true, data: category });
});

export const deleteMainCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (!category) throw ApiError.notFound('Category not found.');

  const publicIds = category.subCategories.map((sub) => publicIdFromUrl(sub.image)).filter(Boolean);
  await Promise.all(publicIds.map((id) => deleteImage(id)));

  await category.deleteOne();
  res.status(200).json({ success: true, message: 'Category deleted.' });
});

/* ---------- Sub-categories (admin) ---------- */

export const createSubCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (!category) throw ApiError.notFound('Category not found.');

  const { name, icon, image, order, isActive } = req.body;
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  if (await Category.isSlugTaken(slug)) {
    throw ApiError.conflict('A sub-category with this name already exists.');
  }

  const { url } = await uploadIfDataUrl(image);

  category.subCategories.push({ name, slug, icon, image: url, order, isActive });
  await category.save();

  res.status(201).json({ success: true, data: category });
});

export const updateSubCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (!category) throw ApiError.notFound('Category not found.');

  const sub = category.subCategories.id(req.params.subCategoryId);
  if (!sub) throw ApiError.notFound('Sub-category not found.');

  const { name, icon, image, order, isActive } = req.body;

  if (name !== undefined && name.trim() !== sub.name) {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (await Category.isSlugTaken(slug, { excludeSubId: sub._id })) {
      throw ApiError.conflict('A sub-category with this name already exists.');
    }
    sub.name = name.trim();
    sub.slug = slug;
  }
  if (icon !== undefined) sub.icon = icon;
  if (order !== undefined) sub.order = order;
  if (isActive !== undefined) sub.isActive = isActive;

  if (image !== undefined) {
    const { url, changed } = await uploadIfDataUrl(image);
    if (changed || image === null) {
      const oldPublicId = publicIdFromUrl(sub.image);
      if (oldPublicId) await deleteImage(oldPublicId);
    }
    sub.image = url;
  }

  await category.save();
  res.status(200).json({ success: true, data: category });
});

export const deleteSubCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (!category) throw ApiError.notFound('Category not found.');

  const sub = category.subCategories.id(req.params.subCategoryId);
  if (!sub) throw ApiError.notFound('Sub-category not found.');

  const publicId = publicIdFromUrl(sub.image);
  if (publicId) await deleteImage(publicId);

  sub.deleteOne();
  await category.save();

  res.status(200).json({ success: true, data: category });
});