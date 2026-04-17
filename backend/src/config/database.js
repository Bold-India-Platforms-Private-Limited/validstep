'use strict';

const { PrismaClient } = require('@prisma/client');

let prisma;

function getPrismaClient() {
  if (!prisma) {
    // With Neon's PgBouncer pooler (already in DATABASE_URL), Prisma uses
    // connection_limit to cap per-instance connections.
    // PM2 cluster × 4 workers × 5 connections = 20 total (well within Neon limits).
    // Neon free tier: 10 max, paid: 100+
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
      errorFormat: 'minimal',
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    prisma.$connect().catch((err) => {
      console.error('Failed to connect to database:', err.message);
      process.exit(1);
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
