'use strict';

const { Router } = require('express');
const { z } = require('zod');
const controller = require('./admin.controller');
const accountingRoutes = require('../accounting/accounting.routes');
const masterAccountingRoutes = require('../master-accounting/masterAccounting.routes');
const { validate } = require('../../middleware/validate');
const { requireSuperAdmin } = require('../../middleware/auth');
const { generalLimiter } = require('../../middleware/rateLimiter');
const { uploadUserImportFile } = require('../../middleware/upload');

const router = Router();

// All admin routes require superadmin authentication
router.use(requireSuperAdmin);
router.use(generalLimiter);

router.use('/accounting', accountingRoutes);
router.use('/master-accounting', masterAccountingRoutes);

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

const usersQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  search: z.string().optional(),
  company_id: z.string().uuid().optional(),
  batch_id: z.string().uuid().optional(),
});

const deleteUsersSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1, 'Select at least one user'),
});

const createUserSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  company_id: z.string().uuid('Select a company'),
  batch_id: z.string().uuid('Select a batch'),
});

const bulkUploadUsersSchema = z.object({
  company_id: z.string().uuid('Select a company'),
  batch_id: z.string().uuid('Select a batch'),
});

// Schemas for admin acting on behalf of a company (mirrors company.routes.js / batch.routes.js)
const createProgramSchema = z.object({
  type: z.enum(['INTERNSHIP', 'COURSE', 'PARTICIPATION', 'HACKATHON', 'OTHER']),
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
});

const updateProgramSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
});

const getProgramsQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 20),
  type: z.enum(['INTERNSHIP', 'COURSE', 'PARTICIPATION', 'HACKATHON', 'OTHER']).optional(),
});

const createCompanyBatchSchema = z.object({
  program_id: z.string().uuid(),
  name: z.string().min(2).max(200),
  start_date: z.string().datetime().or(z.string().refine(s => !isNaN(Date.parse(s)))),
  end_date: z.string().datetime().or(z.string().refine(s => !isNaN(Date.parse(s)))),
  certificate_delivery_date: z.string().optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  role: z.string().max(100).optional().or(z.literal('')),
  id_prefix: z.string().min(2).max(10).optional().or(z.literal('')),
  certificate_price: z.number().min(0).or(z.string().transform(v => parseFloat(v))),
  currency: z.string().length(3).optional(),
});

const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().max(500).optional(),
});

const enrollUsersSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1, 'Select at least one user'),
});

const assignTransactionsSchema = z.object({
  payu_ids: z.array(z.string()).min(1, 'Select at least one transaction'),
});

const assignableTransactionsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
});

const orderLogQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  company_id: z.string().uuid().optional(),
  search: z.string().optional(),
});

const updateCompanyBatchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  certificate_delivery_date: z.string().optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  role: z.string().max(100).optional(),
  id_prefix: z.string().min(2).max(10).optional(),
  certificate_price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  is_active: z.boolean().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'HOLD', 'COMPLETED']).optional(),
});

const analyticsQuerySchema = z.object({
  months: z.string().optional().transform(v => v ? Math.min(parseInt(v), 24) : 12),
});

// Routes
router.get('/dashboard', controller.getDashboard);
router.get('/analytics', validate({ query: analyticsQuerySchema }), controller.getMonthlyAnalytics);
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
router.get('/payments', validate({ query: paymentsQuerySchema }), controller.getAllPayments);
router.get('/invoices', validate({ query: invoicesQuerySchema }), controller.getAdminInvoices);
router.get('/orders/:orderId/invoice', controller.downloadInvoice);
router.get('/pricing', controller.getPricing);
router.put('/pricing', validate({ body: updatePricingSchema }), controller.updatePricing);
router.get('/users', validate({ query: usersQuerySchema }), controller.listUsers);
router.post('/users', validate({ body: createUserSchema }), controller.createUser);
router.delete('/users', validate({ body: deleteUsersSchema }), controller.deleteUsers);
router.post('/users/:userId/resend-password', controller.resendUserPassword);
router.post('/order-log/:orderId/send-certificate-email', controller.resendCertificateEmail);
router.post('/users/bulk-upload', uploadUserImportFile, validate({ body: bulkUploadUsersSchema }), controller.bulkUploadUsers);
router.post('/users/import-payu-customers', controller.importPayuButtonCustomers);
router.post('/companies', validate({ body: createCompanySchema }), controller.createCompany);
router.post('/companies/:companyId/batches/:id/enroll-users', validate({ body: enrollUsersSchema }), controller.enrollExistingUsers);
router.get('/payu-transactions/assignable', validate({ query: assignableTransactionsQuerySchema }), controller.getAssignableTransactions);
router.get('/order-log', validate({ query: orderLogQuerySchema }), controller.getOrderLog);
router.get('/order-log/:orderId', controller.getOrderDetail);
router.put('/queries/:queryId/resolve', controller.resolveQuery);
router.post('/companies/:companyId/batches/:id/assign-transactions', validate({ body: assignTransactionsSchema }), controller.assignTransactionsToBatch);

// Admin acting on behalf of a company — create/manage programs & batches for them
router.post('/companies/:companyId/programs', validate({ body: createProgramSchema }), controller.createCompanyProgram);
router.get('/companies/:companyId/programs', validate({ query: getProgramsQuerySchema }), controller.getCompanyPrograms);
router.put('/companies/:companyId/programs/:programId', validate({ body: updateProgramSchema }), controller.updateCompanyProgram);
router.delete('/companies/:companyId/programs/:programId', controller.deleteCompanyProgram);
router.post('/companies/:companyId/batches', validate({ body: createCompanyBatchSchema }), controller.createCompanyBatch);
router.put('/companies/:companyId/batches/:id', validate({ body: updateCompanyBatchSchema }), controller.updateCompanyBatch);

module.exports = router;
