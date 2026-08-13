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
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

app.use(express.json());
app.use('/api', routes);

// ---------- Sanitization ----------
app.use(sanitize);

// ---------- Request logging ----------
app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ---------- Rate limiting (general tier; auth/sensitive tiers applied
// per-route once those routes exist) ----------
app.use(generalLimiter);

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
