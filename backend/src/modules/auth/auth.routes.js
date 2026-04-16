'use strict';

const { Router } = require('express');
const { z } = require('zod');
const controller = require('./auth.controller');
const { validate } = require('../../middleware/validate');
const { authLimiter } = require('../../middleware/rateLimiter');

const router = Router();

// Validation schemas
const companyRegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().max(500).optional(),
});

const companyLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userRegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().optional(),
  batch_slug: z.string().min(1),
});

const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Routes
router.post(
  '/company/register',
  authLimiter,
  validate({ body: companyRegisterSchema }),
  controller.companyRegister
);

router.post(
  '/company/login',
  authLimiter,
  validate({ body: companyLoginSchema }),
  controller.companyLogin
);

router.post(
  '/user/register',
  authLimiter,
  validate({ body: userRegisterSchema }),
  controller.userRegister
);

router.post(
  '/user/login',
  authLimiter,
  validate({ body: userLoginSchema }),
  controller.userLogin
);

router.post(
  '/superadmin/login',
  authLimiter,
  validate({ body: adminLoginSchema }),
  controller.superAdminLogin
);

router.post('/refresh', controller.refreshToken);

router.post('/logout', controller.logout);

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  type: z.enum(['company', 'user']),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  type: z.enum(['company', 'user']),
});

router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  controller.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  controller.resetPassword
);

module.exports = router;
