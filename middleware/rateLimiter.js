import rateLimit from 'express-rate-limit';
import ApiError from '../utils/ApiError.js';

// Shared handler so every tier returns the same ApiError JSON shape
// instead of express-rate-limit's default plain-text response.
const rateLimitHandler = (req, res, next) => {
  next(new ApiError(429, 'Too many requests — please try again shortly.'));
};

// GENERAL — most browse/read traffic. Generous, mainly to blunt scraping
// and accidental client-side retry storms.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// AUTH — login, OTP send/verify, admin login. Tight, since these are the
// classic brute-force / OTP-spam targets.
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// SENSITIVE — account deletion, password/credential changes, payment
// creation/verification. Tighter still, and short-windowed so a genuine
// user isn't locked out long after a mistaken attempt.
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// COUPON — public coupon-code validation (POST /discounts/validate).
// Unauthenticated and previously only covered by the generous general
// tier, which is enough requests to grind through short/guessable codes.
// Tight enough to stop brute-forcing, loose enough that a real shopper
// mistyping a code a few times never gets blocked.
export const couponLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});