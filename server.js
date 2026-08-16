import env from './config/env.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import app from './app.js';
import { startScheduledJobs, stopScheduledJobs } from './jobs/scheduler.js';

let server;

const start = async () => {
  // Connect to MongoDB BEFORE accepting any HTTP traffic — there is no
  // useful degraded mode where the API is up but the database isn't.
  await connectDB();

  server = app.listen(env.port, () => {
    logger.info(`BYND backend listening on port ${env.port} [${env.nodeEnv}]`);
  });

  startScheduledJobs();
};

// ---------- Graceful shutdown ----------
const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully...`);
  stopScheduledJobs();
  if (!server) {
    process.exit(0);
    return;
  }
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });

  // Force-exit if connections don't close in time.
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ---------- Never let an unexpected error kill the process silently ----------
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});

start();