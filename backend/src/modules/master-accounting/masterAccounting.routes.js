'use strict';

const { Router } = require('express');
const { z } = require('zod');
const controller = require('./masterAccounting.controller');
const gate = require('./masterAccountingAuth');
const { validate } = require('../../middleware/validate');
const { uploadAccountingFile } = require('../../middleware/upload');

// Mounted under /api/admin/master-accounting (parent router already applies requireSuperAdmin).
const router = Router();

const unlockSchema = z.object({ dob: z.string().min(1) });

// Gate endpoints — no passcode required yet, only the inherited requireSuperAdmin.
router.post('/unlock', validate({ body: unlockSchema }), gate.unlock);
router.get('/gate-status', gate.gateStatus);
router.post('/lock', gate.lock);

// Everything below requires the DOB passcode to have been entered this session.
router.use(gate.requireMasterAccountingPasscode);

const rangeQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const pagedRangeQuerySchema = rangeQuerySchema.extend({
  caMode: z.string().optional(),
  page: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v), 200) : 50)),
});

const invoiceListQuerySchema = pagedRangeQuerySchema.extend({
  status: z.string().optional(),
  search: z.string().optional(),
  bankCredit: z.enum(['matched', 'pending']).optional(),
});

const invoiceAnalyticsQuerySchema = rangeQuerySchema.extend({
  gateway: z.enum(['PAYU', 'RAZORPAY']),
});

const trendQuerySchema = rangeQuerySchema.extend({
  granularity: z.enum(['month', 'quarter', 'half-year', 'fy']).optional(),
});

const trendByTypeQuerySchema = trendQuerySchema.extend({
  brandId: z.string().optional(),
});

const gatewayChargesQuerySchema = trendQuerySchema.extend({
  gateway: z.enum(['PAYU', 'RAZORPAY']),
});

const bankLedgerQuerySchema = pagedRangeQuerySchema.extend({
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  sortBy: z.enum(['txn_date', 'narration', 'category', 'brand', 'withdrawal_amt', 'deposit_amt']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  // Manual categorization review needs to see every row, not page through them — a much
  // higher cap than the other paginated lists (which just browse, not audit every row).
  limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v), 5000) : 50)),
});

const fileArchiveQuerySchema = z.object({
  fileType: z.enum(['PAYU_TRANSACTION_REPORT', 'PAYU_SETTLEMENT_REPORT', 'RAZORPAY_PAYMENT_REPORT', 'RAZORPAY_SETTLEMENT_REPORT', 'BANK_STATEMENT']).optional(),
  brandId: z.string().optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['REVENUE', 'EXPENSE', 'TRANSFER', 'TAX', 'REFUND', 'OTHER']),
  brandId: z.string().optional(),
});

const createRuleSchema = z.object({
  categoryId: z.string().min(1),
  matchType: z.enum(['CONTAINS', 'STARTS_WITH', 'REGEX']),
  pattern: z.string().min(1),
  priority: z.number().optional(),
});

const updateRuleSchema = z.object({
  isActive: z.boolean().optional(),
  priority: z.number().optional(),
});

const manualEntrySchema = z.object({
  bankAccountId: z.string().min(1),
  txnDate: z.string().min(1),
  narration: z.string().min(1),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  withdrawalAmt: z.number().optional(),
  depositAmt: z.number().optional(),
  notes: z.string().optional(),
});

const retagSchema = z.object({
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  notes: z.string().optional(),
});

// Reference data
router.get('/brands', controller.listBrands);
router.get('/gateways', controller.listGateways);
router.get('/bank-accounts', controller.listBankAccounts);

// Categories & classification rules
router.get('/categories', controller.listCategories);
router.post('/categories', validate({ body: createCategorySchema }), controller.createCategory);
router.get('/rules', controller.listRules);
router.post('/rules', validate({ body: createRuleSchema }), controller.createRule);
router.patch('/rules/:id', validate({ body: updateRuleSchema }), controller.updateRule);
router.post('/rules/reclassify', controller.runReclassification);

// Imports
router.post('/imports/razorpay-payments', uploadAccountingFile, controller.importRazorpayPayments);
router.post('/imports/razorpay-settlements', uploadAccountingFile, controller.importRazorpaySettlements);
router.post('/imports/payu-transactions', uploadAccountingFile, controller.importPayuTransactions);
router.post('/imports/payu-settlements', uploadAccountingFile, controller.importPayuSettlements);
router.post('/imports/bank-statement', uploadAccountingFile, controller.importBankStatement);
router.post('/reconciliation/run', controller.runReconciliation);

