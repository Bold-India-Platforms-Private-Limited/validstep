'use strict';

const userService = require('./user.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

async function getDashboard(req, res) {
  try {
    const dashboard = await userService.getDashboard(req.user.id);
    return sendSuccess(res, dashboard, 'Dashboard retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getOrders(req, res) {
  try {
    const result = await userService.getOrders(req.user.id, req.query);
    return sendSuccess(res, result, 'Orders retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getProfile(req, res) {
  try {
    const user = await userService.getProfile(req.user.id);
    return sendSuccess(res, user, 'Profile retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function updateProfile(req, res) {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, user, 'Profile updated successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getPaymentHistory(req, res) {
  try {
    const result = await userService.getPaymentHistory(req.user.id, req.query);
    return sendSuccess(res, result, 'Payment history retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function downloadInvoice(req, res) {
  try {
    const { generateInvoicePDF } = require('../../utils/invoiceGenerator');
    const order = await userService.getOrderForInvoice(req.user.id, req.params.orderId);
    const payment = order.payments[0];

    const pdfBuffer = await generateInvoicePDF({
      orderId: order.id,
      invoiceNumber: `INV-${order.certificate_serial || order.id.slice(0, 8).toUpperCase()}`,
      userName: order.user.name,
      userEmail: order.user.email,
      userPhone: order.user.phone || '',
      companyName: order.batch.company.name,
      batchName: order.batch.name,
      programName: order.batch.program.name,
      programType: order.batch.program.type,
      role: order.batch.role,
      startDate: order.batch.start_date,
      endDate: order.batch.end_date,
      certificateSerial: order.certificate_serial,
      amount: order.amount,
      currency: order.currency,
      paidAt: payment?.created_at,
      txnId: payment?.payu_txn_id || order.payu_txn_id,
      verificationHash: order.certificate?.verification_hash,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.certificate_serial}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  getDashboard,
  getOrders,
  getProfile,
  updateProfile,
  getPaymentHistory,
  downloadInvoice,
};
