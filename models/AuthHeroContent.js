import mongoose from 'mongoose';

// Singleton doc backing the Login/Signup page hero images (admin's
// Homepage Manager → Login & Signup tab). Desktop-only in the UI
// (AuthLayout hides the pane below 900px), so no separate mobile crop —
// just a focal point so the admin can position a portrait-ish (3:4) crop
// nicely regardless of the source photo's original composition.

const authHeroPaneSchema = new mongoose.Schema(
  {
    image: { type: String, default: null },
    focalX: { type: Number, default: 50, min: 0, max: 100 },
    focalY: { type: Number, default: 50, min: 0, max: 100 },
  },
  { _id: false },
);

const authHeroContentSchema = new mongoose.Schema(
  {
    login: { type: authHeroPaneSchema, default: () => ({}) },
    signup: { type: authHeroPaneSchema, default: () => ({}) },
  },
  { timestamps: true },
);

const AuthHeroContent = mongoose.model('AuthHeroContent', authHeroContentSchema);

export default AuthHeroContent;