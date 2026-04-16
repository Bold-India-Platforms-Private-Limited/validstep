'use strict';

const { PrismaClient } = require('@prisma/client');

let prisma;

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
      errorFormat: 'minimal',
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
