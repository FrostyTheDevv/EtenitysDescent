// src/utils/errorHandler.js

import logger from './logger.js';

/**
 * Express error‐handling middleware.
 * Catches any errors passed down the middleware chain,
 * logs them, and sends a standardized JSON response.
 *
 * Usage:
 *   app.use(errorHandler);
 */
export function errorHandler(err, req, res, next) {
  // 1. Log the full error (stack trace) for debugging
  logger.error(`Error processing ${req.method} ${req.originalUrl}`, err);

  // 2. Determine status code
  const status = err.statusCode && Number.isInteger(err.statusCode)
    ? err.statusCode
    : 500;

  // 3. Prepare response payload
  const payload = {
    success: false,
    error: err.message || 'Internal Server Error'
  };

  // 4. In development, include stack trace
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  // 5. Send JSON response
  res.status(status).json(payload);
}

export default errorHandler;