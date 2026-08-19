import { firebaseAuth } from '../config/firebaseAdmin.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

// Same token verification as verifyFirebaseToken.js, but for routes that
// work for BOTH logged-in and anonymous visitors (e.g. public coupon
// listing/preview, browsed by guests on the PDP). If a valid token is
// present, req.user is populated exactly like verifyFirebaseToken.js so
// downstream controllers can personalize (e.g. hide coupons the user has
// already used up). If the header is missing, malformed, expired, or
// belongs to no User doc, this middleware silently leaves req.user
// undefined and calls next() anyway — it NEVER throws. Do not use this in
// place of verifyFirebaseToken on routes that actually require a login.
const attachUserIfPresent = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next();

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid });
    if (user && user.status === 'active') {
      req.firebaseUid = decoded.uid;
      req.user = user;
    }
  } catch {
    // Invalid/expired token on an optional-auth route — treat as anonymous
    // rather than failing the request.
  }

  next();
});

export default attachUserIfPresent;