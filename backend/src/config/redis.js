'use strict';

const Redis = require('ioredis');
const env = require('./env');

let redisClient = null;
let redisAvailable = false;

function createRedisClient() {
  const client = new Redis(env.REDIS_URL, {
    // BullMQ requires null — lets commands retry on reconnect instead of throwing immediately
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    // Keep retrying forever with exponential backoff capped at 30s
    retryStrategy(times) {
      const delay = Math.min(Math.pow(2, times) * 500, 30_000);
      return delay;
    },
    // Reconnect when server returns READONLY (failover) or LOADING errors
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'LOADING', 'NOAUTH'];
      return targetErrors.some((e) => err.message.includes(e));
    },
    // Keep connection alive through idle periods
    keepAlive: 10_000,
    connectTimeout: 10_000,
    // No commandTimeout — BullMQ uses long-blocking commands (BRPOP, XREAD)
  });

  client.on('connect', () => {
    console.log('[Redis] Connected');
  });

  client.on('ready', () => {
    redisAvailable = true;
  });

  client.on('error', (err) => {
    redisAvailable = false;
    if (err.code !== 'ECONNREFUSED') {
      console.warn('[Redis] Error:', err.message);
    }
  });

  client.on('close', () => {
    redisAvailable = false;
  });

  client.on('reconnecting', (delay) => {
    console.log(`[Redis] Reconnecting in ${delay}ms...`);
  });

  client.on('end', () => {
    redisAvailable = false;
    console.warn('[Redis] Connection ended — will not reconnect');
  });

  return client;
}

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