// Import previews (dry run — parses the file and reports new/duplicate/overlap counts,
// writes nothing) so the frontend can warn before a re-uploaded or overlapping report
// is actually committed.
router.post('/imports/razorpay-payments/preview', uploadAccountingFile, controller.previewRazorpayPayments);
router.post('/imports/razorpay-settlements/preview', uploadAccountingFile, controller.previewRazorpaySettlements);
router.post('/imports/payu-transactions/preview', uploadAccountingFile, controller.previewPayuTransactions);
router.post('/imports/payu-settlements/preview', uploadAccountingFile, controller.previewPayuSettlements);
router.post('/imports/bank-statement/preview', uploadAccountingFile, controller.previewBankStatement);

// Bank ledger + manual entry
router.get('/bank-ledger', validate({ query: bankLedgerQuerySchema }), controller.getBankLedger);
router.post('/bank-ledger/manual-entry', validate({ body: manualEntrySchema }), controller.createManualEntry);
router.patch('/bank-ledger/:id/tag', validate({ body: retagSchema }), controller.retagBankTransaction);

// Reports
router.get('/reports/trend', validate({ query: trendQuerySchema }), controller.getTrend);
router.get('/reports/trend-by-type', validate({ query: trendByTypeQuerySchema }), controller.getTrendByType);
router.get('/reports/gateway-charges', validate({ query: gatewayChargesQuerySchema }), controller.getGatewayChargesTrend);
router.get('/reports/brand-pnl', validate({ query: rangeQuerySchema }), controller.getBrandPnL);
router.get('/reports/category-summary', validate({ query: rangeQuerySchema }), controller.getCategorySummary);
router.get('/reports/coverage', controller.getMonthCoverage);

// Gateway transaction detail (CA Mode strips PII)
router.get('/razorpay-payments', validate({ query: invoiceListQuerySchema }), controller.getRazorpayPayments);
router.get('/payu-transactions', validate({ query: invoiceListQuerySchema }), controller.getPayuTransactions);

// Invoices — per-transaction PDF covering amount charged, gateway fee, and net credited
router.get('/invoices/razorpay/:razorpayId/download', controller.downloadRazorpayInvoice);
router.get('/invoices/payu/:payuId/download', controller.downloadPayuInvoice);
router.get('/invoices/analytics', validate({ query: invoiceAnalyticsQuerySchema }), controller.getInvoiceAnalytics);

// Sales Register — full per-transaction statutory/audit detail, both brands
router.get('/sales-register/payu', validate({ query: invoiceListQuerySchema }), controller.getSalesRegisterPayu);
router.get('/sales-register/razorpay', validate({ query: invoiceListQuerySchema }), controller.getSalesRegisterRazorpay);
router.get('/sales-register/export', validate({ query: rangeQuerySchema }), controller.exportSalesRegister);

// Bank Credit drill-down — the full linked chain: customer paid -> gateway settled -> bank credited
router.get('/bank-credit-chain/payu/:payuId', controller.getPayuBankCreditChain);
router.get('/bank-credit-chain/razorpay/:razorpayId', controller.getRazorpayBankCreditChain);

// Distinct status values actually present in the data, for building the status filter
router.get('/statuses', validate({ query: z.object({ gateway: z.enum(['PAYU', 'RAZORPAY']) }) }), controller.getDistinctStatuses);

// One-time repair: reset + reassign a brand's customer invoice numbers in transaction-date
// order. Only safe before any of these numbers have gone out to a real customer.
router.post('/customer-invoice-numbers/renumber', validate({ body: z.object({ brand: z.enum(['VALIDSTEP', 'RISEFLAKE']) }) }), controller.renumberCustomerInvoices);

// File archive (read-only originals)
router.get('/files', validate({ query: fileArchiveQuerySchema }), controller.listFileArchive);
router.get('/files/:id/download', controller.downloadFile);
router.get('/files/:id/preview', controller.previewFile);
router.get('/files/:id/imported-rows', controller.getImportedRows);
router.delete('/files/:id', controller.deleteFileArchive);

module.exports = router;
