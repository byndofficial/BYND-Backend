import mongoose from 'mongoose';
import { SIZE_OPTIONS } from '../utils/constants.js';

// One product family = one base product + its color variants. Mirrors the
// frontend shape exactly (adminProductStore.js / products.js): each
// variant owns its own images and its own per-size SKUs — sizes are never
// shared across the whole family since colors can run different size sets.

const sizeSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, enum: SIZE_OPTIONS },
    sku: { type: String, required: true, trim: true, uppercase: true, unique: true },
  },
  { _id: false },
);

const highlightSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 40 },
    value: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false },
);

const variantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    colorCode: { type: String, required: true, trim: true },
    // Cloudinary URLs — empty until real photography exists; UI falls
    // back to the category icon.
    images: { type: [String], default: [] },
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    sizes: { type: [sizeSchema], default: [] },
  },
  { timestamps: true },
);

const productFamilySchema = new mongoose.Schema(
  {
    styleCode: { type: String, required: true, trim: true, uppercase: true, unique: true },
    baseName: { type: String, required: true, trim: true, maxlength: 80 },

    // Main category slug (e.g. "tshirts") and sub-category slug (e.g.
    // "oversized-tshirts") — must match Category/subCategories[].slug.
    category: { type: String, required: true, trim: true, lowercase: true },
    subCategory: { type: String, required: true, trim: true, lowercase: true },

    // Top-level grouping used by the storefront Type filter
    // (AllProducts.jsx / Search.jsx) — derived client-side from category
    // but stored here so it can actually be queried/filtered on.
    type: { type: String, required: true, trim: true, enum: ['Tops', 'Bottoms'] },

    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: null, min: 0 },
    badge: { type: String, enum: ['NEW', 'BEST SELLER', 'SALE', null], default: null },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    highlights: { type: [highlightSchema], default: [] },

    sizeChart: { type: mongoose.Schema.Types.ObjectId, ref: 'SizeChart', default: null },

    variants: {
      type: [variantSchema],
      default: [],
      validate: {
        validator: (v) => v.length > 0,
        message: 'A product needs at least one color variant.',
      },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productFamilySchema.index({ category: 1, subCategory: 1 });
productFamilySchema.index({ type: 1 });
productFamilySchema.index({ baseName: 'text' });

// One color per family — mirrors the frontend's duplicate-color check.
productFamilySchema.pre('validate', function preValidate(next) {
  const colors = this.variants.map((v) => v.color.toLowerCase());
  const hasDuplicate = colors.some((c, i) => colors.indexOf(c) !== i);
  if (hasDuplicate) {
    next(new Error('Each color can only be used once per product.'));
    return;
  }
  next();
});

const ProductFamily = mongoose.model('ProductFamily', productFamilySchema);

export default ProductFamily;