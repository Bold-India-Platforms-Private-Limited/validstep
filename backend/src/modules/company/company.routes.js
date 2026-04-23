'use strict';

const { Router } = require('express');
const { z } = require('zod');
const controller = require('./company.controller');
const { validate } = require('../../middleware/validate');
const { requireCompany } = require('../../middleware/auth');
const { generalLimiter } = require('../../middleware/rateLimiter');

const router = Router();

// All company routes require company authentication
router.use(requireCompany);
router.use(generalLimiter);

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().max(500).optional(),
});

const createProgramSchema = z.object({
  type: z.enum(['INTERNSHIP', 'COURSE', 'PARTICIPATION', 'HACKATHON', 'OTHER']),
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
});

const getProgramsQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 20),
  type: z.enum(['INTERNSHIP', 'COURSE', 'PARTICIPATION', 'HACKATHON', 'OTHER']).optional(),
});

const paymentsQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  status: z.enum(['INITIATED', 'SUCCESS', 'FAILURE', 'REFUNDED']).optional(),
  batch_id: z.string().uuid().optional(),
});

const updateProgramSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
});

// Routes
router.get('/profile', controller.getProfile);
router.put('/profile', validate({ body: updateProfileSchema }), controller.updateProfile);

router.post('/programs', validate({ body: createProgramSchema }), controller.createProgram);
router.get('/programs', validate({ query: getProgramsQuerySchema }), controller.getPrograms);
router.put('/programs/:id', validate({ body: updateProgramSchema }), controller.updateProgram);
router.delete('/programs/:id', controller.deleteProgram);

router.get('/dashboard', controller.getDashboard);
router.get('/payments', validate({ query: paymentsQuerySchema }), controller.getPaymentHistory);
router.get('/invoices', controller.getInvoices);
router.get('/orders/:orderId/invoice', controller.downloadInvoice);

module.exports = router;
