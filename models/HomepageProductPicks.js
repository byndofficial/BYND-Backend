import mongoose from 'mongoose';

// Singleton doc holding the ordered, admin-curated product+variant lists
// for the two homepage sections. Storing family + variantId (not a
// denormalized copy of name/price/image) so edits to the product always
// stay in sync — resolvePicks() in homepage.controller.js looks the live
// data up on every read.
const pickSchema = new mongoose.Schema(
  {
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductFamily', required: true },
    variantId: { type: String, required: true }, // matches ProductFamily.variants[]._id
  },
  { _id: false },
);

const homepageProductPicksSchema = new mongoose.Schema(
  {
    bestSellers: { type: [pickSchema], default: [] },
    newArrivals: { type: [pickSchema], default: [] },
  },
  { timestamps: true },
);

const HomepageProductPicks = mongoose.model('HomepageProductPicks', homepageProductPicksSchema);

export default HomepageProductPicks;