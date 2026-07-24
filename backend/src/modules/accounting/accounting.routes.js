'use strict';

const { Router } = require('express');
const controller = require('./accounting.controller');

// Mounted under /api/admin (which already applies requireSuperAdmin + generalLimiter).
// Only the PayU Button receipt download survives here — it backs the "Download" button on
// the admin Invoices page. Everything else (report imports, reconciliation, fee statements,
// CA export) was the standalone Accounting page, removed per product decision.
const router = Router();

router.get('/transactions/:payuId/receipt', controller.downloadTransactionReceipt);

module.exports = router;
