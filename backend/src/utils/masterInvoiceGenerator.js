'use strict';

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const env = require('../config/env');

const GST_RATE = 0.18;

/** Same GST-applicability rule as the Validstep/PayU receipt generator — no dedicated
 * GSTIN configured yet, so this always resolves false until one is set. */
function isGstApplicable(txnDate) {
  if (!env.COMPANY_GSTIN || !env.COMPANY_GST_EFFECTIVE_FROM || !txnDate) return false;
  return new Date(txnDate) >= new Date(env.COMPANY_GST_EFFECTIVE_FROM);
}

function splitGstInclusive(amount) {
  const taxable = amount / (1 + GST_RATE);
  return { taxable, gst: amount - taxable };
}

// One legal entity runs both brands/websites — only the storefront name/URL in the
// masthead changes per brand, not the billing entity.
const COMPANY = {
  legalName: 'Bold India Platforms Private Limited',
  cin: 'U85499PN2025PTC246360',
  email: 'hello@boldindia.in',
};

const BRANDS = {
  VALIDSTEP: { displayName: 'Validstep.com', website: 'www.validstep.com' },
  RISEFLAKE: { displayName: 'RiseFlake.com / Resume', website: 'www.riseflake.com/resume' },
};

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? rgb(parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255) : rgb(0, 0, 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
}

