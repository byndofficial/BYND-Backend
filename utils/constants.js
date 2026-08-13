// Single source of truth for enums/constants shared across the codebase —
// and, via a lightweight public endpoint (see routes/product.routes.js),
// shared with BOTH frontends too. Editing a color here updates the admin
// product form's color picker and the storefront's filter swatches
// identically, with no risk of the two drifting apart.

export const PRODUCT_COLORS = [
  { id: 'black', name: 'Black', hex: '#000000' },
  { id: 'white', name: 'White', hex: '#ffffff' },
  { id: 'gray', name: 'Gray', hex: '#9e9e9e' },
  { id: 'beige', name: 'Beige', hex: '#d8c3a5' },
  { id: 'navy', name: 'Navy', hex: '#1b2a4a' },
  { id: 'red', name: 'Red', hex: '#b3261e' },
  { id: 'green', name: 'Green', hex: '#3f7d4e' },
  { id: 'yellow', name: 'Yellow', hex: '#ffcc00' },
];

export const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const ORDER_STATUSES = [
  'processing',
  'confirmed',
  'shipped',
  'out-for-delivery',
  'delivered',
  'cancelled',
];

export const PAYMENT_STATUSES = ['pending', 'paid', 'refunded', 'cod'];

export const ADMIN_ROLES = ['super_admin', 'admin'];

export const AUTH_PROVIDERS = ['mobile-otp', 'google'];

export const DISCOUNT_TYPES = ['percent', 'flat'];

// Rate-limit tiers referenced by middleware/rateLimiter.js.
export const RATE_LIMIT_TIERS = {
  GENERAL: 'general', // most GET/browse traffic
  AUTH: 'auth', // login/OTP endpoints — brute-force sensitive
  SENSITIVE: 'sensitive', // account deletion, password change, payments
};
