import { verifyAccessToken } from '../utils/generateTokens.js';
import Admin from '../models/Admin.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Gates every /api/admin/* route. Reads the short-lived JWT access token
// (httpOnly cookie, falling back to Authorization header for non-browser
// clients like Postman/tests), verifies it, and loads the matching Admin
// so controllers can just read req.admin. Refresh/rotation is handled
// separately by adminAuth.controller.js — this middleware never touches
// the RefreshToken collection.
const verifyAdminToken = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = req.cookies?.adminAccessToken || bearerToken;

  if (!token) {
    throw ApiError.unauthorized('Missing or invalid session.');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired session.');
  }

  const admin = await Admin.findById(payload.sub);
  if (!admin) {
    throw ApiError.unauthorized('Admin account not found.');
  }
  if (admin.status !== 'active') {
    throw ApiError.forbidden('This admin account has been suspended.');
  }

  req.admin = admin;
  next();
});

export default verifyAdminToken;