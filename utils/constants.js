// Single source of truth for enums/constants shared across the codebase —
// and, via a lightweight public endpoint (see routes/product.routes.js),
// shared with BOTH frontends too. Editing a color here updates the admin
// product form's color picker and the storefront's filter swatches
// identically, with no risk of the two drifting apart.

export const PRODUCT_COLORS = [
  { id: 'black', name: 'Black', hex: '#000000' },
  { id: 'navy-blue', name: 'Navy Blue', hex: '#00080f' },
  { id: 'gray', name: 'Gray', hex: '#c3c3c3' },
  { id: 'charcoal', name: 'Charcoal', hex: '#6e6e6e' },
  { id: 'yellow', name: 'Yellow', hex: '#ffe381' },
  { id: 'bottle-green', name: 'Bottle Green', hex: '#021705' },
  { id: 'royal-blue', name: 'Royal Blue', hex: '#0b1442' },
  { id: 'red', name: 'Red', hex: '#a6050a' },
  { id: 'maroon', name: 'Maroon', hex: '#290005' },
  { id: 'purple', name: 'Purple', hex: '#1f0a29' },
  { id: 'green', name: 'Green', hex: '#0f871d' },
  { id: 'new-yellow', name: 'New Yellow', hex: '#ffe32e' },
  { id: 'orange', name: 'Orange', hex: '#ff4d0d' },
  { id: 'golden-yellow', name: 'Golden Yellow', hex: '#ffa630' },
  { id: 'brown', name: 'Brown', hex: '#100606' },
  { id: 'petrol-blue', name: 'Petrol Blue', hex: '#00191f' },
  { id: 'brick-red', name: 'Brick Red', hex: '#590906' },
  { id: 'steel-grey', name: 'Steel Grey', hex: '#202224' },
  { id: 'olive-green', name: 'Olive Green', hex: '#1c1c09' },
  { id: 'mustard-yellow', name: 'Mustard Yellow', hex: '#b36e00' },
  { id: 'baby-pink', name: 'Baby Pink', hex: '#ffd6ea' },
  { id: 'lavender', name: 'Lavender', hex: '#ebdeff' },
  { id: 'beige', name: 'Beige', hex: '#ebc078' },
  { id: 'white', name: 'White', hex: '#ffffff' },
  { id: 'copper-red', name: 'Copper Red', hex: '#7d311b' },
  { id: 'flamingo-pink', name: 'Flamingo Pink', hex: '#ffa6b2' },
  { id: 'mushroom', name: 'Mushroom', hex: '#b38b82' },
  { id: 'jade', name: 'Jade', hex: '#abd4a7' },
  { id: 'baby-blue', name: 'Baby Blue', hex: '#bff0ff' },
  { id: 'coral-red', name: 'Coral Red', hex: '#a33c3e' },
  { id: 'mint', name: 'Mint', hex: '#c7fff8' },
  { id: 'peach', name: 'Peach', hex: '#ffd7b8' },
  { id: 'off-white', name: 'Off White', hex: '#fffae7' },
    { id: 'black-melange', name: 'Black Melange', hex: '#25262a' },
  { id: 'navy-melange', name: 'Navy Melange', hex: '#0a1525' },
  { id: 'purple-melange', name: 'Purple Melange', hex: '#3f2e44' },
];

export const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

export const ORDER_STATUSES = [
  'processing',
  'confirmed',
  'shipped',
  'out-for-delivery',
  'delivered',
  'cancelled',
];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'cod'];

export const ADMIN_ROLES = ['super_admin', 'admin'];

export const AUTH_PROVIDERS = ['mobile-otp', 'google'];

export const DISCOUNT_TYPES = ['percent', 'flat'];

// Rate-limit tiers referenced by middleware/rateLimiter.js.
export const RATE_LIMIT_TIERS = {
  GENERAL: 'general', // most GET/browse traffic
  AUTH: 'auth', // login/OTP endpoints — brute-force sensitive
  SENSITIVE: 'sensitive', // account deletion, password change, payments
};