import Admin from '../models/Admin.js';
import RefreshToken from '../models/RefreshToken.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  parseDurationToMs,
} from '../utils/generateTokens.js';
import { issueCsrfToken, clearCsrfToken } from '../middleware/csrf.js';

const isProd = env.isProduction;

const accessCookieOpts = () => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  // Derived from JWT_ACCESS_EXPIRES_IN so the cookie can never disagree
  // with the JWT's own expiry, whatever that env var is set to.
  maxAge: parseDurationToMs(env.jwt.accessExpiresIn),
});

const refreshCookieOpts = (expiresAt) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  expires: expiresAt,
});

const issueSession = async (admin, req, res) => {
  const accessToken = generateAccessToken(admin);
  const { token, jti, tokenHash, expiresAt } = generateRefreshToken();

  await RefreshToken.create({
    admin: admin._id,
    jti,
    tokenHash,
    expiresAt,
    userAgent: req.headers['user-agent'] || null,
    ip: req.ip,
  });

  res.cookie('adminAccessToken', accessToken, accessCookieOpts());
  res.cookie('adminRefreshToken', token, refreshCookieOpts(expiresAt));
  issueCsrfToken(res);
};

const clearAuthCookies = (res) => {
  res.clearCookie('adminAccessToken');
  res.clearCookie('adminRefreshToken');
  clearCsrfToken(res);
};

// POST /api/admin/auth/login
export const login = asyncHandler(async (req, res) => {
  const { mobile, password } = req.body;

  const admin = await Admin.findOne({ mobile }).select('+passwordHash');
  if (!admin) throw ApiError.unauthorized('Invalid mobile number or password.');

  const match = await admin.comparePassword(password);
  if (!match) throw ApiError.unauthorized('Invalid mobile number or password.');

  if (admin.status !== 'active') {
    throw ApiError.forbidden('This admin account has been suspended.');
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  await issueSession(admin, req, res);

  res.status(200).json({ success: true, data: admin });
});

// POST /api/admin/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.adminRefreshToken;
  if (!token) throw ApiError.unauthorized('Missing session.');

  const tokenHash = hashToken(token);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Session expired — please sign in again.');
  }

  const admin = await Admin.findById(stored.admin);
  if (!admin || admin.status !== 'active') {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Session expired — please sign in again.');
  }

  // Rotate: revoke the used refresh token, issue a fresh pair.
  stored.revoked = true;
  await stored.save();

  await issueSession(admin, req, res);

  res.status(200).json({ success: true, data: admin });
});

// GET /api/admin/auth/me
//
// This is the ONLY thing that runs on a fresh page load / hard navigation
// (e.g. opening the Edit Product page directly). Before this fix it just
// confirmed the access-token cookie was valid and returned the admin doc —
// it never re-issued a CSRF token. Since `csrfTokenMem` in the frontend's
// api.js is a plain in-memory variable, it resets to null on every reload,
// and the ONLY way it was ever repopulated was via the `csrfToken` field
// in a login/refresh response body. So: valid session, but no CSRF token
// in memory -> first PATCH/POST/DELETE gets a 403 from requireCsrfToken,
// even though the user is fully authenticated.
//
// Fix: issue (rotate) a CSRF token here too, and include it in the body.
// No frontend change is required for this to take effect — api.js's
// rawFetch() already does `if (data.csrfToken) { csrfTokenMem = ... }`
// on every response, login/refresh included, so it picks this up for free
// the next time apiGetMe() runs on app load.
export const getMe = asyncHandler(async (req, res) => {
  const csrfToken = issueCsrfToken(res);
  res.status(200).json({ success: true, data: req.admin, csrfToken });
});

// POST /api/admin/auth/logout
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.adminRefreshToken;
  if (token) {
    await RefreshToken.updateOne({ tokenHash: hashToken(token) }, { revoked: true });
  }
  clearAuthCookies(res);
  res.status(200).json({ success: true, message: 'Logged out.' });
});

// POST /api/admin/auth/logout-all
export const logoutAll = asyncHandler(async (req, res) => {
  await RefreshToken.updateMany({ admin: req.admin._id, revoked: false }, { revoked: true });
  clearAuthCookies(res);
  res.status(200).json({ success: true, message: 'Logged out of all devices.' });
});