'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate an access token (15 min)
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
    issuer: 'validstep.com',
  });
}

/**
 * Generate a refresh token (7 days)
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
    issuer: 'validstep.com',
  });
}

/**
 * Verify an access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'validstep.com',
    });
  } catch (err) {
    return null;
  }
}

/**
 * Verify a refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'validstep.com',
    });
  } catch (err) {
    return null;
  }
}

/**
 * Generate both tokens for a user
 */
function generateTokenPair(payload) {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
}

/**
 * Set refresh token as httpOnly cookie
 */
function setRefreshTokenCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clear refresh token cookie
 */
function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
  });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};
