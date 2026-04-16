'use strict';

const adminService = require('./admin.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

async function getCompanies(req, res) {
  try {
    const result = await adminService.getCompanies(req.query);
    return sendSuccess(res, result, 'Companies retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getCompanyById(req, res) {
  try {
    const company = await adminService.getCompanyById(req.params.id);
    return sendSuccess(res, company, 'Company retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function updateCompanyStatus(req, res) {
  try {
    const company = await adminService.updateCompanyStatus(req.params.id, req.body);
    return sendSuccess(res, company, 'Company status updated successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getAllBatches(req, res) {
  try {
    const result = await adminService.getAllBatches(req.query);
    return sendSuccess(res, result, 'Batches retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getAllOrders(req, res) {
  try {
    const result = await adminService.getAllOrders(req.query);
    return sendSuccess(res, result, 'Orders retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getPricing(req, res) {
  try {
    const configs = await adminService.getPricingConfigs();
    return sendSuccess(res, configs, 'Pricing configurations retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function updatePricing(req, res) {
  try {
    const { program_type, default_price } = req.body;
    const config = await adminService.updatePricingConfig(program_type, default_price);
    return sendSuccess(res, config, 'Pricing updated successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getDashboard(req, res) {
  try {
    const stats = await adminService.getDashboardStats();
    return sendSuccess(res, stats, 'Admin dashboard stats retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getAllPayments(req, res) {
  try {
    const result = await adminService.getAllPayments(req.query);
    return sendSuccess(res, result, 'Payments retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function downloadInvoice(req, res) {
  try {
    const { generateInvoicePDF } = require('../../utils/invoiceGenerator');
    const order = await adminService.getOrderForInvoice(req.params.orderId);
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

async function getAdminBatchStats(req, res) {
  try {
    const stats = await adminService.getAdminBatchStats(req.params.id);
    return sendSuccess(res, stats, 'Batch stats retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getAdminBatch(req, res) {
  try {
    const batch = await adminService.getAdminBatchById(req.params.id);
    return sendSuccess(res, batch, 'Batch retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getAdminBatchOrders(req, res) {
  try {
    const result = await adminService.getAdminBatchOrders(req.params.id, req.query);
    return sendSuccess(res, result, 'Batch orders retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function exportAdminBatchOrders(req, res) {
  try {
    const rows = await adminService.exportAdminBatchOrders(req.params.id, req.query);
    return sendSuccess(res, rows, 'Export data retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getAdminBatchCertificates(req, res) {
  try {
    const result = await adminService.getAdminBatchCertificates(req.params.id, req.query);
    return sendSuccess(res, result, 'Certificates retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function issueCertificatesAdmin(req, res) {
  try {
    const { order_ids } = req.body;
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return sendError(res, 'order_ids array is required', 400);
    }
    const result = await adminService.issueCertificatesAdmin(req.params.id, order_ids);
    return sendSuccess(res, result, 'Certificates issued');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  getCompanies,
  getCompanyById,
  updateCompanyStatus,
  getAllBatches,
  getAllOrders,
  getAllPayments,
  downloadInvoice,
  getPricing,
  updatePricing,
  getDashboard,
  getAdminBatch,
  getAdminBatchStats,
  getAdminBatchOrders,
  exportAdminBatchOrders,
  getAdminBatchCertificates,
  issueCertificatesAdmin,
};
