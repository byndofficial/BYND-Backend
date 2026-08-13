import mongoose from 'mongoose';

// One per logged-in user. Mirrors WishlistContext.jsx: catalog-snapshot
// fields only (name/price/image/category/badge), no size/color — a
// wishlist entry is per-product, not per-variant.

const wishlistItemSchema = new mongoose.Schema(
  {
    productFamily: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductFamily', required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: null },
    category: { type: String, trim: true, lowercase: true, default: null },
    badge: { type: String, enum: ['NEW', 'BEST SELLER', 'SALE', null], default: null },
  },
  { _id: false },
);

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [wishlistItemSchema], default: [] },
  },
  { timestamps: true },
);

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;