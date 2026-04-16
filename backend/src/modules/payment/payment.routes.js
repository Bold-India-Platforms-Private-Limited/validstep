'use strict';

const { Router } = require('express');
const { z } = require('zod');
const controller = require('./payment.controller');
const { validate } = require('../../middleware/validate');
const { requireUser } = require('../../middleware/auth');
const { paymentLimiter } = require('../../middleware/rateLimiter');

const router = Router();

const initiatePaymentSchema = z.object({
  batch_id: z.string().uuid(),
});

// Authenticated routes
router.post(
  '/initiate',
  requireUser,
  paymentLimiter,
  validate({ body: initiatePaymentSchema }),
  controller.initiatePayment
);

router.get(
  '/status/:orderId',
  requireUser,
  controller.getPaymentStatus
);

// PayU redirect handlers (no auth - PayU posts to these)
router.post('/success', controller.handleSuccess);
router.post('/failure', controller.handleFailure);

// PayU webhook (no auth - webhook from PayU)
router.post('/webhook', controller.handleWebhook);

module.exports = router;
