'use strict';

const XLSX = require('xlsx');

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
 * Razorpay report timestamps are "DD/MM/YYYY HH:mm:ss" strings, in IST (Asia/Kolkata) —
 * verified empirically against the real Q1 export, not assumed. Falls back to converting
 * a native Excel date serial (see reportParsers.js's excelSerialToDateTimeString) in case
 * a future export ever hands back a real date cell instead of text.
 */
function parseRazorpayDateTime(v) {
  if (typeof v === 'number') {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date(`${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}T${pad(parsed.H)}:${pad(parsed.M)}:${pad(Math.round(parsed.S))}+05:30`);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = toStr(v);
  if (!s) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min, ss] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+05:30`);
  return isNaN(d.getTime()) ? null : d;
}

function readFirstSheetAsObjects(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
}

/**
 * Parse a Razorpay payment report export (one row per payment attempt).
 * Unlike PayU, fee/tax are populated per-row already — no daily-batching to work
 * around; Razorpay's `id` (e.g. "pay_xxx") is unique across the whole export.
 */
function parseRazorpayPaymentReport(buffer) {
  const rows = readFirstSheetAsObjects(buffer);
  const parsed = [];
  let skipped = 0;

  for (const row of rows) {
    const razorpayId = toStr(row.id);
    if (!razorpayId) { skipped += 1; continue; }

    parsed.push({
      razorpay_id: razorpayId,
      amount: toNum(row.amount),
      currency: toStr(row.currency),
      status: toStr(row.status) || 'unknown',
      order_id: toStr(row.order_id),
      method: toStr(row.method),
      fee: toNum(row.fee),
      tax: toNum(row.tax),
      amount_refunded: toNum(row.amount_refunded),
      refund_status: toStr(row.refund_status),
      email: toStr(row.email),
      contact: toStr(row.contact),
      description: toStr(row.description),
      bank: toStr(row.bank),
      created_at_source: parseRazorpayDateTime(row.created_at),
      raw: row,
    });
  }

  return { rows: parsed, skipped_count: skipped, total_rows: rows.length };
}

/**
 * Parse a Razorpay settlement report export (one row per settlement batch — much
 * simpler than PayU's ledger: Razorpay settles net-of-fees per batch, and `utr`
 * matches the bank statement's reference directly).
 */
function parseRazorpaySettlementReport(buffer) {
  const rows = readFirstSheetAsObjects(buffer);
  const parsed = [];
  let skipped = 0;

  for (const row of rows) {
    const settlementId = toStr(row.id);
    if (!settlementId) { skipped += 1; continue; }

    parsed.push({
      settlement_id: settlementId,
      amount: toNum(row.amount),
      status: toStr(row.status),
      fees: toNum(row.fees),
      tax: toNum(row.tax),
      utr: toStr(row.utr),
      additional_utr: toStr(row.additional_utr),
      created_at_source: parseRazorpayDateTime(row.created_at),
      raw: row,
    });
  }

  return { rows: parsed, skipped_count: skipped, total_rows: rows.length };
}

module.exports = { parseRazorpayPaymentReport, parseRazorpaySettlementReport };
