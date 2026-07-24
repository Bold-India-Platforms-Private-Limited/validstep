'use strict';

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const env = require('../config/env');

// The invoice issuer is always Bold India Platforms (the entity that actually receives
// payment via PayU) — `companyName` passed into this function is the customer's employer
// / program provider (e.g. "Acme Corp"), which is the "Issuing Organisation" for the
// certificate itself, not who issued the invoice.
const COMPANY = {
  legalName: 'BOLD INDIA PLATFORMS PRIVATE LIMITED',
  cin: env.COMPANY_CIN || 'U85499PN2025PTC246360',
  pan: env.COMPANY_PAN || 'AANCB9446K',
  address: env.COMPANY_ADDRESS || 'Sn 242/1/2 Baner, Tejaswini Soc, DP Road, N.I.A., Pune, Maharashtra 411045, India',
  email: 'hello@boldindia.in | hello@validstep.com',
};

const GST_RATE = 0.18;

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/**
 * GST only applies to orders paid on/after the company's registration takes effect —
 * never retroactively, even if this same invoice is re-downloaded after registration.
 * With no GSTIN/effective-date configured (current state), this is always false.
 */
function isGstApplicable(paidAt) {
  if (!env.COMPANY_GSTIN || !env.COMPANY_GST_EFFECTIVE_FROM || !paidAt) return false;
  return new Date(paidAt) >= new Date(env.COMPANY_GST_EFFECTIVE_FROM);
}

function splitGstInclusive(amount) {
  const taxable = amount / (1 + GST_RATE);
  return { taxable, gst: amount - taxable };
}

const PROGRAM_TYPE_LABEL = {
  INTERNSHIP: 'Internship Program',
  COURSE: 'Course Program',
  PARTICIPATION: 'Participation Program',
  HACKATHON: 'Hackathon Program',
  OTHER: 'Program',
};

/** Greedy word-wrap — pdf-lib has no built-in text wrapping. */
function wrapText(text, font, size, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function rightAlign(page, text, rightX, y, size, font, color) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - w, y, size, font, color });
}

/**
 * Generate a tax-invoice PDF for an order, matching Validstep's official invoice format
 * (FROM / BILL TO / SERVICE DESCRIPTION / item table / PAYMENT INFORMATION).
 * data: { orderId, invoiceNumber, invoiceDate, userName, userEmail, userPhone, companyName,
 *   batchName, programName, programType, startDate, endDate, certificateDeliveryDate,
 *   isIssued, isManualEnrollment, certificateSerial, amount, currency, paidAt, txnId }
 */
