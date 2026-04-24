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
  const orderId = req.body?.udf1 || '';
  try {
    const result = await paymentService.handlePaymentSuccess(req.body);
    // Route to correct page based on actual settlement result
    if (result.status === 'paid' || result.status === 'already_paid') {
      const params = new URLSearchParams({ order_id: result.orderId, status: 'success', txnid: req.body.txnid || '' });
      return res.redirect(302, `${env.FRONTEND_URL}/payment/success?${params}`);
    }
    if (result.status === 'failed') {
      const params = new URLSearchParams({ order_id: result.orderId, status: 'failed', txnid: req.body.txnid || '' });
      return res.redirect(302, `${env.FRONTEND_URL}/payment/failure?${params}`);
    }
    // 'processing' — job queued, let the status page poll
    const params = new URLSearchParams({ order_id: result.orderId, status: 'processing', txnid: req.body.txnid || '' });
    return res.redirect(302, `${env.FRONTEND_URL}/payment/success?${params}`);
  } catch (err) {
    console.error('[Payment] Success handler error:', err.message, { orderId, body: req.body });
    const params = new URLSearchParams({ order_id: orderId, status: 'failed' });
    return res.redirect(302, `${env.FRONTEND_URL}/payment/failure?${params}`);
  }
}

async function handleFailure(req, res) {
  const orderId = req.body?.udf1 || '';
  try {
    console.log('[Payment] Failure POST received:', { txnid: req.body?.txnid, orderId, error_Message: req.body?.error_Message });
    const result = await paymentService.handlePaymentFailure(req.body);
    const params = new URLSearchParams({ order_id: result.orderId, status: 'failed', txnid: req.body.txnid || '' });
    return res.redirect(302, `${env.FRONTEND_URL}/payment/failure?${params}`);
  } catch (err) {
    console.error('[Payment] Failure handler error:', err.message, { orderId, body: req.body });
    // Best-effort: try to mark order failed even if main handler threw
    if (orderId) {
      paymentService.handlePaymentFailure(req.body).catch(() => {});
    }
    const params = new URLSearchParams({ order_id: orderId, status: 'failed' });
    return res.redirect(302, `${env.FRONTEND_URL}/payment/failure?${params}`);
  }
}

// PayU sends GET to furl for certain UPI errors (pre-auth failures, "Custom Id cannot contain :" etc.)
// The order status will be settled by the async webhook. Just redirect cleanly to the failure page.
async function handleFailureGet(req, res) {
  const orderId = req.query?.udf1 || req.query?.order_id || '';
  console.log('[Payment] Failure GET received (UPI pre-auth error):', req.query);
  // Attempt async failure marking using query params
  if (orderId && req.query?.txnid) {
    paymentService.handlePaymentFailure(req.query).catch((e) =>
      console.warn('[Payment] GET failure mark failed (non-critical):', e.message)
    );
  }
  const params = new URLSearchParams({ order_id: orderId, status: 'failed' });
  return res.redirect(302, `${env.FRONTEND_URL}/payment/failure?${params}`);
}

async function handleSuccessGet(req, res) {
  const orderId = req.query?.udf1 || req.query?.order_id || '';
  console.log('[Payment] Success GET received:', req.query);
  const params = new URLSearchParams({ order_id: orderId, status: 'processing' });
  return res.redirect(302, `${env.FRONTEND_URL}/payment/success?${params}`);
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
  handleFailureGet,
  handleSuccessGet,
  handleWebhook,
  getPaymentStatus,
  reconcilePayment,
};
