'use strict';

const { sendForbidden } = require('../utils/apiResponse');

/**
 * Blocks any non-GET request from a "review" (dummy/demo) super admin account.
 * Mount after requireSuperAdmin on the admin router so it covers every nested route.
 */
function enforceReviewReadOnly(req, res, next) {
  if (req.user?.access_level === 'review' && req.method !== 'GET') {
    return sendForbidden(res, 'This is a read-only demo account — write access is disabled.');
  }
  next();
}

/**
 * Blocks review accounts from Master Accounting entirely, regardless of method —
 * independent of and in addition to the passcode gate.
 */
function blockReviewFromMasterAccounting(req, res, next) {
  if (req.user?.access_level === 'review') {
    return sendForbidden(res, 'Master Accounting is not available on a demo account.');
  }
  next();
}

function maskPhone(phone) {
  const digits = String(phone);
  if (digits.length <= 4) return '*'.repeat(digits.length);
  return `${digits.slice(0, 2)}${'*'.repeat(digits.length - 4)}${digits.slice(-2)}`;
}

const PHONE_KEYS = new Set(['phone', 'phone_number', 'mobile', 'mobile_number']);

// Only plain {} objects should be walked and rebuilt. Prisma returns non-plain instances
// (Decimal for money fields, Date for timestamps) that rely on their own toJSON() — rebuilding
// them into a plain object here strips that and corrupts them (Date -> {}, Decimal -> garbage).
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && (value.constructor === Object || value.constructor === undefined);
}

function deepMaskPhones(value) {
  if (Array.isArray(value)) return value.map(deepMaskPhones);
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = PHONE_KEYS.has(key) && typeof val === 'string' ? maskPhone(val) : deepMaskPhones(val);
    }
    return out;
  }
  return value;
}

/**
 * Masks customer phone numbers in every JSON response for review accounts —
 * done server-side so it can't be bypassed by reading the raw network response.
 */
function maskSensitiveDataForReview(req, res, next) {
  if (req.user?.access_level !== 'review') return next();
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object' && 'data' in body) {
      body.data = deepMaskPhones(body.data);
    }
    return originalJson(body);
  };
  next();
}

module.exports = { enforceReviewReadOnly, blockReviewFromMasterAccounting, maskSensitiveDataForReview };
