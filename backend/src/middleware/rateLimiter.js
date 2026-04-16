'use strict';

const rateLimit = require('express-rate-limit');
const { isRedisAvailable, getRedisClient } = require('../config/redis');

/**
 * Create a rate limiter — uses Redis store if available, falls back to in-memory
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later',
    keyPrefix = 'rl',
    skipSuccessfulRequests = false,
  } = options;

  // Build store only when Redis is actually available at request time
  const getLimiter = () => {
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
      keyGenerator: (req) => req.user?.id || req.ip,
    };

    if (isRedisAvailable()) {
      try {
        const { RedisStore } = require('rate-limit-redis');
        const client = getRedisClient();
        limiterOptions.store = new RedisStore({
          sendCommand: (...args) => client.call(...args),
          prefix: `${keyPrefix}:`,
        });
      } catch {
        // Fall through to memory store
      }
    }

    return rateLimit(limiterOptions);
  };

  // Return a middleware that creates the appropriate limiter dynamically
  let _limiter = null;
  return (req, res, next) => {
    if (!_limiter) {
      _limiter = getLimiter();
    }
    _limiter(req, res, next);
  };
}

// General API rate limiter - 100 requests per 15 minutes
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyPrefix: 'rl:general',
});

// Auth rate limiter - 10 attempts per 15 minutes
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again after 15 minutes',
  keyPrefix: 'rl:auth',
});

// Payment rate limiter - 5 payment attempts per 10 minutes
const paymentLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many payment attempts, please try again after 10 minutes',
  keyPrefix: 'rl:payment',
});

// Strict rate limiter for sensitive operations - 5 per 15 minutes
const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'rl:strict',
});

module.exports = {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  paymentLimiter,
  strictLimiter,
};
