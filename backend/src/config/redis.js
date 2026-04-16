'use strict';

const Redis = require('ioredis');
const env = require('./env');

let redisClient = null;
let redisAvailable = false;

function createRedisClient() {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 0,       // Don't retry commands — fail fast
    enableReadyCheck: false,
    lazyConnect: true,             // Don't connect immediately
    retryStrategy(times) {
      if (times > 3) return null;  // Stop retrying after 3 attempts
      return Math.min(times * 500, 2000);
    },
    reconnectOnError: () => false, // Don't reconnect on command errors
  });

  client.on('connect', () => {
    redisAvailable = true;
    console.log('[Redis] Connected');
  });

  client.on('ready', () => {
    redisAvailable = true;
  });

  client.on('error', (err) => {
    redisAvailable = false;
    // Only log once, not every retry
    if (err.code === 'ECONNREFUSED') {
      // Suppress repeated ECONNREFUSED noise
    } else {
      console.warn('[Redis] Error:', err.message);
    }
  });

  client.on('close', () => {
    redisAvailable = false;
  });

  client.on('end', () => {
    redisAvailable = false;
  });

  return client;
}

// Attempt connection — but don't crash if Redis is unavailable
async function initRedis() {
  try {
    redisClient = createRedisClient();
    await redisClient.connect();
  } catch {
    console.warn('[Redis] Not available — running without Redis (rate limiting uses memory fallback)');
    redisAvailable = false;
  }
}

function getRedisClient() {
  return redisClient;
}

function isRedisAvailable() {
  return redisAvailable && redisClient && redisClient.status === 'ready';
}

async function redisGet(key) {
  if (!isRedisAvailable()) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
}

async function redisSet(key, value, ttlSeconds) {
  if (!isRedisAvailable()) return false;
  try {
    if (ttlSeconds) {
      await redisClient.setex(key, ttlSeconds, value);
    } else {
      await redisClient.set(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

async function redisDel(key) {
  if (!isRedisAvailable()) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch {
    return false;
  }
}

async function redisExists(key) {
  if (!isRedisAvailable()) return false;
  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch {
    return false;
  }
}

async function disconnectRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      // ignore
    }
  }
}

// Singleton export — call initRedis() once at startup
module.exports = {
  initRedis,
  getRedisClient,
  isRedisAvailable,
  redisGet,
  redisSet,
  redisDel,
  redisExists,
  disconnectRedis,
};
