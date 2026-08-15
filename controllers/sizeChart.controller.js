import SizeChart from '../models/SizeChart.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadImage, deleteImage, publicIdFromUrl } from '../services/cloudinary.service.js';

const isDataUrl = (value) => typeof value === 'string' && /^data:image\/\w+;base64,/.test(value);

export const listSizeCharts = asyncHandler(async (req, res) => {
  const charts = await SizeChart.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: charts });
});

export const getSizeChartById = asyncHandler(async (req, res) => {
  const chart = await SizeChart.findById(req.params.chartId);
  if (!chart) throw ApiError.notFound('Size chart not found.');
  res.status(200).json({ success: true, data: chart });
});

// POST — image arrives as a base64 data URL, same convention as
// category.controller.js.
export const createSizeChart = asyncHandler(async (req, res) => {
  const { name, image } = req.body;
  if (!isDataUrl(image)) throw ApiError.badRequest('Upload an image for this chart.');

  const uploaded = await uploadImage(Buffer.from(image.split(',')[1], 'base64'), 'size-charts');
  const chart = await SizeChart.create({ name, image: uploaded.url });
  res.status(201).json({ success: true, data: chart });
});

export const updateSizeChart = asyncHandler(async (req, res) => {
  const chart = await SizeChart.findById(req.params.chartId);
  if (!chart) throw ApiError.notFound('Size chart not found.');

  const { name, image } = req.body;
  if (name !== undefined) chart.name = name;

  if (image !== undefined && isDataUrl(image)) {
    const previousPublicId = publicIdFromUrl(chart.image);
    const uploaded = await uploadImage(Buffer.from(image.split(',')[1], 'base64'), 'size-charts');
    chart.image = uploaded.url;
    if (previousPublicId) await deleteImage(previousPublicId);
  }

  await chart.save();
  res.status(200).json({ success: true, data: chart });
});

export const deleteSizeChart = asyncHandler(async (req, res) => {
  const chart = await SizeChart.findById(req.params.chartId);
  if (!chart) throw ApiError.notFound('Size chart not found.');

  const publicId = publicIdFromUrl(chart.image);
  await chart.deleteOne();
  if (publicId) await deleteImage(publicId);

  res.status(200).json({ success: true, message: 'Size chart deleted.' });
});