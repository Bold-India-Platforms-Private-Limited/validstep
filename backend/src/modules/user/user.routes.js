'use strict';

const { Router } = require('express');
const { z } = require('zod');
const controller = require('./user.controller');
const { validate } = require('../../middleware/validate');
const { requireUser } = require('../../middleware/auth');
const { generalLimiter } = require('../../middleware/rateLimiter');

const router = Router();

// All user routes require user authentication
router.use(requireUser);
router.use(generalLimiter);

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
});

const ordersQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
});

const paymentsQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? Math.min(parseInt(v), 100) : 20),
  status: z.enum(['INITIATED', 'SUCCESS', 'FAILURE', 'REFUNDED']).optional(),
});

router.get('/dashboard', controller.getDashboard);
router.get('/profile', controller.getProfile);
router.put('/profile', validate({ body: updateProfileSchema }), controller.updateProfile);
router.get('/orders', validate({ query: ordersQuerySchema }), controller.getOrders);
router.get('/payments', validate({ query: paymentsQuerySchema }), controller.getPaymentHistory);
router.get('/invoices', controller.getInvoices);
router.get('/orders/:orderId/invoice', controller.downloadInvoice);

module.exports = router;
