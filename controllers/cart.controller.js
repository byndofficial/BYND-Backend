import Cart from '../models/Cart.js';
import ProductFamily from '../models/ProductFamily.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Matches backend/models/ProductFamily.js exactly: price lives only at
// family level, sku only at size level, no stock/inventory field exists
// on the schema so there's nothing to check there.
const resolveLine = async (productFamilyId, variantId, size) => {
  const family = await ProductFamily.findById(productFamilyId).lean();
  if (!family || !family.isActive) throw new ApiError(404, 'Product not found.');

  const variant = (family.variants || []).find((v) => String(v._id) === String(variantId));
  if (!variant) throw new ApiError(404, 'Product variant not found.');

  const sizeRow = (variant.sizes || []).find((s) => s.size === size);
  if (!sizeRow) throw new ApiError(404, 'Selected size is not available.');

  return {
    productFamily: family._id,
    variantId: variant._id,
    sku: sizeRow.sku,
    name: family.baseName,
    price: family.price,
    image: variant.images?.[0] || null,
    category: family.category || null,
    color: variant.color || null,
    size: size || null,
  };
};

const findOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
};

// Shapes a cart doc into what the frontend CartContext expects.
const serializeCart = (cart) => ({
  items: cart.items.map((item) => ({
    lineId: Cart.makeLineId(item.variantId, item.size),
    productId: item.productFamily,
    variantId: item.variantId,
    sku: item.sku,
    name: item.name,
    price: item.price,
    image: item.image,
    category: item.category,
    color: item.color,
    size: item.size,
    quantity: item.quantity,
  })),
});

export const getCart = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(req.user._id);
  res.json({ success: true, data: serializeCart(cart) });
});

export const addToCart = asyncHandler(async (req, res) => {
  const { productFamilyId, variantId, size, quantity = 1 } = req.body;
  if (!productFamilyId || !variantId) {
    throw new ApiError(400, 'productFamilyId and variantId are required.');
  }
  const qty = Math.min(10, Math.max(1, Number(quantity) || 1));
  const line = await resolveLine(productFamilyId, variantId, size);
  const lineId = Cart.makeLineId(line.variantId, line.size);

  const cart = await findOrCreateCart(req.user._id);
  const existing = cart.items.find(
    (item) => Cart.makeLineId(item.variantId, item.size) === lineId,
  );

  if (existing) {
    existing.quantity = Math.min(10, existing.quantity + qty);
  } else {
    cart.items.push({ ...line, quantity: qty });
  }

  await cart.save();
  res.status(200).json({ success: true, data: serializeCart(cart) });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { lineId } = req.params;
  const { quantity } = req.body;
  if (typeof quantity !== 'number') throw new ApiError(400, 'quantity must be a number.');

  const cart = await findOrCreateCart(req.user._id);
  const item = cart.items.find((i) => Cart.makeLineId(i.variantId, i.size) === lineId);
  if (!item) throw new ApiError(404, 'Cart line not found.');

  if (quantity < 1) {
    cart.items = cart.items.filter((i) => Cart.makeLineId(i.variantId, i.size) !== lineId);
  } else {
    item.quantity = Math.min(10, quantity);
  }

  await cart.save();
  res.json({ success: true, data: serializeCart(cart) });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const { lineId } = req.params;
  const cart = await findOrCreateCart(req.user._id);
  cart.items = cart.items.filter((i) => Cart.makeLineId(i.variantId, i.size) !== lineId);
  await cart.save();
  res.json({ success: true, data: serializeCart(cart) });
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json({ success: true, data: serializeCart(cart) });
});

// Called once right after login with whatever was sitting in the guest's
// localStorage cart. Re-resolves each line server-side (never trusts the
// client's price/sku) and folds it into the user's existing server cart.
export const mergeCart = asyncHandler(async (req, res) => {
  const { items = [] } = req.body;
  const cart = await findOrCreateCart(req.user._id);

  for (const guestItem of items) {
    const { productFamilyId, variantId, size, quantity = 1 } = guestItem;
    if (!productFamilyId || !variantId) continue;
    try {
      const line = await resolveLine(productFamilyId, variantId, size);
      const lineId = Cart.makeLineId(line.variantId, line.size);
      const existing = cart.items.find(
        (item) => Cart.makeLineId(item.variantId, item.size) === lineId,
      );
      const qty = Math.min(10, Math.max(1, Number(quantity) || 1));
      if (existing) {
        existing.quantity = Math.min(10, existing.quantity + qty);
      } else {
        cart.items.push({ ...line, quantity: qty });
      }
    } catch {
      // Skip lines that no longer resolve (deleted product, sold-out size,
      // etc.) instead of failing the whole merge.
    }
  }

  await cart.save();
  res.json({ success: true, data: serializeCart(cart) });
});