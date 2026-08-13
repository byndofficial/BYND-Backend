import mongoose from 'mongoose';

// Fixed 2-level taxonomy — Main Category -> Sub-Categories — mirrored
// exactly from the storefront's static categories.js. Admins don't create
// main categories or sub-categories freely; they mainly attach/replace the
// image on a sub-category (see adminCategoryStore.js on the frontend).
// Sub-categories are embedded, not a separate collection: they are never
// queried independently of their parent, and the whole tree is small and
// effectively static.
//
// `slug` (not `_id`) is the stable identifier referenced elsewhere
// (products, storefront filters, URLs) — matches how both frontends
// already key categories today.

const subCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    icon: { type: String, trim: true, default: 'fa-solid fa-tag' },
    // Cloudinary URL — null until an admin uploads one.
    image: { type: String, default: null },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    icon: { type: String, trim: true, default: 'fa-solid fa-tag' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    subCategories: { type: [subCategorySchema], default: [] },
  },
  { timestamps: true },
);

categorySchema.index({ 'subCategories.slug': 1 });

// Slugs must be globally unique across BOTH main and sub-categories
// (matches allSlugs()/isSlugTaken() in adminCategoryStore.js) — a product
// or storefront route only has one flat slug namespace to resolve against.
categorySchema.statics.isSlugTaken = async function isSlugTaken(slug, { excludeMainId, excludeSubId } = {}) {
  const normalized = slug.trim().toLowerCase();

  const mainMatch = await this.exists({
    slug: normalized,
    ...(excludeMainId ? { _id: { $ne: excludeMainId } } : {}),
  });
  if (mainMatch) return true;

  const subMatch = await this.exists({
    'subCategories.slug': normalized,
    ...(excludeSubId ? { 'subCategories._id': { $ne: excludeSubId } } : {}),
  });
  return Boolean(subMatch);
};

// Flat list of every sub-category tagged with its parent — mirrors
// readFlatSubCategories()/flatSubCategories on both frontends, which is
// the shape product forms and storefront filters actually consume.
categorySchema.statics.getFlatSubCategories = async function getFlatSubCategories() {
  const categories = await this.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();
  return categories.flatMap((main) =>
    main.subCategories
      .filter((sub) => sub.isActive)
      .map((sub) => ({ ...sub, mainCategoryId: main._id, mainCategorySlug: main.slug, mainCategoryName: main.name })),
  );
};

const Category = mongoose.model('Category', categorySchema);

export default Category;