'use strict';

const fs = require('fs');
const path = require('path');
const { Prisma } = require('@prisma/client');
const { db } = require('../../config/database');
const XLSX = require('xlsx');
const {
  parseTransactionReport,
  parseSettlementReport,
  parsePayuSettlementSummaryReport,
  parseBankStatement,
} = require('../../utils/reportParsers');
const { parseRazorpayPaymentReport, parseRazorpaySettlementReport } = require('../../utils/razorpayReportParsers');
const { archiveSourceFile } = require('./fileArchive');
const { loadActiveRules, classifyNarration, reclassifyUnmatched } = require('./bankNarrationClassifier');
const { generateInvoicePDF } = require('../../utils/masterInvoiceGenerator');

function toNumber(decimal) {
  return decimal === null || decimal === undefined ? 0 : Number(decimal);
}

// All gateway timestamps (Razorpay created_at_source, PayU addedon/settlement_date) are
// stored as precise UTC instants anchored to IST at parse time (see reportParsers.js /
// razorpayReportParsers.js — they append "+05:30" to the naive datetime string). Reading
// a "YYYY-MM-DD" date param as plain UTC midnight would silently exclude/misattribute
// anything in the first ~5.5 hours of an IST calendar day (that instant is still the
// *previous* UTC day). Anchoring the param to IST midnight instead keeps every date-range
// filter, FY/quarter/month bucket, and the coverage matrix aligned to the same IST
// calendar day the business actually operates on — see getISTCalendarKey below for the
// matching fix on the read side.
const IST_OFFSET = '+05:30';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function parseDateParam(v) {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00${IST_OFFSET}`);
  return isNaN(d.getTime()) ? null : d;
}

/** A date-only "to" bound is inclusive of the whole final IST day. */
function parseToDateParam(v) {
  if (!v) return null;
  const d = new Date(`${v}T23:59:59.999${IST_OFFSET}`);
  return isNaN(d.getTime()) ? null : d;
}

/** Shift a stored UTC instant so UTC getters read back the IST calendar date/time. */
function toISTShifted(date) {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

/** "YYYY-MM" bucket key for a stored timestamp, in IST (not the raw UTC calendar day). */
function getISTMonthKey(date) {
  const shifted = toISTShifted(date);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function dateRangeWhere(field, from, to) {
  const range = {};
  if (from) range.gte = from;
  if (to) range.lte = to;
  return Object.keys(range).length ? { [field]: range } : {};
}

async function getBrandByCode(code) {
  const brand = await db.brand.findUnique({ where: { code } });
  if (!brand) throw Object.assign(new Error(`Brand ${code} not seeded — run npm run seed:master-accounting`), { statusCode: 500 });
  return brand;
}

async function getGatewayByCode(code) {
  const gateway = await db.paymentGatewayAccount.findUnique({ where: { code } });
  if (!gateway) throw Object.assign(new Error(`Gateway ${code} not seeded — run npm run seed:master-accounting`), { statusCode: 500 });
  return gateway;
}

async function getDefaultBankAccount() {
  const bank = await db.bankAccount.findFirst({ where: { is_active: true }, orderBy: { created_at: 'asc' } });
  if (!bank) throw Object.assign(new Error('No bank account seeded — run npm run seed:master-accounting'), { statusCode: 500 });
  return bank;
}

// ─── Reference data ──────────────────────────────────────────────────────────

async function listBrands() {
  return db.brand.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } });
}

async function listGateways() {
  return db.paymentGatewayAccount.findMany({ where: { is_active: true }, include: { brand: true }, orderBy: { name: 'asc' } });
}

async function listBankAccounts() {
  return db.bankAccount.findMany({ where: { is_active: true }, orderBy: { nickname: 'asc' } });
}

// ─── Categories & classification rules (the extensibility surface) ─────────

async function listCategories() {
  return db.ledgerCategory.findMany({ include: { brand: true }, orderBy: { name: 'asc' } });
}

async function createCategory({ name, type, brandId }) {
  return db.ledgerCategory.create({ data: { name, type, brand_id: brandId || null } });
}

async function listRules() {
  return db.ledgerClassificationRule.findMany({ include: { category: true }, orderBy: [{ priority: 'desc' }, { created_at: 'asc' }] });
}

async function createRule({ categoryId, matchType, pattern, priority }) {
  return db.ledgerClassificationRule.create({
    data: { category_id: categoryId, match_type: matchType, pattern, priority: priority ?? 0 },
  });
}

async function updateRule({ id, isActive, priority }) {
  return db.ledgerClassificationRule.update({
    where: { id },
    data: {
      ...(isActive !== undefined ? { is_active: isActive } : {}),
      ...(priority !== undefined ? { priority } : {}),
    },
  });
}

async function runReclassification() {
  return reclassifyUnmatched();
}

// ─── Imports ─────────────────────────────────────────────────────────────────

async function importRazorpayPaymentReport({ file, uploadedBy, periodType = 'MONTHLY', periodLabel }) {
  const buffer = fs.readFileSync(file.path);
  const brand = await getBrandByCode('RISEFLAKE');
  const gateway = await getGatewayByCode('RAZORPAY');
  const { rows, skipped_count } = parseRazorpayPaymentReport(buffer);
  const isReferenceOnly = periodType !== 'MONTHLY';

  const archive = await archiveSourceFile({
    buffer,
    originalFilename: file.originalname,
    fileType: 'RAZORPAY_PAYMENT_REPORT',
    brandId: brand.id,
    gatewayId: gateway.id,
    periodType,
    periodLabel,
    uploadedBy,
    rowCount: rows.length,
    importedToLedger: !isReferenceOnly,
    scopeFolder: 'riseflake',
    subScopeFolder: 'razorpay',
  });

  // Only MONTHLY uploads are the real recurring ingestion path. Any wider-span file
  // (quarterly/half-yearly/yearly/custom — e.g. a combined Q1 report) is archived for
  // later manual cross-checking only; writing its rows into the ledger too would
  // massively double-count data already covered by the monthly uploads.
  if (isReferenceOnly) {
    return { row_count: 0, parsed_row_count: rows.length, skipped_count, archive_id: archive.id, archived_only: true };
  }

  for (const row of rows) {
    await db.razorpayPayment.upsert({
      where: { razorpay_id: row.razorpay_id },
      create: { ...row, brand_id: brand.id, import_id: archive.id },
      update: { ...row, brand_id: brand.id, import_id: archive.id },
    });
  }

  return { row_count: rows.length, skipped_count, archive_id: archive.id };
}

async function importRazorpaySettlementReport({ file, uploadedBy, periodType = 'MONTHLY', periodLabel }) {
  const buffer = fs.readFileSync(file.path);
  const brand = await getBrandByCode('RISEFLAKE');
  const gateway = await getGatewayByCode('RAZORPAY');
  const { rows, skipped_count } = parseRazorpaySettlementReport(buffer);
  const isReferenceOnly = periodType !== 'MONTHLY';

  const archive = await archiveSourceFile({
    buffer,
    originalFilename: file.originalname,
    fileType: 'RAZORPAY_SETTLEMENT_REPORT',
    brandId: brand.id,
    gatewayId: gateway.id,
    periodType,
    periodLabel,
    uploadedBy,
    rowCount: rows.length,
    importedToLedger: !isReferenceOnly,
    scopeFolder: 'riseflake',
    subScopeFolder: 'razorpay',
  });

  if (isReferenceOnly) {
    return { row_count: 0, parsed_row_count: rows.length, skipped_count, archive_id: archive.id, archived_only: true };
  }

  for (const row of rows) {
    await db.razorpaySettlement.upsert({
      where: { settlement_id: row.settlement_id },
      create: { ...row, brand_id: brand.id, import_id: archive.id },
      update: { ...row, brand_id: brand.id, import_id: archive.id },
    });
  }

  const reconciliation = await runReconciliation();
  return { row_count: rows.length, skipped_count, archive_id: archive.id, reconciliation };
}

async function importPayuTransactionReport({ file, uploadedBy, periodType = 'MONTHLY', periodLabel }) {
  const buffer = fs.readFileSync(file.path);
  const brand = await getBrandByCode('VALIDSTEP');
  const gateway = await getGatewayByCode('PAYU');
  const { rows, skipped_count } = parseTransactionReport(buffer);
  const isReferenceOnly = periodType !== 'MONTHLY';

  const archive = await archiveSourceFile({
    buffer,
    originalFilename: file.originalname,
    fileType: 'PAYU_TRANSACTION_REPORT',
    brandId: brand.id,
    gatewayId: gateway.id,
    periodType,
    periodLabel,
    uploadedBy,
    rowCount: rows.length,
    importedToLedger: !isReferenceOnly,
    scopeFolder: 'validstep',
    subScopeFolder: 'payu',
  });

  if (isReferenceOnly) {
    return { row_count: 0, parsed_row_count: rows.length, skipped_count, archive_id: archive.id, archived_only: true };
  }

  for (const row of rows) {
    const data = {
      payu_id: row.payu_id,
      brand_id: brand.id,
      txnid: row.txnid,
      status: row.status,
      amount: row.amount,
      productinfo: row.productinfo,
      email: row.email,
      mode: row.mode,
      service_fees: row.service_fees,
      convenience_fee: row.convenience_fee,
      cgst: row.cgst,
      sgst: row.sgst,
      igst: row.igst,
      settlement_amount: row.settlement_amount,
      addedon: row.addedon,
      settlement_date: row.settlement_date,
      raw: row.raw,
      import_id: archive.id,
    };
    await db.masterPayuTransaction.upsert({
      where: { payu_id: row.payu_id },
      create: data,
      update: data,
    });
  }

  return { row_count: rows.length, skipped_count, archive_id: archive.id };
}

/** PayU exports settlement data in two shapes — detect which one by sniffing the header row. */
function detectPayuSettlementShape(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const firstRow = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true })[0] || {};
  if ('Merchant Txn ID' in firstRow) return 'LEDGER';
  if ('SETTLEMENT ID' in firstRow) return 'SUMMARY';
  throw Object.assign(new Error('Unrecognized PayU settlement report format'), { statusCode: 400 });
}

async function importPayuSettlementReport({ file, uploadedBy, periodType = 'MONTHLY', periodLabel }) {
  const buffer = fs.readFileSync(file.path);
  const brand = await getBrandByCode('VALIDSTEP');
  const gateway = await getGatewayByCode('PAYU');
  const shape = detectPayuSettlementShape(buffer);
  const { rows, skipped_count } = shape === 'SUMMARY' ? parsePayuSettlementSummaryReport(buffer) : parseSettlementReport(buffer);
  const isReferenceOnly = periodType !== 'MONTHLY';

  const archive = await archiveSourceFile({
    buffer,
    originalFilename: file.originalname,
    fileType: 'PAYU_SETTLEMENT_REPORT',
    brandId: brand.id,
    gatewayId: gateway.id,
    periodType,
    periodLabel,
    uploadedBy,
    rowCount: rows.length,
    importedToLedger: !isReferenceOnly,
    scopeFolder: 'validstep',
    subScopeFolder: 'payu',
  });

  if (isReferenceOnly) {
    return { row_count: 0, parsed_row_count: rows.length, skipped_count, archive_id: archive.id, shape, archived_only: true };
  }

  for (const row of rows) {
    const data = shape === 'SUMMARY'
      ? {
          settlement_key: row.settlement_key,
          brand_id: brand.id,
          settlement_id: row.settlement_id,
          settlement_date: row.settlement_date,
          merchant_utr: row.merchant_utr,
          txns_amount: row.txns_amount,
          settled_amount: row.settled_amount,
          adjustment_amount: row.adjustment_amount,
          refund_amount: row.refund_amount,
          chargeback_amount: row.chargeback_amount,
          total_processing_fees: row.total_processing_fees,
          total_service_tax: row.total_service_tax,
          transactions_count: row.transactions_count,
          raw: row.raw,
          import_id: archive.id,
        }
      : {
          settlement_key: row.settlement_key,
          brand_id: brand.id,
          merchant_txn_id: row.merchant_txn_id,
          requested_action: row.requested_action,
          amount_net_signed: row.amount_net_signed,
          total_processing_fees: row.total_processing_fees,
          total_service_tax: row.total_service_tax,
          merchant_utr: row.merchant_utr,
          settlement_date: row.settlement_date,
          raw: row.raw,
          import_id: archive.id,
        };
    await db.masterPayuSettlement.upsert({
      where: { settlement_key: row.settlement_key },
      create: data,
      update: data,
    });
  }

  const reconciliation = await runReconciliation();
  return { row_count: rows.length, skipped_count, archive_id: archive.id, shape, reconciliation };
}

async function importBankStatement({ file, uploadedBy, periodType = 'MONTHLY', periodLabel }) {
  const buffer = fs.readFileSync(file.path);
  const bankAccount = await getDefaultBankAccount();
  const { rows } = parseBankStatement(buffer);
  const isReferenceOnly = periodType !== 'MONTHLY';

  const archive = await archiveSourceFile({
    buffer,
    originalFilename: file.originalname,
    fileType: 'BANK_STATEMENT',
    bankAccountId: bankAccount.id,
    periodType,
    periodLabel,
    uploadedBy,
    rowCount: rows.length,
    importedToLedger: !isReferenceOnly,
    scopeFolder: 'shared',
    subScopeFolder: 'hdfc-bank',
  });

  if (isReferenceOnly) {
    return { row_count: 0, parsed_row_count: rows.length, skipped_duplicate: 0, archive_id: archive.id, archived_only: true };
  }

  const rules = await loadActiveRules();
  let created = 0;
  let skippedDuplicate = 0;
  let pendingClassification = 0;

  for (const row of rows) {
    // Decimal fields must be wrapped in Prisma.Decimal for the dedupe lookup — a raw JS
    // number lets Prisma serialize it through a float round-trip that silently fails the
    // equality match against the stored numeric column (see accounting.service.js history).
    const existing = await db.masterBankTransaction.findFirst({
      where: {
        bank_account_id: bankAccount.id,
        txn_date: row.txn_date,
        ref_no: row.ref_no,
        withdrawal_amt: row.withdrawal_amt === null ? null : new Prisma.Decimal(row.withdrawal_amt),
        deposit_amt: row.deposit_amt === null ? null : new Prisma.Decimal(row.deposit_amt),
        closing_balance: row.closing_balance === null ? null : new Prisma.Decimal(row.closing_balance),
      },
    });
    if (existing) { skippedDuplicate += 1; continue; }

    const classification = classifyNarration(row.narration, rules);
    if (!classification) pendingClassification += 1;

    await db.masterBankTransaction.create({
      data: {
        bank_account_id: bankAccount.id,
        txn_date: row.txn_date,
        narration: row.narration,
        ref_no: row.ref_no,
        value_date: row.value_date,
        withdrawal_amt: row.withdrawal_amt,
        deposit_amt: row.deposit_amt,
        closing_balance: row.closing_balance,
        category_id: classification?.category_id ?? null,
        brand_id: classification?.brand_id ?? null,
        matched_rule_id: classification?.matched_rule_id ?? null,
        import_id: archive.id,
      },
    });
    created += 1;
  }

  const reconciliation = await runReconciliation();
  return {
    row_count: created,
    skipped_duplicate: skippedDuplicate,
    pending_classification: pendingClassification,
    archive_id: archive.id,
    reconciliation,
  };
}

// ─── Import previews (dry run) ───────────────────────────────────────────────
// Parses the file and reports what WOULD happen — new rows, already-imported rows,
// the date range covered, and which earlier-uploaded file(s) already cover part of
// that same range — without writing anything to the DB or archiving the file. The
// frontend shows this to the admin before they confirm, so a re-uploaded or
// overlapping report (e.g. June appearing in two different exports) is caught and
// explained rather than silently causing confusion later.

function dateRangeOf(dates) {
  const valid = dates.filter(Boolean).map((d) => new Date(d).getTime()).filter((t) => !isNaN(t));
  if (!valid.length) return null;
  return { from: new Date(Math.min(...valid)), to: new Date(Math.max(...valid)) };
}

async function findOverlappingImports(model, dateField, dateRange, extraWhere = {}) {
  if (!dateRange) return [];
  const rows = await db[model].findMany({
    where: { ...extraWhere, [dateField]: { gte: dateRange.from, lte: dateRange.to }, import_id: { not: null } },
    select: { import_id: true },
    distinct: ['import_id'],
  });
  const importIds = [...new Set(rows.map((r) => r.import_id).filter(Boolean))];
  if (!importIds.length) return [];
  return db.sourceFileArchive.findMany({ where: { id: { in: importIds } } });
}

/** Prisma Decimal, plain number, or string — normalize all three to something comparable. */
function normalizeForCompare(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && typeof v.toNumber === 'function') return Math.round(v.toNumber() * 100) / 100;
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  return String(v).trim();
}

/**
 * Bidirectional row-level verification for a wider-span reference file (e.g. a combined
 * 6-month report) against what's already in the ledger from the monthly uploads it's meant
 * to cross-check. Every row on EITHER side is accounted for:
 *   - "verified"          found on both sides + every compared field matches — the monthly
 *                          data is confirmed correct for this transaction.
 *   - "mismatch"          found on both sides but a field differs — worth investigating,
 *                          could mean a monthly file was wrong or the gateway corrected a
 *                          record after the fact.
 *   - "missing_from_ledger" in this file but nowhere in the ledger — a real gap, e.g. a
 *                          transaction that never made it into any monthly upload.
 *   - "extra_in_ledger"   in the ledger (within this file's date range) but not in this
 *                          file at all — either this reference file doesn't fully cover
 *                          that sub-range, or the ledger has a row not backed by the source.
 * `existingRowsInRange` must be every ledger row whose date falls within the file's own
 * min/max date span (not just rows matching a key from the file) so the reverse direction
 * can be computed too.
 */
function buildVerificationReport(parsedRows, existingRowsInRange, keyFn, compareFieldList, describeFn = keyFn) {
  const existingByKey = new Map();
  for (const e of existingRowsInRange) {
    const k = keyFn(e);
    if (k) existingByKey.set(k, e);
  }

  const fileKeys = new Set();
  let verified = 0;
  const mismatches = [];
  const missingFromLedger = [];

  for (const row of parsedRows) {
    const key = keyFn(row);
    if (!key) continue;
    fileKeys.add(key);
    const existing = existingByKey.get(key);
    if (!existing) { missingFromLedger.push(describeFn(row)); continue; }
    const diffs = [];
    for (const f of compareFieldList) {
      const a = normalizeForCompare(row[f]);
      const b = normalizeForCompare(existing[f]);
      // A field going from null to populated (or vice versa) is itself a real discrepancy
      // worth surfacing — e.g. settlement_amount filling in after the fact — not noise to skip.
      if (a !== b) diffs.push({ field: f, file_value: a, ledger_value: b });
    }
    if (diffs.length) mismatches.push({ key: describeFn(row), diffs });
    else verified += 1;
  }

  const extraInLedger = [];
  for (const [key, row] of existingByKey) {
    if (!fileKeys.has(key)) extraInLedger.push(describeFn(row));
  }

  return {
    verified_count: verified,
    mismatch_count: mismatches.length,
    missing_from_ledger_count: missingFromLedger.length,
    extra_in_ledger_count: extraInLedger.length,
    // cap response size; counts above are still exact
    mismatches: mismatches.slice(0, 50),
    missing_from_ledger: missingFromLedger.slice(0, 50),
    extra_in_ledger: extraInLedger.slice(0, 50),
  };
}

async function previewRazorpayPaymentReport({ file }) {
  const buffer = fs.readFileSync(file.path);
  const { rows, skipped_count } = parseRazorpayPaymentReport(buffer);
  const dateRange = dateRangeOf(rows.map((r) => r.created_at_source));
  const existingInRange = dateRange
    ? await db.razorpayPayment.findMany({
        where: dateRangeWhere('created_at_source', dateRange.from, dateRange.to),
        select: { razorpay_id: true, amount: true, status: true, fee: true, tax: true },
      })
    : [];
  const overlappingFiles = await findOverlappingImports('razorpayPayment', 'created_at_source', dateRange);
  const verification = buildVerificationReport(rows, existingInRange, (r) => r.razorpay_id, ['amount', 'status', 'fee', 'tax']);

  return {
    total_rows: rows.length,
    skipped_count,
    new_rows: verification.missing_from_ledger_count,
    already_imported_rows: verification.verified_count + verification.mismatch_count,
    date_range: dateRange,
    overlapping_files: overlappingFiles,
    verification,
  };
}

async function previewRazorpaySettlementReport({ file }) {
  const buffer = fs.readFileSync(file.path);
  const { rows, skipped_count } = parseRazorpaySettlementReport(buffer);
  const dateRange = dateRangeOf(rows.map((r) => r.created_at_source));
  const existingInRange = dateRange
    ? await db.razorpaySettlement.findMany({
        where: dateRangeWhere('created_at_source', dateRange.from, dateRange.to),
        select: { settlement_id: true, amount: true, status: true, fees: true, tax: true, utr: true },
      })
    : [];
  const overlappingFiles = await findOverlappingImports('razorpaySettlement', 'created_at_source', dateRange);
  const verification = buildVerificationReport(rows, existingInRange, (r) => r.settlement_id, ['amount', 'status', 'fees', 'tax', 'utr']);

  return {
    total_rows: rows.length,
    skipped_count,
    new_rows: verification.missing_from_ledger_count,
    already_imported_rows: verification.verified_count + verification.mismatch_count,
    date_range: dateRange,
    overlapping_files: overlappingFiles,
    verification,
  };
}

async function previewPayuTransactionReport({ file }) {
  const buffer = fs.readFileSync(file.path);
  const { rows, skipped_count } = parseTransactionReport(buffer);
  const dateRange = dateRangeOf(rows.map((r) => r.addedon));
  const existingInRange = dateRange
    ? await db.masterPayuTransaction.findMany({
        where: dateRangeWhere('addedon', dateRange.from, dateRange.to),
        select: { payu_id: true, status: true, amount: true, settlement_amount: true },
      })
    : [];
  const overlappingFiles = await findOverlappingImports('masterPayuTransaction', 'addedon', dateRange);
  const verification = buildVerificationReport(rows, existingInRange, (r) => r.payu_id, ['status', 'amount', 'settlement_amount']);

  return {
    total_rows: rows.length,
    skipped_count,
    new_rows: verification.missing_from_ledger_count,
    already_imported_rows: verification.verified_count + verification.mismatch_count,
    date_range: dateRange,
    overlapping_files: overlappingFiles,
    verification,
  };
}

async function previewPayuSettlementReport({ file }) {
  const buffer = fs.readFileSync(file.path);
  const shape = detectPayuSettlementShape(buffer);
  const { rows, skipped_count } = shape === 'SUMMARY' ? parsePayuSettlementSummaryReport(buffer) : parseSettlementReport(buffer);
  const dateRange = dateRangeOf(rows.map((r) => r.settlement_date));
  const compareFieldList = shape === 'SUMMARY'
    ? ['settled_amount', 'total_processing_fees', 'total_service_tax']
    : ['amount_net_signed', 'total_processing_fees', 'total_service_tax'];
  const existingInRange = dateRange
    ? await db.masterPayuSettlement.findMany({
        where: dateRangeWhere('settlement_date', dateRange.from, dateRange.to),
        select: { settlement_key: true, amount_net_signed: true, total_processing_fees: true, total_service_tax: true, settled_amount: true },
      })
    : [];
  const overlappingFiles = await findOverlappingImports('masterPayuSettlement', 'settlement_date', dateRange);
  const verification = buildVerificationReport(rows, existingInRange, (r) => r.settlement_key, compareFieldList);

  return {
    total_rows: rows.length,
    skipped_count,
    new_rows: verification.missing_from_ledger_count,
    already_imported_rows: verification.verified_count + verification.mismatch_count,
    date_range: dateRange,
    overlapping_files: overlappingFiles,
    shape,
    verification,
  };
}

/** Bank rows have no single natural key, so cross-check verification uses a looser
 * composite (date+ref+narration, excluding amounts) than the exact-equality key the real
 * import's dedupe uses — that's what lets an amount discrepancy surface as a "mismatch"
 * to investigate instead of just looking like an unrelated "new" row. */
function bankRowKey(r) {
  if (!r.txn_date) return null;
  const d = new Date(r.txn_date).toISOString().slice(0, 10);
  const ref = (r.ref_no || '').trim();
  const narr = (r.narration || '').trim();
  return `${d}|${ref}|${narr}`;
}

function bankRowDescribe(r) {
  const d = r.txn_date ? new Date(r.txn_date).toISOString().slice(0, 10) : '?';
  const ref = (r.ref_no || '').trim() || '—';
  const narr = (r.narration || '').trim();
  return `${d} · ${narr} (ref: ${ref})`;
}

async function previewBankStatement({ file }) {
  const buffer = fs.readFileSync(file.path);
  const bankAccount = await getDefaultBankAccount();
  const { rows } = parseBankStatement(buffer);

  let newCount = 0;
  for (const row of rows) {
    const existing = await db.masterBankTransaction.findFirst({
      where: {
        bank_account_id: bankAccount.id,
        txn_date: row.txn_date,
        ref_no: row.ref_no,
        withdrawal_amt: row.withdrawal_amt === null ? null : new Prisma.Decimal(row.withdrawal_amt),
        deposit_amt: row.deposit_amt === null ? null : new Prisma.Decimal(row.deposit_amt),
        closing_balance: row.closing_balance === null ? null : new Prisma.Decimal(row.closing_balance),
      },
    });
    if (!existing) newCount += 1;
  }

  const dateRange = dateRangeOf(rows.map((r) => r.txn_date));
  const overlappingFiles = await findOverlappingImports('masterBankTransaction', 'txn_date', dateRange, {
    bank_account_id: bankAccount.id,
  });

  const existingInRange = dateRange
    ? await db.masterBankTransaction.findMany({
        where: { bank_account_id: bankAccount.id, ...dateRangeWhere('txn_date', dateRange.from, dateRange.to) },
        select: { txn_date: true, ref_no: true, narration: true, withdrawal_amt: true, deposit_amt: true, closing_balance: true },
      })
    : [];
  const verification = buildVerificationReport(
    rows, existingInRange, bankRowKey, ['withdrawal_amt', 'deposit_amt', 'closing_balance'], bankRowDescribe
  );

  return {
    total_rows: rows.length,
    skipped_count: 0,
    new_rows: newCount,
    already_imported_rows: rows.length - newCount,
    date_range: dateRange,
    overlapping_files: overlappingFiles,
    verification,
  };
}

// ─── Reconciliation (settlement ↔ bank, exact UTR/reference match) ──────────

async function runReconciliation() {
  const bankRows = await db.masterBankTransaction.findMany({ where: { deposit_amt: { not: null } } });
  const refIndex = new Map();
  for (const b of bankRows) {
    if (b.ref_no) refIndex.set(b.ref_no.trim(), b);
  }

  let razorpayMatched = 0;
  const unmatchedRazorpay = await db.razorpaySettlement.findMany({ where: { bank_match_status: 'UNMATCHED' } });
  for (const s of unmatchedRazorpay) {
    const ref = s.utr || s.additional_utr;
    const bank = ref ? refIndex.get(ref.trim()) : null;
    if (bank) {
      await db.razorpaySettlement.update({ where: { id: s.id }, data: { bank_match_status: 'MATCHED_EXACT', bank_transaction_id: bank.id } });
      razorpayMatched += 1;
    }
  }

  let payuMatched = 0;
  const unmatchedPayu = await db.masterPayuSettlement.findMany({ where: { bank_match_status: 'UNMATCHED' } });
  for (const s of unmatchedPayu) {
    const ref = s.merchant_utr;
    const bank = ref ? refIndex.get(ref.trim()) : null;
    if (bank) {
      await db.masterPayuSettlement.update({ where: { id: s.id }, data: { bank_match_status: 'MATCHED_EXACT', bank_transaction_id: bank.id } });
      payuMatched += 1;
    }
  }

  return {
    razorpay_matched: razorpayMatched,
    razorpay_unmatched: unmatchedRazorpay.length - razorpayMatched,
    payu_matched: payuMatched,
    payu_unmatched: unmatchedPayu.length - payuMatched,
  };
}

// ─── Bank ledger + manual entry ──────────────────────────────────────────────

const LEDGER_SORT_FIELDS = {
  txn_date: (dir) => ({ txn_date: dir }),
  narration: (dir) => ({ narration: dir }),
  category: (dir) => ({ category: { name: dir } }),
  brand: (dir) => ({ brand: { name: dir } }),
  withdrawal_amt: (dir) => ({ withdrawal_amt: dir }),
  deposit_amt: (dir) => ({ deposit_amt: dir }),
};

async function getBankLedger({ from, to, categoryId, brandId, caMode, page = 1, limit = 50, sortBy = 'txn_date', sortDir = 'desc' } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const where = {
    ...dateRangeWhere('txn_date', fromDate, toDate),
    ...(categoryId ? { category_id: categoryId === 'null' ? null : categoryId } : {}),
    ...(brandId ? { brand_id: brandId } : {}),
    // CA Mode hides not-yet-finalized rows (unclassified or manually-entered/adjusted) from
    // the compliance-facing view — they're not dropped from the money, just from what CA sees
    // until an admin finishes classifying them (see getPendingClassificationTotal below).
    ...(caMode ? { category_id: { not: null }, is_manual_entry: false } : {}),
  };
  const skip = (Number(page) - 1) * Number(limit);
  const dir = sortDir === 'asc' ? 'asc' : 'desc';
  const orderBy = (LEDGER_SORT_FIELDS[sortBy] || LEDGER_SORT_FIELDS.txn_date)(dir);

  const [rows, total] = await Promise.all([
    db.masterBankTransaction.findMany({
      where,
      include: { category: true, brand: true, bank_account: true },
      orderBy,
      skip,
      take: Number(limit),
    }),
    db.masterBankTransaction.count({ where }),
  ]);

  const shaped = rows.map((r) => ({
    id: r.id,
    txn_date: r.txn_date,
    narration: r.narration,
    ref_no: r.ref_no,
    withdrawal_amt: toNumber(r.withdrawal_amt),
    deposit_amt: toNumber(r.deposit_amt),
    closing_balance: toNumber(r.closing_balance),
    category: r.category ? { id: r.category.id, name: r.category.name, type: r.category.type } : null,
    brand: r.brand ? { id: r.brand.id, name: r.brand.name } : null,
    bank_account: r.bank_account?.nickname,
    is_manual_entry: r.is_manual_entry,
    // Free-text notes may contain informal admin remarks — not part of the CA-facing record.
    notes: caMode ? undefined : r.notes,
  }));

  return { rows: shaped, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
}

async function createManualEntry({ bankAccountId, txnDate, narration, categoryId, brandId, withdrawalAmt, depositAmt, notes }) {
  return db.masterBankTransaction.create({
    data: {
      bank_account_id: bankAccountId,
      txn_date: new Date(txnDate),
      narration,
      category_id: categoryId || null,
      brand_id: brandId || null,
      withdrawal_amt: withdrawalAmt ?? null,
      deposit_amt: depositAmt ?? null,
      is_manual_entry: true,
      notes,
    },
  });
}

async function retagBankTransaction({ id, categoryId, brandId, notes }) {
  return db.masterBankTransaction.update({
    where: { id },
    data: {
      category_id: categoryId || null,
      brand_id: brandId || null,
      matched_rule_id: null, // manual override — no longer attributable to an auto-rule
      ...(notes !== undefined ? { notes } : {}),
    },
  });
}

// ─── Period rollups: month / quarter / half-year / financial-year ──────────
// Indian FY runs April–March; quarters/halves follow that, not the calendar year.

// All four label functions read calendar fields off the IST-shifted instant (see
// toISTShifted above) — never the raw UTC getters — so a transaction just after IST
// midnight lands in the correct IST day/month/quarter/FY instead of the previous one.

function getFYLabel(date) {
  const shifted = toISTShifted(date);
  const month = shifted.getUTCMonth();
  const year = shifted.getUTCFullYear();
  const fyStartYear = month >= 3 ? year : year - 1;
  return `FY${String(fyStartYear).slice(2)}-${String(fyStartYear + 1).slice(2)}`;
}

function getQuarterLabel(date) {
  const fyMonthIndex = (toISTShifted(date).getUTCMonth() + 9) % 12; // shift so April = index 0
  const q = Math.floor(fyMonthIndex / 3) + 1;
  return `${getFYLabel(date)} Q${q}`;
}

function getHalfLabel(date) {
  const fyMonthIndex = (toISTShifted(date).getUTCMonth() + 9) % 12;
  return `${getFYLabel(date)} ${fyMonthIndex < 6 ? 'H1' : 'H2'}`;
}

function getMonthLabel(date) {
  return getISTMonthKey(date);
}

function getPeriodLabel(date, granularity) {
  switch (granularity) {
    case 'quarter': return getQuarterLabel(date);
    case 'half-year': return getHalfLabel(date);
    case 'fy': return getFYLabel(date);
    case 'month':
    default: return getMonthLabel(date);
  }
}

async function getTrend({ from, to, granularity = 'month' } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const rows = await db.masterBankTransaction.findMany({
    where: dateRangeWhere('txn_date', fromDate, toDate),
    include: { category: true },
  });

  const buckets = new Map();
  for (const r of rows) {
    const label = getPeriodLabel(r.txn_date, granularity);
    if (!buckets.has(label)) buckets.set(label, { period: label, credit: 0, debit: 0 });
    const b = buckets.get(label);
    b.credit += toNumber(r.deposit_amt);
    b.debit += toNumber(r.withdrawal_amt);
  }

  return [...buckets.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((b) => ({ ...b, net: b.credit - b.debit }));
}

/**
 * Same period bucketing as getTrend, but classifies each row by its category's
 * type (REVENUE/EXPENSE) instead of raw credit/debit — this is what actually
 * powers a P&L chart. Optionally scoped to one brand (Validstep or RiseFlake) so
 * the same function drives the company-wide P&L chart and the per-gateway
 * (PayU/Razorpay) charts. Unclassified rows are excluded — they don't have a
 * definitive revenue/expense type yet (see Dashboard's "Pending Classification").
 */
async function getTrendByType({ from, to, granularity = 'month', brandId } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const rows = await db.masterBankTransaction.findMany({
    where: {
      ...dateRangeWhere('txn_date', fromDate, toDate),
      ...(brandId ? { brand_id: brandId } : {}),
    },
    include: { category: true },
  });

  const buckets = new Map();
  for (const r of rows) {
    if (!r.category) continue;
    const label = getPeriodLabel(r.txn_date, granularity);
    if (!buckets.has(label)) buckets.set(label, { period: label, revenue: 0, expense: 0 });
    const b = buckets.get(label);
    if (r.category.type === 'REVENUE') b.revenue += toNumber(r.deposit_amt);
    else if (r.category.type === 'EXPENSE') b.expense += toNumber(r.withdrawal_amt);
  }

  return [...buckets.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((b) => ({ ...b, net: b.revenue - b.expense }));
}

/**
 * "Out of what we earned through this gateway, how much did it actually take?" —
 * gross transaction volume vs. everything that reduced it before settlement
 * (processing fees + service tax + refunds + chargebacks combined into one number,
 * since all four are money that didn't make it to the bank). Razorpay reports fee/
 * tax/refund per transaction already, so RazorpayPayment is bucketed by
 * created_at_source directly. PayU batches this at settlement time — the daily
 * Settlement Summary shape (see reportParsers.js) already carries txns_amount,
 * total_processing_fees, total_service_tax, refund_amount, and chargeback_amount
 * per settlement day, so MasterPayuSettlement is bucketed by settlement_date.
 *
 * PayU's two settlement shapes disagree on sign convention: the Summary shape's
 * SERVICE FEE/TAX columns are positive magnitudes, but the older per-transaction
 * Ledger shape stores total_processing_fees/total_service_tax as *negative*
 * net-effect values (verified against real settlement data — summing them for one
 * month came out to -1675.25, not a plausible fee). Math.abs() on both fields
 * normalizes either shape to a magnitude. A Ledger-shape settlement also has no
 * stored gross field (only the net `amount_net_signed` made it into the schema),
 * so gross there is reconstructed as net + |fee| + |tax|; refund/chargeback show
 * up as their own Requested Action rows in that shape rather than a combined
 * figure, so they're 0 for those rows rather than double-counted elsewhere.
 */
async function getGatewayChargesTrend({ from, to, granularity = 'month', gateway } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const buckets = new Map();

  const addTo = (label, gross, charges) => {
    if (!buckets.has(label)) buckets.set(label, { period: label, gross: 0, charges: 0 });
    const b = buckets.get(label);
    b.gross += gross;
    b.charges += charges;
  };

  if (gateway === 'RAZORPAY') {
    const rows = await db.razorpayPayment.findMany({ where: dateRangeWhere('created_at_source', fromDate, toDate) });
    for (const r of rows) {
      if (!r.created_at_source) continue;
      const label = getPeriodLabel(r.created_at_source, granularity);
      const charges = Math.abs(toNumber(r.fee)) + Math.abs(toNumber(r.tax)) + Math.abs(toNumber(r.amount_refunded));
      addTo(label, toNumber(r.amount), charges);
    }
  } else if (gateway === 'PAYU') {
    const rows = await db.masterPayuSettlement.findMany({ where: dateRangeWhere('settlement_date', fromDate, toDate) });
    for (const r of rows) {
      if (!r.settlement_date) continue;
      const label = getPeriodLabel(r.settlement_date, granularity);
      const fee = Math.abs(toNumber(r.total_processing_fees));
      const tax = Math.abs(toNumber(r.total_service_tax));
      const refund = Math.abs(toNumber(r.refund_amount));
      const chargeback = Math.abs(toNumber(r.chargeback_amount));
      const gross = r.txns_amount !== null ? toNumber(r.txns_amount) : toNumber(r.amount_net_signed) + fee + tax;
      addTo(label, gross, fee + tax + refund + chargeback);
    }
  } else {
    throw Object.assign(new Error('gateway must be PAYU or RAZORPAY'), { statusCode: 400 });
  }

  return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));
}

async function getBrandPnL({ from, to } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const rows = await db.masterBankTransaction.findMany({
    where: dateRangeWhere('txn_date', fromDate, toDate),
    include: { category: true, brand: true },
  });

  const brands = new Map();
  let sharedExpense = 0;
  let unclassifiedCredit = 0;
  let unclassifiedDebit = 0;

  for (const r of rows) {
    const credit = toNumber(r.deposit_amt);
    const debit = toNumber(r.withdrawal_amt);

    if (!r.category) {
      unclassifiedCredit += credit;
      unclassifiedDebit += debit;
      continue;
    }

    if (r.category.type === 'REVENUE' && r.brand_id) {
      if (!brands.has(r.brand_id)) brands.set(r.brand_id, { brand_id: r.brand_id, brand_name: r.brand?.name, revenue: 0, expense: 0 });
      brands.get(r.brand_id).revenue += credit;
    } else if (r.category.type === 'EXPENSE') {
      if (r.brand_id) {
        if (!brands.has(r.brand_id)) brands.set(r.brand_id, { brand_id: r.brand_id, brand_name: r.brand?.name, revenue: 0, expense: 0 });
        brands.get(r.brand_id).expense += debit;
      } else {
        sharedExpense += debit;
      }
    }
  }

  const byBrand = [...brands.values()].map((b) => ({ ...b, net_profit: b.revenue - b.expense }));
  const totalRevenue = byBrand.reduce((a, b) => a + b.revenue, 0);
  const totalBrandExpense = byBrand.reduce((a, b) => a + b.expense, 0);

  return {
    period: { from: fromDate, to: toDate },
    by_brand: byBrand,
    shared_expense: sharedExpense,
    unclassified: { credit: unclassifiedCredit, debit: unclassifiedDebit },
    company_total: {
      revenue: totalRevenue,
      expense: totalBrandExpense + sharedExpense,
      net_profit: totalRevenue - totalBrandExpense - sharedExpense,
    },
  };
}

async function getCategorySummary({ from, to } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const rows = await db.masterBankTransaction.findMany({
    where: dateRangeWhere('txn_date', fromDate, toDate),
    include: { category: true },
  });

  const byCategory = new Map();
  for (const r of rows) {
    const key = r.category_id || 'unclassified';
    if (!byCategory.has(key)) {
      byCategory.set(key, {
        category_id: r.category_id,
        category_name: r.category?.name || 'Needs Classification',
        category_type: r.category?.type || null,
        credit: 0,
        debit: 0,
        count: 0,
      });
    }
    const c = byCategory.get(key);
    c.credit += toNumber(r.deposit_amt);
    c.debit += toNumber(r.withdrawal_amt);
    c.count += 1;
  }

  return [...byCategory.values()].sort((a, b) => (b.credit + b.debit) - (a.credit + a.debit));
}

// ─── Month coverage (which months have data for each of the 5 report types) ──
// Admin uploads one file per gateway/bank per month — this surfaces gaps (a month
// with no rows for a given file type) so a missing upload is visible immediately
// rather than only being noticed later as a hole in the numbers.

const COVERAGE_SOURCES = [
  { fileType: 'RAZORPAY_PAYMENT_REPORT', model: 'razorpayPayment', dateField: 'created_at_source' },
  { fileType: 'RAZORPAY_SETTLEMENT_REPORT', model: 'razorpaySettlement', dateField: 'created_at_source' },
  { fileType: 'PAYU_TRANSACTION_REPORT', model: 'masterPayuTransaction', dateField: 'addedon' },
  { fileType: 'PAYU_SETTLEMENT_REPORT', model: 'masterPayuSettlement', dateField: 'settlement_date' },
  { fileType: 'BANK_STATEMENT', model: 'masterBankTransaction', dateField: 'txn_date' },
];

async function getMonthCoverage() {
  const coverage = {};
  const allMonths = new Set();

  for (const src of COVERAGE_SOURCES) {
    const rows = await db[src.model].findMany({ select: { [src.dateField]: true } });
    const counts = {};
    for (const r of rows) {
      const d = r[src.dateField];
      if (!d) continue;
      const month = getISTMonthKey(new Date(d));
      counts[month] = (counts[month] || 0) + 1;
      allMonths.add(month);
    }
    coverage[src.fileType] = counts;
  }

  return { months: [...allMonths].sort(), coverage };
}

// ─── File archive ─────────────────────────────────────────────────────────────

const ARCHIVE_DATE_FIELD = {
  RAZORPAY_PAYMENT_REPORT: 'created_at_source',
  RAZORPAY_SETTLEMENT_REPORT: 'created_at_source',
  PAYU_TRANSACTION_REPORT: 'addedon',
  PAYU_SETTLEMENT_REPORT: 'settlement_date',
  BANK_STATEMENT: 'txn_date',
};

async function listFileArchive({ fileType, brandId } = {}) {
  const archives = await db.sourceFileArchive.findMany({
    where: {
      ...(fileType ? { file_type: fileType } : {}),
      ...(brandId ? { brand_id: brandId } : {}),
    },
    include: { brand: true, gateway: true, bank_account: true },
    orderBy: { uploaded_at: 'desc' },
  });

  // The actual date span a file covers — derived from its own imported rows rather than
  // stored at upload time, so it's always exact. Only meaningful for files that were
  // actually written to the ledger (imported_to_ledger); a reference-only (Quarterly/
  // Custom) upload has no rows of its own to measure — period_type/period_label is all
  // the frontend has to show for those.
  return Promise.all(
    archives.map(async (archive) => {
      if (!archive.imported_to_ledger) return { ...archive, date_range: null };
      const source = IMPORTED_ROWS_SOURCES[archive.file_type];
      const dateField = ARCHIVE_DATE_FIELD[archive.file_type];
      if (!source || !dateField) return { ...archive, date_range: null };

      const agg = await db[source.model].aggregate({
        where: { import_id: archive.id },
        _min: { [dateField]: true },
        _max: { [dateField]: true },
      });
      const from = agg._min[dateField];
      const to = agg._max[dateField];
      return { ...archive, date_range: from && to ? { from, to } : null };
    })
  );
}

async function getFileForDownload(id) {
  const archive = await db.sourceFileArchive.findUnique({ where: { id } });
  if (!archive) throw Object.assign(new Error('File not found'), { statusCode: 404 });
  const repoRoot = path.join(__dirname, '../../../..');
  const absPath = path.join(repoRoot, archive.stored_path);
  return { archive, absPath };
}

/**
 * Read-only preview of an archived original file's raw sheet contents — never writes
 * back to the file (fs.readFileSync only). Used so an admin can visually compare the
 * original Excel rows against what actually landed in the software without leaving
 * the app, and without any risk to the read-only original (chmod 444 on disk already
 * enforces this at the OS level; this function simply never opens it for writing).
 */
async function getFilePreview(id, { page = 1, limit = 200 } = {}) {
  const { archive, absPath } = await getFileForDownload(id);
  const buffer = fs.readFileSync(absPath);
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

  const total = grid.length;
  const skip = (Number(page) - 1) * Number(limit);
  const rows = grid.slice(skip, skip + Number(limit));

  return {
    id: archive.id,
    original_filename: archive.original_filename,
    sheet_name: sheetName,
    rows,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  };
}

const IMPORTED_ROWS_SOURCES = {
  RAZORPAY_PAYMENT_REPORT: { model: 'razorpayPayment', orderBy: { created_at_source: 'asc' } },
  RAZORPAY_SETTLEMENT_REPORT: { model: 'razorpaySettlement', orderBy: { created_at_source: 'asc' } },
  PAYU_TRANSACTION_REPORT: { model: 'masterPayuTransaction', orderBy: { addedon: 'asc' } },
  PAYU_SETTLEMENT_REPORT: { model: 'masterPayuSettlement', orderBy: { settlement_date: 'asc' } },
  BANK_STATEMENT: { model: 'masterBankTransaction', orderBy: { txn_date: 'asc' }, include: { category: true, brand: true } },
};

/**
 * The rows that actually landed in the software for one specific archived import —
 * used side-by-side with getFilePreview's raw original-file rows so an admin can
 * visually confirm the two match, without either view being editable.
 */
async function getImportedRows(id, { page = 1, limit = 200 } = {}) {
  const archive = await db.sourceFileArchive.findUnique({ where: { id } });
  if (!archive) throw Object.assign(new Error('File not found'), { statusCode: 404 });

  const source = IMPORTED_ROWS_SOURCES[archive.file_type];
  if (!source) throw Object.assign(new Error(`No imported-rows view for ${archive.file_type}`), { statusCode: 400 });

  const where = { import_id: id };
  const skip = (Number(page) - 1) * Number(limit);

  const [rows, total] = await Promise.all([
    db[source.model].findMany({
      where, orderBy: source.orderBy, include: source.include, skip, take: Number(limit),
    }),
    db[source.model].count({ where }),
  ]);

  return {
    file_type: archive.file_type,
    rows,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  };
}

/**
 * Permanently removes an archived original file — the physical file on disk, every
 * ledger row that was written from it (looked up by import_id), and the archive
 * record itself. This is the one deliberate exception to "originals are never
 * deleted" — it exists for correcting a bad/duplicate/test upload, is irreversible,
 * and the frontend gates it behind an explicit double-confirmation before calling
 * this at all.
 */
async function deleteFileArchive(id) {
  const archive = await db.sourceFileArchive.findUnique({ where: { id } });
  if (!archive) throw Object.assign(new Error('File not found'), { statusCode: 404 });

  const source = IMPORTED_ROWS_SOURCES[archive.file_type];
  let deletedRows = 0;
  if (source) {
    const result = await db[source.model].deleteMany({ where: { import_id: id } });
    deletedRows = result.count;
  }

  await db.sourceFileArchive.delete({ where: { id } });

  const repoRoot = path.join(__dirname, '../../../..');
  const absPath = path.join(repoRoot, archive.stored_path);
  try {
    fs.chmodSync(absPath, 0o644); // undo the read-only lock before unlinking
    fs.unlinkSync(absPath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err; // already gone from disk — not fatal, DB is the source of truth
  }

  return { deleted_rows: deletedRows, original_filename: archive.original_filename };
}

// ─── Gateway transaction lists (CA Mode strips customer PII) ────────────────

// ─── Invoices — full money trail per transaction: amount charged → gateway fee → net
// credited to the company bank — for either brand/gateway pair Bold India Platforms runs. ──

/** Razorpay itemizes fee/tax on the payment row itself — no batching or allocation needed. */
function computeRazorpayInvoiceBreakdown(r) {
  const amount = toNumber(r.amount);
  const fee = Math.abs(toNumber(r.fee));
  const tax = Math.abs(toNumber(r.tax));
  const refunded = Math.abs(toNumber(r.amount_refunded));
  const netAmount = amount - fee - tax - refunded;
  return {
    amount, fee, tax, refunded, netAmount,
    feeRows: [
      { label: 'Razorpay Transaction Fee', value: fee },
      { label: 'GST on Transaction Fee', value: tax },
      ...(refunded ? [{ label: 'Refunded to Customer', value: refunded }] : []),
    ],
  };
}

function isChargebackAction(action) {
  // No confirmed real example of PayU's literal chargeback label has shown up in imported
  // data yet (only capture/refund/Adjustment_debit so far) — matched defensively by
  // substring so whatever PayU actually calls it still gets classified correctly.
  return /chargeback/i.test(action || '');
}

/** Builds the {matched, note} shape for one settlement row's own bank-credit status. */
/**
 * Reads the actual credit/debit direction off the matched bank row rather than assuming it
 * from the settlement leg type — a refund's settlement UTR can still net to a bank *credit*
 * if the rest of that day's batch outweighs it, so "refund = debit" isn't a safe assumption.
 */
function buildBankCreditInfo(settlement, bankTxnById) {
  const bankTxn = settlement?.bank_transaction_id ? bankTxnById.get(settlement.bank_transaction_id) : null;
  if (bankTxn) {
    const depositAmt = toNumber(bankTxn.deposit_amt);
    const isCredit = depositAmt > 0;
    const amt = isCredit ? depositAmt : toNumber(bankTxn.withdrawal_amt);
    return {
      matched: true,
      isCredit,
      note: `Part of settlement UTR ${settlement.merchant_utr || '—'}, ${isCredit ? 'credited to' : 'debited from'} your bank on `
        + `${bankTxn.txn_date.toISOString().slice(0, 10)}\n(batch ${isCredit ? 'credit' : 'debit'} of `
        + `${amt.toLocaleString('en-IN')} covering multiple transactions).`,
    };
  }
  return {
    matched: false,
    note: settlement
      ? `Settlement UTR ${settlement.merchant_utr || '—'} not yet matched to a bank statement row — check Bank Ledger once the statement is uploaded.`
      : 'No settlement record found yet — it may not have settled.',
  };
}

/**
 * Batched per-transaction PayU fee/net/bank-credit breakdown for a page of transactions —
 * the same fee model as the original /admin/accounting receipts (per-txn processing fee +
 * GST from the settlement ledger row, priority-settlement fee/GST when present, and this
 * txn's proportional share of PayU's ~2% MDR, which PayU settles once per day rather than
 * itemizing per row) but reading Master Accounting's own tables so it works brand-wide.
 * Batches the settlement lookup, day-level aggregates, and bank-match lookup across the
 * whole page instead of querying per row.
 *
 * Looks up EVERY settlement row for a transaction (capture, refund, chargeback), not just
 * the capture — a refunded/charged-back transaction has its own separate settlement leg,
 * with its own UTR/date/bank-match, that has to be surfaced or it silently vanishes from
 * the invoice and sales register. Also: PayU's transaction report zeroes out `amount` to 0
 * once a transaction is fully refunded (confirmed against real data), so "amount charged"
 * falls back to the capture settlement's own recorded amount when the transaction's own
 * amount looks like that zeroed-out case.
 */
async function getPayuInvoiceBreakdownForTxns(transactions) {
  const txnIds = [...new Set(transactions.map((t) => t.txnid).filter(Boolean))];
  const allSettlements = txnIds.length
    ? await db.masterPayuSettlement.findMany({ where: { merchant_txn_id: { in: txnIds } } })
    : [];
  const settlementsByTxnId = new Map();
  for (const s of allSettlements) {
    if (!settlementsByTxnId.has(s.merchant_txn_id)) settlementsByTxnId.set(s.merchant_txn_id, []);
    settlementsByTxnId.get(s.merchant_txn_id).push(s);
  }

  const captureSettlements = allSettlements.filter((s) => s.requested_action === 'capture');
  const settlementDateKeys = [...new Set(captureSettlements.map((s) => s.settlement_date?.toISOString()).filter(Boolean))];
  const dayStatsByDate = new Map();
  await Promise.all(settlementDateKeys.map(async (iso) => {
    const date = new Date(iso);
    const [captureAgg, adjAgg] = await Promise.all([
      db.masterPayuSettlement.aggregate({ where: { settlement_date: date, requested_action: 'capture' }, _sum: { amount_net_signed: true } }),
      db.masterPayuSettlement.aggregate({ where: { settlement_date: date, requested_action: 'Adjustment_debit' }, _sum: { total_processing_fees: true, total_service_tax: true } }),
    ]);
    dayStatsByDate.set(iso, {
      dayCaptureTotal: Math.abs(toNumber(captureAgg._sum.amount_net_signed)),
      dayPlatformFee: Math.abs(toNumber(adjAgg._sum.total_processing_fees)),
      dayPlatformFeeGst: Math.abs(toNumber(adjAgg._sum.total_service_tax)),
    });
  }));

  const bankTxnIds = [...new Set(allSettlements.map((s) => s.bank_transaction_id).filter(Boolean))];
  const bankTxns = bankTxnIds.length
    ? await db.masterBankTransaction.findMany({ where: { id: { in: bankTxnIds } } })
    : [];
  const bankTxnById = new Map(bankTxns.map((b) => [b.id, b]));

  const breakdownByTxnId = new Map();
  for (const t of transactions) {
    const rowsForTxn = settlementsByTxnId.get(t.txnid) || [];
    const settlement = rowsForTxn.find((s) => s.requested_action === 'capture');
    const refundSettlements = rowsForTxn.filter((s) => s.requested_action === 'refund');
    const chargebackSettlements = rowsForTxn.filter((s) => isChargebackAction(s.requested_action));

    // PayU zeroes the transaction report's amount once fully refunded — fall back to the
    // capture settlement's own recorded gross amount in that case.
    const amount = toNumber(t.amount) || Math.abs(toNumber(settlement?.raw?.Amount)) || 0;

    const perTransactionFee = Math.abs(toNumber(settlement?.total_processing_fees));
    const perTransactionGst = Math.abs(toNumber(settlement?.total_service_tax));
    const prioritySettlementFee = Math.abs(toNumber(settlement?.raw?.['Priority Settlement Fee']));
    const prioritySettlementGst = Math.abs(toNumber(settlement?.raw?.['Priority Settlement Tax']));

    let platformFeeShare = 0;
    let platformFeeGstShare = 0;
    let hasEstimatedFee = false;
    if (settlement?.settlement_date) {
      const stats = dayStatsByDate.get(settlement.settlement_date.toISOString());
      if (stats && stats.dayCaptureTotal > 0 && (stats.dayPlatformFee > 0 || stats.dayPlatformFeeGst > 0)) {
        const share = amount / stats.dayCaptureTotal;
        platformFeeShare = stats.dayPlatformFee * share;
        platformFeeGstShare = stats.dayPlatformFeeGst * share;
        hasEstimatedFee = true;
      }
    }

    const totalFee = perTransactionFee + perTransactionGst + prioritySettlementFee + prioritySettlementGst + platformFeeShare + platformFeeGstShare;

    const feeRows = [
      { label: 'PayU Processing Fee', value: perTransactionFee },
      { label: 'GST on Processing Fee', value: perTransactionGst },
    ];
    if (prioritySettlementFee || prioritySettlementGst) {
      feeRows.push({ label: 'Priority/Instant Settlement Fee', value: prioritySettlementFee });
      feeRows.push({ label: 'GST on Priority Settlement Fee', value: prioritySettlementGst });
    }
    if (hasEstimatedFee) {
      feeRows.push({ label: "PayU Transaction Fee (~2% MDR, this txn's share)", value: platformFeeShare });
      feeRows.push({ label: 'GST on Transaction Fee', value: platformFeeGstShare });
    }

    const bankCredit = buildBankCreditInfo(settlement, bankTxnById);

    const refund = refundSettlements.length
      ? {
          amount: refundSettlements.reduce((sum, s) => sum + Math.abs(toNumber(s.amount_net_signed)), 0),
          settlementDate: refundSettlements[0].settlement_date,
          merchantUtr: refundSettlements[0].merchant_utr,
          bankCredit: buildBankCreditInfo(refundSettlements[0], bankTxnById),
        }
      : null;
    if (refund) feeRows.push({ label: 'Refunded to Customer', value: refund.amount });

    const chargeback = chargebackSettlements.length
      ? {
          amount: chargebackSettlements.reduce((sum, s) => sum + Math.abs(toNumber(s.amount_net_signed)), 0),
          settlementDate: chargebackSettlements[0].settlement_date,
          merchantUtr: chargebackSettlements[0].merchant_utr,
          bankCredit: buildBankCreditInfo(chargebackSettlements[0], bankTxnById),
        }
      : null;
    if (chargeback) feeRows.push({ label: 'Chargeback', value: chargeback.amount });

    // The gateway fee is typically NOT reversed when a refund/chargeback happens (PayU
    // keeps its MDR either way) — so the true final financial impact is the fee AND the
    // full refunded/charged-back amount both coming out, not just the fee.
    const netAmount = amount - totalFee - (refund?.amount || 0) - (chargeback?.amount || 0);

    breakdownByTxnId.set(t.txnid, {
      amount, feeRows, totalFee, netAmount, hasEstimatedFee,
      // Named components (in addition to feeRows) so callers building a fixed-column report
      // — the sales register — don't have to parse label strings back out of feeRows.
      perTransactionFee, perTransactionGst, prioritySettlementFee, prioritySettlementGst,
      platformFeeShare, platformFeeGstShare,
      settled: !!settlement, bankCredit,
      settlementDate: settlement?.settlement_date || null,
      merchantUtr: settlement?.merchant_utr || null,
      refund, chargeback, isRefunded: !!refund, isChargedBack: !!chargeback,
    });
  }
  return breakdownByTxnId;
}

async function getRazorpayPayments({ from, to, caMode, status, search, page = 1, limit = 50 } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const where = {
    ...dateRangeWhere('created_at_source', fromDate, toDate),
    ...(status ? { status: { in: status.split(",") } } : {}),
    ...(search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { razorpay_id: { contains: search, mode: 'insensitive' } },
        { order_id: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  };
  const skip = (Number(page) - 1) * Number(limit);

  const [rows, total] = await Promise.all([
    db.razorpayPayment.findMany({ where, orderBy: { created_at_source: 'desc' }, skip, take: Number(limit) }),
    db.razorpayPayment.count({ where }),
  ]);

  const shaped = rows.map((r) => {
    const b = computeRazorpayInvoiceBreakdown(r);
    return {
      id: r.id,
      razorpay_id: r.razorpay_id,
      amount: b.amount,
      currency: r.currency,
      status: r.status,
      method: r.method,
      fee: toNumber(r.fee),
      tax: toNumber(r.tax),
      amount_refunded: toNumber(r.amount_refunded),
      gateway_fee: b.fee + b.tax,
      net_amount: b.netAmount,
      is_refunded: b.refunded > 0,
      invoice_eligible: r.status === 'captured' || b.refunded > 0,
      created_at_source: r.created_at_source,
      // Customer identity is not part of a CA compliance export — only amounts/status.
      email: caMode ? undefined : r.email,
      contact: caMode ? undefined : r.contact,
      description: caMode ? undefined : r.description,
    };
  });

  return { rows: shaped, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
}

/**
 * `bankCredit` ('matched' | 'pending') can only be evaluated after computing each row's
 * settlement breakdown, so when it's set this fetches every row in the date/status/search
 * scope (unpaginated), filters in-memory, then paginates the filtered set — everything else
 * filters and paginates directly in SQL. Fine for the bounded periods the UI actually uses
 * (month/quarter/FY), consistent with how the other rollup endpoints in this module work.
 */
async function getPayuTransactions({ from, to, caMode, status, search, bankCredit, page = 1, limit = 50 } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const where = {
    ...dateRangeWhere('addedon', fromDate, toDate),
    ...(status ? { status: { in: status.split(",") } } : {}),
    ...(search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { productinfo: { contains: search, mode: 'insensitive' } },
        { payu_id: { contains: search, mode: 'insensitive' } },
        { txnid: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  };

  const shapeRow = (r, b) => ({
    id: r.id,
    payu_id: r.payu_id,
    txnid: r.txnid,
    status: r.status,
    // Falls back through the breakdown's amount resolution — PayU zeroes the transaction
    // report's amount once fully refunded (confirmed against real data).
    amount: b ? b.amount : toNumber(r.amount),
    mode: r.mode,
    service_fees: toNumber(r.service_fees),
    convenience_fee: toNumber(r.convenience_fee),
    settlement_amount: toNumber(r.settlement_amount),
    gateway_fee: b ? b.totalFee : null,
    net_amount: b ? b.netAmount : toNumber(r.settlement_amount),
    bank_credit: b ? b.bankCredit : null,
    is_refunded: !!b?.isRefunded,
    is_charged_back: !!b?.isChargedBack,
    invoice_eligible: !!(b?.bankCredit?.matched || b?.isRefunded || b?.isChargedBack),
    addedon: r.addedon,
    settlement_date: r.settlement_date,
    email: caMode ? undefined : r.email,
    productinfo: caMode ? undefined : r.productinfo,
  });

  if (bankCredit) {
    const allRows = await db.masterPayuTransaction.findMany({ where, orderBy: { addedon: 'desc' } });
    const breakdownByTxnId = await getPayuInvoiceBreakdownForTxns(allRows);
    const wantMatched = bankCredit === 'matched';
    const filtered = allRows.filter((r) => !!breakdownByTxnId.get(r.txnid)?.bankCredit?.matched === wantMatched);
    const total = filtered.length;
    const skip = (Number(page) - 1) * Number(limit);
    const pageRows = filtered.slice(skip, skip + Number(limit));
    const shaped = pageRows.map((r) => shapeRow(r, breakdownByTxnId.get(r.txnid)));
    return { rows: shaped, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [rows, total] = await Promise.all([
    db.masterPayuTransaction.findMany({ where, orderBy: { addedon: 'desc' }, skip, take: Number(limit) }),
    db.masterPayuTransaction.count({ where }),
  ]);

  const breakdownByTxnId = await getPayuInvoiceBreakdownForTxns(rows);
  const shaped = rows.map((r) => shapeRow(r, breakdownByTxnId.get(r.txnid)));

  return { rows: shaped, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
}

/** {amount, settlementDate, merchantUtr, bankCredit} -> the {amount, date, bankCredit} shape
 * the PDF generator expects. */
function legForPdf(leg) {
  return leg ? { amount: leg.amount, date: leg.settlementDate, bankCredit: leg.bankCredit } : null;
}

const INVOICE_NOT_ELIGIBLE_MESSAGE =
  'An invoice is only generated once a transaction is confirmed credited to the bank, refunded, or charged back — this one is still pending settlement confirmation.';

// Customer-facing description — the raw productinfo/description field is internal checkout
// plumbing (button IDs, QR labels), not something a customer's receipt should show.
const CUSTOMER_PRODUCT_DESCRIPTION = {
  VALIDSTEP: 'Certificate Builder / Document Wallet App Premium',
  RISEFLAKE: 'Resume Builder Service',
};

/**
 * Assigns customer invoice numbers to every currently-eligible, not-yet-numbered transaction
 * for a brand in one pass, ordered by transaction date ascending — so the sequence reflects
 * when the sale actually happened, not the order an admin happened to click "View" first.
 * Once a number is assigned it's never reassigned or reused, matching real invoice-numbering
 * conventions (a late-discovered eligible transaction gets appended next, not backdated).
 */
async function backfillCustomerInvoiceNumbers(brand) {
  let eligible;
  if (brand === 'RISEFLAKE') {
    const payments = await db.razorpayPayment.findMany();
    eligible = payments
      .filter((p) => p.status === 'captured' || Math.abs(toNumber(p.amount_refunded)) > 0)
      .map((p) => ({ gateway: 'RAZORPAY', gatewayTxnId: p.razorpay_id, txnDate: p.created_at_source }));
  } else {
    const transactions = await db.masterPayuTransaction.findMany();
    const breakdownByTxnId = await getPayuInvoiceBreakdownForTxns(transactions);
    eligible = transactions
      .filter((t) => {
        const b = breakdownByTxnId.get(t.txnid);
        return b && (b.bankCredit.matched || b.isRefunded || b.isChargedBack);
      })
      .map((t) => ({ gateway: 'PAYU', gatewayTxnId: t.payu_id, txnDate: t.addedon }));
  }

  const existing = await db.customerInvoiceNumber.findMany({ where: { brand } });
  const numbered = new Set(existing.map((n) => n.gateway_txn_id));
  const unnumbered = eligible
    .filter((e) => !numbered.has(e.gatewayTxnId))
    .sort((a, b) => new Date(a.txnDate) - new Date(b.txnDate));

  if (!unnumbered.length) return;

  await db.$transaction(async (tx) => {
    const last = await tx.customerInvoiceNumber.findFirst({ where: { brand }, orderBy: { seq: 'desc' } });
    let nextSeq = (last?.seq || 0) + 1;
    for (const e of unnumbered) {
      const invoiceNo = brand === 'VALIDSTEP' ? `BIPPL-VS-${String(nextSeq).padStart(2, '0')}` : `BIPPL-RR-${nextSeq}`;
      await tx.customerInvoiceNumber.create({
        data: { brand, gateway: e.gateway, gateway_txn_id: e.gatewayTxnId, seq: nextSeq, invoice_no: invoiceNo },
      });
      nextSeq += 1;
    }
  });
}

/**
 * One-time repair: wipes this brand's assigned customer invoice numbers and re-runs the
 * backfill so the sequence restarts strictly in transaction-date order. Only meaningful
 * before any of these numbers have actually gone out to a real customer — once a customer
 * invoice has been issued for real, its number must never change again.
 */
async function resetAndRenumberCustomerInvoices(brand) {
  await db.customerInvoiceNumber.deleteMany({ where: { brand } });
  await backfillCustomerInvoiceNumbers(brand);
  return db.customerInvoiceNumber.findMany({ where: { brand }, orderBy: { seq: 'asc' } });
}

/**
 * Sequential, statutory-style invoice number for the customer-facing invoice only (the
 * company invoice keeps its internal PU-/RP- reference). Never reassigned after — repeat
 * views/downloads of the same transaction's invoice always return the same number.
 */
async function getOrAssignCustomerInvoiceNumber({ brand, gateway, gatewayTxnId }) {
  const existing = await db.customerInvoiceNumber.findUnique({
    where: { brand_gateway_gateway_txn_id: { brand, gateway, gateway_txn_id: gatewayTxnId } },
  });
  if (existing) return existing.invoice_no;

  await backfillCustomerInvoiceNumbers(brand);

  const assigned = await db.customerInvoiceNumber.findUnique({
    where: { brand_gateway_gateway_txn_id: { brand, gateway, gateway_txn_id: gatewayTxnId } },
  });
  return assigned.invoice_no;
}

async function getRazorpayInvoicePdf(razorpayId, { invoiceType = 'company' } = {}) {
  const payment = await db.razorpayPayment.findUnique({ where: { razorpay_id: razorpayId } });
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  const breakdown = computeRazorpayInvoiceBreakdown(payment);

  // Razorpay has no per-payment bank-match in the current schema, so "captured" (a
  // successful charge) stands in for "credited" — plus a refund is its own closed-loop
  // event regardless of that. No chargeback field exists on this model yet.
  const eligible = payment.status === 'captured' || breakdown.refunded > 0;
  if (!eligible) throw Object.assign(new Error(INVOICE_NOT_ELIGIBLE_MESSAGE), { statusCode: 400 });

  const refund = breakdown.refunded > 0
    ? { amount: breakdown.refunded, date: null, bankCredit: { matched: false, note: 'Razorpay refund timing/settlement isn\'t tracked per payment in the current data — see Bank Ledger.' } }
    : null;

  const isCustomer = invoiceType === 'customer';
  const invoiceNumber = isCustomer
    ? await getOrAssignCustomerInvoiceNumber({ brand: 'RISEFLAKE', gateway: 'RAZORPAY', gatewayTxnId: razorpayId })
    : `RP-${razorpayId}`;

  const pdfBuffer = await generateInvoicePDF({
    invoiceType,
    invoiceNumber,
    brand: 'RISEFLAKE',
    gateway: 'RAZORPAY',
    gatewayTxnId: razorpayId,
    merchantTxnId: payment.order_id,
    customerName: null, // Razorpay's payment export has no customer name field
    customerEmail: payment.email,
    productInfo: isCustomer ? CUSTOMER_PRODUCT_DESCRIPTION.RISEFLAKE : payment.description,
    mode: payment.method,
    txnDate: payment.created_at_source,
    amount: breakdown.amount,
    feeRows: breakdown.feeRows,
    netAmount: breakdown.netAmount,
    hasEstimatedFee: false,
    bankCredit: {
      matched: false,
      note: "Razorpay settles payments in batches (by UTR) rather than per payment — see Bank\nLedger / Razorpay Settlement Report for the batch this payment was credited in.",
    },
    refund,
    chargeback: null,
  });

  return { payment, pdfBuffer };
}

async function getPayuInvoicePdf(payuId, { invoiceType = 'company' } = {}) {
  const transaction = await db.masterPayuTransaction.findUnique({ where: { payu_id: payuId } });
  if (!transaction) throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });
  const breakdownByTxnId = await getPayuInvoiceBreakdownForTxns([transaction]);
  const breakdown = breakdownByTxnId.get(transaction.txnid);

  const eligible = breakdown.bankCredit.matched || breakdown.isRefunded || breakdown.isChargedBack;
  if (!eligible) throw Object.assign(new Error(INVOICE_NOT_ELIGIBLE_MESSAGE), { statusCode: 400 });

  const isCustomer = invoiceType === 'customer';
  const invoiceNumber = isCustomer
    ? await getOrAssignCustomerInvoiceNumber({ brand: 'VALIDSTEP', gateway: 'PAYU', gatewayTxnId: payuId })
    : `PU-${payuId}`;
  const customerName = [transaction.raw?.firstname, transaction.raw?.lastname].filter(Boolean).join(' ').trim() || null;

  const pdfBuffer = await generateInvoicePDF({
    invoiceType,
    invoiceNumber,
    brand: 'VALIDSTEP',
    gateway: 'PAYU',
    gatewayTxnId: payuId,
    merchantTxnId: transaction.txnid,
    customerName,
    customerEmail: transaction.email,
    productInfo: isCustomer ? CUSTOMER_PRODUCT_DESCRIPTION.VALIDSTEP : transaction.productinfo,
    mode: transaction.mode,
    txnDate: transaction.addedon,
    amount: breakdown.amount,
    feeRows: breakdown.feeRows,
    netAmount: breakdown.netAmount,
    hasEstimatedFee: breakdown.hasEstimatedFee,
    bankCredit: breakdown.bankCredit,
    refund: legForPdf(breakdown.refund),
    chargeback: legForPdf(breakdown.chargeback),
  });

  return { transaction, pdfBuffer };
}

/** Structured {matched, bank_txn_date, amount, narration, ref_no} detail for one settlement
 * leg's bank match — the raw fields behind buildBankCreditInfo's prose note, for a UI that
 * wants to render the actual linked bank ledger row rather than just read a sentence. */
function bankLegDetail(settlement, bankTxnById) {
  if (!settlement) return { matched: false, reason: 'No settlement record found yet — it may not have settled.' };
  const bankTxn = settlement.bank_transaction_id ? bankTxnById.get(settlement.bank_transaction_id) : null;
  if (!bankTxn) {
    return {
      matched: false,
      settlement_utr: settlement.merchant_utr,
      settlement_date: settlement.settlement_date,
      reason: 'Settlement not yet matched to a bank statement row — check Bank Ledger once the statement is uploaded.',
    };
  }
  const depositAmt = toNumber(bankTxn.deposit_amt);
  const isCredit = depositAmt > 0;
  return {
    matched: true,
    settlement_utr: settlement.merchant_utr,
    settlement_date: settlement.settlement_date,
    bank_transaction_id: bankTxn.id,
    bank_txn_date: bankTxn.txn_date,
    // A refund/chargeback's own settlement UTR can still net to a bank *credit* if the rest
    // of that day's batch outweighs it — read direction off the real row, don't assume it.
    is_credit: isCredit,
    bank_amount: isCredit ? depositAmt : toNumber(bankTxn.withdrawal_amt),
    bank_narration: bankTxn.narration,
    bank_ref_no: bankTxn.ref_no,
  };
}

/**
 * The full linked money trail for one PayU transaction — customer paid → gateway settled →
 * bank credited (plus refund/chargeback legs when present) — each step backed by the actual
 * linked row, not a description, so the UI can show genuinely connected data end to end.
 */
async function getPayuBankCreditChain(payuId) {
  const transaction = await db.masterPayuTransaction.findUnique({ where: { payu_id: payuId } });
  if (!transaction) throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });

  const allSettlements = await db.masterPayuSettlement.findMany({ where: { merchant_txn_id: transaction.txnid } });
  const capture = allSettlements.find((s) => s.requested_action === 'capture');
  const refundSettlements = allSettlements.filter((s) => s.requested_action === 'refund');
  const chargebackSettlements = allSettlements.filter((s) => isChargebackAction(s.requested_action));

  const bankTxnIds = [...new Set(allSettlements.map((s) => s.bank_transaction_id).filter(Boolean))];
  const bankTxns = bankTxnIds.length ? await db.masterBankTransaction.findMany({ where: { id: { in: bankTxnIds } } }) : [];
  const bankTxnById = new Map(bankTxns.map((b) => [b.id, b]));

  const amount = toNumber(transaction.amount) || Math.abs(toNumber(capture?.raw?.Amount)) || 0;

  return {
    customer_paid: {
      amount, date: transaction.addedon, email: transaction.email,
      product: transaction.productinfo, mode: transaction.mode, status: transaction.status,
    },
    gateway_settlement: capture
      ? {
          matched: true,
          utr: capture.merchant_utr,
          settlement_date: capture.settlement_date,
          net_amount: toNumber(capture.amount_net_signed),
          processing_fee: Math.abs(toNumber(capture.total_processing_fees)),
          service_tax: Math.abs(toNumber(capture.total_service_tax)),
        }
      : { matched: false, reason: 'No capture settlement found yet — it may not have settled.' },
    bank_credit: bankLegDetail(capture, bankTxnById),
    refunds: refundSettlements.map((s) => ({
      amount: Math.abs(toNumber(s.amount_net_signed)),
      bank_debit: bankLegDetail(s, bankTxnById),
    })),
    chargebacks: chargebackSettlements.map((s) => ({
      amount: Math.abs(toNumber(s.amount_net_signed)),
      bank_debit: bankLegDetail(s, bankTxnById),
    })),
  };
}

/** Razorpay equivalent — genuinely more limited: no per-payment settlement/bank link exists
 * in the current schema, so this reports what's actually known rather than fabricating a
 * connection the data doesn't support. */
async function getRazorpayBankCreditChain(razorpayId) {
  const payment = await db.razorpayPayment.findUnique({ where: { razorpay_id: razorpayId } });
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  const breakdown = computeRazorpayInvoiceBreakdown(payment);

  return {
    customer_paid: {
      amount: breakdown.amount, date: payment.created_at_source, email: payment.email,
      product: payment.description, mode: payment.method, status: payment.status,
    },
    gateway_settlement: {
      matched: false,
      reason: 'Razorpay settles in UTR batches — this payment is not individually linked to a settlement row in the current data. See Bank Ledger / Razorpay Settlement Report for the batch.',
    },
    bank_credit: { matched: false, reason: 'Not tracked per payment — see Bank Ledger for batch-level bank confirmation.' },
    refunds: breakdown.refunded > 0 ? [{ amount: breakdown.refunded, bank_debit: { matched: false, reason: 'Not tracked per payment.' } }] : [],
    chargebacks: [],
  };
}

/**
 * Distinct status values that actually exist in the data — a status filter built from a
 * hand-picked list will eventually miss a real value (e.g. PayU also has "Chargebacked" and
 * "dropped", not just the commonly-seen captured/failed/bounced/userCancelled/Refunded), so
 * this reads the real set directly rather than guessing.
 */
async function getDistinctStatuses({ gateway }) {
  if (gateway === 'PAYU') {
    const rows = await db.masterPayuTransaction.groupBy({ by: ['status'] });
    return rows.map((r) => r.status).sort();
  }
  if (gateway === 'RAZORPAY') {
    const rows = await db.razorpayPayment.groupBy({ by: ['status'] });
    return rows.map((r) => r.status).sort();
  }
  throw Object.assign(new Error('gateway must be PAYU or RAZORPAY'), { statusCode: 400 });
}

// ─── Invoice Analytics — monthly rollup, confirmed-credited data only ───────────────────
// PayU: "credited" means this transaction's settlement UTR has actually been matched to a
// bank statement row (real confirmation). Razorpay has no per-payment settlement link in the
// current schema, so its rows use "captured" (a successful charge) as the closest available
// proxy — genuinely not the same guarantee, which the caller must label accordingly.

async function getInvoiceAnalytics({ gateway, from, to } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);

  const newBucket = (period) => ({ period, credited_count: 0, credited_amount: 0, credited_fee: 0, credited_net: 0, pending_count: 0, pending_amount: 0 });

  if (gateway === 'PAYU') {
    const rows = await db.masterPayuTransaction.findMany({ where: dateRangeWhere('addedon', fromDate, toDate) });
    const breakdownByTxnId = await getPayuInvoiceBreakdownForTxns(rows);
    const buckets = new Map();
    for (const r of rows) {
      const month = getMonthLabel(r.addedon);
      if (!buckets.has(month)) buckets.set(month, newBucket(month));
      const bucket = buckets.get(month);
      const b = breakdownByTxnId.get(r.txnid);
      if (b?.bankCredit?.matched) {
        bucket.credited_count += 1;
        bucket.credited_amount += b.amount;
        bucket.credited_fee += b.totalFee;
        bucket.credited_net += b.netAmount;
      } else if (r.status === 'captured') {
        bucket.pending_count += 1;
        bucket.pending_amount += toNumber(r.amount);
      }
    }
    return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));
  }

  if (gateway === 'RAZORPAY') {
    const rows = await db.razorpayPayment.findMany({
      where: { ...dateRangeWhere('created_at_source', fromDate, toDate), status: 'captured' },
    });
    const buckets = new Map();
    for (const r of rows) {
      const month = getMonthLabel(r.created_at_source);
      if (!buckets.has(month)) buckets.set(month, newBucket(month));
      const bucket = buckets.get(month);
      const b = computeRazorpayInvoiceBreakdown(r);
      bucket.credited_count += 1;
      bucket.credited_amount += b.amount;
      bucket.credited_fee += b.fee + b.tax;
      bucket.credited_net += b.netAmount;
    }
    return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));
  }

  throw Object.assign(new Error('gateway must be PAYU or RAZORPAY'), { statusCode: 400 });
}

// ─── Sales Register — full per-transaction statutory/audit detail, both brands ─────────

function payuBankCreditStatus(b) {
  if (!b) return 'NOT_SETTLED';
  if (b.bankCredit?.matched) return 'CREDITED';
  if (b.settled) return 'PENDING';
  return 'NOT_SETTLED';
}

function shapePayuRegisterRow(r, b) {
  return {
    id: r.id,
    brand: 'VALIDSTEP',
    gateway: 'PAYU',
    txn_datetime: r.addedon,
    gateway_txn_id: r.payu_id,
    merchant_txn_id: r.txnid,
    status: r.status,
    email: r.email,
    product: r.productinfo,
    // Falls back through the breakdown's own amount resolution — PayU zeroes the
    // transaction report's amount once fully refunded (confirmed against real data), so
    // reading r.amount directly here would silently show "0" for refunded transactions.
    amount_charged: b ? b.amount : toNumber(r.amount),
    fee_processing: b ? b.perTransactionFee : 0,
    fee_processing_gst: b ? b.perTransactionGst : 0,
    fee_priority_settlement: b ? b.prioritySettlementFee : 0,
    fee_priority_settlement_gst: b ? b.prioritySettlementGst : 0,
    fee_mdr_share: b ? b.platformFeeShare : 0,
    fee_mdr_share_gst: b ? b.platformFeeGstShare : 0,
    gateway_fee_total: b ? b.totalFee : 0,
    net_amount: b ? b.netAmount : toNumber(r.settlement_amount),
    settlement_ref: b?.merchantUtr || null,
    settlement_datetime: b?.settlementDate || null,
    bank_credit_status: payuBankCreditStatus(b),
    bank_credit_note: b?.bankCredit?.note || null,
    is_refunded: !!b?.isRefunded,
    refund_amount: b?.refund?.amount || 0,
    refund_settlement_ref: b?.refund?.merchantUtr || null,
    refund_settlement_datetime: b?.refund?.settlementDate || null,
    refund_bank_credit_status: b?.refund ? (b.refund.bankCredit.matched ? 'DEBITED' : 'PENDING') : null,
    is_charged_back: !!b?.isChargedBack,
    chargeback_amount: b?.chargeback?.amount || 0,
    chargeback_settlement_ref: b?.chargeback?.merchantUtr || null,
    chargeback_settlement_datetime: b?.chargeback?.settlementDate || null,
  };
}

function shapeRazorpayRegisterRow(r) {
  const b = computeRazorpayInvoiceBreakdown(r);
  return {
    id: r.id,
    brand: 'RISEFLAKE',
    gateway: 'RAZORPAY',
    txn_datetime: r.created_at_source,
    gateway_txn_id: r.razorpay_id,
    merchant_txn_id: r.order_id,
    status: r.status,
    email: r.email,
    product: r.description,
    amount_charged: b.amount,
    fee_processing: b.fee,
    fee_processing_gst: b.tax,
    fee_priority_settlement: 0,
    fee_priority_settlement_gst: 0,
    fee_mdr_share: 0,
    fee_mdr_share_gst: 0,
    gateway_fee_total: b.fee + b.tax,
    net_amount: b.netAmount,
    settlement_ref: null,
    settlement_datetime: null,
    bank_credit_status: 'NOT_LINKED',
    bank_credit_note: 'Razorpay settles in UTR batches, not linked per payment — see Bank Ledger / Razorpay Settlement Report.',
    is_refunded: b.refunded > 0,
    refund_amount: b.refunded,
    refund_settlement_ref: null,
    refund_settlement_datetime: null,
    refund_bank_credit_status: null,
    // Razorpay chargebacks aren't captured in the current schema (no dedicated field on
    // RazorpayPayment) — always false rather than silently implying "confirmed none".
    is_charged_back: false,
    chargeback_amount: 0,
    chargeback_settlement_ref: null,
    chargeback_settlement_datetime: null,
  };
}

async function getSalesRegisterPayu({ from, to, status, search, bankCredit, page = 1, limit = 50 } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const where = {
    ...dateRangeWhere('addedon', fromDate, toDate),
    ...(status ? { status: { in: status.split(",") } } : {}),
    ...(search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { productinfo: { contains: search, mode: 'insensitive' } },
        { payu_id: { contains: search, mode: 'insensitive' } },
        { txnid: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  };

  if (bankCredit) {
    const allRows = await db.masterPayuTransaction.findMany({ where, orderBy: { addedon: 'desc' } });
    const breakdownByTxnId = await getPayuInvoiceBreakdownForTxns(allRows);
    const wantMatched = bankCredit === 'matched';
    const filtered = allRows.filter((r) => !!breakdownByTxnId.get(r.txnid)?.bankCredit?.matched === wantMatched);
    const total = filtered.length;
    const skip = (Number(page) - 1) * Number(limit);
    const pageRows = filtered.slice(skip, skip + Number(limit));
    const shaped = pageRows.map((r) => shapePayuRegisterRow(r, breakdownByTxnId.get(r.txnid)));
    return { rows: shaped, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [rows, total] = await Promise.all([
    db.masterPayuTransaction.findMany({ where, orderBy: { addedon: 'desc' }, skip, take: Number(limit) }),
    db.masterPayuTransaction.count({ where }),
  ]);
  const breakdownByTxnId = await getPayuInvoiceBreakdownForTxns(rows);
  const shaped = rows.map((r) => shapePayuRegisterRow(r, breakdownByTxnId.get(r.txnid)));
  return { rows: shaped, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
}

async function getSalesRegisterRazorpay({ from, to, status, search, page = 1, limit = 50 } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const where = {
    ...dateRangeWhere('created_at_source', fromDate, toDate),
    ...(status ? { status: { in: status.split(",") } } : {}),
    ...(search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { razorpay_id: { contains: search, mode: 'insensitive' } },
        { order_id: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  };
  const skip = (Number(page) - 1) * Number(limit);
  const [rows, total] = await Promise.all([
    db.razorpayPayment.findMany({ where, orderBy: { created_at_source: 'desc' }, skip, take: Number(limit) }),
    db.razorpayPayment.count({ where }),
  ]);
  const shaped = rows.map(shapeRazorpayRegisterRow);
  return { rows: shaped, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
}

/** Full, unpaginated export for a bounded date range — one workbook, one sheet per brand. */
async function exportSalesRegister({ from, to } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);

  const [payuRows, rzpRows] = await Promise.all([
    db.masterPayuTransaction.findMany({ where: dateRangeWhere('addedon', fromDate, toDate), orderBy: { addedon: 'asc' } }),
    db.razorpayPayment.findMany({ where: dateRangeWhere('created_at_source', fromDate, toDate), orderBy: { created_at_source: 'asc' } }),
  ]);
  const payuBreakdownByTxnId = await getPayuInvoiceBreakdownForTxns(payuRows);

  const wb = XLSX.utils.book_new();

  const payuSheet = XLSX.utils.json_to_sheet(payuRows.map((r) => {
    const b = payuBreakdownByTxnId.get(r.txnid);
    const row = shapePayuRegisterRow(r, b);
    return {
      'Txn Date/Time': row.txn_datetime,
      'PayU Txn ID': row.gateway_txn_id,
      'Merchant Txn ID': row.merchant_txn_id,
      Status: row.status,
      Customer: row.email,
      Product: row.product,
      'Amount Charged': row.amount_charged,
      'Processing Fee': row.fee_processing,
      'GST on Processing Fee': row.fee_processing_gst,
      'Priority Settlement Fee': row.fee_priority_settlement,
      'GST on Priority Settlement Fee': row.fee_priority_settlement_gst,
      'MDR Fee (allocated share)': row.fee_mdr_share,
      'GST on MDR Fee': row.fee_mdr_share_gst,
      'Total Gateway Fee': row.gateway_fee_total,
      'Net Amount': row.net_amount,
      'Settlement UTR': row.settlement_ref,
      'Settlement Date': row.settlement_datetime,
      'Bank Credit Status': row.bank_credit_status,
      'Refund Amount': row.refund_amount,
      'Refund Settlement UTR': row.refund_settlement_ref,
      'Refund Settlement Date': row.refund_settlement_datetime,
      'Chargeback Amount': row.chargeback_amount,
      'Chargeback Settlement UTR': row.chargeback_settlement_ref,
      'Chargeback Settlement Date': row.chargeback_settlement_datetime,
    };
  }));
  XLSX.utils.book_append_sheet(wb, payuSheet, 'Validstep - PayU');

  const rzpSheet = XLSX.utils.json_to_sheet(rzpRows.map((r) => {
    const row = shapeRazorpayRegisterRow(r);
    return {
      'Txn Date/Time': row.txn_datetime,
      'Razorpay Payment ID': row.gateway_txn_id,
      'Order ID': row.merchant_txn_id,
      Status: row.status,
      Customer: row.email,
      Product: row.product,
      'Amount Charged': row.amount_charged,
      'Transaction Fee': row.fee_processing,
      'GST on Transaction Fee': row.fee_processing_gst,
      'Total Gateway Fee': row.gateway_fee_total,
      'Net Amount': row.net_amount,
      'Bank Credit Status': row.bank_credit_status,
      'Refund Amount': row.refund_amount,
    };
  }));
  XLSX.utils.book_append_sheet(wb, rzpSheet, 'RiseFlake - Razorpay');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  listBrands,
  listGateways,
  listBankAccounts,
  listCategories,
  createCategory,
  listRules,
  createRule,
  updateRule,
  runReclassification,
  importRazorpayPaymentReport,
  importRazorpaySettlementReport,
  importPayuTransactionReport,
  importPayuSettlementReport,
  importBankStatement,
  previewRazorpayPaymentReport,
  previewRazorpaySettlementReport,
  previewPayuTransactionReport,
  previewPayuSettlementReport,
  previewBankStatement,
  runReconciliation,
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
  getFileForDownload,
  getFilePreview,
  getImportedRows,
  deleteFileArchive,
  getRazorpayPayments,
  getPayuTransactions,
  getRazorpayInvoicePdf,
  getPayuInvoicePdf,
  getInvoiceAnalytics,
  getSalesRegisterPayu,
  getSalesRegisterRazorpay,
  exportSalesRegister,
  getPayuBankCreditChain,
  getRazorpayBankCreditChain,
  getDistinctStatuses,
  resetAndRenumberCustomerInvoices,
};
