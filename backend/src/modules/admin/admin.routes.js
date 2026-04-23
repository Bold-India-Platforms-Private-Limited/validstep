'use strict';

const { Router } = require('express');
const { z } = require('zod');
const controller = require('./admin.controller');
const { validate } = require('../../middleware/validate');
const { requireSuperAdmin } = require('../../middleware/auth');
const { generalLimiter } = require('../../middleware/rateLimiter');

const router = Router();

// All admin routes require superadmin authentication
router.use(requireSuperAdmin);
router.use(generalLimiter);

// Validation schemas
const listQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  search: z.string().optional(),
  is_active: z.string().optional(),
  is_verified: z.string().optional(),
});

const batchesQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  status: z.enum(['DRAFT', 'ACTIVE', 'HOLD', 'COMPLETED']).optional(),
  company_id: z.string().uuid().optional(),
  search: z.string().optional(),
});

const batchOrdersQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 100),
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
});

const issueCertsSchema = z.object({
  order_ids: z.array(z.string().uuid()).min(1),
});

const ordersQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  company_id: z.string().uuid().optional(),
  search: z.string().optional(),
});

const updateStatusSchema = z.object({
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
});

const updatePricingSchema = z.object({
  program_type: z.enum(['INTERNSHIP', 'COURSE', 'PARTICIPATION', 'HACKATHON', 'OTHER']),
  default_price: z.number().min(0),
});

const paymentsQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  status: z.enum(['INITIATED', 'SUCCESS', 'FAILURE', 'REFUNDED']).optional(),
  company_id: z.string().uuid().optional(),
});

const invoicesQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  search: z.string().optional(),
  company_id: z.string().uuid().optional(),
});

// Routes
router.get('/dashboard', controller.getDashboard);
router.get('/companies', validate({ query: listQuerySchema }), controller.getCompanies);
router.get('/companies/:id', controller.getCompanyById);
router.put('/companies/:id/status', validate({ body: updateStatusSchema }), controller.updateCompanyStatus);
router.get('/batches', validate({ query: batchesQuerySchema }), controller.getAllBatches);
router.get('/batches/:id', controller.getAdminBatch);
router.get('/batches/:id/stats', controller.getAdminBatchStats);
router.get('/batches/:id/orders', validate({ query: batchOrdersQuerySchema }), controller.getAdminBatchOrders);
router.get('/batches/:id/orders/export', controller.exportAdminBatchOrders);
router.get('/batches/:id/certificates', controller.getAdminBatchCertificates);
router.post('/batches/:id/issue', validate({ body: issueCertsSchema }), controller.issueCertificatesAdmin);
router.get('/orders', validate({ query: ordersQuerySchema }), controller.getAllOrders);
router.get('/payments', validate({ query: paymentsQuerySchema }), controller.getAllPayments);
router.get('/invoices', validate({ query: invoicesQuerySchema }), controller.getAdminInvoices);
router.get('/orders/:orderId/invoice', controller.downloadInvoice);
router.get('/pricing', controller.getPricing);
router.put('/pricing', validate({ body: updatePricingSchema }), controller.updatePricing);

module.exports = router;
