const config = require('../config/env');

/**
 * Centralized Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  // Avoid sending another response if headers are already committed
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  // In test or production, suppress verbose stack trace in client JSON
  const response = {
    success: false,
    error: message
  };

  if (config.nodeEnv === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
