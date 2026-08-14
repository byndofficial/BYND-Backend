import Discount from '../models/Discount.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Admin CRUD for coupons. Deliberately thin — Discount.js already owns the
// business rules (status derivation via getStatus(), code uniqueness via
// isCodeTaken()), so this controller just wires HTTP to the model instead
// of re-implementing anything. Field-by-field sparse update on PATCH
// mirrors adminProduct.controller.js's updateProduct.

// Attaches the derived status (active/scheduled/expired/exhausted/disabled)
// so the admin table never has to recompute it client-side — same idea as
// adminOrder.controller.js's serializeOrder shaping the response for its UI.
const serializeDiscount = (discount) => {
  const obj = discount.toObject ? discount.toObject() : discount;
  return { ...obj, status: discount.getStatus() };
};

// GET /admin/discounts
export const listDiscounts = asyncHandler(async (req, res) => {
  const discounts = await Discount.find().sort({ createdAt: -1 });
  res.json({ success: true, data: discounts.map(serializeDiscount) });
});

// GET /admin/discounts/:discountId
export const getDiscountById = asyncHandler(async (req, res) => {
  const discount = await Discount.findById(req.params.discountId);
  if (!discount) throw ApiError.notFound('Discount not found.');
  res.json({ success: true, data: serializeDiscount(discount) });
});

// POST /admin/discounts
export const createDiscount = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    description,
    type,
    value,
    maxDiscountAmount,
    minPurchaseAmount,
    maxPurchaseAmount,
    startDate,
    endDate,
    usageLimit,
    perUserLimit,
    isEnabled,
    isPublic,
  } = req.body;

  const upperCode = code.trim().toUpperCase();
  if (await Discount.isCodeTaken(upperCode)) {
    throw ApiError.conflict('A coupon with this code already exists.');
  }
  if (endDate < startDate) {
    throw new ApiError(400, 'End date must be on or after the start date.');
  }

  const discount = await Discount.create({
    code: upperCode,
    name,
    description: description || '',
    type,
    value,
    // Cap only makes sense for percent-type coupons — same rule the
    // DiscountFormModal already enforces client-side before submit.
    maxDiscountAmount: type === 'percent' && maxDiscountAmount != null ? maxDiscountAmount : null,
    minPurchaseAmount: minPurchaseAmount || 0,
    maxPurchaseAmount: maxPurchaseAmount ?? null,
    startDate,
    endDate,
    usageLimit: usageLimit ?? null,
    perUserLimit: perUserLimit ?? null,
    isEnabled: isEnabled !== false,
    isPublic: isPublic !== false,
  });

  res.status(201).json({ success: true, data: serializeDiscount(discount) });
});

// PATCH /admin/discounts/:discountId — also used for the table's quick
// enable/disable toggle, which just sends { isEnabled }.
export const updateDiscount = asyncHandler(async (req, res) => {
  const discount = await Discount.findById(req.params.discountId);
  if (!discount) throw ApiError.notFound('Discount not found.');

  const {
    code,
    name,
    description,
    type,
    value,
    maxDiscountAmount,
    minPurchaseAmount,
    maxPurchaseAmount,
    startDate,
    endDate,
    usageLimit,
    perUserLimit,
    isEnabled,
    isPublic,
  } = req.body;

  if (code !== undefined) {
    const upperCode = code.trim().toUpperCase();
    if (upperCode !== discount.code && (await Discount.isCodeTaken(upperCode, discount._id))) {
      throw ApiError.conflict('A coupon with this code already exists.');
    }
    discount.code = upperCode;
  }
  if (name !== undefined) discount.name = name;
  if (description !== undefined) discount.description = description;
  if (type !== undefined) discount.type = type;
  if (value !== undefined) discount.value = value;
  if (maxDiscountAmount !== undefined) discount.maxDiscountAmount = maxDiscountAmount;
  if (minPurchaseAmount !== undefined) discount.minPurchaseAmount = minPurchaseAmount;
  if (maxPurchaseAmount !== undefined) discount.maxPurchaseAmount = maxPurchaseAmount;
  if (startDate !== undefined) discount.startDate = startDate;
  if (endDate !== undefined) discount.endDate = endDate;
  if (usageLimit !== undefined) discount.usageLimit = usageLimit;
  if (perUserLimit !== undefined) discount.perUserLimit = perUserLimit;
  if (isEnabled !== undefined) discount.isEnabled = isEnabled;
  if (isPublic !== undefined) discount.isPublic = isPublic;

  const effectiveStart = startDate !== undefined ? startDate : discount.startDate;
  const effectiveEnd = endDate !== undefined ? endDate : discount.endDate;
  if (effectiveEnd < effectiveStart) {
    throw new ApiError(400, 'End date must be on or after the start date.');
  }

  await discount.save();
  res.json({ success: true, data: serializeDiscount(discount) });
});

// DELETE /admin/discounts/:discountId
export const deleteDiscount = asyncHandler(async (req, res) => {
  const discount = await Discount.findById(req.params.discountId);
  if (!discount) throw ApiError.notFound('Discount not found.');
  await discount.deleteOne();
  res.json({ success: true, message: 'Discount deleted.' });
});