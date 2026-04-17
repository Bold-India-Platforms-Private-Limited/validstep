'use strict';

const { Router } = require('express');
const { z } = require('zod');
const controller = require('./payment.controller');
const { validate } = require('../../middleware/validate');
const { requireUser, requireSuperAdmin } = require('../../middleware/auth');
const { paymentLimiter, webhookLimiter } = require('../../middleware/rateLimiter');

const router = Router();

const initiatePaymentSchema = z.object({
  batch_id: z.string().uuid('Invalid batch ID'),
});

/* ─────────────────────────────────────────────
   Authenticated user routes
───────────────────────────────────────────── */

// Start a payment checkout
router.post(
  '/initiate',
  requireUser,
  paymentLimiter,
  validate({ body: initiatePaymentSchema }),
  controller.initiatePayment
);

// Fetch order status (user polls this after redirect)
router.get(
  '/status/:orderId',
  requireUser,
  controller.getPaymentStatus
);

/* ─────────────────────────────────────────────
   PayU redirect callbacks (no auth — PayU POSTs these)
   Must be raw body — DO NOT add JSON body parser here
───────────────────────────────────────────── */

router.post('/success', controller.handleSuccess);
router.post('/failure', controller.handleFailure);

/* ─────────────────────────────────────────────
   PayU webhook / IPN (no auth — PayU POSTs async)
───────────────────────────────────────────── */

router.post('/webhook', webhookLimiter, controller.handleWebhook);

/* ─────────────────────────────────────────────
   Admin: manual payment reconciliation
   POST /api/payment/reconcile/:txnid
   Use when redirect + webhook both missed (edge case)
───────────────────────────────────────────── */

router.post(
  '/reconcile/:txnid',
  requireSuperAdmin,
  controller.reconcilePayment
);

module.exports = router;
