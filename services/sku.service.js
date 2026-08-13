import ProductFamily from '../models/ProductFamily.js';

// Server-side counterpart to generateStyleCode/generateSku/
// buildVariantDisplayName in adminProductStore.js. The frontend versions
// are UX-only starting suggestions the admin can overwrite — this is the
// one place that actually enforces uniqueness, since two admins could
// generate the same suggestion at the same time.

// "Panda Print Oversized Tee" -> "POT-427" — a starting suggestion only,
// re-rolled if it happens to collide with an existing styleCode.
export const generateStyleCode = async (baseName) => {
  const initials = (baseName || '')
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 3);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = Math.floor(100 + Math.random() * 900);
    const candidate = initials ? `${initials}-${suffix}` : `SKU-${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    const taken = await ProductFamily.exists({ styleCode: candidate });
    if (!taken) return candidate;
  }
  // Extremely unlikely fallback — timestamp guarantees uniqueness.
  return `${initials || 'SKU'}-${Date.now().toString().slice(-6)}`;
};

const colorAbbr = (colorName) =>
  (colorName || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3) || 'CLR';

// e.g. buildSku('TS-001', 'Red', 'XS') -> 'TS001-RED-XS'
export const buildSku = (styleCode, colorName, size) => {
  const prefix = (styleCode || 'SKU').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `${prefix}-${colorAbbr(colorName)}-${size}`;
};

// "Black" + "Car Print T-Shirt" -> "Black Car Print T-Shirt" — never typed
// by hand, so it can't drift out of sync with the base product name.
export const buildVariantDisplayName = (baseName, colorName) => {
  const trimmedBase = (baseName || '').trim();
  if (!colorName) return trimmedBase;
  if (!trimmedBase) return colorName;
  return `${colorName} ${trimmedBase}`;
};

// True uniqueness check — every size's SKU must be globally unique across
// ALL product families, since ProductFamily's schema enforces this at the
// field level too; this lets a controller check before attempting a save
// and return a clean validation error instead of a raw duplicate-key one.
export const isSkuTaken = async (sku, excludeFamilyId = null) => {
  const query = { 'variants.sizes.sku': sku.trim().toUpperCase() };
  if (excludeFamilyId) query._id = { $ne: excludeFamilyId };
  return ProductFamily.exists(query);
};

export const isStyleCodeTaken = async (styleCode, excludeFamilyId = null) => {
  const query = { styleCode: styleCode.trim().toUpperCase() };
  if (excludeFamilyId) query._id = { $ne: excludeFamilyId };
  return ProductFamily.exists(query);
};