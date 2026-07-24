'use strict';

const fs = require('fs');
const service = require('./masterAccounting.service');
const { sendSuccess, sendCreated, sendError } = require('../../utils/apiResponse');

function boolParam(v) {
  return v === 'true' || v === true;
}

async function withFile(req, res, importFn) {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);
    const result = await importFn({
      file: req.file,
      uploadedBy: req.user?.email || req.user?.id,
      periodType: req.body?.periodType,
      periodLabel: req.body?.periodLabel,
    });
    return sendCreated(res, result, 'File imported successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
}

const importRazorpayPayments = (req, res) => withFile(req, res, service.importRazorpayPaymentReport);
const importRazorpaySettlements = (req, res) => withFile(req, res, service.importRazorpaySettlementReport);
const importPayuTransactions = (req, res) => withFile(req, res, service.importPayuTransactionReport);
const importPayuSettlements = (req, res) => withFile(req, res, service.importPayuSettlementReport);
const importBankStatement = (req, res) => withFile(req, res, service.importBankStatement);

async function withFilePreview(req, res, previewFn) {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);
    const result = await previewFn({ file: req.file });
    return sendSuccess(res, result, 'Preview generated');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
}

const previewRazorpayPayments = (req, res) => withFilePreview(req, res, service.previewRazorpayPaymentReport);
const previewRazorpaySettlements = (req, res) => withFilePreview(req, res, service.previewRazorpaySettlementReport);
const previewPayuTransactions = (req, res) => withFilePreview(req, res, service.previewPayuTransactionReport);
const previewPayuSettlements = (req, res) => withFilePreview(req, res, service.previewPayuSettlementReport);
const previewBankStatement = (req, res) => withFilePreview(req, res, service.previewBankStatement);

