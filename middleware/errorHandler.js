import env from '../config/env.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';

// Must be registered LAST, after all routes and notFound — Express
// recognizes it as an error handler purely by its 4-argument signature.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Normalize known third-party error shapes into ApiError so the
  // response format is always identical to the client.
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;

    if (error.name === 'ValidationError') {
      // Mongoose schema validation error
      const messages = Object.values(error.errors || {}).map((e) => e.message);
      error = new ApiError(400, 'Validation failed', messages, error.stack);
    } else if (error.code === 11000) {
      // Mongoose duplicate key error
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      error = new ApiError(409, `${field} already in use`, [], error.stack);
    } else if (error.name === 'CastError') {
      error = new ApiError(400, `Invalid ${error.path}: ${error.value}`, [], error.stack);
    } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      error = new ApiError(401, 'Invalid or expired session', [], error.stack);
    } else {
      error = new ApiError(statusCode, error.message || 'Something went wrong', [], error.stack);
    }
  }

  // Unexpected (non-operational) errors always get logged loudly —
  // operational ones (bad input, 404s) are expected traffic, not incidents.
  if (!error.isOperational || error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${error.message}`, error.stack);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    errors: error.errors?.length ? error.errors : undefined,
    // Stack traces never leak to the client in production.
    stack: env.isProduction ? undefined : error.stack,
  });
};

export default errorHandler;
