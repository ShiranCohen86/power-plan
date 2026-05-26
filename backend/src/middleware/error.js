const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
module.exports = function errorMiddleware(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.name === 'ValidationError') {
    status = 400;
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    message = 'Validation failed';
  }
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    status = 400;
    message = 'Invalid ID format';
  }
  if (err.code === 11000) {
    status = 409;
    details = err.keyValue;
    message = 'Duplicate key';
  }
  if (err.isJoi) {
    status = 400;
    details = err.details?.map((d) => ({ path: d.path.join('.'), message: d.message }));
    message = 'Validation failed';
  }

  if (status >= 500) {
    logger.error('Server error', { err: err.message, stack: err.stack, path: req.originalUrl });
  } else {
    logger.warn('Client error', { status, message, path: req.originalUrl });
  }

  res.status(status).json({
    error: message,
    details,
    ...(env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
};

module.exports.ApiError = ApiError;
