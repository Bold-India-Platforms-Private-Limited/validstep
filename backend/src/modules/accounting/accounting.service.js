'use strict';

const fs = require('fs');
const XLSX = require('xlsx');
const { Prisma } = require('@prisma/client');
const { db } = require('../../config/database');
const { parseTransactionReport, parseSettlementReport, parseBankStatement } = require('../../utils/reportParsers');
const { generateFeeStatementPDF } = require('../../utils/platformFeeStatementGenerator');
const { generateReceiptPDF } = require('../../utils/paymentReceiptGenerator');

const AMOUNT_MATCH_TOLERANCE = 0.01;
const AMOUNT_DATE_WINDOW_DAYS = 3;

function parseDateParam(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * A "to" bound from a plain date picker (e.g. "2026-06-30") parses to that day's midnight —
 * used naively as an `lte` upper bound, it would exclude every transaction later that same
 * day. Push it to the end of the day so the range is inclusive of the whole final day.
 */
function parseToDateParam(v) {
  const d = parseDateParam(v);
  if (!d) return null;
  const endOfDay = new Date(d);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return endOfDay;
}

function dateRangeWhere(field, from, to) {
  const range = {};
  if (from) range.gte = from;
  if (to) range.lte = to;
  return Object.keys(range).length ? { [field]: range } : {};
}

function toNumber(decimal) {
  return decimal === null || decimal === undefined ? 0 : Number(decimal);
}

/**
 * Import a PayU/bank report file: parse, upsert rows, and (for settlement/bank uploads)
 * re-run the reconciliation matcher since a new import can complete existing matches.
 */
async function importFile({ type, file, uploadedBy }) {
  const buffer = fs.readFileSync(file.path);
  const storedPath = `uploads/accounting/${file.filename}`;

  let rowCount = 0;
  let skippedCount = 0;

  if (type === 'TRANSACTION_REPORT') {
    const { rows, skipped_count } = parseTransactionReport(buffer);
    skippedCount = skipped_count;
    const importRecord = await db.accountingImport.create({
      data: { type, original_filename: file.originalname, stored_path: storedPath, row_count: rows.length, uploaded_by: uploadedBy },
    });
    for (const row of rows) {
      await db.payuTransaction.upsert({
        where: { payu_id: row.payu_id },
        create: { ...row, import_id: importRecord.id },
        update: { ...row, import_id: importRecord.id },
      });
    }
    rowCount = rows.length;
  } else if (type === 'SETTLEMENT_REPORT') {
    const { rows, skipped_count } = parseSettlementReport(buffer);
    skippedCount = skipped_count;
    const importRecord = await db.accountingImport.create({
      data: { type, original_filename: file.originalname, stored_path: storedPath, row_count: rows.length, uploaded_by: uploadedBy },
    });
    for (const row of rows) {
      await db.payuSettlement.upsert({
        where: { settlement_key: row.settlement_key },
        create: { ...row, import_id: importRecord.id },
        // Never clobber an existing bank match when a report is re-uploaded.
        update: { ...row, import_id: importRecord.id },
      });
    }
    rowCount = rows.length;
  } else if (type === 'BANK_STATEMENT') {
    const { rows } = parseBankStatement(buffer);
    const importRecord = await db.accountingImport.create({
      data: { type, original_filename: file.originalname, stored_path: storedPath, row_count: rows.length, uploaded_by: uploadedBy },
    });
    for (const row of rows) {
      // Not findUnique: withdrawal_amt/deposit_amt are nullable (only one populated per row)
      // and Prisma's compound-unique lookup rejects null literals — findFirst handles it fine.
      // Decimal fields must be wrapped in Prisma.Decimal: passing a raw JS number lets Prisma
      // serialize it through a float round-trip (e.g. 651622.94 -> "651622.9399999999"), which
      // silently fails the equality match against the stored numeric(12,2) column.
      const existing = await db.bankTransaction.findFirst({
        where: {
          txn_date: row.txn_date,
          ref_no: row.ref_no,
          withdrawal_amt: row.withdrawal_amt === null ? null : new Prisma.Decimal(row.withdrawal_amt),
          deposit_amt: row.deposit_amt === null ? null : new Prisma.Decimal(row.deposit_amt),
          closing_balance: row.closing_balance === null ? null : new Prisma.Decimal(row.closing_balance),
        },
      });
      if (existing) continue; // identical row already imported (overlapping statement period)
      await db.bankTransaction.create({ data: { ...row, import_id: importRecord.id } });
    }
    rowCount = rows.length;
  } else {
    throw Object.assign(new Error('Invalid import type'), { statusCode: 400 });
  }

  let reconciliation = null;
  if (type === 'SETTLEMENT_REPORT' || type === 'BANK_STATEMENT') {
    reconciliation = await runReconciliation();
  }

  return { type, row_count: rowCount, skipped_count: skippedCount, reconciliation };
}

async function listImports({ page = 1, limit = 20 } = {}) {
  const skip = (Number(page) - 1) * Number(limit);
  const [imports, total] = await Promise.all([
    db.accountingImport.findMany({ orderBy: { uploaded_at: 'desc' }, skip, take: Number(limit) }),
    db.accountingImport.count(),
  ]);
  return { imports, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
}

/**
 * Match PayU settlement ledger rows to HDFC bank credit rows.
 * Tier 1: exact reference match (settlement's merchant UTR / bank reference / ARN equals
 * the bank statement's Chq./Ref.No. — PayU batches a day's payouts under one shared UTR).
 * Tier 2: for anything still unmatched, group by settlement date and sum the *signed*
 * net amount, then look for a bank deposit of the same amount within a few days
 * (covers cases where the reference field didn't come through cleanly).
 * Every row gets a confidence tag — nothing is silently declared reconciled.
 */
async function runReconciliation() {
  const bankRows = await db.bankTransaction.findMany({ where: { deposit_amt: { not: null } } });
  const refIndex = new Map();
  for (const b of bankRows) {
    if (b.ref_no) refIndex.set(b.ref_no.trim(), b);
  }

  const unmatched = await db.payuSettlement.findMany({ where: { bank_match_status: 'UNMATCHED' } });

  let matchedExact = 0;
  const stillUnmatched = [];

  for (const s of unmatched) {
    const candidateRef = s.merchant_utr || s.bank_reference_no || s.bank_arn;
    const bank = candidateRef ? refIndex.get(candidateRef.trim()) : null;
    if (bank) {
      await db.payuSettlement.update({
        where: { id: s.id },
        data: { bank_match_status: 'MATCHED_EXACT', bank_transaction_id: bank.id },
      });
      await db.bankTransaction.update({ where: { id: bank.id }, data: { match_status: 'MATCHED_EXACT' } });
      matchedExact += 1;
    } else {
      stillUnmatched.push(s);
    }
  }

  // Tier 2: group remaining unmatched settlements by settlement date, sum signed net amount.
  const byDate = new Map();
  for (const s of stillUnmatched) {
    if (!s.settlement_date) continue;
    const key = s.settlement_date.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(s);
  }

  let matchedAmountDate = 0;
  const windowMs = AMOUNT_DATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  for (const [dateKey, group] of byDate) {
    const sum = group.reduce((acc, s) => acc + toNumber(s.amount_net_signed), 0);
    const dayMs = new Date(`${dateKey}T00:00:00.000Z`).getTime();

    const bank = bankRows.find((b) => {
      if (b.match_status !== 'UNMATCHED') return false; // don't double-book a bank row already used
      if (Math.abs(Number(b.deposit_amt) - sum) > AMOUNT_MATCH_TOLERANCE) return false;
      return Math.abs(b.txn_date.getTime() - dayMs) <= windowMs;
    });

    if (bank) {
      for (const s of group) {
        await db.payuSettlement.update({
          where: { id: s.id },
          data: { bank_match_status: 'MATCHED_AMOUNT_DATE', bank_transaction_id: bank.id },
        });
      }
      await db.bankTransaction.update({ where: { id: bank.id }, data: { match_status: 'MATCHED_AMOUNT_DATE' } });
      matchedAmountDate += group.length;
    }
  }

  const totalUnmatched = stillUnmatched.length - matchedAmountDate;

  return { matched_exact: matchedExact, matched_amount_date: matchedAmountDate, unmatched: totalUnmatched };
}

async function getSummary({ from, to } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const addedonWhere = dateRangeWhere('addedon', fromDate, toDate);

  const statusGroups = await db.payuTransaction.groupBy({
    by: ['status'],
    where: addedonWhere,
    _sum: { amount: true },
    _count: { _all: true },
  });

  const captured = await db.payuTransaction.aggregate({
    where: { ...addedonWhere, status: 'captured' },
    _sum: {
      amount: true,
      service_fees: true,
      convenience_fee: true,
      tsp_charges: true,
      mer_service_fee: true,
      cgst: true,
      sgst: true,
      igst: true,
      settlement_amount: true,
    },
    _count: { _all: true },
  });

  const settlementWhere = dateRangeWhere('settlement_date', fromDate, toDate);
  const bankMatchGroups = await db.payuSettlement.groupBy({
    by: ['bank_match_status'],
    where: settlementWhere,
    _count: { _all: true },
    _sum: { amount_net_signed: true },
  });

  // Settlement-ledger based fee & revenue reconciliation. The transaction report only carries
  // small per-transaction fees (service_fees/cgst/etc, often ~0) — PayU's actual dominant fee is
  // its standard ~2% + GST MDR (merchant discount rate), which it settles as ONE combined debit
  // per day rather than itemizing per transaction row — shows up in the settlement report as
  // "Adjustment_debit" rows with Product Info "Platform fees_daily_*" (confirmed against PayU's
  // live dashboard: Settlements > a settlement row > Adjustment > "Platform fees"). Verified this
  // is genuinely proportional, not a flat fee: grouping by settlement_date, the fee is a median
  // of exactly 2.000% of that day's captured gross on every day with meaningful volume — only
  // very low-volume days deviate, consistent with a per-transaction minimum-fee floor.
  const settlementFeeGroups = await db.payuSettlement.groupBy({
    by: ['requested_action'],
    where: settlementWhere,
    _sum: {
      amount: true,
      total_processing_fees: true,
      total_service_tax: true,
      priority_settlement_fee: true,
      priority_settlement_tax: true,
      amount_net_signed: true,
    },
    _count: { _all: true },
  });

  const findAction = (action) => settlementFeeGroups.find((g) => g.requested_action === action);
  const captureLedger = findAction('capture');
  const adjustmentLedger = findAction('Adjustment_debit');
  const refundLedger = findAction('refund');

  // Per-transaction processing fee/GST (capture rows) — small, but real.
  const perTxnProcessingFee = Math.abs(toNumber(captureLedger?._sum.total_processing_fees));
  const perTxnProcessingGst = Math.abs(toNumber(captureLedger?._sum.total_service_tax));
  // Instant/priority settlement fee (capture rows, only when priority settlement is used).
  const prioritySettlementFee = Math.abs(toNumber(captureLedger?._sum.priority_settlement_fee));
  const prioritySettlementGst = Math.abs(toNumber(captureLedger?._sum.priority_settlement_tax));
  // PayU's ~2% + GST MDR — the real, dominant PayU fee for this merchant, settled as one
  // combined daily debit rather than itemized per transaction (see comment above).
  const dailyPlatformFee = Math.abs(toNumber(adjustmentLedger?._sum.total_processing_fees));
  const dailyPlatformGst = Math.abs(toNumber(adjustmentLedger?._sum.total_service_tax));

  const totalFees = perTxnProcessingFee + perTxnProcessingGst + prioritySettlementFee + prioritySettlementGst + dailyPlatformFee + dailyPlatformGst;
  const refundAmount = Math.abs(toNumber(refundLedger?._sum.amount_net_signed));
  // Bank-verified: this is the literal sum of every settlement ledger row's signed net amount,
  // which in testing matched the real HDFC bank credits exactly (100% exact reconciliation match).
  const netCreditedToBank = settlementFeeGroups.reduce((acc, g) => acc + toNumber(g._sum.amount_net_signed), 0);
  // Gross revenue is sourced from the settlement ledger's own capture rows, NOT the transaction
  // report's captured-status sum: PayU overwrites a transaction's status to "Refunded" (with its
  // amount zeroed) once refunded, so the transaction report's "captured" total silently excludes
  // every later-refunded sale — double-subtracting the refund if used alongside refundAmount
  // below. The settlement report records every capture as its own ledger row regardless of what
  // happened to it afterwards, so it stays revenue - refunds - fees === net credited, exactly.
  const grossRevenue = toNumber(captureLedger?._sum.amount);
  const netRevenue = grossRevenue - refundAmount - totalFees;
  // Should be ~0 given gross/refunds/fees/net are all sourced from the same settlement ledger;
  // a nonzero value here would flag a real data gap rather than an expected timing difference.
  const reconciliationVariance = netCreditedToBank - netRevenue;

  // Channel breakdown: ValidStep website checkout vs PayU's standalone Payment Button vs
  // anything unclassified — see reportParsers.classifyChannel for how this is tagged.
  // Note: PayU's ~2% MDR fee (see revenue.fees below) is settled as one daily debit covering
  // every channel's transactions together, so it isn't split out per channel here — only
  // gross/settlement figures are shown.
  const channelGroups = await db.payuTransaction.groupBy({
    by: ['source_channel'],
    where: { ...addedonWhere, status: 'captured' },
    _sum: { amount: true, settlement_amount: true },
    _count: { _all: true },
  });

  // Company breakdown: join captured transactions back to Order via payu_txn_id (soft link,
  // no FK) so the CA can see revenue attributed to each client company on the platform.
  const capturedTxns = await db.payuTransaction.findMany({
    where: { ...addedonWhere, status: 'captured' },
    select: { txnid: true, amount: true },
  });
  const txnIds = [...new Set(capturedTxns.map((t) => t.txnid))];
  const orders = txnIds.length
    ? await db.order.findMany({
        where: { payu_txn_id: { in: txnIds } },
        select: { payu_txn_id: true, company: { select: { id: true, name: true } } },
      })
    : [];
  const companyByTxnId = new Map(orders.filter((o) => o.company).map((o) => [o.payu_txn_id, o.company]));

  const companyTotals = new Map();
  for (const t of capturedTxns) {
    const company = companyByTxnId.get(t.txnid);
    const key = company ? company.id : 'unmapped';
    const label = company ? company.name : 'Unmapped / test transactions';
    if (!companyTotals.has(key)) companyTotals.set(key, { company_id: company?.id || null, company_name: label, amount: 0, count: 0 });
    const entry = companyTotals.get(key);
    entry.amount += toNumber(t.amount);
    entry.count += 1;
  }

  return {
    period: { from: fromDate, to: toDate },
    by_status: statusGroups.map((g) => ({ status: g.status, count: g._count._all, amount: toNumber(g._sum.amount) })),
    revenue: {
      count: captureLedger?._count._all || 0,
      gross_amount: grossRevenue,
      refund_amount: refundAmount,
      refund_count: refundLedger?._count._all || 0,
      fees: {
        per_transaction_processing_fee: perTxnProcessingFee,
        per_transaction_gst: perTxnProcessingGst,
        priority_settlement_fee: prioritySettlementFee,
        priority_settlement_gst: prioritySettlementGst,
        daily_platform_fee: dailyPlatformFee,
        daily_platform_fee_gst: dailyPlatformGst,
        total: totalFees,
      },
      net_revenue: netRevenue,
      net_credited_to_bank: netCreditedToBank,
      reconciliation_variance: reconciliationVariance,
    },
    bank_reconciliation: bankMatchGroups.map((g) => ({
      status: g.bank_match_status,
      count: g._count._all,
      amount: toNumber(g._sum.amount_net_signed),
    })),
    by_company: [...companyTotals.values()].sort((a, b) => b.amount - a.amount),
    by_channel: channelGroups.map((g) => ({
      channel: g.source_channel,
      count: g._count._all,
      gross_amount: toNumber(g._sum.amount),
      net_settled_amount: toNumber(g._sum.settlement_amount),
    })).sort((a, b) => b.gross_amount - a.gross_amount),
  };
}

async function getReconciliation({ from, to, status, channel, page = 1, limit = 50 } = {}) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  const where = {
    ...dateRangeWhere('settlement_date', fromDate, toDate),
    ...(status ? { bank_match_status: status } : {}),
    ...(channel ? { source_channel: channel } : {}),
  };
  const skip = (Number(page) - 1) * Number(limit);

  const [rows, total, statusCounts] = await Promise.all([
    db.payuSettlement.findMany({
      where,
      orderBy: { settlement_date: 'desc' },
      skip,
      take: Number(limit),
      include: { bank_transaction: { select: { id: true, txn_date: true, ref_no: true, deposit_amt: true, narration: true } } },
    }),
    db.payuSettlement.count({ where }),
    db.payuSettlement.groupBy({
      by: ['bank_match_status'],
      where: { ...dateRangeWhere('settlement_date', fromDate, toDate), ...(channel ? { source_channel: channel } : {}) },
      _count: { _all: true },
    }),
  ]);

  return {
    rows,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    status_counts: statusCounts.map((g) => ({ status: g.bank_match_status, count: g._count._all })),
  };
}

async function generateFeeStatement({ from, to }) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);
  if (!fromDate || !toDate) {
    throw Object.assign(new Error('from and to dates are required to generate a fee statement'), { statusCode: 400 });
  }

  const summary = await getSummary({ from, to });
  const { revenue } = summary;

  const existingCount = await db.platformFeeStatement.count();
  const periodTag = `${fromDate.getUTCFullYear()}${String(fromDate.getUTCMonth() + 1).padStart(2, '0')}`;
  const statementNumber = `PFS-${periodTag}-${String(existingCount + 1).padStart(3, '0')}`;

  const statement = await db.platformFeeStatement.create({
    data: {
      statement_number: statementNumber,
      period_start: fromDate,
      period_end: toDate,
      gross_amount: revenue.gross_amount,
      refund_amount: revenue.refund_amount,
      per_transaction_fee: revenue.fees.per_transaction_processing_fee,
      per_transaction_gst: revenue.fees.per_transaction_gst,
      priority_settlement_fee: revenue.fees.priority_settlement_fee,
      priority_settlement_gst: revenue.fees.priority_settlement_gst,
      daily_platform_fee: revenue.fees.daily_platform_fee,
      daily_platform_fee_gst: revenue.fees.daily_platform_fee_gst,
      total_fee_amount: revenue.fees.total,
      net_revenue: revenue.net_revenue,
      net_credited_to_bank: revenue.net_credited_to_bank,
      reconciliation_variance: revenue.reconciliation_variance,
      transaction_count: revenue.count,
    },
  });

  const pdfBuffer = await buildFeeStatementPdf(statement);
  return { statement, pdfBuffer };
}

