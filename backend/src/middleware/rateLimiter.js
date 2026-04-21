'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient, isRedisAvailable } = require('../config/redis');

function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    keyGenerator = (req) => req.user?.id || req.ip,
    prefix = 'rl',
  } = options;

  const limiterOptions = {
    windowMs,
    max,
    message: {
      success: false,
      message,
      data: null,
      error: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator,
  };

  // Use Redis store in production so limits are shared across cluster workers
  if (isRedisAvailable()) {
    limiterOptions.store = new RedisStore({
      sendCommand: (...args) => getRedisClient().call(...args),
      prefix: `${prefix}:`,
    });
  }

  return rateLimit(limiterOptions);
}

// General API: 300 req / 15 min per user/IP
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  prefix: 'rl:general',
});

// Auth: 30 failed attempts / 15 min — only failed attempts count
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true,
  prefix: 'rl:auth',
});

// Payment initiation: 20 / 10 min
const paymentLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many payment attempts, please try again after 10 minutes',
  prefix: 'rl:payment',
});

// Webhook: 500 / min per IP — PayU may batch-retry during outage recovery
const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 500,
  message: 'Webhook rate limit exceeded',
  keyGenerator: (req) => req.ip,
  prefix: 'rl:webhook',
});

// Strict: 10 / 15 min — password reset, sensitive ops
const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: 'rl:strict',
});

module.exports = {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  paymentLimiter,
  webhookLimiter,
  strictLimiter,
};
