'use strict';

const XLSX = require('xlsx');
const crypto = require('crypto');

function toNum(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toStr(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/**
 * Every real PayU/Razorpay/HDFC export seen so far stores dates as plain text (verified
 * empirically against the actual Q1 files, not assumed) — `raw: true` in sheet_to_json
 * hands those through untouched as strings. But if a cell were ever a *native* Excel date
 * (e.g. someone re-saves the file in Excel and it auto-converts), `raw: true` would instead
 * hand back a numeric serial day count, which would silently fail the string-based regexes
 * below. This converts that serial number back into the same "YYYY-MM-DD HH:mm:ss" shape
 * the string-based parsers expect, so either cell type parses correctly.
 */
function excelSerialToDateTimeString(serial) {
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)} ${pad(parsed.H)}:${pad(parsed.M)}:${pad(Math.round(parsed.S))}`;
}

function toDateTimeStr(v) {
  if (typeof v === 'number') return excelSerialToDateTimeString(v);
  return toStr(v);
}

/**
 * PayU report datetimes are naive "YYYY-MM-DD HH:mm:ss" strings in IST (Asia/Kolkata, UTC+5:30).
 * Must anchor the offset explicitly — otherwise parsing depends on the server process's
 * local timezone, which silently shifts every timestamp if the server runs in UTC.
 */
function parsePayuDateTime(v) {
  const s = toDateTimeStr(v);
  if (!s) return null;
  const d = new Date(s.replace(' ', 'T') + '+05:30');
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Classify which channel a transaction/settlement row came through:
 * - VALIDSTEP: a legacy website-checkout order — txnid is "VS"-prefixed (the live checkout
 *   this came from has since been removed in favor of manual PayU-report import).
 * - PAYU_BUTTON: paid via PayU's standalone Payment Button product (no ValidStep order
 *   behind it) — productinfo reads "Paid With ButtonId ...".
 * - OTHER: matches neither (ad-hoc test transactions, PayU's own daily fee adjustment
 *   entries) — not a real revenue channel, shown separately rather than mislabeled.
 */
function classifyChannel(id, productinfo) {
  const trimmedId = (id || '').trim();
  if (/^VS/i.test(trimmedId)) return 'VALIDSTEP';
  if (/ButtonId/i.test(productinfo || '')) return 'PAYU_BUTTON';
  return 'OTHER';
}

const BANK_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{2})$/;

/** HDFC statement dates are DD/MM/YY with no time component — stored as UTC midnight for that calendar day. */
function parseBankDate(v) {
  // Defensive fallback for a native Excel date cell (see excelSerialToDateTimeString) —
  // every real HDFC export seen so far is plain "DD/MM/YY" text, verified empirically.
  if (typeof v === 'number') {
    const parsed = XLSX.SSF.parse_date_code(v);
    return parsed ? new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)) : null;
  }
  const s = toStr(v);
  if (!s) return null;
  const m = BANK_DATE_RE.exec(s);
  if (!m) return null;
  const [, dd, mm, yy] = m;
  return new Date(Date.UTC(2000 + Number(yy), Number(mm) - 1, Number(dd)));
}

function readFirstSheetAsObjects(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
}

function readFirstSheetAsGrid(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
}

/**
 * Parse a PayU transaction report export (one row per transaction attempt).
 * `txnid` is NOT unique — PayU logs a new row per retry and legacy website-checkout orders
 * reused the same txnid deterministically, so `id` (PayU's own row id, unique across the
 * whole export) is used as the de-dupe key downstream.
 */
function parseTransactionReport(buffer) {
  const rows = readFirstSheetAsObjects(buffer);
  const parsed = [];
  let skipped = 0;

  for (const row of rows) {
    const txnid = toStr(row.txnid);
    const payu_id = toStr(row.id);
    if (!txnid || !payu_id) { skipped += 1; continue; }

    const productinfo = toStr(row.productinfo);
    parsed.push({
      txnid,
      payu_id,
      source_channel: classifyChannel(txnid, productinfo),
      status: toStr(row.status) || 'unknown',
      addedon: parsePayuDateTime(row.addedon),
      success_at: parsePayuDateTime(row.success_at),
      amount: toNum(row.amount),
      productinfo,
      firstname: toStr(row.firstname),
      lastname: toStr(row.lastname),
      email: toStr(row.email),
      phone: toStr(row.phone),
      bank_name: toStr(row.bank_name),
      mode: toStr(row.mode),
      error_code: toStr(row.error_code),
      error_message: toStr(row.error_message) || toStr(row.errorDescription),
      transaction_fee: toNum(row.transaction_fee),
      service_fees: toNum(row.service_fees),
      convenience_fee: toNum(row.convenience_fee),
      tsp_charges: toNum(row.tsp_charges),
      mer_service_fee: toNum(row.mer_service_fee),
      cgst: toNum(row.cgst),
      sgst: toNum(row.sgst),
      igst: toNum(row.igst),
      settlement_amount: toNum(row.settlement_amount),
      settlement_date: parsePayuDateTime(row.settlement_date),
      utr: toStr(row.utr),
      recon_ref_number: toStr(row.recon_ref_number),
      category: toStr(row.category),
      sub_category: toStr(row.sub_category),
      raw: row,
    });
  }

  return { rows: parsed, skipped_count: skipped, total_rows: rows.length };
}

/**
 * Parse a PayU settlement report export (capture / refund / Adjustment_debit ledger entries).
 * `Request ID` is unique when present (~98% of rows); Adjustment_debit rows lack one, so those
 * fall back to a deterministic hash of stable fields as the de-dupe key.
 */
function parseSettlementReport(buffer) {
  const rows = readFirstSheetAsObjects(buffer);
  const parsed = [];
  let skipped = 0;

  for (const row of rows) {
    const merchantTxnId = toStr(row['Merchant Txn ID']);
    if (!merchantTxnId) { skipped += 1; continue; }

    const requestedAction = toStr(row['Requested Action']) || 'unknown';
    const requestId = toStr(row['Request ID']);
    const settlementDateRaw = toStr(row['Settlement Date']);
    const netAmount = toNum(row['Net Amount']);
    const serviceTax = toNum(row['Service Tax']);
    const cgst = toNum(row['CGST']);
    const sgst = toNum(row['SGST']);
    const igst = toNum(row['IGST']);

    const settlementKey = requestId || crypto
      .createHash('sha1')
      .update([merchantTxnId, requestedAction, settlementDateRaw, netAmount, serviceTax, cgst, sgst, igst].join('|'))
      .digest('hex');

    parsed.push({
      settlement_key: settlementKey,
      merchant_txn_id: merchantTxnId,
      source_channel: classifyChannel(merchantTxnId, toStr(row['Product Info'])),
      requested_action: requestedAction,
      recon_ref_number: toStr(row['Recon Ref Number']),
      payu_id: toStr(row['PayU ID']),
      merchant_utr: toStr(row['Merchant UTR']),
      bank_reference_no: toStr(row['Bank Reference No']),
      bank_arn: toStr(row['Bank ARN']),
      amount: toNum(row['Amount']),
      net_amount: netAmount,
      amount_net_signed: toNum(row['Amount(Net)']),
      status: toStr(row['Status']),
      settlement_date: parsePayuDateTime(row['Settlement Date']),
      added_on: parsePayuDateTime(row['AddedOn']),
      succeed_on: parsePayuDateTime(row['SucceedOn']),
      service_tax: serviceTax,
      cgst,
      sgst,
      igst,
      total_processing_fees: toNum(row['Total Processing fees']),
      total_service_tax: toNum(row['Total Service Tax']),
      priority_settlement_fee: toNum(row['Priority Settlement Fee']),
      priority_settlement_tax: toNum(row['Priority Settlement Tax']),
      raw: row,
    });
  }

  return { rows: parsed, skipped_count: skipped, total_rows: rows.length };
}

/**
 * Parse a PayU "Daily Settlement Summary" report — a different export shape than
 * parseSettlementReport's per-transaction ledger: one row per settlement day/UTR,
 * shaped like Razorpay's settlement report (DATE, UTR NUMBER, SETTLEMENT ID,
 * TXNS AMOUNT, SETTLED AMOUNT, SERVICE FEE, SERVICE TAX, ...). Used by Master
 * Accounting, which needs direct UTR-based bank reconciliation.
 */
function parsePayuSettlementSummaryReport(buffer) {
  const rows = readFirstSheetAsObjects(buffer);
  const parsed = [];
  let skipped = 0;

  for (const row of rows) {
    const settlementId = toStr(row['SETTLEMENT ID']);
    if (!settlementId) { skipped += 1; continue; }

    // SETTLEMENT ID alone is only unique per calendar day — PayU can settle more than
    // one UTR on the same day (e.g. a regular batch plus a separate adjustment), so the
    // UTR must be part of the key or same-day rows silently collide on upsert.
    const utr = toStr(row['UTR NUMBER']);
    const settlementKey = utr ? `${settlementId}_${utr}` : settlementId;

    parsed.push({
      settlement_key: settlementKey,
      settlement_id: settlementId,
      settlement_date: parsePayuDateTime(row['DATE']),
      merchant_utr: toStr(row['UTR NUMBER']),
      txns_amount: toNum(row['TXNS AMOUNT']),
      settled_amount: toNum(row['SETTLED AMOUNT']),
      adjustment_amount: toNum(row['ADJUSTMENT AMOUNT']),
      refund_amount: toNum(row['REFUND AMOUNT']),
      chargeback_amount: toNum(row['CHARGEBACK AMOUNT']),
      total_processing_fees: toNum(row['SERVICE FEE']),
      total_service_tax: toNum(row['SERVICE TAX']),
      transactions_count: (() => { const n = toNum(row['Transactions']); return n === null ? null : Math.round(n); })(),
      raw: row,
    });
  }

  return { rows: parsed, skipped_count: skipped, total_rows: rows.length };
}

/**
 * Parse an HDFC bank statement export. The header/address block length varies statement to
 * statement, so the data window is located by scanning for the "Date" header row rather than
 * assuming a fixed offset, and data rows are recognized by a DD/MM/YY date in column 0.
 */
function parseBankStatement(buffer) {
  const grid = readFirstSheetAsGrid(buffer);

  let headerIdx = -1;
  for (let i = 0; i < grid.length; i++) {
    const cell = grid[i] && grid[i][0];
    if (typeof cell === 'string' && cell.trim().toLowerCase() === 'date') {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    throw Object.assign(new Error('Could not locate the "Date" header row in the bank statement'), { statusCode: 400 });
  }

  const parsed = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i] || [];
    const dateCell = String(row[0] || '').trim();
    if (!BANK_DATE_RE.test(dateCell)) {
      // Skip every non-data row rather than stopping at the first one — the trailing
      // "STATEMENT SUMMARY" footer block, blank separator rows, and repeated header/"****"
      // rows all fail the DD/MM/YY test, but so would a mid-file gap in a statement covering
      // a longer, combined date range (e.g. several months concatenated into one export).
      // Scanning the full sheet instead of breaking early means a row after any such gap is
      // still picked up rather than silently lost.
      continue;
    }
    parsed.push({
      txn_date: parseBankDate(row[0]),
      narration: toStr(row[1]) || '',
      ref_no: toStr(row[2]),
      value_date: parseBankDate(row[3]),
      withdrawal_amt: toNum(row[4]),
      deposit_amt: toNum(row[5]),
      closing_balance: toNum(row[6]),
    });
  }

  return { rows: parsed, total_rows: grid.length };
}

module.exports = {
  parseTransactionReport,
  parseSettlementReport,
  parsePayuSettlementSummaryReport,
  parseBankStatement,
};
