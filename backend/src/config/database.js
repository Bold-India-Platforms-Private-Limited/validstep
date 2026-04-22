'use strict';

const { PrismaClient } = require('@prisma/client');

// Neon serverless DB can take 2-5s to wake from suspension.
// Retry transient connection errors (P1001, P1002, P1008) up to 3 times.
const RETRYABLE_CODES = new Set(['P1001', 'P1002', 'P1008']);
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let prisma;

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
      errorFormat: 'minimal',
      datasources: { db: { url: process.env.DATABASE_URL } },
    });

    // $use middleware to retry on transient Neon cold-start errors
    prisma.$use(async (params, next) => {
      let lastErr;
      for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
          return await next(params);
        } catch (err) {
          lastErr = err;
          if (RETRYABLE_CODES.has(err?.code) && attempt < RETRY_ATTEMPTS) {
            console.warn(`[DB] Transient error ${err.code} on attempt ${attempt}, retrying in ${RETRY_DELAY_MS * attempt}ms…`);
            await sleep(RETRY_DELAY_MS * attempt);
          } else {
            throw err;
          }
        }
      }
      throw lastErr;
    });

    prisma.$connect().catch((err) => {
      // Non-fatal on startup — Neon may still be waking up; first query will retry
      console.warn('[DB] Initial connect warning:', err.message);
    });
  }
  return prisma;
}

const db = getPrismaClient();

async function disconnectDB() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

module.exports = { db, disconnectDB };
