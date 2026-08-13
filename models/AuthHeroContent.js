import mongoose from 'mongoose';

// Login/Signup page hero images, managed from Homepage Manager. Effectively
// a singleton — exactly one document ever exists, fetched via
// findOne() / findOneAndUpdate(..., { upsert: true }). Kept as its own
// tiny collection rather than embedded in a general "site settings" doc
// since it's the only content Login/Signup currently pull.

const authHeroContentSchema = new mongoose.Schema(
  {
    login: {
      image: { type: String, default: null }, // Cloudinary URL
    },
    signup: {
      image: { type: String, default: null },
    },
  },
  { timestamps: true },
);

const AuthHeroContent = mongoose.model('AuthHeroContent', authHeroContentSchema);

export default AuthHeroContent;