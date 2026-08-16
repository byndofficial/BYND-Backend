import crypto from 'crypto';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

const CSRF_COOKIE_NAME = 'adminCsrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';

export const issueCsrfToken = (res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
  });
  return token;
};

export const clearCsrfToken = (res) => {
  res.clearCookie(CSRF_COOKIE_NAME);
};

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