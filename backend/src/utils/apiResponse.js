'use strict';

/**
 * Send a successful response
 */
function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    error: null,
  });
}

/**
 * Send an error response
 */
function sendError(res, message = 'An error occurred', statusCode = 500, error = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error: error || message,
  });
}

/**
 * Send a created response (201)
 */
function sendCreated(res, data = null, message = 'Created successfully') {
  return sendSuccess(res, data, message, 201);
}

/**
 * Send a not found response (404)
 */
function sendNotFound(res, message = 'Resource not found') {
  return sendError(res, message, 404);
}

/**
 * Send an unauthorized response (401)
 */
function sendUnauthorized(res, message = 'Unauthorized') {
  return sendError(res, message, 401);
}

/**
 * Send a forbidden response (403)
 */
function sendForbidden(res, message = 'Forbidden') {
  return sendError(res, message, 403);
}

/**
 * Send a bad request response (400)
 */
function sendBadRequest(res, message = 'Bad request', error = null) {
  return sendError(res, message, 400, error);
}

module.exports = {
  sendSuccess,
  sendError,
  sendCreated,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendBadRequest,
};
