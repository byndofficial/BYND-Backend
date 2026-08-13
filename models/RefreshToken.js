import mongoose from 'mongoose';

// Backs admin refresh-token revocation. Only a SHA-256 hash of the token
// is ever stored (see utils/generateTokens.js) — the plaintext token is
// sent to the client once and never persisted. `jti` is the lookup key
// used to revoke a single session ("log out this device") independent of
// having the plaintext token again; `revoked` supports "log out everywhere"
// by flagging every row for an admin at once instead of deleting them
// (keeps a short audit trail of past sessions).
//
// The TTL index on `expiresAt` lets MongoDB garbage-collect rows itself
// once a refresh token has expired — no separate cleanup cron needed for
// this collection specifically.
const refreshTokenSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    jti: { type: String, required: true, unique: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
