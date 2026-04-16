'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const env = require('./config/env');
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
    // Allow requests with no origin (mobile apps, curl, etc.)
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Compression ────────────────────────────────────────────────────────────
app.use(compression());

// ─── Logging ────────────────────────────────────────────────────────────────
if (env.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Trust Proxy (for accurate IP behind nginx/load balancer) ───────────────
app.set('trust proxy', 1);

// ─── Static Files (certificate PDFs) ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
    error: null,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────

// Auth routes (no global auth required)
app.use('/api/auth', authRoutes);

// Company routes (requires company auth)
app.use('/api/company', companyRoutes);

// Company batch management routes (requires company auth)
app.use('/api/company/batches', batchCompanyRoutes);

// User routes (requires user auth)
app.use('/api/user', userRoutes);

// User certificate routes (requires user auth)
app.use('/api/user/certificates', certUserRoutes);

// Payment routes
app.use('/api/payment', paymentRoutes);

// Public routes (no auth required)
app.use('/api/public', batchPublicRoutes);
app.use('/api/public', certPublicRoutes);

// Admin routes (requires superadmin auth)
app.use('/api/admin', adminRoutes);

// ─── Error Handling ──────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
