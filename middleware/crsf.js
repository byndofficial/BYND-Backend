import crypto from 'crypto';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

// Double-submit-cookie CSRF protection for the admin panel's cookie-based
// session. The strict CORS allowlist already blocks cross-origin `fetch`
// requests from ever completing, but that isn't a full CSRF defense — a
// same-site or non-preflighted form-style request could still ride the
// admin's cookies. This closes that gap without changing the auth model:
// no server-side session store, no extra round trip for the client.
//
// Flow:
// 1. issueCsrfToken sets a random, non-httpOnly token in an
//    "adminCsrfToken" cookie (readable by admin frontend JS) right
//    alongside the httpOnly session cookies, on login/refresh.
// 2. The admin frontend reads that cookie and sends it back on every
//    mutating request as the "x-csrf-token" header.
// 3. requireCsrfToken (mounted after verifyAdminToken) rejects the
//    request unless the header matches the cookie — a cross-site
//    attacker can ride the cookies automatically but can't read them to
//    forge the matching header.

const CSRF_COOKIE_NAME = 'adminCsrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';

export const issueCsrfToken = (res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // must be readable by admin frontend JS to echo back
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    // No explicit expiry — lives for the browser session, refreshed on
    // every login/refresh call anyway.
  });
  return token;
};

export const clearCsrfToken = (res) => {
  res.clearCookie(CSRF_COOKIE_NAME);
};

// Only state-changing methods need the check — GETs can't mutate anything
// and browsers don't attach custom headers to simple cross-site GETs anyway.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const requireCsrfToken = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    next(ApiError.forbidden('Missing or invalid CSRF token.'));
    return;
  }

  next();
};

export default requireCsrfToken;