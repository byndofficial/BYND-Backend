import mongoose from 'mongoose';

// Reusable size chart library — NOT one per sub-category. Admin builds a
// small set (e.g. "Regular Tee — Male", "Oversized Fit — Unisex") and each
// product picks one via ProductFamily.sizeChart. Replacing a chart's image
// updates it everywhere it's referenced.
const sizeChartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    image: { type: String, required: true }, // Cloudinary URL
  },
  { timestamps: true },
);

const SizeChart = mongoose.model('SizeChart', sizeChartSchema);
export default SizeChart;