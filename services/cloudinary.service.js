import cloudinary from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

// Thin wrapper around the Cloudinary SDK — every controller that handles
// an image (product variants, category images, hero slides, size charts,
// auth hero) goes through here rather than calling `cloudinary` directly,
// so the folder convention and error handling stay in one place.
//
// Files arrive as in-memory Buffers (see middleware/upload.js — memory
// storage, nothing hits local disk), so uploads go through
// upload_stream rather than uploader.upload(filePath).

const uploadBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `bynd/${folder}`, resource_type: 'image' },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      },
    );
    stream.end(buffer);
  });

// Uploads one image buffer, returns { url, publicId }. `folder` groups
// assets in Cloudinary (e.g. 'products', 'categories', 'hero-slides',
// 'size-charts', 'auth-hero') for easier management there.
export const uploadImage = async (buffer, folder) => {
  try {
    const result = await uploadBuffer(buffer, folder);
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    logger.error(`Cloudinary upload failed: ${err.message}`);
    throw ApiError.internal('Image upload failed — please try again.');
  }
};

// Uploads several image buffers in parallel — used for product variant
// image sets where an admin picks multiple files at once.
export const uploadImages = (buffers, folder) => Promise.all(buffers.map((buffer) => uploadImage(buffer, folder)));

// Deletes by Cloudinary public_id. Never throws on a missing asset — a
// stale/already-deleted reference shouldn't block the caller's own
// operation (e.g. deleting a product whose image was already removed).
export const deleteImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.warn(`Cloudinary delete failed for ${publicId}: ${err.message}`);
  }
};

export const deleteImages = (publicIds = []) => Promise.all(publicIds.filter(Boolean).map(deleteImage));

// Extracts the public_id back out of a stored Cloudinary secure_url — for
// records (seeded before this service existed, or from older data) that
// only kept the URL, not the publicId.
export const publicIdFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : null;
};