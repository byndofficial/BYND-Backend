// Minimal leveled logger — no external dependency needed at this scale.
// Swap the body of each level for a real transport (e.g. pino/winston with
// a log-drain) if/when volume justifies it; every call site already goes
// through this one module, so that swap never touches business logic.
import env from '../config/env.js';

const timestamp = () => new Date().toISOString();

const logger = {
  info: (...args) => {
    // eslint-disable-next-line no-console
    console.log(`[INFO]  ${timestamp()} —`, ...args);
  },
  warn: (...args) => {
    // eslint-disable-next-line no-console
    console.warn(`[WARN]  ${timestamp()} —`, ...args);
  },
  error: (...args) => {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${timestamp()} —`, ...args);
  },
  debug: (...args) => {
    if (env.isProduction) return;
    // eslint-disable-next-line no-console
    console.debug(`[DEBUG] ${timestamp()} —`, ...args);
  },
};

export default logger;
