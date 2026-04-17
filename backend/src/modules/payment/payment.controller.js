'use strict';

const paymentService = require('./payment.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const env = require('../../config/env');

/* ─────────────────────────────────────────────
   Initiate Payment
───────────────────────────────────────────── */
async function initiatePayment(req, res) {
  try {
    const result = await paymentService.initiatePayment(req.user.id, req.body);
    return sendSuccess(res, result, 'Payment initiated successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

/* ─────────────────────────────────────────────
   PayU Redirect Handlers (no auth — PayU POSTs these)
───────────────────────────────────────────── */
async function handleSuccess(req, res) {
  try {
    const result = await paymentService.handlePaymentSuccess(req.body);
    const params = new URLSearchParams({
      order_id: result.orderId,
      status: result.status,
      txnid: req.body.txnid || '',
    });
    return res.redirect(302, `${env.FRONTEND_URL}/payment/success?${params}`);
  } catch (err) {
    console.error('[Payment] Success handler error:', err.message);
    const params = new URLSearchParams({
      error: err.message,
      order_id: req.body?.udf1 || '',
    });
    return res.redirect(302, `${env.FRONTEND_URL}/payment/failure?${params}`);
  }
}

async function handleFailure(req, res) {
  try {
    const result = await paymentService.handlePaymentFailure(req.body);
    const params = new URLSearchParams({
      order_id: result.orderId,
      status: 'failed',
      txnid: req.body.txnid || '',
    });
    return res.redirect(302, `${env.FRONTEND_URL}/payment/failure?${params}`);
  } catch (err) {
    console.error('[Payment] Failure handler error:', err.message);
    const params = new URLSearchParams({
      error: err.message,
      order_id: req.body?.udf1 || '',
    });
    return res.redirect(302, `${env.FRONTEND_URL}/payment/failure?${params}`);
  }
}

/* ─────────────────────────────────────────────
   Webhook Handler (PayU async IPN)
───────────────────────────────────────────── */
async function handleWebhook(req, res) {
  try {
    const result = await paymentService.handleWebhook(req.body);
    // PayU expects HTTP 200 for webhooks — always return 200
    return res.status(200).json({ success: true, message: 'Webhook processed', data: result });
  } catch (err) {
    console.error('[Payment] Webhook error:', err.message);
    // Still return 200 so PayU doesn't retry on our own validation errors
    return res.status(200).json({ success: false, message: err.message });
  }
}

/* ─────────────────────────────────────────────
   Payment Status (authenticated user)
───────────────────────────────────────────── */
async function getPaymentStatus(req, res) {
  try {
    const order = await paymentService.getPaymentStatus(req.user.id, req.params.orderId);
    return sendSuccess(res, order, 'Payment status retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

/* ─────────────────────────────────────────────
   Reconcile (Admin — manually re-check with PayU)
───────────────────────────────────────────── */
async function reconcilePayment(req, res) {
  try {
    const { txnid } = req.params;
    if (!txnid) return sendError(res, 'txnid is required', 400);
    const result = await paymentService.reconcilePayment(txnid);
    return sendSuccess(res, result, 'Payment reconciled');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  initiatePayment,
  handleSuccess,
  handleFailure,
  handleWebhook,
  getPaymentStatus,
  reconcilePayment,
};
