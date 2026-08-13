import { firebaseAuth } from '../config/firebaseAdmin.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Gates every storefront-namespace route. Verifies the Firebase ID token
// sent by the customer app (mobile OTP or Google sign-in), then loads the
// matching Mongo User so controllers can just read req.user — they never
// touch Firebase directly.
//
// Signup is the one flow that legitimately has a valid Firebase token but
// no User doc yet (the account is being created *from* this token) — that
// route should call firebaseAuth.verifyIdToken itself rather than sit
// behind this middleware.
const verifyFirebaseToken = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw ApiError.unauthorized('Missing or invalid Authorization header.');
  }

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired session.');
  }

  const user = await User.findOne({ firebaseUid: decoded.uid });
  if (!user) {
    throw ApiError.unauthorized('No account found for this session — please sign up.');
  }
  if (user.status !== 'active') {
    throw ApiError.forbidden('This account is no longer active.');
  }

  req.firebaseUid = decoded.uid;
  req.user = user;
  next();
});

export default verifyFirebaseToken;