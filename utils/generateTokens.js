// Admin auth token helpers.
//
// - Access token: a short-lived JWT (see env.jwt.accessExpiresIn), signed
//   with JWT_ACCESS_SECRET, carrying { sub: adminId, role }. Sent as an
//   httpOnly cookie (or Authorization header) on every request.
// - Refresh token: NOT a JWT — an opaque random string. Only its SHA-256
//   hash is ever stored (in the RefreshToken collection), alongside a
//   `jti` used to look it up and revoke it (single-session logout or
//   logout-all-devices) without needing the plaintext token again.
//
// This split matters: a JWT refresh token can't be revoked before it
// expires without a blocklist; an opaque token backed by a DB row can be
// revoked instantly by deleting/flagging that row.

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const generateAccessToken = (admin) =>
  jwt.sign({ sub: admin._id.toString(), role: admin.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Returns { token, jti, tokenHash, expiresAt } — persist jti + tokenHash +
// expiresAt on the RefreshToken document; send only `token` to the client.
export const generateRefreshToken = () => {
  const jti = crypto.randomUUID();
  const token = `${jti}.${crypto.randomBytes(48).toString('hex')}`;
  const tokenHash = hashToken(token);

  const durationMs = parseDurationToMs(env.jwt.refreshExpiresIn);
  const expiresAt = new Date(Date.now() + durationMs);

  return { token, jti, tokenHash, expiresAt };
};

// Parses simple duration strings like "30d", "15m", "1h" into milliseconds.
// Only supports the units this project actually uses — not a general-purpose parser.
function parseDurationToMs(duration) {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // fallback: 30 days

  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * unitMs[unit];
}
