import ProductFamily from '../models/ProductFamily.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadImage, deleteImage, publicIdFromUrl } from '../services/cloudinary.service.js';
import { isSkuTaken, isStyleCodeTaken } from '../services/sku.service.js';

// Product images arrive as base64 data URLs (same pattern as
// category.controller.js) — anything not a fresh data URL (already an
// https URL, or empty) passes through unchanged.
const isDataUrl = (value) => typeof value === 'string' && /^data:image\/\w+;base64,/.test(value);

const uploadImagesIfNeeded = async (images = []) => {
  const results = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const image of images) {
    if (isDataUrl(image)) {
      // eslint-disable-next-line no-await-in-loop
      const { url } = await uploadImage(Buffer.from(image.split(',')[1], 'base64'), 'products');
      results.push(url);
    } else if (image) {
      results.push(image);
    }
  }
  return results;
};

const isRealObjectId = (id) => /^[a-f\d]{24}$/i.test(id || '');

// GET /admin/products
export const listProducts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.subCategory) filter.subCategory = req.query.subCategory;

  const products = await ProductFamily.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: products });
});

// GET /admin/products/:productId — productId may be a family _id OR a
// variant _id (admin pages navigate by variant, e.g. /products/:variantId).
export const getProductById = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const family =
    (await ProductFamily.findById(productId)) || (await ProductFamily.findOne({ 'variants._id': productId }));
  if (!family) throw ApiError.notFound('Product not found.');
  res.status(200).json({ success: true, data: family });
});

// POST /admin/products
export const createProduct = asyncHandler(async (req, res) => {
  const {
    styleCode,
    baseName,
    category,
    subCategory,
    type,
    price,
    costPrice,
    badge,
    description,
    highlights,
    sizeChartId,
    variants,
  } = req.body;

  const upperStyleCode = styleCode.trim().toUpperCase();
  if (await isStyleCodeTaken(upperStyleCode)) {
    throw ApiError.conflict('A product with this style code already exists.');
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const variant of variants) {
    // eslint-disable-next-line no-restricted-syntax
    for (const s of variant.sizes) {
      // eslint-disable-next-line no-await-in-loop
      if (await isSkuTaken(s.sku)) throw ApiError.conflict(`SKU "${s.sku}" is already in use.`);
    }
  }

  const processedVariants = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const variant of variants) {
    // eslint-disable-next-line no-await-in-loop
    const images = await uploadImagesIfNeeded(variant.images);
    processedVariants.push({
      color: variant.color,
      colorCode: variant.colorCode,
      images,
      displayName: variant.displayName,
      sizes: variant.sizes.map((s) => ({ size: s.size, sku: s.sku.trim().toUpperCase() })),
    });
  }

  const product = await ProductFamily.create({
    styleCode: upperStyleCode,
    baseName,
    category,
    subCategory,
    type,
    price,
    costPrice: costPrice ?? null,
    badge: badge || null,
    description: description || '',
    highlights: highlights || [],
    sizeChart: sizeChartId || null,
    variants: processedVariants,
  });

  res.status(201).json({ success: true, data: product });
  
});

// PATCH /admin/products/:productId
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await ProductFamily.findById(req.params.productId);
  if (!product) throw ApiError.notFound('Product not found.');

  const {
    styleCode,
    baseName,
    category,
    subCategory,
    type,
    price,
    costPrice,
    badge,
    description,
    highlights,
    variants,
    isActive,
    sizeChartId,
  } = req.body;

  if (styleCode !== undefined) {
    const upperStyleCode = styleCode.trim().toUpperCase();
    if (upperStyleCode !== product.styleCode && (await isStyleCodeTaken(upperStyleCode, product._id))) {
      throw ApiError.conflict('A product with this style code already exists.');
    }
    product.styleCode = upperStyleCode;
  }
  if (baseName !== undefined) product.baseName = baseName;
  if (category !== undefined) product.category = category;
  if (subCategory !== undefined) product.subCategory = subCategory;
  if (type !== undefined) product.type = type;
  if (price !== undefined) product.price = price;
  if (costPrice !== undefined) product.costPrice = costPrice;
  if (badge !== undefined) product.badge = badge || null;
  if (description !== undefined) product.description = description;
  if (highlights !== undefined) product.highlights = highlights;
  if (isActive !== undefined) product.isActive = isActive;
  if (sizeChartId !== undefined) product.sizeChart = sizeChartId || null;

  if (variants !== undefined) {
    // eslint-disable-next-line no-restricted-syntax
    for (const variant of variants) {
      // eslint-disable-next-line no-restricted-syntax
      for (const s of variant.sizes) {
        // eslint-disable-next-line no-await-in-loop
        if (await isSkuTaken(s.sku, product._id)) throw ApiError.conflict(`SKU "${s.sku}" is already in use.`);
      }
    }

    // Clean up Cloudinary assets that no longer appear in the incoming
    // variant set (removed by the admin on save).
    const incomingUrls = new Set(variants.flatMap((v) => v.images).filter((img) => !isDataUrl(img)));
    const existingUrls = product.variants.flatMap((v) => v.images);
    const removedUrls = existingUrls.filter((url) => !incomingUrls.has(url));
    await Promise.all(removedUrls.map((url) => deleteImage(publicIdFromUrl(url))));

    const processedVariants = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const variant of variants) {
      // eslint-disable-next-line no-await-in-loop
      const images = await uploadImagesIfNeeded(variant.images);
      processedVariants.push({
        _id: isRealObjectId(variant.variantId) ? variant.variantId : undefined,
        color: variant.color,
        colorCode: variant.colorCode,
        images,
        displayName: variant.displayName,
        sizes: variant.sizes.map((s) => ({ size: s.size, sku: s.sku.trim().toUpperCase() })),
      });
    }
    product.variants = processedVariants;
  }

  await product.save();
  res.status(200).json({ success: true, data: product });
});

// DELETE /admin/products/:productId
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await ProductFamily.findById(req.params.productId);
  if (!product) throw ApiError.notFound('Product not found.');

  const publicIds = product.variants.flatMap((v) => v.images).map(publicIdFromUrl).filter(Boolean);
  await Promise.all(publicIds.map((id) => deleteImage(id)));

  await product.deleteOne();
  res.status(200).json({ success: true, message: 'Product deleted.' });
});

// POST /admin/products/:productId/duplicate
export const duplicateProduct = asyncHandler(async (req, res) => {
  const original = await ProductFamily.findById(req.params.productId).lean();
  if (!original) throw ApiError.notFound('Product not found.');

  const suffix = Date.now().toString().slice(-4);

  const duplicate = await ProductFamily.create({
    ...original,
    _id: undefined,
    styleCode: `${original.styleCode}-COPY-${suffix}`,
    baseName: `${original.baseName} (Copy)`,
    variants: original.variants.map((v) => ({
      ...v,
      _id: undefined,
      sizes: v.sizes.map((s) => ({ size: s.size, sku: `${s.sku}-COPY-${suffix}` })),
    })),
    createdAt: undefined,
    updatedAt: undefined,
  });

  res.status(201).json({ success: true, data: duplicate });
});