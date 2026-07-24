'use strict';

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

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
  // Explicit UTC: period_start/period_end are stored as UTC day boundaries, and rendering
  // without a fixed zone would let the server's local timezone shift the displayed calendar
  // date across midnight (e.g. an end-of-day UTC bound reading as the next day in IST).
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function fmtMoney(n) {
  return `INR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generate the internal PayU fee/settlement statement PDF for a period.
 * This is a management/reconciliation document assembled from PayU's own settlement
 * export — it is NOT a substitute for PayU's official GST tax invoice (downloadable
 * separately from the PayU dashboard), which is what should be used to claim GST ITC
 * on these fees. That distinction is called out explicitly in the footer.
 */
async function generateFeeStatementPDF(data) {
  const {
    statementNumber, periodStart, periodEnd,
    grossAmount, refundAmount, fees,
    netRevenue, netCreditedToBank, reconciliationVariance,
    transactionCount, generatedAt,
  } = data;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
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
  page.drawText('Internal PayU Fee & Settlement Statement', { x: marginX, y: height - 65, size: 10, font: regular, color: rgb(0.8, 0.8, 1) });

  const titleW = bold.widthOfTextAtSize('STATEMENT', 22);
  page.drawText('STATEMENT', { x: width - marginX - titleW, y: height - 42, size: 22, font: bold, color: white });
  const numW = regular.widthOfTextAtSize(statementNumber, 10);
  page.drawText(statementNumber, { x: width - marginX - numW, y: height - 60, size: 10, font: regular, color: rgb(0.8, 0.8, 1) });

  y = height - 130;

  // Issuer block
  page.drawText('ISSUED BY', { x: marginX, y, size: 8, font: bold, color: gray });
  y -= 18;
  page.drawText(COMPANY.legalName, { x: marginX, y, size: 13, font: bold, color: dark });
  y -= 15;
  page.drawText(`CIN: ${COMPANY.cin}`, { x: marginX, y, size: 9, font: regular, color: gray });
  y -= 13;
  for (const line of COMPANY.address) {
    page.drawText(line, { x: marginX, y, size: 9, font: regular, color: gray });
    y -= 13;
  }
  page.drawText(`${COMPANY.email}  |  ${COMPANY.website}`, { x: marginX, y, size: 9, font: regular, color: gray });

  // Period block (right column)
  const col2X = marginX + (width - marginX * 2) / 2 + 20;
  let y2 = height - 148;
  page.drawText('PERIOD', { x: col2X, y: y2, size: 8, font: bold, color: gray });
  y2 -= 18;
  page.drawText(`${fmtDate(periodStart)} – ${fmtDate(periodEnd)}`, { x: col2X, y: y2, size: 11, font: bold, color: dark });
  y2 -= 18;
  page.drawText(`${transactionCount} settled transaction${transactionCount === 1 ? '' : 's'}`, { x: col2X, y: y2, size: 9, font: regular, color: gray });
  y2 -= 13;
  page.drawText(`Generated: ${fmtDate(generatedAt || new Date())}`, { x: col2X, y: y2, size: 9, font: regular, color: gray });

  y = Math.min(y, y2) - 22;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: hexToRgb('#e2e8f0') });
  y -= 24;

  // Summary table
  const tableW = width - marginX * 2;
  const rows = [
    ['Total Revenue (Gross, via PayU)', fmtMoney(grossAmount)],
    ['Less: Refunds / Chargebacks', `(${fmtMoney(refundAmount)})`],
    ['Less: Per-Transaction Processing Fee', `(${fmtMoney(fees.perTransactionFee)})`],
    ['Less: Per-Transaction GST', `(${fmtMoney(fees.perTransactionGst)})`],
    ['Less: Priority/Instant Settlement Fee', `(${fmtMoney(fees.prioritySettlementFee)})`],
    ['Less: GST on Priority Settlement Fee', `(${fmtMoney(fees.prioritySettlementGst)})`],
    ['Less: PayU Transaction Fee (~2% MDR)', `(${fmtMoney(fees.dailyPlatformFee)})`],
    ['Less: GST on Transaction Fee', `(${fmtMoney(fees.dailyPlatformFeeGst)})`],
  ];

  page.drawRectangle({ x: marginX, y: y - 4, width: tableW, height: 20, color: light });
  page.drawText('DESCRIPTION', { x: marginX + 10, y: y + 2, size: 8, font: bold, color: gray });
  page.drawText('AMOUNT', { x: width - marginX - 90, y: y + 2, size: 8, font: bold, color: gray });
  y -= 26;

  for (const [label, value] of rows) {
    page.drawText(label, { x: marginX + 10, y, size: 9.5, font: regular, color: dark });
    const valW = regular.widthOfTextAtSize(value, 9.5);
    page.drawText(value, { x: width - marginX - 10 - valW, y, size: 9.5, font: regular, color: dark });
    y -= 16.5;
  }

  y -= 2;
  page.drawText('Total PayU Fees', { x: marginX + 10, y, size: 9.5, font: bold, color: dark });
  const totalFeeStr = `(${fmtMoney(fees.total)})`;
  const totalFeeW = bold.widthOfTextAtSize(totalFeeStr, 9.5);
  page.drawText(totalFeeStr, { x: width - marginX - 10 - totalFeeW, y, size: 9.5, font: bold, color: dark });
  y -= 22;

  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: hexToRgb('#e2e8f0') });
  y -= 22;

  page.drawText('NET REVENUE', { x: marginX + 10, y, size: 12, font: bold, color: dark });
  const netRevStr = fmtMoney(netRevenue);
  const netRevW = bold.widthOfTextAtSize(netRevStr, 13);
  page.drawText(netRevStr, { x: width - marginX - 10 - netRevW, y, size: 13, font: bold, color: primary });
  y -= 20;

  page.drawText('Net Credited to Bank (per HDFC statement)', { x: marginX + 10, y, size: 9.5, font: regular, color: gray });
  const netBankStr = fmtMoney(netCreditedToBank);
  const netBankW = regular.widthOfTextAtSize(netBankStr, 9.5);
  page.drawText(netBankStr, { x: width - marginX - 10 - netBankW, y, size: 9.5, font: regular, color: dark });
  y -= 16;

  page.drawText('Reconciliation Variance (report timing differences)', { x: marginX + 10, y, size: 8.5, font: oblique, color: gray });
  const varStr = fmtMoney(reconciliationVariance);
  const varW = oblique.widthOfTextAtSize(varStr, 8.5);
  page.drawText(varStr, { x: width - marginX - 10 - varW, y, size: 8.5, font: oblique, color: gray });
  y -= 30;

  // ITC / provenance caveat
  page.drawRectangle({ x: marginX, y: y - 58, width: tableW, height: 68, color: hexToRgb('#fffbeb'), borderRadius: 6 });
  page.drawText('IMPORTANT NOTE', { x: marginX + 12, y: y - 12, size: 9, font: bold, color: hexToRgb('#92400e') });
  const noteLines = [
    'This statement is an internal reconciliation document, computed from PayU\'s own settlement',
    'export, for revenue/expense bookkeeping. It is NOT a substitute for PayU\'s official GST tax',
    'invoice on these fees — download that separately from the PayU dashboard (Settlements >',
    'Download Monthly Invoice) for GST Input Tax Credit claims.',
  ];
  let noteY = y - 26;
  for (const line of noteLines) {
    page.drawText(line, { x: marginX + 12, y: noteY, size: 8, font: regular, color: hexToRgb('#92400e') });
    noteY -= 11;
  }
  y -= 82;

  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: hexToRgb('#e2e8f0') });
  y -= 18;
  page.drawText('This is a computer-generated statement. No signature required.', { x: marginX, y, size: 9, font: oblique, color: gray });
  y -= 14;
  page.drawText(`Generated on ${fmtDate(generatedAt || new Date())} | ${COMPANY.website}`, { x: marginX, y, size: 8, font: regular, color: hexToRgb('#94a3b8') });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generateFeeStatementPDF };
