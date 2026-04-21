'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const env = require('./config/env');
const { isRedisAvailable } = require('./config/redis');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// Route modules
const authRoutes = require('./modules/auth/auth.routes');
const companyRoutes = require('./modules/company/company.routes');
const { companyRouter: batchCompanyRoutes, publicRouter: batchPublicRoutes } = require('./modules/batch/batch.routes');
const { publicRouter: certPublicRoutes, userRouter: certUserRoutes } = require('./modules/certificate/certificate.routes');
const paymentRoutes = require('./modules/payment/payment.routes');
const userRoutes = require('./modules/user/user.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// ─── CORS ───────────────────────────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (env.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ─── Body Parsing ───────────────────────────────────────────────────────────
// 1mb is sufficient for all auth/payment/batch JSON payloads
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ─── Compression ────────────────────────────────────────────────────────────
// Only compress responses larger than 1kb — small payloads not worth the CPU
app.use(compression({ threshold: 1024 }));

// ─── Logging ────────────────────────────────────────────────────────────────
if (env.isDev) {
  app.use(morgan('dev'));
} else {
  // In production: skip health-check spam, log only non-200 or slow requests
  app.use(morgan('combined', {
    skip: (req, res) => req.path === '/health' && res.statusCode === 200,
  }));
}

// ─── Trust Proxy (for accurate IP behind nginx/load balancer) ───────────────
app.set('trust proxy', 1);

// ─── Static Files (certificate PDFs) ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d',      // browser caches static assets for 1 day
  etag: true,
  lastModified: true,
}));

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      redis: isRedisAvailable() ? 'connected' : 'unavailable',
    },
    error: null,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/company/batches', batchCompanyRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user/certificates', certUserRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/public', batchPublicRoutes);
app.use('/api/public', certPublicRoutes);
app.use('/api/admin', adminRoutes);

// ─── Error Handling ──────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
