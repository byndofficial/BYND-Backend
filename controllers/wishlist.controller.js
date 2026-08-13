import Wishlist from '../models/Wishlist.js';
import ProductFamily from '../models/ProductFamily.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const findOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) wishlist = await Wishlist.create({ user: userId, items: [] });
  return wishlist;
};

// Shapes a wishlist doc into what WishlistContext expects on the frontend.
const serializeWishlist = (wishlist) => ({
  items: wishlist.items.map((item) => ({
    productId: item.productFamily,
    name: item.name,
    price: item.price,
    image: item.image,
    category: item.category,
    badge: item.badge,
  })),
});

export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await findOrCreateWishlist(req.user._id);
  res.json({ success: true, data: serializeWishlist(wishlist) });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new ApiError(400, 'productId is required.');

  const product = await ProductFamily.findById(productId).lean();
  if (!product || !product.isActive) throw new ApiError(404, 'Product not found.');

  const wishlist = await findOrCreateWishlist(req.user._id);
  const alreadyIn = wishlist.items.some((item) => String(item.productFamily) === String(productId));

  if (!alreadyIn) {
    wishlist.items.push({
      productFamily: product._id,
      name: product.baseName,
      price: product.price,
      image: product.variants?.[0]?.images?.[0] || null,
      category: product.category || null,
      badge: product.badge || null,
    });
    await wishlist.save();
  }

  res.status(200).json({ success: true, data: serializeWishlist(wishlist) });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const wishlist = await findOrCreateWishlist(req.user._id);
  wishlist.items = wishlist.items.filter((item) => String(item.productFamily) !== String(productId));
  await wishlist.save();
  res.json({ success: true, data: serializeWishlist(wishlist) });
});

export const clearWishlist = asyncHandler(async (req, res) => {
  const wishlist = await findOrCreateWishlist(req.user._id);
  wishlist.items = [];
  await wishlist.save();
  res.json({ success: true, data: serializeWishlist(wishlist) });
});

// Called once right after login with whatever was sitting in the guest's
// localStorage wishlist. Re-resolves each product server-side and folds
// it into the user's existing server wishlist.
export const mergeWishlist = asyncHandler(async (req, res) => {
  const { items = [] } = req.body;
  const wishlist = await findOrCreateWishlist(req.user._id);

  for (const guestItem of items) {
    const productId = guestItem.productId;
    if (!productId) continue;
    const alreadyIn = wishlist.items.some((item) => String(item.productFamily) === String(productId));
    if (alreadyIn) continue;

    try {
      const product = await ProductFamily.findById(productId).lean();
      if (!product || !product.isActive) continue;
      wishlist.items.push({
        productFamily: product._id,
        name: product.baseName,
        price: product.price,
        image: product.variants?.[0]?.images?.[0] || null,
        category: product.category || null,
        badge: product.badge || null,
      });
    } catch {
      // Skip lines that no longer resolve (deleted product, etc.)
    }
  }

  await wishlist.save();
  res.json({ success: true, data: serializeWishlist(wishlist) });
});