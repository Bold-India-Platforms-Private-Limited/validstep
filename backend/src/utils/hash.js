'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with a hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token (hex string)
 */
function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a SHA256 hash
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a SHA512 hash
 */
function sha512(data) {
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Generate a unique verification hash for certificates
 */
function generateVerificationHash(certificateSerial, userId, batchId) {
  const data = `${certificateSerial}:${userId}:${batchId}:${Date.now()}:${generateRandomToken(8)}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomToken,
  sha256,
  sha512,
  generateVerificationHash,
};