function fmtMoney(n) {
  return `INR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Per-transaction invoice for either brand/gateway pair Bold India Platforms runs
 * (Validstep via PayU, RiseFlake via Razorpay). Two distinct documents share this renderer:
 *   - `invoiceType: 'customer'` — what you'd actually hand a customer: amount paid, product,
 *     date, GST split when applicable, and refund/chargeback status if any. No gateway fee
 *     breakdown, no settlement UTR, no bank-credit detail — that's the company's internal
 *     business, not the customer's.
 *   - `invoiceType: 'company'` (default) — the full internal accounting version: every
 *     gateway fee/tax deducted and the actual bank credit this transaction's settlement
 *     produced. `feeRows` and `bankCredit` are shaped by the caller per-gateway since PayU
 *     (batched daily MDR, allocated) and Razorpay (fee/tax itemized per payment) have
 *     genuinely different fee mechanics — this renderer just lays out whatever it's given.
 */
async function generateInvoicePDF(data) {
  const {
    invoiceType = 'company', invoiceNumber, brand, gateway, gatewayTxnId, merchantTxnId,
    customerName, customerEmail, productInfo, mode, txnDate, amount, feeRows, netAmount,
    hasEstimatedFee, bankCredit, // { matched: bool, note: string } — see callers for exact shape
    refund, chargeback, // { amount, date, bankCredit } or null — see callers for exact shape
  } = data;
  const isCustomerType = invoiceType === 'customer';

  const brandInfo = BRANDS[brand] || BRANDS.VALIDSTEP;

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

  const docTitle = isCustomerType ? 'RECEIPT' : 'INVOICE';
  const docKind = isCustomerType ? 'Receipt' : 'Invoice';

  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: primary });
  page.drawText(brandInfo.displayName, { x: marginX, y: height - 45, size: 20, font: bold, color: white });
  page.drawText(`Payment ${docKind} — via ${gateway === 'RAZORPAY' ? 'Razorpay' : 'PayU'}`, { x: marginX, y: height - 65, size: 10, font: regular, color: rgb(0.8, 0.8, 1) });

  const titleW = bold.widthOfTextAtSize(docTitle, 22);
  page.drawText(docTitle, { x: width - marginX - titleW, y: height - 42, size: 22, font: bold, color: white });
  const numW = regular.widthOfTextAtSize(invoiceNumber, 10);
  page.drawText(invoiceNumber, { x: width - marginX - numW, y: height - 60, size: 10, font: regular, color: rgb(0.8, 0.8, 1) });

  y = height - 130;

  const displayName = customerName || customerEmail || 'Customer';
  page.drawText('BILL TO', { x: marginX, y, size: 8, font: bold, color: gray });
  y -= 18;
  page.drawText(displayName, { x: marginX, y, size: 13, font: bold, color: dark });
  y -= 15;
  if (customerEmail && customerEmail !== displayName) { page.drawText(customerEmail, { x: marginX, y, size: 9, font: regular, color: gray }); y -= 13; }

  const gstApplicable = isGstApplicable(txnDate);
  const col2X = marginX + (width - marginX * 2) / 2 + 20;
  let y2 = height - 148;
  page.drawText('ISSUED BY', { x: col2X, y: y2, size: 8, font: bold, color: gray });
  y2 -= 18;
  page.drawText(COMPANY.legalName, { x: col2X, y: y2, size: 11, font: bold, color: dark });
  y2 -= 15;
  page.drawText(`CIN: ${COMPANY.cin}`, { x: col2X, y: y2, size: 8.5, font: regular, color: gray });
  y2 -= 13;
  page.drawText(`${brandInfo.website} · ${COMPANY.email}`, { x: col2X, y: y2, size: 8.5, font: regular, color: gray });
  if (gstApplicable) {
    y2 -= 13;
    page.drawText(`GSTIN: ${env.COMPANY_GSTIN}`, { x: col2X, y: y2, size: 8.5, font: regular, color: gray });
  }

  y = Math.min(y, y2) - 22;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: hexToRgb('#e2e8f0') });
  y -= 24;

  // "Paid" unless this transaction was itself reversed — a refunded/charged-back receipt
  // must not still claim "Paid", that's the whole point of showing it to the customer.
  const paymentStatus = chargeback ? 'Charged Back' : refund ? 'Refunded' : 'Paid';

  const tableW = width - marginX * 2;
  const details = [
    // Gateway transaction ID is an internal reconciliation reference — not customer-relevant;
    // the receipt number at the top already identifies this document for the customer.
    ...(!isCustomerType ? [[gateway === 'RAZORPAY' ? 'Transaction ID (Razorpay)' : 'Transaction ID (PayU)', gatewayTxnId]] : []),
    ...(!isCustomerType && merchantTxnId ? [['Merchant Txn ID', merchantTxnId]] : []),
    ['Product', productInfo || '—'],
    ...(mode ? [['Payment Mode', mode]] : []),
    ['Date', fmtDateTime(txnDate)],
    ...(isCustomerType ? [['Payment Status', paymentStatus]] : []),
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

  const rows = [[isCustomerType ? 'Amount Paid' : 'Amount Charged to Customer', fmtMoney(amount)]];
  if (gstApplicable) {
    const { taxable, gst } = splitGstInclusive(Number(amount));
    rows.push(['  Taxable Value', fmtMoney(taxable)]);
    rows.push(['  GST (18%, included)', fmtMoney(gst)]);
  }
  if (isCustomerType) {
    // Customer copy shows only what the customer paid and any refund/chargeback — the
    // gateway's fee and the company's net take are internal business detail, not theirs.
    if (refund) rows.push([refund.date ? `Refunded on ${fmtDate(refund.date)}` : 'Refunded', `(${fmtMoney(refund.amount)})`]);
    if (chargeback) rows.push([chargeback.date ? `Chargeback on ${fmtDate(chargeback.date)}` : 'Chargeback', `(${fmtMoney(chargeback.amount)})`]);
  } else {
    for (const fr of feeRows) {
      rows.push([`Less: ${fr.label}`, `(${fmtMoney(fr.value)})`]);
    }
  }
  for (const [label, value] of rows) {
    page.drawText(label, { x: marginX + 10, y, size: 9.5, font: regular, color: dark });
    const valW = regular.widthOfTextAtSize(value, 9.5);
    page.drawText(value, { x: width - marginX - 10 - valW, y, size: 9.5, font: regular, color: dark });
    y -= 17;
  }

  y -= 4;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: hexToRgb('#e2e8f0') });
  y -= 22;

  if (isCustomerType) {
    // Just the bottom line of this receipt — what the customer paid, net of any refund or
    // chargeback. No fee/net breakdown here; that's the company invoice's job.
    const total = amount - (refund?.amount || 0) - (chargeback?.amount || 0);

    page.drawText('TOTAL', { x: marginX + 10, y, size: 12, font: bold, color: dark });
    const totalStr = fmtMoney(total);
    const totalW = bold.widthOfTextAtSize(totalStr, 14);
    page.drawText(totalStr, { x: width - marginX - 10 - totalW, y, size: 14, font: bold, color: primary });
    y -= 30;

    if (!gstApplicable) {
      page.drawText('This is a payment receipt, not a tax invoice.', { x: marginX + 10, y, size: 8, font: oblique, color: gray });
      y -= 18;
    } else {
      y -= 4;
    }
  } else {
    const netSuffix = refund || chargeback ? 'gateway fees, refund & chargeback' : 'gateway fees';
    const netLabel = `${hasEstimatedFee ? 'ESTIMATED NET' : 'NET'} (after ${netSuffix})`;
    page.drawText(netLabel, { x: marginX + 10, y, size: 11, font: bold, color: dark });
    const netStr = fmtMoney(netAmount);
    const netW = bold.widthOfTextAtSize(netStr, 13);
    page.drawText(netStr, { x: width - marginX - 10 - netW, y, size: 13, font: bold, color: primary });
    y -= 34;

    // Bank-credit status — the actual end-of-chain confirmation, not an estimate: whether
    // this transaction's settlement batch has been matched to a real HDFC bank credit yet.
    const bcHeight = bankCredit.matched ? 48 : 38;
    page.drawRectangle({
      x: marginX, y: y - bcHeight, width: tableW, height: bcHeight,
      color: bankCredit.matched ? hexToRgb('#ecfdf5') : hexToRgb('#fffbeb'),
    });
    page.drawText(
      bankCredit.matched ? 'CREDITED TO COMPANY BANK ACCOUNT' : 'BANK CREDIT STATUS',
      { x: marginX + 12, y: y - 14, size: 9, font: bold, color: bankCredit.matched ? hexToRgb('#065f46') : hexToRgb('#92400e') }
    );
    const bcLines = bankCredit.note.split('\n');
    let bcY = y - 27;
    for (const line of bcLines) {
      page.drawText(line, { x: marginX + 12, y: bcY, size: 8, font: regular, color: bankCredit.matched ? hexToRgb('#065f46') : hexToRgb('#92400e') });
      bcY -= 11;
    }
    y -= bcHeight + 18;

    // Refund/chargeback are their own settlement legs, each with their own bank movement —
    // surface that confirmation too, not just the original capture's credit. Note this leg's
    // own settlement UTR can still net to a bank *credit* if the rest of that day's batch
    // outweighs it, so the direction is read off bankCredit.isCredit, never assumed.
    for (const [kind, leg] of [['Refund', refund], ['Chargeback', chargeback]]) {
      if (!leg) continue;
      const legHeight = 40;
      page.drawRectangle({
        x: marginX, y: y - legHeight, width: tableW, height: legHeight,
        color: leg.bankCredit.matched ? hexToRgb('#fef2f2') : hexToRgb('#fffbeb'),
      });
      const legStatusLabel = leg.bankCredit.matched
        ? `— ${leg.bankCredit.isCredit ? 'BATCH NETTED TO A CREDIT' : 'DEBITED FROM BANK'}`
        : '— BANK MOVEMENT STATUS';
      page.drawText(
        `${kind.toUpperCase()} ${legStatusLabel}`,
        { x: marginX + 12, y: y - 14, size: 9, font: bold, color: hexToRgb('#991b1b') }
      );
      const legLines = leg.bankCredit.note.split('\n');
      let legY = y - 27;
      for (const line of legLines) {
        page.drawText(line, { x: marginX + 12, y: legY, size: 8, font: regular, color: hexToRgb('#991b1b') });
        legY -= 11;
      }
      y -= legHeight + 12;
    }

    if (hasEstimatedFee) {
      page.drawRectangle({ x: marginX, y: y - 42, width: tableW, height: 42, color: hexToRgb('#fffbeb'), borderRadius: 6 });
      page.drawText('NOTE ON GATEWAY FEE', { x: marginX + 12, y: y - 12, size: 9, font: bold, color: hexToRgb('#92400e') });
      const noteLines = [
        "PayU's ~2% + GST fee is settled as one combined debit per day rather than itemized per",
        'transaction — the figure above is this transaction\'s proportional share of that day\'s total.',
      ];
      let noteY = y - 24;
      for (const line of noteLines) {
        page.drawText(line, { x: marginX + 12, y: noteY, size: 7.5, font: regular, color: hexToRgb('#92400e') });
        noteY -= 10.5;
      }
      y -= 54;
    }
  }

  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: hexToRgb('#e2e8f0') });
  y -= 18;
  page.drawText(`This is a computer-generated ${docKind.toLowerCase()}. No signature required.`, { x: marginX, y, size: 9, font: oblique, color: gray });
  y -= 14;
  page.drawText(`Generated on ${fmtDate(txnDate)} | ${brandInfo.website}`, { x: marginX, y, size: 8, font: regular, color: hexToRgb('#94a3b8') });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generateInvoicePDF };
