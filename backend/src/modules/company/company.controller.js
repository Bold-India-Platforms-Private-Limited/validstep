'use strict';

const companyService = require('./company.service');
const { getOrCreateInvoiceRecord, incrementInvoiceDownloadCount } = require('../payment/payment.service');
const { sendSuccess, sendCreated, sendError } = require('../../utils/apiResponse');
const { generateInvoicePDF } = require('../../utils/invoiceGenerator');

async function getProfile(req, res) {
  try {
    const company = await companyService.getProfile(req.user.id);
    return sendSuccess(res, company, 'Profile retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function updateProfile(req, res) {
  try {
    const company = await companyService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, company, 'Profile updated successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function createProgram(req, res) {
  try {
    const program = await companyService.createProgram(req.user.id, req.body);
    return sendCreated(res, program, 'Program created successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getPrograms(req, res) {
  try {
    const result = await companyService.getPrograms(req.user.id, req.query);
    return sendSuccess(res, result, 'Programs retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getDashboard(req, res) {
  try {
    const stats = await companyService.getDashboardStats(req.user.id);
    return sendSuccess(res, stats, 'Dashboard stats retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function updateProgram(req, res) {
  try {
    const program = await companyService.updateProgram(req.user.id, req.params.id, req.body);
    return sendSuccess(res, program, 'Program updated');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function deleteProgram(req, res) {
  try {
    await companyService.deleteProgram(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Program deleted');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getPaymentHistory(req, res) {
  try {
    const result = await companyService.getPaymentHistory(req.user.id, req.query);
    return sendSuccess(res, result, 'Payment history retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function downloadInvoice(req, res) {
  try {
    const order = await companyService.getOrderForInvoice(req.user.id, req.params.orderId);
    const payment = order.payments[0];

    const invoiceRecord = await getOrCreateInvoiceRecord(order.id);

    const pdfBuffer = await generateInvoicePDF({
      orderId: order.id,
      invoiceNumber: invoiceRecord.invoice_number,
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
      paidAt: invoiceRecord.paid_at || payment?.created_at,
      txnId: invoiceRecord.payu_txn_id || payment?.payu_txn_id || order.payu_txn_id,
      verificationHash: order.certificate?.verification_hash,
    });

    incrementInvoiceDownloadCount(order.id).catch(() => {});

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.certificate_serial}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getInvoices(req, res) {
  try {
    const result = await companyService.getCompanyInvoices(req.user.id, req.query);
    return sendSuccess(res, result, 'Invoices retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  createProgram,
  getPrograms,
  updateProgram,
  deleteProgram,
  getDashboard,
  getPaymentHistory,
  downloadInvoice,
  getInvoices,
};
