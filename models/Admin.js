import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import { ADMIN_ROLES } from '../utils/constants.js';

// Admin PANEL accounts — who can sign in to the admin console. Completely
// separate from the customer `User` collection. Password is always
// bcrypt-hashed before it ever touches the database; the plaintext value
// is never stored or logged anywhere.
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: 'admin' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

adminSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

adminSchema.statics.hashPassword = async function hashPassword(plain) {
  return bcrypt.hash(plain, env.bcryptSaltRounds);
};

// Never serialize the hash, even accidentally (e.g. res.json(admin)).
adminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