async function generateInvoicePDF(data) {
  const {
    invoiceNumber, invoiceDate, userName, userEmail,
    companyName, programType, startDate, endDate, certificateDeliveryDate,
    isIssued, isManualEnrollment, amount, currency, paidAt, txnId,
  } = data;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const dark = rgb(0.1, 0.1, 0.15);
  const gray = rgb(0.4, 0.4, 0.45);
  const light = rgb(0.95, 0.95, 0.97);
  const border = rgb(0.85, 0.85, 0.88);
  const primary = rgb(0.31, 0.27, 0.9);

  const marginX = 48;
  const rightX = width - marginX;
  let y = height - 50;

  // Header
  page.drawText('Validstep', { x: marginX, y, size: 22, font: bold, color: primary });
  page.drawText('.com', { x: marginX + bold.widthOfTextAtSize('Validstep', 22), y, size: 22, font: bold, color: dark });
  rightAlign(page, 'TAX INVOICE', rightX, y + 2, 16, bold, dark);
  y -= 16;
  page.drawText('A product by Bold India Platforms Private Limited', { x: marginX, y, size: 9, font: regular, color: gray });
  rightAlign(page, `Invoice No.: ${invoiceNumber}`, rightX, y, 9.5, bold, dark);
  y -= 13;
  rightAlign(page, `Invoice Date: ${fmtDate(invoiceDate || new Date())}`, rightX, y, 9, regular, gray);

  y -= 26;
  page.drawLine({ start: { x: marginX, y }, end: { x: rightX, y }, thickness: 1, color: border });
  y -= 24;

  // FROM / BILL TO
  const colW = (width - marginX * 2 - 24) / 2;
  const col2X = marginX + colW + 24;

  page.drawText('FROM', { x: marginX, y, size: 9, font: bold, color: gray });
  page.drawText('BILL TO', { x: col2X, y, size: 9, font: bold, color: gray });
  y -= 16;

  let yL = y;
  page.drawText(COMPANY.legalName, { x: marginX, y: yL, size: 10.5, font: bold, color: dark }); yL -= 13;
  page.drawText('Brand: Validstep', { x: marginX, y: yL, size: 9, font: regular, color: dark }); yL -= 13;
  for (const line of wrapText(COMPANY.address, regular, 9, colW)) {
    page.drawText(line, { x: marginX, y: yL, size: 9, font: regular, color: gray }); yL -= 12;
  }
  page.drawText(`CIN: ${COMPANY.cin}`, { x: marginX, y: yL, size: 9, font: regular, color: gray }); yL -= 12;
  page.drawText(`PAN: ${COMPANY.pan}`, { x: marginX, y: yL, size: 9, font: regular, color: gray }); yL -= 12;
  const gstApplicable = isGstApplicable(paidAt);
  page.drawText(gstApplicable ? `GSTIN: ${env.COMPANY_GSTIN}` : 'GSTIN: Not Applicable (Unregistered)', { x: marginX, y: yL, size: 9, font: regular, color: gray }); yL -= 12;
  page.drawText(`Email: ${COMPANY.email}`, { x: marginX, y: yL, size: 9, font: regular, color: gray }); yL -= 12;

  let yR = y;
  page.drawText(userName, { x: col2X, y: yR, size: 10.5, font: bold, color: dark }); yR -= 13;
  page.drawText(`Email: ${userEmail}`, { x: col2X, y: yR, size: 9, font: regular, color: gray }); yR -= 12;
  page.drawText('Address: Not Available', { x: col2X, y: yR, size: 9, font: regular, color: gray }); yR -= 12;
  page.drawText('GSTIN: Not Applicable (Individual / Unregistered)', { x: col2X, y: yR, size: 9, font: regular, color: gray }); yR -= 12;

  y = Math.min(yL, yR) - 16;
  page.drawLine({ start: { x: marginX, y }, end: { x: rightX, y }, thickness: 0.75, color: border });
  y -= 22;

  // SERVICE DESCRIPTION
  page.drawText('SERVICE DESCRIPTION', { x: marginX, y, size: 9, font: bold, color: gray });
  y -= 16;

  const svcRows = [
    ['Issuing Organisation:', companyName || '—'],
    ['Program Type:', PROGRAM_TYPE_LABEL[programType] || 'Program'],
    ['Batch Duration:', `${fmtDate(startDate)} – ${fmtDate(endDate)}`],
    ['Participant Status:', isIssued ? 'Certificate Issued' : 'Enrolled'],
    ['Certificate Delivery Date:', fmtDate(certificateDeliveryDate || endDate)],
  ];
  const labelW = 150;
  for (const [label, val] of svcRows) {
    page.drawText(label, { x: marginX, y, size: 9.5, font: bold, color: dark });
    page.drawText(String(val), { x: marginX + labelW, y, size: 9.5, font: regular, color: dark });
    y -= 15;
  }
  page.drawText('Delivery Tracking:', { x: marginX, y, size: 9.5, font: bold, color: dark });
  y -= 14;
  const trackingText = 'Participants may log in to the Validstep web application (validstep.com) using their registered email ID to view real-time enrollment status and track the progress of certificate delivery.';
  for (const line of wrapText(trackingText, regular, 9, width - marginX * 2)) {
    page.drawText(line, { x: marginX, y, size: 9, font: regular, color: gray });
    y -= 12;
  }

  y -= 12;

  // Item table
  const tableW = width - marginX * 2;
  const qtyColX = marginX + tableW - 140;
  const amtColX = marginX + tableW - 10;

  page.drawRectangle({ x: marginX, y: y - 6, width: tableW, height: 22, color: light });
  page.drawText('DESCRIPTION', { x: marginX + 10, y, size: 8.5, font: bold, color: gray });
  page.drawText('QTY', { x: qtyColX, y, size: 8.5, font: bold, color: gray });
  rightAlign(page, 'AMOUNT (INR)', amtColX, y, 8.5, bold, gray);
  y -= 26;

  const descText = 'Validstep SaaS Platform Fee – Participant Enrollment, Digital Certificate Infrastructure, Certificate Management & Public Verification Services';
  const descLines = wrapText(descText, regular, 9.5, qtyColX - marginX - 20);
  for (const line of descLines) {
    page.drawText(line, { x: marginX + 10, y, size: 9.5, font: regular, color: dark });
    y -= 13;
  }
  const rowTopY = y + descLines.length * 13 - 3;
  page.drawText('1', { x: qtyColX, y: rowTopY, size: 9.5, font: regular, color: dark });
  const amountStr = `Rs. ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  rightAlign(page, amountStr, amtColX, rowTopY, 9.5, regular, dark);

  y -= 10;
  page.drawLine({ start: { x: marginX, y }, end: { x: rightX, y }, thickness: 0.5, color: border });
  y -= 16;

  if (gstApplicable) {
    const { taxable, gst } = splitGstInclusive(Number(amount));
    page.drawText('Subtotal', { x: qtyColX, y, size: 9.5, font: regular, color: dark });
    rightAlign(page, `Rs. ${taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, amtColX, y, 9.5, regular, dark);
    y -= 15;
    page.drawText('GST (18%, included)', { x: qtyColX, y, size: 9.5, font: regular, color: dark });
    rightAlign(page, `Rs. ${gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, amtColX, y, 9.5, regular, dark);
    y -= 15;
  } else {
    page.drawText('Subtotal', { x: qtyColX, y, size: 9.5, font: regular, color: dark });
    rightAlign(page, amountStr, amtColX, y, 9.5, regular, dark);
    y -= 15;
    page.drawText('GST', { x: qtyColX, y, size: 9.5, font: regular, color: dark });
    rightAlign(page, 'Not Applicable', amtColX, y, 9.5, regular, dark);
    y -= 15;
  }
  page.drawLine({ start: { x: qtyColX - 10, y: y + 4 }, end: { x: rightX, y: y + 4 }, thickness: 0.5, color: border });
  y -= 4;
  page.drawText('Total Amount Paid', { x: qtyColX, y, size: 10, font: bold, color: dark });
  rightAlign(page, amountStr, amtColX, y, 10, bold, dark);
  y -= 30;

  // PAYMENT INFORMATION — omitted entirely for manual/comp enrollments (no real payment to describe)
  if (!isManualEnrollment) {
    page.drawText('PAYMENT INFORMATION', { x: marginX, y, size: 9, font: bold, color: gray });
    y -= 18;
    page.drawRectangle({ x: marginX, y: y - 34, width: tableW, height: 50, color: light, borderRadius: 4 });
    page.drawText(`PayU Transaction ID: ${txnId || '—'}`, { x: marginX + 12, y: y - 10, size: 9.5, font: regular, color: dark });
    page.drawText(`Payment Date & Time: ${fmtDateTime(paidAt)}`, { x: marginX + 12, y: y - 26, size: 9.5, font: regular, color: dark });
    y -= 50;
  }

  y -= 20;
  rightAlign(page, 'For BOLD INDIA PLATFORMS PRIVATE LIMITED', rightX, y, 9.5, bold, dark);
  y -= 26;
  rightAlign(page, 'Authorized Signatory', rightX, y, 9.5, regular, gray);

  // Footer
  const footerY = 56;
  page.drawLine({ start: { x: marginX, y: footerY + 24 }, end: { x: rightX, y: footerY + 24 }, thickness: 0.5, color: border });
  const disclaimer = 'This is a computer-generated invoice and does not require a physical signature. For queries, contact hello@validstep.com or hello@boldindia.in.';
  const disclaimerLines = wrapText(disclaimer, regular, 8, width - marginX * 2);
  let fy = footerY + 10;
  for (const line of disclaimerLines) {
    const w = regular.widthOfTextAtSize(line, 8);
    page.drawText(line, { x: (width - w) / 2, y: fy, size: 8, font: regular, color: gray });
    fy -= 11;
  }
  const footerLine = `Bold India Platforms Private Limited · CIN ${COMPANY.cin} · www.boldindia.in · www.validstep.com`;
  const flw = regular.widthOfTextAtSize(footerLine, 7.5);
  page.drawText(footerLine, { x: (width - flw) / 2, y: fy - 4, size: 7.5, font: regular, color: gray });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generateInvoicePDF };
