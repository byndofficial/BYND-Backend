import mongoose from 'mongoose';
import { AUTH_PROVIDERS } from '../utils/constants.js';

// Embedded, not a separate collection — addresses are always fetched and
// written together with their owning user (checkout, profile, admin user
// view), and there is no case where an address is queried independently.
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 20, default: 'Home' },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true, maxlength: 120 },
    line2: { type: String, trim: true, maxlength: 120, default: '' },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    state: { type: String, required: true, trim: true, maxlength: 60 },
    pincode: { type: String, required: true, trim: true, match: [/^\d{6}$/, 'Enter a valid 6-digit pincode'] },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false },
);

// Customer accounts, authenticated via Firebase (mobile OTP or Google) —
// never a password stored here. `firebaseUid` is the durable link back to
// the Firebase user record; every authenticated storefront request is
// verified against this uid via middleware/verifyFirebaseToken.js.
const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, trim: true, maxlength: 80, default: '' },
    email: { type: String, trim: true, lowercase: true, default: null },
    phone: { type: String, trim: true, default: null },
    authProvider: { type: String, enum: AUTH_PROVIDERS, required: true },

    addresses: { type: [addressSchema], default: [] },

    marketingOptIn: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },

    lastLoginAt: { type: Date, default: null },

    // Admin-only, never exposed to the storefront API.
    adminNotes: { type: String, trim: true, maxlength: 1000, default: '' },

    // Self-service account deletion (see controllers/user.controller.js).
    // `select: false` so these never leak through /auth/me or /admin/users
    // responses — controllers that need them re-query with `.select('+...')`.
    deletionOtpHash: { type: String, default: null, select: false },
    deletionOtpExpiresAt: { type: Date, default: null, select: false },
    deletionOtpAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

const User = mongoose.model('User', userSchema);

export default User;