async function getFeeStatementPdf(id) {
  const statement = await db.platformFeeStatement.findUnique({ where: { id } });
  if (!statement) throw Object.assign(new Error('Fee statement not found'), { statusCode: 404 });

  const pdfBuffer = await buildFeeStatementPdf(statement);
  return { statement, pdfBuffer };
}

async function buildFeeStatementPdf(statement) {
  return generateFeeStatementPDF({
    statementNumber: statement.statement_number,
    periodStart: statement.period_start,
    periodEnd: statement.period_end,
    grossAmount: toNumber(statement.gross_amount),
    refundAmount: toNumber(statement.refund_amount),
    fees: {
      perTransactionFee: toNumber(statement.per_transaction_fee),
      perTransactionGst: toNumber(statement.per_transaction_gst),
      prioritySettlementFee: toNumber(statement.priority_settlement_fee),
      prioritySettlementGst: toNumber(statement.priority_settlement_gst),
      dailyPlatformFee: toNumber(statement.daily_platform_fee),
      dailyPlatformFeeGst: toNumber(statement.daily_platform_fee_gst),
      total: toNumber(statement.total_fee_amount),
    },
    netRevenue: toNumber(statement.net_revenue),
    netCreditedToBank: toNumber(statement.net_credited_to_bank),
    reconciliationVariance: toNumber(statement.reconciliation_variance),
    transactionCount: statement.transaction_count,
    generatedAt: statement.generated_at,
  });
}

