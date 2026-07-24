'use strict';

require('dotenv').config();

const requiredVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

function validateEnv() {
  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateEnv();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),

  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d',

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
  APP_DOMAIN: process.env.APP_DOMAIN || 'localhost',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim()),

  SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || 'admin@example.com',
  SUPERADMIN_PASSWORD: process.env.SUPERADMIN_PASSWORD || 'Admin@123',
  SUPERADMIN_NAME: process.env.SUPERADMIN_NAME || 'Super Admin',

  // Secondary confirmation gate for the Master Accounting panel — entered after the
  // superadmin is already authenticated, so this is a UX/scoping gate, not the primary
  // security boundary. Configurable via env so it can be changed without a code deploy.
  MASTER_ACCOUNTING_PASSCODE: process.env.MASTER_ACCOUNTING_PASSCODE || '11-09-2025',

  STORAGE_BASE_URL: process.env.STORAGE_BASE_URL || 'http://localhost:5000/uploads',

  // No GSTIN yet. Once registered, set both — invoices only show a GST breakdown for
  // orders paid on/after GST_EFFECTIVE_FROM, so past invoices never retroactively gain
  // GST just because they're re-downloaded after registration (see invoiceGenerator.js).
  COMPANY_GSTIN: process.env.COMPANY_GSTIN || '',
  COMPANY_GST_EFFECTIVE_FROM: process.env.COMPANY_GST_EFFECTIVE_FROM || '',
  COMPANY_PAN: process.env.COMPANY_PAN || '',
  COMPANY_ADDRESS: process.env.COMPANY_ADDRESS || '',

  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
};

module.exports = env;
