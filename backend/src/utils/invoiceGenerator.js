'use strict';

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const env = require('../config/env');

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? rgb(parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255) : rgb(0, 0, 0);
}

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Generate invoice PDF for an order
 * data: { orderId, invoiceNumber, userName, userEmail, userPhone, companyName, batchName, programName, programType, role, startDate, endDate, certificateSerial, amount, currency, paidAt, txnId, issuedAt, verificationHash }
 */
async function generateInvoicePDF(data) {
  const {
    orderId, invoiceNumber, userName, userEmail, userPhone,
    companyName, batchName, programName, programType, role,
    startDate, endDate, certificateSerial, amount, currency,
    paidAt, txnId, verificationHash,
  } = data;

  const pdfDoc = await PDFDocument.create();
  // A4 portrait
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
  const green = hexToRgb('#16a34a');

  const marginX = 48;
  let y = height - 48;

  // Header background
  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: primary });

  // Logo / Brand
  page.drawText('Validstep.com', { x: marginX, y: height - 45, size: 20, font: bold, color: white });
  page.drawText('Digital Certificate Platform', { x: marginX, y: height - 65, size: 10, font: regular, color: rgb(0.8, 0.8, 1) });

  // INVOICE label (right)
  page.drawText('INVOICE', { x: width - marginX - 80, y: height - 42, size: 22, font: bold, color: white });
  const invNumW = regular.widthOfTextAtSize(invoiceNumber, 10);
  page.drawText(invoiceNumber, { x: width - marginX - invNumW, y: height - 60, size: 10, font: regular, color: rgb(0.8, 0.8, 1) });
  const dateStr = fmt(paidAt || new Date());
  const dateW = regular.widthOfTextAtSize(dateStr, 9);
  page.drawText(dateStr, { x: width - marginX - dateW, y: height - 76, size: 9, font: regular, color: rgb(0.75, 0.75, 0.95) });

  y = height - 130;

  // Status badge
  const isPaid = !!paidAt;
  const statusLabel = isPaid ? '✓  PAID' : 'PENDING';
  const statusColor = isPaid ? green : hexToRgb('#d97706');
  const statusBg = isPaid ? hexToRgb('#dcfce7') : hexToRgb('#fef3c7');
  page.drawRectangle({ x: marginX, y: y - 6, width: 80, height: 22, color: statusBg, borderRadius: 4 });
  page.drawText(statusLabel, { x: marginX + 10, y: y + 2, size: 11, font: bold, color: statusColor });

  y -= 36;

  // Bill to + Bill from columns
  const colW = (width - marginX * 2 - 20) / 2;

  // Bill To
  page.drawText('BILL TO', { x: marginX, y, size: 8, font: bold, color: gray });
  y -= 18;
  page.drawText(userName, { x: marginX, y, size: 13, font: bold, color: dark });
  y -= 16;
  page.drawText(userEmail, { x: marginX, y, size: 10, font: regular, color: gray });
  if (userPhone) { y -= 14; page.drawText(userPhone, { x: marginX, y, size: 10, font: regular, color: gray }); }

  // Bill From (right column)
  const col2X = marginX + colW + 20;
  let y2 = y + (userPhone ? 48 : 34);
  page.drawText('ISSUED BY', { x: col2X, y: y2, size: 8, font: bold, color: gray });
  y2 -= 18;
  page.drawText(companyName, { x: col2X, y: y2, size: 13, font: bold, color: dark });
  y2 -= 16;
  page.drawText('via Validstep.com Platform', { x: col2X, y: y2, size: 10, font: oblique, color: gray });

  y = Math.min(y, y2) - 32;

  // Divider
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: hexToRgb('#e2e8f0') });
  y -= 24;

  // --- Item table ---
  const tableW = width - marginX * 2;

  // Table header
  page.drawRectangle({ x: marginX, y: y - 4, width: tableW, height: 24, color: light });
  page.drawText('DESCRIPTION', { x: marginX + 10, y: y + 4, size: 9, font: bold, color: gray });
  page.drawText('SERIAL NO.', { x: marginX + tableW * 0.55, y: y + 4, size: 9, font: bold, color: gray });
  page.drawText('AMOUNT', { x: width - marginX - 60, y: y + 4, size: 9, font: bold, color: gray });
  y -= 30;

  // Item row
  const desc = `${programType === 'INTERNSHIP' ? 'Internship / Fellowship' : programType === 'COURSE' ? 'Course' : programType === 'HACKATHON' ? 'Hackathon' : programType === 'OTHER' ? 'Other' : 'Participation'} Certificate – ${batchName}`;
  page.drawText(desc.slice(0, 52), { x: marginX + 10, y, size: 10, font: regular, color: dark });
  if (role) { page.drawText(`Role: ${role}`, { x: marginX + 10, y: y - 14, size: 9, font: oblique, color: gray }); }
  page.drawText(certificateSerial, { x: marginX + tableW * 0.55, y, size: 10, font: regular, color: dark, fontFamily: 'monospace' });
  const amtStr = `${currency || 'INR'} ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const amtW = bold.widthOfTextAtSize(amtStr, 11);
  page.drawText(amtStr, { x: width - marginX - amtW, y, size: 11, font: bold, color: dark });

  y -= (role ? 46 : 30);

  // Divider
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: hexToRgb('#e2e8f0') });
  y -= 20;

  // Total row
  page.drawText('TOTAL PAID', { x: marginX + 10, y, size: 11, font: bold, color: dark });
  const totalW = bold.widthOfTextAtSize(amtStr, 14);
  page.drawText(amtStr, { x: width - marginX - totalW, y, size: 14, font: bold, color: primary });
  y -= 36;

  // Payment details box
  page.drawRectangle({ x: marginX, y: y - 72, width: tableW, height: 82, color: light, borderRadius: 6 });
  y -= 10;

  const details = [
    ['Transaction ID', txnId || '—'],
    ['Order ID', orderId],
    ['Program', `${programName} (${programType})`],
    ['Duration', `${fmtDate(startDate)} – ${fmtDate(endDate)}`],
    ['Payment Date', fmt(paidAt)],
  ];

  details.forEach(([label, val]) => {
    page.drawText(label + ':', { x: marginX + 12, y, size: 9, font: bold, color: gray });
    page.drawText(String(val).slice(0, 60), { x: marginX + 130, y, size: 9, font: regular, color: dark });
    y -= 14;
  });
  y -= 16;

  // Verification section
  if (verificationHash) {
    const verifyUrl = `${env.FRONTEND_URL}/verify/${verificationHash}`;
    page.drawRectangle({ x: marginX, y: y - 34, width: tableW, height: 44, color: hexToRgb('#eff6ff'), borderRadius: 6 });
    page.drawText('Certificate Verification Link:', { x: marginX + 12, y: y - 8, size: 9, font: bold, color: hexToRgb('#1d4ed8') });
    page.drawText(verifyUrl.slice(0, 70), { x: marginX + 12, y: y - 22, size: 8, font: regular, color: hexToRgb('#1d4ed8') });
    y -= 50;
  }

  y -= 20;

  // Footer note
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: hexToRgb('#e2e8f0') });
  y -= 18;
  page.drawText('This is a computer-generated invoice. No signature required.', { x: marginX, y, size: 9, font: oblique, color: gray });
  y -= 14;
  page.drawText(`Generated on ${fmt(new Date())} | ${env.FRONTEND_URL}`, { x: marginX, y, size: 8, font: regular, color: hexToRgb('#94a3b8') });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generateInvoicePDF };