async function runReconciliation(req, res) {
  try {
    const result = await service.runReconciliation();
    return sendSuccess(res, result, 'Reconciliation re-run complete');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function listBrands(req, res) {
  try {
    return sendSuccess(res, await service.listBrands(), 'Brands retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function listGateways(req, res) {
  try {
    return sendSuccess(res, await service.listGateways(), 'Gateways retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function listBankAccounts(req, res) {
  try {
    return sendSuccess(res, await service.listBankAccounts(), 'Bank accounts retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function listCategories(req, res) {
  try {
    return sendSuccess(res, await service.listCategories(), 'Categories retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function createCategory(req, res) {
  try {
    const { name, type, brandId } = req.body;
    return sendCreated(res, await service.createCategory({ name, type, brandId }), 'Category created');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function listRules(req, res) {
  try {
    return sendSuccess(res, await service.listRules(), 'Rules retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function createRule(req, res) {
  try {
    const { categoryId, matchType, pattern, priority } = req.body;
    return sendCreated(res, await service.createRule({ categoryId, matchType, pattern, priority }), 'Rule created');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function updateRule(req, res) {
  try {
    const { isActive, priority } = req.body;
    return sendSuccess(res, await service.updateRule({ id: req.params.id, isActive, priority }), 'Rule updated');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function runReclassification(req, res) {
  try {
    return sendSuccess(res, await service.runReclassification(), 'Reclassification complete');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getBankLedger(req, res) {
  try {
    const { from, to, categoryId, brandId, page, limit, sortBy, sortDir } = req.query;
    const result = await service.getBankLedger({ from, to, categoryId, brandId, caMode: boolParam(req.query.caMode), page, limit, sortBy, sortDir });
    return sendSuccess(res, result, 'Bank ledger retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function createManualEntry(req, res) {
  try {
    const result = await service.createManualEntry(req.body);
    return sendCreated(res, result, 'Manual entry created');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function retagBankTransaction(req, res) {
  try {
    const { categoryId, brandId, notes } = req.body;
    const result = await service.retagBankTransaction({ id: req.params.id, categoryId, brandId, notes });
    return sendSuccess(res, result, 'Transaction re-tagged');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getTrend(req, res) {
  try {
    const { from, to, granularity } = req.query;
    return sendSuccess(res, await service.getTrend({ from, to, granularity }), 'Trend retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getTrendByType(req, res) {
  try {
    const { from, to, granularity, brandId } = req.query;
    return sendSuccess(res, await service.getTrendByType({ from, to, granularity, brandId }), 'Trend by type retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getGatewayChargesTrend(req, res) {
  try {
    const { from, to, granularity, gateway } = req.query;
    return sendSuccess(res, await service.getGatewayChargesTrend({ from, to, granularity, gateway }), 'Gateway charges trend retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getBrandPnL(req, res) {
  try {
    const { from, to } = req.query;
    return sendSuccess(res, await service.getBrandPnL({ from, to }), 'Brand P&L retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getCategorySummary(req, res) {
  try {
    const { from, to } = req.query;
    return sendSuccess(res, await service.getCategorySummary({ from, to }), 'Category summary retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getMonthCoverage(req, res) {
  try {
    return sendSuccess(res, await service.getMonthCoverage(), 'Month coverage retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function listFileArchive(req, res) {
  try {
    const { fileType, brandId } = req.query;
    return sendSuccess(res, await service.listFileArchive({ fileType, brandId }), 'File archive retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function downloadFile(req, res) {
  try {
    const { archive, absPath } = await service.getFileForDownload(req.params.id);
    res.download(absPath, archive.original_filename);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function previewFile(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await service.getFilePreview(req.params.id, { page, limit });
    return sendSuccess(res, result, 'File preview retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getImportedRows(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await service.getImportedRows(req.params.id, { page, limit });
    return sendSuccess(res, result, 'Imported rows retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function deleteFileArchive(req, res) {
  try {
    const result = await service.deleteFileArchive(req.params.id);
    return sendSuccess(res, result, 'File and associated data deleted');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getRazorpayPayments(req, res) {
  try {
    const { from, to, page, limit, status, search } = req.query;
    const result = await service.getRazorpayPayments({ from, to, caMode: boolParam(req.query.caMode), status, search, page, limit });
    return sendSuccess(res, result, 'Razorpay payments retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getPayuTransactions(req, res) {
  try {
    const { from, to, page, limit, status, search, bankCredit } = req.query;
    const result = await service.getPayuTransactions({ from, to, caMode: boolParam(req.query.caMode), status, search, bankCredit, page, limit });
    return sendSuccess(res, result, 'PayU transactions retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

function normalizeInvoiceType(v) {
  return v === 'customer' ? 'customer' : 'company';
}

async function downloadRazorpayInvoice(req, res) {
  try {
    const invoiceType = normalizeInvoiceType(req.query.type);
    const { payment, pdfBuffer } = await service.getRazorpayInvoicePdf(req.params.razorpayId, { invoiceType });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceType}-invoice-${payment.razorpay_id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function downloadPayuInvoice(req, res) {
  try {
    const invoiceType = normalizeInvoiceType(req.query.type);
    const { transaction, pdfBuffer } = await service.getPayuInvoicePdf(req.params.payuId, { invoiceType });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceType}-invoice-${transaction.payu_id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getInvoiceAnalytics(req, res) {
  try {
    const { gateway, from, to } = req.query;
    const result = await service.getInvoiceAnalytics({ gateway, from, to });
    return sendSuccess(res, result, 'Invoice analytics retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getSalesRegisterPayu(req, res) {
  try {
    const { from, to, page, limit, status, search, bankCredit } = req.query;
    const result = await service.getSalesRegisterPayu({ from, to, status, search, bankCredit, page, limit });
    return sendSuccess(res, result, 'PayU sales register retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getSalesRegisterRazorpay(req, res) {
  try {
    const { from, to, page, limit, status, search } = req.query;
    const result = await service.getSalesRegisterRazorpay({ from, to, status, search, page, limit });
    return sendSuccess(res, result, 'Razorpay sales register retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function exportSalesRegister(req, res) {
  try {
    const { from, to } = req.query;
    const buffer = await service.exportSalesRegister({ from, to });
    const filename = `sales-register${from ? `-${from}` : ''}${to ? `_to_${to}` : ''}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getPayuBankCreditChain(req, res) {
  try {
    const result = await service.getPayuBankCreditChain(req.params.payuId);
    return sendSuccess(res, result, 'Bank credit chain retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getRazorpayBankCreditChain(req, res) {
  try {
    const result = await service.getRazorpayBankCreditChain(req.params.razorpayId);
    return sendSuccess(res, result, 'Bank credit chain retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getDistinctStatuses(req, res) {
  try {
    const result = await service.getDistinctStatuses({ gateway: req.query.gateway });
    return sendSuccess(res, result, 'Distinct statuses retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function renumberCustomerInvoices(req, res) {
  try {
    const result = await service.resetAndRenumberCustomerInvoices(req.body.brand);
    return sendSuccess(res, result, 'Customer invoice numbers reset and reassigned in transaction-date order');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  importRazorpayPayments,
  importRazorpaySettlements,
  importPayuTransactions,
  importPayuSettlements,
  importBankStatement,
  previewRazorpayPayments,
  previewRazorpaySettlements,
  previewPayuTransactions,
  previewPayuSettlements,
  previewBankStatement,
  runReconciliation,
  listBrands,
  listGateways,
  listBankAccounts,
  listCategories,
  createCategory,
  listRules,
  createRule,
  updateRule,
  runReclassification,
  getBankLedger,
  createManualEntry,
  retagBankTransaction,
  getTrend,
  getTrendByType,
  getGatewayChargesTrend,
  getBrandPnL,
  getCategorySummary,
  getMonthCoverage,
  listFileArchive,
  downloadFile,
  previewFile,
  getImportedRows,
  deleteFileArchive,
  getRazorpayPayments,
  getPayuTransactions,
  downloadRazorpayInvoice,
  downloadPayuInvoice,
  getInvoiceAnalytics,
  getSalesRegisterPayu,
  getSalesRegisterRazorpay,
  exportSalesRegister,
  getPayuBankCreditChain,
  getRazorpayBankCreditChain,
  getDistinctStatuses,
  renumberCustomerInvoices,
};