async function listFeeStatements({ page = 1, limit = 20 } = {}) {
  const skip = (Number(page) - 1) * Number(limit);
  const [statements, total] = await Promise.all([
    db.platformFeeStatement.findMany({ orderBy: { generated_at: 'desc' }, skip, take: Number(limit) }),
    db.platformFeeStatement.count(),
  ]);
  return { statements, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
}

/**
 * Build a multi-sheet workbook (transactions / settlements / bank statement / summary / fees)
 * for direct handoff to the CA — one file with everything needed for the period.
 */
async function exportForCA({ from, to }) {
  const fromDate = parseDateParam(from);
  const toDate = parseToDateParam(to);

  const [transactions, settlements, bankRows, summary] = await Promise.all([
    db.payuTransaction.findMany({ where: dateRangeWhere('addedon', fromDate, toDate), orderBy: { addedon: 'asc' } }),
    db.payuSettlement.findMany({ where: dateRangeWhere('settlement_date', fromDate, toDate), orderBy: { settlement_date: 'asc' } }),
    db.bankTransaction.findMany({ where: dateRangeWhere('txn_date', fromDate, toDate), orderBy: { txn_date: 'asc' } }),
    getSummary({ from, to }),
  ]);

  const wb = XLSX.utils.book_new();

  const txnSheet = XLSX.utils.json_to_sheet(
    transactions.map((t) => ({
      TxnID: t.txnid,
      PayUID: t.payu_id,
      Channel: t.source_channel,
      Status: t.status,
      Date: t.addedon,
      Amount: toNumber(t.amount),
      Product: t.productinfo,
      Email: t.email,
      Mode: t.mode,
      ServiceFee: toNumber(t.service_fees),
      ConvenienceFee: toNumber(t.convenience_fee),
      CGST: toNumber(t.cgst),
      SGST: toNumber(t.sgst),
      IGST: toNumber(t.igst),
      SettlementAmount: toNumber(t.settlement_amount),
      SettlementDate: t.settlement_date,
      UTR: t.utr,
    }))
  );
  XLSX.utils.book_append_sheet(wb, txnSheet, 'Transactions');

  const settlementSheet = XLSX.utils.json_to_sheet(
    settlements.map((s) => ({
      MerchantTxnID: s.merchant_txn_id,
      Channel: s.source_channel,
      Action: s.requested_action,
      Status: s.status,
      NetAmountSigned: toNumber(s.amount_net_signed),
      MerchantUTR: s.merchant_utr,
      SettlementDate: s.settlement_date,
      BankMatchStatus: s.bank_match_status,
    }))
  );
  XLSX.utils.book_append_sheet(wb, settlementSheet, 'Settlements');

  const bankSheet = XLSX.utils.json_to_sheet(
    bankRows.map((b) => ({
      Date: b.txn_date,
      Narration: b.narration,
      RefNo: b.ref_no,
      Withdrawal: toNumber(b.withdrawal_amt),
      Deposit: toNumber(b.deposit_amt),
      ClosingBalance: toNumber(b.closing_balance),
      MatchStatus: b.match_status,
    }))
  );
  XLSX.utils.book_append_sheet(wb, bankSheet, 'Bank Statement');

  const summaryRows = [
    { Metric: 'Period From', Value: fromDate ? fromDate.toISOString().slice(0, 10) : 'All time' },
    { Metric: 'Period To', Value: toDate ? toDate.toISOString().slice(0, 10) : 'All time' },
    { Metric: 'Total Revenue (Gross)', Value: summary.revenue.gross_amount },
    { Metric: 'Refunds', Value: summary.revenue.refund_amount },
    { Metric: 'Per-Transaction Processing Fee', Value: summary.revenue.fees.per_transaction_processing_fee },
    { Metric: 'Per-Transaction GST', Value: summary.revenue.fees.per_transaction_gst },
    { Metric: 'Priority Settlement Fee', Value: summary.revenue.fees.priority_settlement_fee },
    { Metric: 'Priority Settlement GST', Value: summary.revenue.fees.priority_settlement_gst },
    { Metric: 'PayU Transaction Fee (~2% MDR)', Value: summary.revenue.fees.daily_platform_fee },
    { Metric: 'GST on Transaction Fee', Value: summary.revenue.fees.daily_platform_fee_gst },
    { Metric: 'Total PayU Fees', Value: summary.revenue.fees.total },
    { Metric: 'Net Revenue', Value: summary.revenue.net_revenue },
    { Metric: 'Net Credited to Bank (bank-verified)', Value: summary.revenue.net_credited_to_bank },
    { Metric: 'Reconciliation Variance', Value: summary.revenue.reconciliation_variance },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

  const companySheet = XLSX.utils.json_to_sheet(summary.by_company);
  XLSX.utils.book_append_sheet(wb, companySheet, 'Fee Breakdown by Company');

  const channelSheet = XLSX.utils.json_to_sheet(
    summary.by_channel.map((c) => ({
      Channel: c.channel,
      Count: c.count,
      GrossAmount: c.gross_amount,
      NetSettledAmount: c.net_settled_amount,
    }))
  );
  XLSX.utils.book_append_sheet(wb, channelSheet, 'By Channel');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Build a per-transaction payment receipt for a PayU Button transaction (no ValidStep Order
 * behind it, so the regular certificate-invoice flow never fires). Joins the transaction to its
 * settlement ledger row by payu_id (verified 1:1 reliable, unlike merchant_txn_id/txnid which
 * isn't unique). The small per-transaction fee and priority-settlement fee come straight off
 * that row; PayU's ~2% + GST MDR is genuinely a per-transaction fee (confirmed: median exactly
 * 2.000% of daily captured gross on every day with meaningful volume) but PayU settles it as one
 * combined debit per day rather than itemizing it per row, so it's allocated to this transaction
 * proportionally by its share of that day's total settled revenue — labeled as an allocation on
 * the receipt since very low-volume days may carry a per-transaction minimum fee that shifts the
 * true rate slightly from this proportional figure.
 */
async function computeTransactionFeeBreakdown(transaction) {
  const payuId = transaction.payu_id;
  const settlement = await db.payuSettlement.findFirst({
    where: { payu_id: payuId, requested_action: 'capture' },
  });

  const amount = toNumber(transaction.amount);
  const perTransactionFee = Math.abs(toNumber(settlement?.total_processing_fees));
  const perTransactionGst = Math.abs(toNumber(settlement?.total_service_tax));
  const prioritySettlementFee = Math.abs(toNumber(settlement?.priority_settlement_fee));
  const prioritySettlementGst = Math.abs(toNumber(settlement?.priority_settlement_tax));
  const ledgerSettledAmount = toNumber(settlement?.amount_net_signed) || (amount - perTransactionFee - perTransactionGst - prioritySettlementFee - prioritySettlementGst);

  let platformFeeShare = 0;
  let platformFeeGstShare = 0;
  let hasPlatformFeeAllocation = false;

  if (settlement?.settlement_date) {
    const [dayCaptures, dayAdjustments] = await Promise.all([
      db.payuSettlement.aggregate({
        where: { settlement_date: settlement.settlement_date, requested_action: 'capture' },
        _sum: { amount: true },
      }),
      db.payuSettlement.aggregate({
        where: { settlement_date: settlement.settlement_date, requested_action: 'Adjustment_debit' },
        _sum: { total_processing_fees: true, total_service_tax: true },
      }),
    ]);
    const dayCaptureTotal = toNumber(dayCaptures._sum.amount);
    const dayPlatformFee = Math.abs(toNumber(dayAdjustments._sum.total_processing_fees));
    const dayPlatformFeeGst = Math.abs(toNumber(dayAdjustments._sum.total_service_tax));
    if (dayCaptureTotal > 0 && (dayPlatformFee > 0 || dayPlatformFeeGst > 0)) {
      const share = amount / dayCaptureTotal;
      platformFeeShare = dayPlatformFee * share;
      platformFeeGstShare = dayPlatformFeeGst * share;
      hasPlatformFeeAllocation = true;
    }
  }

  const totalFee = perTransactionFee + perTransactionGst + prioritySettlementFee + prioritySettlementGst + platformFeeShare + platformFeeGstShare;
  const netAmount = amount - totalFee;

  return {
    amount, perTransactionFee, perTransactionGst, prioritySettlementFee, prioritySettlementGst,
    ledgerSettledAmount, platformFeeShare, platformFeeGstShare, hasPlatformFeeAllocation,
    totalFee, netAmount,
  };
}

/**
 * Fee/net breakdown for a page of PayU Button "invoice" rows (see admin.service.js
 * getAllInvoices) — keyed by payu_id so the caller can attach it to each row without an N+1
 * lookup pattern in the route handler itself.
 */
async function getTransactionFeesForPayuIds(payuIds) {
  if (!payuIds.length) return new Map();
  const transactions = await db.payuTransaction.findMany({ where: { payu_id: { in: payuIds } } });
  const entries = await Promise.all(
    transactions.map(async (t) => [t.payu_id, await computeTransactionFeeBreakdown(t)])
  );
  return new Map(entries);
}

async function getTransactionReceipt(payuId) {
  const transaction = await db.payuTransaction.findUnique({ where: { payu_id: payuId } });
  if (!transaction) throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });

  const fee = await computeTransactionFeeBreakdown(transaction);

  const pdfBuffer = await generateReceiptPDF({
    receiptNumber: `PU-${payuId}`,
    payuId,
    txnid: transaction.txnid,
    customerName: [transaction.firstname, transaction.lastname].filter(Boolean).join(' '),
    customerEmail: transaction.email,
    productInfo: transaction.productinfo,
    mode: transaction.mode,
    addedOn: transaction.addedon,
    amount: fee.amount,
    perTransactionFee: fee.perTransactionFee,
    perTransactionGst: fee.perTransactionGst,
    prioritySettlementFee: fee.prioritySettlementFee,
    prioritySettlementGst: fee.prioritySettlementGst,
    ledgerSettledAmount: fee.ledgerSettledAmount,
    platformFeeShare: fee.platformFeeShare,
    platformFeeGstShare: fee.platformFeeGstShare,
    estimatedNetAmount: fee.netAmount,
    hasPlatformFeeAllocation: fee.hasPlatformFeeAllocation,
  });

  return { transaction, pdfBuffer };
}

module.exports = {
  importFile,
  listImports,
  runReconciliation,
  getSummary,
  getReconciliation,
  generateFeeStatement,
  getFeeStatementPdf,
  listFeeStatements,
  exportForCA,
  getTransactionReceipt,
  getTransactionFeesForPayuIds,
};
