'use strict';

const fs = require('fs');
const accountingService = require('./accounting.service');
const { sendSuccess, sendCreated, sendError } = require('../../utils/apiResponse');

const IMPORT_TYPES = new Set(['TRANSACTION_REPORT', 'SETTLEMENT_REPORT', 'BANK_STATEMENT']);

async function uploadImport(req, res) {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);
    const { type } = req.body;
    if (!IMPORT_TYPES.has(type)) {
      fs.unlink(req.file.path, () => {});
      return sendError(res, `type must be one of ${[...IMPORT_TYPES].join(', ')}`, 400);
    }

    const result = await accountingService.importFile({ type, file: req.file, uploadedBy: req.user?.email || req.user?.id });
    return sendCreated(res, result, 'File imported successfully');
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getImports(req, res) {
  try {
    const result = await accountingService.listImports(req.query);
    return sendSuccess(res, result, 'Imports retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getSummary(req, res) {
  try {
    const result = await accountingService.getSummary(req.query);
    return sendSuccess(res, result, 'Summary retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getReconciliation(req, res) {
  try {
    const result = await accountingService.getReconciliation(req.query);
    return sendSuccess(res, result, 'Reconciliation retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function runReconciliation(req, res) {
  try {
    const result = await accountingService.runReconciliation();
    return sendSuccess(res, result, 'Reconciliation re-run complete');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function createFeeStatement(req, res) {
  try {
    const { from, to } = req.body;
    const { statement, pdfBuffer } = await accountingService.generateFeeStatement({ from, to, generatedBy: req.user?.email });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${statement.statement_number}.pdf"`);
    res.setHeader('X-Statement-Id', statement.id);
    res.send(pdfBuffer);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getFeeStatements(req, res) {
  try {
    const result = await accountingService.listFeeStatements(req.query);
    return sendSuccess(res, result, 'Fee statements retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function downloadFeeStatement(req, res) {
  try {
    const { statement, pdfBuffer } = await accountingService.getFeeStatementPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${statement.statement_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function exportForCA(req, res) {
  try {
    const buffer = await accountingService.exportForCA(req.query);
    const { from, to } = req.query;
    const filename = `validstep-payu-accounting${from ? `-${from}` : ''}${to ? `_to_${to}` : ''}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function downloadTransactionReceipt(req, res) {
  try {
    const { transaction, pdfBuffer } = await accountingService.getTransactionReceipt(req.params.payuId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${transaction.payu_id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  uploadImport,
  getImports,
  getSummary,
  getReconciliation,
  runReconciliation,
  createFeeStatement,
  getFeeStatements,
  downloadFeeStatement,
  exportForCA,
  downloadTransactionReceipt,
};
