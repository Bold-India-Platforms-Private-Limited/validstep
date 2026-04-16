'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { sendUnauthorized, sendForbidden } = require('../utils/apiResponse');

/**
 * Base authentication middleware - verifies JWT access token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendUnauthorized(res, 'Access token required');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return sendUnauthorized(res, 'Invalid or expired access token');
  }

  req.user = decoded;
  next();
}

/**
 * Require superadmin role
 */
function requireSuperAdmin(req, res, next) {
  authenticate(req, res, () => {
    if (req.user.role !== 'superadmin') {
      return sendForbidden(res, 'Super admin access required');
    }
    next();
  });
}

/**
 * Require company role
 */
function requireCompany(req, res, next) {
  authenticate(req, res, () => {
    if (req.user.role !== 'company') {
      return sendForbidden(res, 'Company account access required');
    }
    next();
  });
}

/**
 * Require user role
 */
function requireUser(req, res, next) {
  authenticate(req, res, () => {
    if (req.user.role !== 'user') {
      return sendForbidden(res, 'User account access required');
    }
    next();
  });
}

/**
 * Allow multiple roles
 */
function requireRoles(...roles) {
  return function (req, res, next) {
    authenticate(req, res, () => {
      if (!roles.includes(req.user.role)) {
        return sendForbidden(res, `Access restricted. Required roles: ${roles.join(', ')}`);
      }
      next();
    });
  };
}

/**
 * Optional authentication - attaches user if token present, continues without error
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);
  req.user = decoded || null;
  next();
}

module.exports = {
  authenticate,
  requireSuperAdmin,
  requireCompany,
  requireUser,
  requireRoles,
  optionalAuth,
};
