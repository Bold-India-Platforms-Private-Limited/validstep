'use strict';

const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { sendForbidden, sendSuccess } = require('../../utils/apiResponse');

const COOKIE_NAME = 'master_accounting_session';
const SCOPE = 'master-accounting';
const SESSION_EXPIRY = '8h';

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function setGateCookie(res, userId) {
  const token = jwt.sign({ sub: userId, scope: SCOPE }, env.JWT_ACCESS_SECRET, {
    expiresIn: SESSION_EXPIRY,
    issuer: 'validstep.com',
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearGateCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
  });
}

function verifyGateCookie(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return false;
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'validstep.com' });
    // Tie the gate token to the currently logged-in admin so it can't outlive their
    // superadmin session or be replayed by a different account sharing the cookie jar.
    return payload.scope === SCOPE && payload.sub === req.user?.id;
  } catch {
    return false;
  }
}

/** Mounted on every /master-accounting route except /unlock and /gate-status. */
function requireMasterAccountingPasscode(req, res, next) {
  if (!verifyGateCookie(req)) {
    return sendForbidden(res, 'Master Accounting passcode required');
  }
  next();
}

function unlock(req, res) {
  const { dob } = req.body;
  if (onlyDigits(dob) !== onlyDigits(env.MASTER_ACCOUNTING_PASSCODE)) {
    return sendForbidden(res, 'Incorrect passcode');
  }
  setGateCookie(res, req.user.id);
  return sendSuccess(res, { unlocked: true }, 'Master Accounting unlocked');
}

function gateStatus(req, res) {
  return sendSuccess(res, { unlocked: verifyGateCookie(req) }, 'Gate status');
}

function lock(req, res) {
  clearGateCookie(res);
  return sendSuccess(res, { unlocked: false }, 'Master Accounting locked');
}

module.exports = { requireMasterAccountingPasscode, unlock, gateStatus, lock };
