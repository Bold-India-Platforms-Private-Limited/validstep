'use strict';

const { Router } = require('express');
const { z } = require('zod');
const controller = require('./accounting.controller');
const { validate } = require('../../middleware/validate');
const { uploadAccountingFile } = require('../../middleware/upload');

// Mounted under /api/admin (which already applies requireSuperAdmin + generalLimiter).
const router = Router();

const uploadBodySchema = z.object({
  type: z.enum(['TRANSACTION_REPORT', 'SETTLEMENT_REPORT', 'BANK_STATEMENT']),
});

const rangeQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const reconciliationQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(['UNMATCHED', 'MATCHED_EXACT', 'MATCHED_AMOUNT_DATE', 'IGNORED']).optional(),
  channel: z.enum(['VALIDSTEP', 'PAYU_BUTTON', 'OTHER']).optional(),
  page: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v), 200) : 50)),
});

const listQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v), 100) : 20)),
});

const feeStatementBodySchema = z.object({
  from: z.string(),
  to: z.string(),
});

router.post('/imports', uploadAccountingFile, validate({ body: uploadBodySchema }), controller.uploadImport);
router.get('/imports', validate({ query: listQuerySchema }), controller.getImports);
router.get('/summary', validate({ query: rangeQuerySchema }), controller.getSummary);
router.get('/reconciliation', validate({ query: reconciliationQuerySchema }), controller.getReconciliation);
router.post('/reconciliation/run', controller.runReconciliation);
router.post('/fee-statement', validate({ body: feeStatementBodySchema }), controller.createFeeStatement);
router.get('/fee-statement', validate({ query: listQuerySchema }), controller.getFeeStatements);
router.get('/fee-statement/:id/download', controller.downloadFeeStatement);
router.get('/export', validate({ query: rangeQuerySchema }), controller.exportForCA);
router.get('/transactions/:payuId/receipt', controller.downloadTransactionReceipt);

module.exports = router;
