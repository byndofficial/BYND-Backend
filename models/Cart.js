import mongoose from 'mongoose';

// Server-side cart, one per logged-in user (per README: cart only persists
// server-side once authenticated — guests stay in localStorage on the
// frontend, this model is never touched for them). A "line" is one
// product + color + size combination — matches makeLineId() on the
// frontend, so re-adding the same combination increases quantity instead
// of creating a duplicate row.

const cartItemSchema = new mongoose.Schema(
  {
    productFamily: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductFamily', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: null },
    category: { type: String, trim: true, lowercase: true, default: null },
    color: { type: String, default: null },
    size: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1, max: 10, default: 1 },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

// Mirrors makeLineId() on the frontend exactly, so a re-add of the same
// product/color/size combination is recognized as the same line.
cartSchema.statics.makeLineId = (variantId, size) => `${variantId}::${size || 'onesize'}`;

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;