'use strict';

require('dotenv').config();

const requiredVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'PAYU_KEY',
  'PAYU_SALT',
  'PAYU_MID',
  'PAYU_BASE_URL',
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

  PAYU_MID: process.env.PAYU_MID,
  PAYU_KEY: process.env.PAYU_KEY,
  PAYU_SALT: process.env.PAYU_SALT,
  // Salt2 is the newer IPN/webhook salt issued from PayU dashboard (optional, but recommended)
  PAYU_SALT2: process.env.PAYU_SALT2 || '',
  PAYU_BASE_URL: process.env.PAYU_BASE_URL || 'https://test.payu.in',

  SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || 'admin@example.com',
  SUPERADMIN_PASSWORD: process.env.SUPERADMIN_PASSWORD || 'Admin@123',
  SUPERADMIN_NAME: process.env.SUPERADMIN_NAME || 'Super Admin',

  STORAGE_BASE_URL: process.env.STORAGE_BASE_URL || 'http://localhost:5000/uploads',

  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
};

module.exports = env;
