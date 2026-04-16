'use strict';

const env = require('../config/env');

/**
 * 404 handler - route not found
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null,
    error: 'NOT_FOUND',
  });
}

/**
 * Global error handler
 */
function globalErrorHandler(err, req, res, next) {
  console.error('[Error]', {
    message: err.message,
    stack: env.isDev ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Prisma errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
      data: null,
      error: 'DUPLICATE_ENTRY',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found',
      data: null,
      error: 'NOT_FOUND',
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Related record not found',
      data: null,
      error: 'FOREIGN_KEY_VIOLATION',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      data: null,
      error: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      data: null,
      error: 'TOKEN_EXPIRED',
    });
  }

  // Validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: null,
      error: err.errors,
    });
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large',
      data: null,
      error: 'FILE_TOO_LARGE',
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    message: env.isProd && statusCode === 500 ? 'Internal server error' : message,
    data: null,
    error: env.isDev ? err.stack : message,
  });
}

module.exports = { notFoundHandler, globalErrorHandler };
