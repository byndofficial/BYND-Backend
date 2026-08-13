import ProductFamily from '../models/ProductFamily.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const buildFilterQuery = (query) => {
  const filter = { isActive: true };
  if (query.category) filter.category = query.category;
  if (query.subCategory) filter.subCategory = query.subCategory;
  if (query.color) filter['variants.color'] = new RegExp(`^${query.color}$`, 'i');
  if (query.size) filter['variants.sizes.size'] = query.size;
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }
  if (query.search) filter.$text = { $search: query.search };
  return filter;
};

const buildSort = (sort) => {
  switch (sort) {
    case 'price-asc':
      return { price: 1 };
    case 'price-desc':
      return { price: -1 };
    case 'newest':
      return { createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
};

// GET /products
export const listProducts = asyncHandler(async (req, res) => {
  const filter = buildFilterQuery(req.query);
  const sort = buildSort(req.query.sort);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 60;

  const [products, total] = await Promise.all([
    ProductFamily.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    ProductFamily.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data: products, meta: { total, page, limit } });
});

// GET /products/:productId
export const getProductById = asyncHandler(async (req, res) => {
  const product = await ProductFamily.findOne({ _id: req.params.productId, isActive: true });
  if (!product) throw ApiError.notFound('Product not found.');
  res.status(200).json({ success: true, data: product });
});