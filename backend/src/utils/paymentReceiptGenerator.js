'use strict';

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const env = require('../config/env');

const GST_RATE = 0.18;

/**
 * GST only applies to transactions dated on/after the company's registration takes
 * effect — never retroactively, even if this same receipt is re-downloaded after
 * registration. With no GSTIN/effective-date configured (current state), always false.
 */
function isGstApplicable(txnDate) {
  if (!env.COMPANY_GSTIN || !env.COMPANY_GST_EFFECTIVE_FROM || !txnDate) return false;
  return new Date(txnDate) >= new Date(env.COMPANY_GST_EFFECTIVE_FROM);
}

/** Amount is treated as GST-inclusive; this splits it into taxable value + GST for display only. */
function splitGstInclusive(amount) {
  const taxable = amount / (1 + GST_RATE);
  return { taxable, gst: amount - taxable };
}

const COMPANY = {
  legalName: 'Bold India Platforms Private Limited',
  cin: 'U85499PN2025PTC246360',
  address: ['Sn 242/1/2 Baner, Tejaswini Soc, DP Road, N.I.A.,', 'Pune, Maharashtra 411045'],
  email: 'hello@boldindia.in',
  website: 'www.boldindia.in',
};

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? rgb(parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255) : rgb(0, 0, 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function fmtMoney(n) {
  return `INR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generate a per-transaction payment receipt for a PayU Button transaction (one with no
 * ValidStep Order behind it, so the regular certificate-invoice flow never fires for it).
 * The small per-transaction processing fee and priority-settlement fee come straight off this
 * transaction's own settlement ledger row. PayU's dominant fee — its standard ~2% + GST MDR —
 * genuinely applies per transaction (verified: consistently ~2% of daily volume), but PayU
 * settles it as one combined debit per day rather than itemizing it per row, so it's shown here
 * as this transaction's proportional share of that day's total (by revenue) — labeled as an
 * allocation since very low-volume days can carry a per-transaction minimum-fee floor that
 * shifts the true amount slightly from this proportional figure.
 */
async function generateReceiptPDF(data) {
  const {
    receiptNumber, payuId, txnid, customerName, customerEmail,
    productInfo, mode, addedOn, amount,
    perTransactionFee, perTransactionGst, prioritySettlementFee, prioritySettlementGst,
    ledgerSettledAmount, platformFeeShare, platformFeeGstShare, estimatedNetAmount,
    hasPlatformFeeAllocation,
  } = data;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const oblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const primary = hexToRgb('#4F46E5');
  const dark = rgb(0.1, 0.1, 0.15);
  const gray = rgb(0.45, 0.45, 0.5);
  const light = rgb(0.96, 0.96, 0.98);
  const white = rgb(1, 1, 1);

  const marginX = 48;
  let y = height - 48;

  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: primary });
  page.drawText('Validstep.com', { x: marginX, y: height - 45, size: 20, font: bold, color: white });
  page.drawText('Payment Receipt — PayU Button Transaction', { x: marginX, y: height - 65, size: 10, font: regular, color: rgb(0.8, 0.8, 1) });

  const titleW = bold.widthOfTextAtSize('RECEIPT', 22);
  page.drawText('RECEIPT', { x: width - marginX - titleW, y: height - 42, size: 22, font: bold, color: white });
  const numW = regular.widthOfTextAtSize(receiptNumber, 10);
  page.drawText(receiptNumber, { x: width - marginX - numW, y: height - 60, size: 10, font: regular, color: rgb(0.8, 0.8, 1) });

  y = height - 130;

  const displayName = customerName || customerEmail || 'Customer';
  page.drawText('BILL TO', { x: marginX, y, size: 8, font: bold, color: gray });
  y -= 18;
  page.drawText(displayName, { x: marginX, y, size: 13, font: bold, color: dark });
  y -= 15;
  if (customerEmail && customerEmail !== displayName) { page.drawText(customerEmail, { x: marginX, y, size: 9, font: regular, color: gray }); y -= 13; }

  const gstApplicable = isGstApplicable(addedOn);
  const col2X = marginX + (width - marginX * 2) / 2 + 20;
  let y2 = height - 148;
  page.drawText('ISSUED BY', { x: col2X, y: y2, size: 8, font: bold, color: gray });
  y2 -= 18;
  page.drawText(COMPANY.legalName, { x: col2X, y: y2, size: 11, font: bold, color: dark });
  y2 -= 15;
  page.drawText(`CIN: ${COMPANY.cin}`, { x: col2X, y: y2, size: 8.5, font: regular, color: gray });
  y2 -= 13;
  page.drawText(COMPANY.email, { x: col2X, y: y2, size: 8.5, font: regular, color: gray });
  if (gstApplicable) {
    y2 -= 13;
    page.drawText(`GSTIN: ${env.COMPANY_GSTIN}`, { x: col2X, y: y2, size: 8.5, font: regular, color: gray });
  }

  y = Math.min(y, y2) - 22;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: hexToRgb('#e2e8f0') });
  y -= 24;

  const tableW = width - marginX * 2;
  const details = [
    ['Transaction ID (PayU)', payuId],
    ['Merchant Txn ID', txnid],
    ['Product', productInfo || '—'],
    ['Payment Mode', mode || '—'],
    ['Date', fmtDate(addedOn)],
  ];
  for (const [label, val] of details) {
    page.drawText(`${label}:`, { x: marginX, y, size: 9, font: bold, color: gray });
    page.drawText(String(val || '—').slice(0, 60), { x: marginX + 140, y, size: 9, font: regular, color: dark });
    y -= 15;
  }
  y -= 10;

  page.drawRectangle({ x: marginX, y: y - 4, width: tableW, height: 20, color: light });
  page.drawText('DESCRIPTION', { x: marginX + 10, y: y + 2, size: 8, font: bold, color: gray });
  page.drawText('AMOUNT', { x: width - marginX - 90, y: y + 2, size: 8, font: bold, color: gray });
  y -= 26;

  const rows = [
    ['Amount Paid', fmtMoney(amount)],
  ];
  if (gstApplicable) {
    const { taxable, gst } = splitGstInclusive(Number(amount));
    rows.push(['  Taxable Value', fmtMoney(taxable)]);
    rows.push(['  GST (18%, included)', fmtMoney(gst)]);
  }
  rows.push(
    ['Less: Per-Transaction Processing Fee', `(${fmtMoney(perTransactionFee)})`],
    ['Less: Per-Transaction GST', `(${fmtMoney(perTransactionGst)})`],
  );
  if (prioritySettlementFee) {
    rows.push(['Less: Priority/Instant Settlement Fee', `(${fmtMoney(prioritySettlementFee)})`]);
    rows.push(['Less: GST on Priority Settlement Fee', `(${fmtMoney(prioritySettlementGst)})`]);
  }
  for (const [label, value] of rows) {
    page.drawText(label, { x: marginX + 10, y, size: 9.5, font: regular, color: dark });
    const valW = regular.widthOfTextAtSize(value, 9.5);
    page.drawText(value, { x: width - marginX - 10 - valW, y, size: 9.5, font: regular, color: dark });
    y -= 17;
  }

  y -= 4;
  page.drawText('Settled via this transaction\'s ledger entry', { x: marginX + 10, y, size: 9.5, font: bold, color: dark });
  const settledStr = fmtMoney(ledgerSettledAmount);
  const settledW = bold.widthOfTextAtSize(settledStr, 9.5);
  page.drawText(settledStr, { x: width - marginX - 10 - settledW, y, size: 9.5, font: bold, color: dark });
  y -= 26;

  if (hasPlatformFeeAllocation) {
    page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: hexToRgb('#e2e8f0') });
    y -= 18;
    page.drawText('Less: PayU Transaction Fee (~2% MDR, this txn\'s share)', { x: marginX + 10, y, size: 9.5, font: regular, color: dark });
    const pfStr = `(${fmtMoney(platformFeeShare)})`;
    const pfW = regular.widthOfTextAtSize(pfStr, 9.5);
    page.drawText(pfStr, { x: width - marginX - 10 - pfW, y, size: 9.5, font: regular, color: dark });
    y -= 17;
    page.drawText('Less: GST on Transaction Fee', { x: marginX + 10, y, size: 9.5, font: regular, color: dark });
    const pgStr = `(${fmtMoney(platformFeeGstShare)})`;
    const pgW = regular.widthOfTextAtSize(pgStr, 9.5);
    page.drawText(pgStr, { x: width - marginX - 10 - pgW, y, size: 9.5, font: regular, color: dark });
    y -= 26;
  }

  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: hexToRgb('#e2e8f0') });
  y -= 22;
  const netLabel = hasPlatformFeeAllocation ? 'ESTIMATED NET (after PayU transaction fee)' : 'NET SETTLED';
  page.drawText(netLabel, { x: marginX + 10, y, size: 11, font: bold, color: dark });
  const netStr = fmtMoney(estimatedNetAmount);
  const netW = bold.widthOfTextAtSize(netStr, 13);
  page.drawText(netStr, { x: width - marginX - 10 - netW, y, size: 13, font: bold, color: primary });
  y -= 40;

  if (hasPlatformFeeAllocation) {
    page.drawRectangle({ x: marginX, y: y - 55, width: tableW, height: 65, color: hexToRgb('#fffbeb'), borderRadius: 6 });
    page.drawText('NOTE ON TRANSACTION FEE', { x: marginX + 12, y: y - 12, size: 9, font: bold, color: hexToRgb('#92400e') });
    const noteLines = [
      'PayU\'s ~2% + GST fee (MDR) applies per transaction, but is settled as one combined debit',
      'per day rather than itemized per row. The amount above is this transaction\'s share of that',
      'day\'s total, by revenue — very small/low-volume days may carry a per-transaction minimum',
      'fee that shifts the actual rate slightly from the proportional figure shown here.',
    ];
    let noteY = y - 26;
    for (const line of noteLines) {
      page.drawText(line, { x: marginX + 12, y: noteY, size: 7.5, font: regular, color: hexToRgb('#92400e') });
      noteY -= 10.5;
    }
    y -= 77;
  }

  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: hexToRgb('#e2e8f0') });
  y -= 18;
  page.drawText('This is a computer-generated receipt. No signature required.', { x: marginX, y, size: 9, font: oblique, color: gray });
  y -= 14;
  page.drawText(`Generated on ${fmtDate(new Date())} | ${COMPANY.website}`, { x: marginX, y, size: 8, font: regular, color: hexToRgb('#94a3b8') });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generateReceiptPDF };
