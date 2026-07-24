'use strict';

const adminService = require('./admin.service');
const companyService = require('../company/company.service');
const batchService = require('../batch/batch.service');
const { getOrCreateInvoiceRecord, incrementInvoiceDownloadCount } = require('../../utils/invoiceRecords');
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

async function getAdminInvoices(req, res) {
  try {
    const result = await adminService.getAllInvoices(req.query);
    return sendSuccess(res, result, 'Invoices retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function listUsers(req, res) {
  try {
    const result = await adminService.listUsers(req.query);
    return sendSuccess(res, result, 'Users retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function createUser(req, res) {
  try {
    const result = await adminService.registerUserForBatch(req.body);
    return sendSuccess(res, result, 'User registered successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function bulkUploadUsers(req, res) {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }
    const result = await adminService.bulkUploadUsers({
      company_id: req.body.company_id,
      batch_id: req.body.batch_id,
      file: req.file,
    });
    return sendSuccess(res, result, 'Bulk upload processed');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function importPayuButtonCustomers(req, res) {
  try {
    const result = await adminService.importPayuButtonCustomers();
    return sendSuccess(res, result, 'PayU Button customers imported');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function createCompany(req, res) {
  try {
    const company = await adminService.createCompany(req.body);
    return sendSuccess(res, company, 'Company created successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function enrollExistingUsers(req, res) {
  try {
    const result = await adminService.enrollExistingUsers({
      company_id: req.params.companyId,
      batch_id: req.params.id,
      user_ids: req.body.user_ids,
    });
    return sendSuccess(res, result, 'Users enrolled');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function importPayuTransactions(req, res) {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }
    const result = await adminService.importPayuTransactions(req.file);
    return sendSuccess(res, result, 'PayU transactions imported');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getAssignableTransactions(req, res) {
  try {
    const result = await adminService.getAssignableTransactions(req.query);
    return sendSuccess(res, result, 'Assignable transactions retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function assignTransactionsToBatch(req, res) {
  try {
    const result = await adminService.assignTransactionsToBatch({
      company_id: req.params.companyId,
      batch_id: req.params.id,
      payu_ids: req.body.payu_ids,
    });
    return sendSuccess(res, result, 'Transactions assigned');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── Admin acting on behalf of a company (create/manage programs & batches) ───────────────

async function createCompanyProgram(req, res) {
  try {
    const program = await companyService.createProgram(req.params.companyId, req.body);
    return sendSuccess(res, program, 'Program created successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getCompanyPrograms(req, res) {
  try {
    const result = await companyService.getPrograms(req.params.companyId, req.query);
    return sendSuccess(res, result, 'Programs retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function updateCompanyProgram(req, res) {
  try {
    const program = await companyService.updateProgram(req.params.companyId, req.params.programId, req.body);
    return sendSuccess(res, program, 'Program updated successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function deleteCompanyProgram(req, res) {
  try {
    await companyService.deleteProgram(req.params.companyId, req.params.programId);
    return sendSuccess(res, null, 'Program deleted successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function createCompanyBatch(req, res) {
  try {
    const batch = await batchService.createBatch(req.params.companyId, req.body);
    return sendSuccess(res, batch, 'Batch created successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function updateCompanyBatch(req, res) {
  try {
    const batch = await batchService.updateBatch(req.params.companyId, req.params.id, req.body);
    return sendSuccess(res, batch, 'Batch updated successfully');
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
  getAdminInvoices,
  getPricing,
  updatePricing,
  getDashboard,
  getAdminBatch,
  getAdminBatchStats,
  getAdminBatchOrders,
  exportAdminBatchOrders,
  getAdminBatchCertificates,
  issueCertificatesAdmin,
  listUsers,
  createUser,
  bulkUploadUsers,
  importPayuButtonCustomers,
  createCompany,
  enrollExistingUsers,
  importPayuTransactions,
  getAssignableTransactions,
  assignTransactionsToBatch,
  createCompanyProgram,
  getCompanyPrograms,
  updateCompanyProgram,
  deleteCompanyProgram,
  createCompanyBatch,
  updateCompanyBatch,
};
