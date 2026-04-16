'use strict';

const { Router } = require('express');
const { z } = require('zod');
const controller = require('./batch.controller');
const { validate } = require('../../middleware/validate');
const { requireCompany } = require('../../middleware/auth');
const { generalLimiter } = require('../../middleware/rateLimiter');

const router = Router();

// Company batch management routes
const companyRouter = Router();
companyRouter.use(requireCompany);
companyRouter.use(generalLimiter);

// Validation schemas
const createBatchSchema = z.object({
  program_id: z.string().uuid(),
  name: z.string().min(2).max(200),
  start_date: z.string().datetime().or(z.string().refine(s => !isNaN(Date.parse(s)))),
  end_date: z.string().datetime().or(z.string().refine(s => !isNaN(Date.parse(s)))),
  role: z.string().max(100).optional(),
  id_prefix: z.string().min(2).max(10).optional(),
  certificate_price: z.number().min(0).or(z.string().transform(v => parseFloat(v))),
  currency: z.string().length(3).optional(),
});

const updateBatchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  role: z.string().max(100).optional(),
  id_prefix: z.string().min(2).max(10).optional(),
  certificate_price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  is_active: z.boolean().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED']).optional(),
});

const templateSchema = z.object({
  template_name: z.string().min(2).max(100),
  template_type: z.enum(['CLASSIC', 'MODERN', 'MINIMAL']).optional(),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  font_family: z.string().optional(),
  show_logo: z.boolean().optional(),
  show_signature: z.boolean().optional(),
  signature_url: z.string().url().optional().or(z.literal('')),
  custom_text: z.string().max(500).optional(),
});

const issueCertificatesSchema = z.object({
  order_ids: z.array(z.string().uuid()).min(1).max(100),
});

const listQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED']).optional(),
  program_id: z.string().uuid().optional(),
});

const ordersQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
});

// Company batch routes
companyRouter.post('/', validate({ body: createBatchSchema }), controller.createBatch);
companyRouter.get('/', validate({ query: listQuerySchema }), controller.getBatches);
companyRouter.get('/:id', controller.getBatchById);
companyRouter.put('/:id', validate({ body: updateBatchSchema }), controller.updateBatch);
companyRouter.post('/:id/templates', validate({ body: templateSchema }), controller.createOrUpdateTemplate);
companyRouter.get('/:id/templates', controller.getTemplates);
companyRouter.post('/:id/issue-certificates', validate({ body: issueCertificatesSchema }), controller.issueCertificates);
companyRouter.get('/:id/orders', validate({ query: ordersQuerySchema }), controller.getBatchOrders);
companyRouter.get('/:id/orders/export', controller.exportBatchOrders);
companyRouter.get('/:id/certificates', controller.getBatchCertificates);

// Public route (no auth)
const publicRouter = Router();
publicRouter.get('/batch/:slug', controller.getPublicBatch);

module.exports = { companyRouter, publicRouter };
