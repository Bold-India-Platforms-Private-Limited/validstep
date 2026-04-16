'use strict';

const paymentService = require('./payment.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const env = require('../../config/env');

async function initiatePayment(req, res) {
  try {
    const result = await paymentService.initiatePayment(req.user.id, req.body);
    return sendSuccess(res, result, 'Payment initiated successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function handleSuccess(req, res) {
  try {
    const responseData = req.body;
    const result = await paymentService.handlePaymentSuccess(responseData);

    // Redirect to frontend with success
    const redirectUrl = `${env.FRONTEND_URL}/payment/success?order_id=${result.orderId}&status=${result.status}`;
    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Payment success handler error:', err.message);
    const redirectUrl = `${env.FRONTEND_URL}/payment/failure?error=${encodeURIComponent(err.message)}`;
    return res.redirect(302, redirectUrl);
  }
}

async function handleFailure(req, res) {
  try {
    const responseData = req.body;
    const result = await paymentService.handlePaymentFailure(responseData);

    const redirectUrl = `${env.FRONTEND_URL}/payment/failure?order_id=${result.orderId}&status=failed`;
    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Payment failure handler error:', err.message);
    const redirectUrl = `${env.FRONTEND_URL}/payment/failure?error=${encodeURIComponent(err.message)}`;
    return res.redirect(302, redirectUrl);
  }
}

async function handleWebhook(req, res) {
  try {
    const webhookData = req.body;
    const result = await paymentService.handleWebhook(webhookData);
    // PayU expects a 200 response for webhooks
    return res.status(200).json({ success: true, message: 'Webhook processed', data: result });
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    // Return 200 to prevent PayU from retrying on our validation errors
    return res.status(200).json({ success: false, message: err.message });
  }
}

async function getPaymentStatus(req, res) {
  try {
    const order = await paymentService.getPaymentStatus(req.user.id, req.params.orderId);
    return sendSuccess(res, order, 'Payment status retrieved');
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
};
