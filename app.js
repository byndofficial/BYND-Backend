import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import env from './config/env.js';
import logger from './utils/logger.js';
import sanitize from './middleware/sanitize.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import requireCsrfToken from './middleware/csrf.js';
import apiRouter from './routes/index.js';
import { handleWebhook } from './routes/payment.routes.js';


const app = express();

// Trust the first proxy hop (Render/most PaaS sit behind one) — needed
// for correct client IPs in rate limiting and logging.
app.set('trust proxy', 1);

// ---------- Security headers ----------
app.use(helmet());

// ---------- CORS — explicit allowlist, never a wildcard ----------
// Only the two known frontend origins may call this API with credentials
// (cookies). Anything else is rejected by the browser's preflight check.
const allowedOrigins = [env.storefrontOrigin, env.adminOrigin];

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no Origin header, e.g. server-to-server
      // health checks) and any explicitly allowed origin.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials: true,
  }),
);

// ---------- Body parsing ----------
// Razorpay webhook signature verification needs the RAW body, so that
// route (once added under /api/payments/webhook) must use
// express.raw({ type: 'application/json' }) on itself, mounted BEFORE this
// json() parser runs on it — see routes/payment.routes.js when it's built.
// 15mb — several routes (product/category/hero-slide/size-chart image
// uploads) send images as base64 data URLs inside JSON bodies. Base64
// inflates payload size by ~33%, and admins can submit multiple images in
// one request (e.g. a product with several color variants), so 2mb was too
// tight and caused spurious 413s on real uploads. Prefer true multipart
// (middleware/upload.js) for any new image-upload route instead of raising
// this further.
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// ---------- Sanitization ----------
app.use(sanitize);

// ---------- Request logging ----------
app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ---------- Rate limiting (general tier; auth/sensitive tiers applied
// per-route once those routes exist) ----------
app.use(generalLimiter);

// ---------- CSRF (admin panel only — it's the only cookie-based session;
// the storefront uses Bearer tokens, which aren't riddable by CSRF) ----------
// Excludes login/refresh: the CSRF cookie doesn't exist yet before the
// first successful login, and refresh is itself how a stale/missing CSRF
// cookie gets reissued. Every other mutating /api/admin/* route requires it.
app.use((req, res, next) => {
  const isExemptAuthRoute =
    req.path === '/api/admin/auth/login' || req.path === '/api/admin/auth/refresh';
  if (!req.path.startsWith('/api/admin') || isExemptAuthRoute) {
    next();
    return;
  }
  requireCsrfToken(req, res, next);
});

// ---------- Health check (no auth, no rate-limit tier concerns) ----------
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', env: env.nodeEnv, timestamp: new Date().toISOString() });
});

// ---------- API routes ----------
app.use('/api', apiRouter);

// ---------- 404 + centralized error handling (must be last) ----------
app.use(notFound);
app.use(errorHandler);

export default app;