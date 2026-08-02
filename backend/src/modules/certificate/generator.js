'use strict';

const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const QRCode = require('qrcode');
const https = require('https');
const http = require('http');
const sharp = require('sharp');
const env = require('../../config/env');

/**
 * Convert hex color to pdf-lib rgb
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return rgb(0, 0, 0);
  return rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  );
}

/**
 * Generate QR code as PNG data URL
 */
async function generateQRCode(text) {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 120,
    });
    return dataUrl;
  } catch (err) {
    return null;
  }
}

/**
 * Draw centered text on a PDF page
 */
function drawCenteredText(page, text, font, fontSize, y, color, pageWidth) {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const x = (pageWidth - textWidth) / 2;
  page.drawText(text, { x, y, size: fontSize, font, color });
  return textWidth;
}

/**
 * Truncate text to fit within max width
 */
function truncateText(text, font, fontSize, maxWidth) {
  let truncated = text;
  while (font.widthOfTextAtSize(truncated, fontSize) > maxWidth && truncated.length > 3) {
    truncated = truncated.slice(0, -1);
  }
  if (truncated !== text) truncated = truncated.slice(0, -3) + '...';
  return truncated;
}

/**
 * Format date to readable string
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * CLASSIC Template: A4 landscape, colored header bar, formal layout
 */
async function generateClassicTemplate(data, template) {
  const { userName, companyName, role, batchName, startDate, endDate, certificateSerial, programType, verificationHash, companyLogoUrl } = data;
  const { background_color, accent_color, custom_text } = template;

  const pdfDoc = await PDFDocument.create();
  // A4 landscape: 841.89 x 595.28 points
  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const bgColor = hexToRgb(background_color || '#FFFFFF');
  const accentColor = hexToRgb(accent_color || '#1a237e');
  const goldColor = rgb(0.8, 0.65, 0.12);
  const darkColor = rgb(0.1, 0.1, 0.1);
  const grayColor = rgb(0.5, 0.5, 0.5);

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: bgColor });

  // Top header bar
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: accentColor });

  // Bottom footer bar
  page.drawRectangle({ x: 0, y: 0, width, height: 50, color: accentColor });

  // Decorative border inside
  page.drawRectangle({
    x: 20,
    y: 60,
    width: width - 40,
    height: height - 120,
    borderColor: goldColor,
    borderWidth: 2,
    opacity: 0,
  });

  // Company name in header
  const companyDisplayName = truncateText(companyName.toUpperCase(), helveticaBold, 22, width - 100);
  drawCenteredText(page, companyDisplayName, helveticaBold, 22, height - 50, rgb(1, 1, 1), width);

  // Subtitle in header
  drawCenteredText(page, 'CERTIFICATE OF ACHIEVEMENT', helvetica, 11, height - 72, rgb(0.9, 0.85, 0.7), width);

  // "Certificate of" text
  const certTypeLabel = programType === 'INTERNSHIP'
    ? 'Certificate of Internship / Fellowship'
    : programType === 'COURSE'
    ? 'Certificate of Completion'
    : programType === 'HACKATHON'
    ? 'Certificate of Achievement'
    : 'Certificate of Participation';

  drawCenteredText(page, certTypeLabel, timesBold, 30, height - 150, accentColor, width);

  // Decorative line
  const lineY = height - 170;
  page.drawLine({
    start: { x: width / 2 - 120, y: lineY },
    end: { x: width / 2 + 120, y: lineY },
    thickness: 1.5,
    color: goldColor,
  });

  // "This is to certify that"
  drawCenteredText(page, 'This is to certify that', helveticaOblique, 14, height - 205, grayColor, width);

  // User name (large and bold)
  const userNameDisplay = truncateText(userName, timesBold, 38, width - 100);
  drawCenteredText(page, userNameDisplay, timesBold, 38, height - 255, darkColor, width);

  // Underline for name
  const nameWidth = timesBold.widthOfTextAtSize(userNameDisplay, 38);
  page.drawLine({
    start: { x: (width - nameWidth) / 2, y: height - 260 },
    end: { x: (width + nameWidth) / 2, y: height - 260 },
    thickness: 1,
    color: accentColor,
  });

  // "has successfully completed"
  drawCenteredText(page, 'has successfully completed', helvetica, 14, height - 290, grayColor, width);

  // Role / Program name
  let programLine = batchName;
  if (role && programType === 'INTERNSHIP') {
    programLine = `${role} Internship / Fellowship Program`;
  } else if (programType === 'COURSE') {
    programLine = `${batchName} Course`;
  }
  const programDisplay = truncateText(programLine, helveticaBold, 18, width - 100);
  drawCenteredText(page, programDisplay, helveticaBold, 18, height - 320, accentColor, width);

  // At company
  drawCenteredText(page, `at ${companyName}`, helvetica, 14, height - 348, grayColor, width);

  // Dates
  const dateStr = `from ${formatDate(startDate)} to ${formatDate(endDate)}`;
  drawCenteredText(page, dateStr, helvetica, 12, height - 375, grayColor, width);

  // Custom text if provided
  if (custom_text) {
    const customDisplay = truncateText(custom_text, helveticaOblique, 11, width - 200);
    drawCenteredText(page, customDisplay, helveticaOblique, 11, height - 400, grayColor, width);
  }

  // Certificate serial (bottom left)
  page.drawText(`Certificate ID: ${certificateSerial}`, {
    x: 35,
    y: 22,
    size: 9,
    font: helvetica,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Verification info (bottom right)
  const verifyText = `Verify: ${env.FRONTEND_URL}/verify/${verificationHash}`;
  const verifyWidth = helvetica.widthOfTextAtSize(verifyText, 7);
  page.drawText(verifyText, {
    x: width - verifyWidth - 35,
    y: 22,
    size: 7,
    font: helvetica,
    color: rgb(0.85, 0.85, 0.85),
  });

  // QR Code
  const verifyUrl = `${env.FRONTEND_URL}/verify/${verificationHash}`;
  const qrDataUrl = await generateQRCode(verifyUrl);
  if (qrDataUrl) {
    const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    page.drawImage(qrImage, { x: width - 120, y: 60, width: 80, height: 80 });
    page.drawText('Scan to verify', {
      x: width - 118,
      y: 56,
      size: 7,
      font: helvetica,
      color: grayColor,
    });
  }

  // Issued date (bottom left above footer bar)
  page.drawText(`Issued on: ${formatDate(new Date())}`, {
    x: 35,
    y: 57,
    size: 9,
    font: helvetica,
    color: grayColor,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * MODERN Template: Bold colors, two-tone layout, modern design
 */
async function generateModernTemplate(data, template) {
  const { userName, companyName, role, batchName, startDate, endDate, certificateSerial, programType, verificationHash } = data;
  const { background_color, accent_color, custom_text } = template;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const bgColor = hexToRgb(background_color || '#F8F9FA');
  const accentColor = hexToRgb(accent_color || '#00BCD4');
  const darkColor = rgb(0.1, 0.1, 0.2);
  const lightAccent = rgb(0.95, 0.98, 1.0);

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Full background
  page.drawRectangle({ x: 0, y: 0, width, height, color: bgColor });

  // Left colored panel
  page.drawRectangle({ x: 0, y: 0, width: 220, height, color: accentColor });

  // Decorative circles on left panel
  page.drawCircle({ x: 110, y: height - 80, size: 60, color: rgb(1, 1, 1, 0.1) });
  page.drawCircle({ x: 110, y: 80, size: 40, color: rgb(1, 1, 1, 0.08) });

  // Company name on left panel (vertical text workaround - horizontal on left panel)
  page.drawText('CERTIFICATE', {
    x: 20,
    y: height / 2 + 80,
    size: 14,
    font: helveticaBold,
    color: rgb(1, 1, 1, 0.6),
    rotate: degrees(90),
  });

  // Company name at top of left panel
  const compShort = truncateText(companyName, helveticaBold, 13, 180);
  drawCenteredText(page, compShort, helveticaBold, 13, height - 40, rgb(1, 1, 1), 220);

  // Vertical text label
  page.drawText('OF ACHIEVEMENT', {
    x: 35,
    y: height / 2 - 20,
    size: 11,
    font: helvetica,
    color: rgb(1, 1, 1, 0.5),
    rotate: degrees(90),
  });

  // Main content area (right of left panel)
  const contentX = 240;
  const contentWidth = width - contentX - 30;

  // Program type heading
  const programTypeLabel = programType === 'INTERNSHIP'
    ? 'INTERNSHIP / FELLOWSHIP CERTIFICATE'
    : programType === 'COURSE'
    ? 'COMPLETION CERTIFICATE'
    : programType === 'HACKATHON'
    ? 'HACKATHON CERTIFICATE'
    : 'PARTICIPATION CERTIFICATE';

  page.drawText(programTypeLabel, {
    x: contentX,
    y: height - 80,
    size: 13,
    font: helveticaBold,
    color: accentColor,
  });

  // Decorative line
  page.drawLine({
    start: { x: contentX, y: height - 90 },
    end: { x: contentX + 200, y: height - 90 },
    thickness: 2,
    color: accentColor,
  });

  // "This certifies that"
  page.drawText('This certifies that', {
    x: contentX,
    y: height - 140,
    size: 14,
    font: helveticaOblique,
    color: rgb(0.4, 0.4, 0.5),
  });

  // User name
  const userNameDisplay = truncateText(userName, timesBold, 42, contentWidth);
  page.drawText(userNameDisplay, {
    x: contentX,
    y: height - 200,
    size: 42,
    font: timesBold,
    color: darkColor,
  });

  // Name underline
  const nameWidth2 = timesBold.widthOfTextAtSize(userNameDisplay, 42);
  page.drawLine({
    start: { x: contentX, y: height - 207 },
    end: { x: contentX + nameWidth2, y: height - 207 },
    thickness: 2,
    color: accentColor,
  });

  // "has successfully completed"
  page.drawText('has successfully completed', {
    x: contentX,
    y: height - 240,
    size: 13,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.5),
  });

  // Program/role
  let programLine2 = batchName;
  if (role && programType === 'INTERNSHIP') {
    programLine2 = `${role} Internship / Fellowship at ${companyName}`;
  }
  const progDisplay = truncateText(programLine2, helveticaBold, 16, contentWidth);
  page.drawText(progDisplay, {
    x: contentX,
    y: height - 270,
    size: 16,
    font: helveticaBold,
    color: darkColor,
  });

  // Duration
  page.drawText(`Duration: ${formatDate(startDate)} – ${formatDate(endDate)}`, {
    x: contentX,
    y: height - 300,
    size: 11,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.6),
  });

  // Custom text
  if (custom_text) {
    page.drawText(truncateText(custom_text, helveticaOblique, 10, contentWidth), {
      x: contentX,
      y: height - 325,
      size: 10,
      font: helveticaOblique,
      color: rgb(0.5, 0.5, 0.6),
    });
  }

  // Divider line
  page.drawLine({
    start: { x: contentX, y: height - 360 },
    end: { x: width - 30, y: height - 360 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.85),
  });

  // Certificate ID
  page.drawText(`Certificate ID: ${certificateSerial}`, {
    x: contentX,
    y: height - 380,
    size: 10,
    font: helveticaBold,
    color: darkColor,
  });

  // Issued date
  page.drawText(`Issued: ${formatDate(new Date())}`, {
    x: contentX,
    y: height - 398,
    size: 10,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.6),
  });

  // Verify URL
  page.drawText(`Verify at: ${env.FRONTEND_URL}/verify/${verificationHash}`, {
    x: contentX,
    y: height - 416,
    size: 8,
    font: helvetica,
    color: accentColor,
  });

  // QR Code
  const verifyUrl = `${env.FRONTEND_URL}/verify/${verificationHash}`;
  const qrDataUrl = await generateQRCode(verifyUrl);
  if (qrDataUrl) {
    const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    page.drawImage(qrImage, { x: width - 110, y: height - 450, width: 80, height: 80 });
    page.drawText('Scan to verify', {
      x: width - 108,
      y: height - 458,
      size: 7,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.6),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * MINIMAL Template: Clean, minimal white design
 */
async function generateMinimalTemplate(data, template) {
  const { userName, companyName, role, batchName, startDate, endDate, certificateSerial, programType, verificationHash } = data;
  const { background_color, accent_color, custom_text } = template;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const bgColor = hexToRgb(background_color || '#FFFFFF');
  const accentColor = hexToRgb(accent_color || '#2E7D32');
  const darkColor = rgb(0.08, 0.08, 0.08);
  const lightGray = rgb(0.6, 0.6, 0.6);
  const paleAccent = hexToRgb(accent_color || '#2E7D32');

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // White background
  page.drawRectangle({ x: 0, y: 0, width, height, color: bgColor });

  // Thin colored border
  const borderPadding = 25;
  page.drawRectangle({
    x: borderPadding,
    y: borderPadding,
    width: width - borderPadding * 2,
    height: height - borderPadding * 2,
    borderColor: accentColor,
    borderWidth: 1.5,
    opacity: 0,
  });

  // Inner border (double border effect)
  page.drawRectangle({
    x: borderPadding + 5,
    y: borderPadding + 5,
    width: width - (borderPadding + 5) * 2,
    height: height - (borderPadding + 5) * 2,
    borderColor: accentColor,
    borderWidth: 0.5,
    opacity: 0,
  });

  // Top accent bar (thin)
  page.drawRectangle({
    x: borderPadding + 5,
    y: height - borderPadding - 5,
    width: width - (borderPadding + 5) * 2,
    height: 3,
    color: accentColor,
  });

  // Bottom accent bar
  page.drawRectangle({
    x: borderPadding + 5,
    y: borderPadding + 5,
    width: width - (borderPadding + 5) * 2,
    height: 3,
    color: accentColor,
  });

  const centerX = width / 2;

  // Company name
  const compDisplay = truncateText(companyName.toUpperCase(), helveticaBold, 14, width - 100);
  drawCenteredText(page, compDisplay, helveticaBold, 14, height - 80, accentColor, width);

  // Thin line
  page.drawLine({
    start: { x: centerX - 80, y: height - 92 },
    end: { x: centerX + 80, y: height - 92 },
    thickness: 0.5,
    color: accentColor,
  });

  // Certificate title
  const certTitle = programType === 'INTERNSHIP'
    ? 'Certificate of Internship / Fellowship'
    : programType === 'COURSE'
    ? 'Certificate of Completion'
    : programType === 'HACKATHON'
    ? 'Certificate of Achievement'
    : 'Certificate of Participation';

  drawCenteredText(page, certTitle, timesItalic, 26, height - 150, darkColor, width);

  // "Presented to"
  drawCenteredText(page, 'presented to', helveticaOblique, 12, height - 195, lightGray, width);

  // User name
  const userNameDisp = truncateText(userName, timesBold, 44, width - 100);
  drawCenteredText(page, userNameDisp, timesBold, 44, height - 255, darkColor, width);

  // Fine line under name
  const nameW = timesBold.widthOfTextAtSize(userNameDisp, 44);
  page.drawLine({
    start: { x: centerX - nameW / 2, y: height - 262 },
    end: { x: centerX + nameW / 2, y: height - 262 },
    thickness: 0.5,
    color: lightGray,
  });

  // Description text
  let descriptionLine = '';
  if (programType === 'INTERNSHIP') {
    descriptionLine = `for successfully completing the ${role || 'Internship / Fellowship'} program at ${companyName}`;
  } else if (programType === 'COURSE') {
    descriptionLine = `for successfully completing ${batchName}`;
  } else if (programType === 'HACKATHON') {
    descriptionLine = `for outstanding participation in ${batchName}`;
  } else {
    descriptionLine = `for participation in ${batchName}`;
  }
  const descDisplay = truncateText(descriptionLine, helvetica, 13, width - 120);
  drawCenteredText(page, descDisplay, helvetica, 13, height - 300, lightGray, width);

  // Duration
  const durText = `${formatDate(startDate)} – ${formatDate(endDate)}`;
  drawCenteredText(page, durText, helvetica, 11, height - 325, lightGray, width);

  // Custom text
  if (custom_text) {
    const ctDisplay = truncateText(custom_text, helveticaOblique, 10, width - 120);
    drawCenteredText(page, ctDisplay, helveticaOblique, 10, height - 350, lightGray, width);
  }

  // Bottom section
  // Certificate ID (left)
  page.drawText(`ID: ${certificateSerial}`, {
    x: 50,
    y: 55,
    size: 9,
    font: helvetica,
    color: lightGray,
  });

  // Issued date (center)
  const issuedText = `Issued ${formatDate(new Date())}`;
  drawCenteredText(page, issuedText, helvetica, 9, 55, lightGray, width);

  // Verify text
  const verifyUrlText = `${env.FRONTEND_URL}/verify/${verificationHash}`;
  const verifyTextWidth = helvetica.widthOfTextAtSize(verifyUrlText, 7);
  page.drawText(verifyUrlText, {
    x: width - verifyTextWidth - 50,
    y: 55,
    size: 7,
    font: helvetica,
    color: accentColor,
  });

  // QR Code (small, right side)
  const verifyUrl = `${env.FRONTEND_URL}/verify/${verificationHash}`;
  const qrDataUrl = await generateQRCode(verifyUrl);
  if (qrDataUrl) {
    const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    page.drawImage(qrImage, { x: width - 105, y: 68, width: 70, height: 70 });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Fetch remote URL as Buffer (for loading uploaded background images)
 */
function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

const DEFAULT_LAYOUT = {
  companyName: { x: 50, y: 20, fontSize: 22, color: '#1a237e', align: 'center', bold: true, visible: true },
  programType: { x: 50, y: 30, fontSize: 14, color: '#555555', align: 'center', bold: false, visible: true },
  subtitle:    { x: 50, y: 42, fontSize: 11, color: '#777777', align: 'center', bold: false, visible: true },
  name:        { x: 50, y: 55, fontSize: 38, color: '#111111', align: 'center', bold: true,  visible: true },
  dates:       { x: 50, y: 67, fontSize: 13, color: '#444444', align: 'center', bold: false, visible: true },
  serial:      { x: 8,  y: 91, fontSize: 9,  color: '#888888', align: 'left',   bold: false, visible: true },
  verification:{ x: 50, y: 94, fontSize: 8,  color: '#999999', align: 'center', bold: false, visible: true },
  qrCode:      { x: 90, y: 82, size: 70, visible: true },
  logo:        { x: 50, y: 10, width: 80, height: 50, visible: false },
};

/**
 * CUSTOM Template: JPG/PNG background + configurable element positions
 */
async function generateCustomTemplate(data, template) {
  const { userName, companyName, role, batchName, startDate, endDate,
          certificateSerial, programType, verificationHash, companyLogoUrl } = data;
  const { background_image_url, layout_config, custom_text } = template;

  const layout = { ...DEFAULT_LAYOUT };
  if (layout_config && typeof layout_config === 'object') {
    for (const [key, val] of Object.entries(layout_config)) {
      layout[key] = { ...layout[key], ...val };
    }
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const helvetica      = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold  = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Background image
  if (background_image_url) {
    try {
      const imgBytes = await fetchBuffer(background_image_url);
      let bgImage;
      const lc = background_image_url.toLowerCase();
      if (lc.endsWith('.png') || lc.includes('png')) {
        bgImage = await pdfDoc.embedPng(imgBytes);
      } else {
        bgImage = await pdfDoc.embedJpg(imgBytes);
      }
      page.drawImage(bgImage, { x: 0, y: 0, width, height });
    } catch (e) {
      console.warn('[Generator] Background image load failed:', e.message);
      page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    }
  } else {
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  }

  // Helper: resolve position (x/y as % of page, origin PDF bottom-left)
  const px  = (pct) => (pct / 100) * width;
  const py  = (pct) => height - (pct / 100) * height;

  function drawEl(el, text, opts = {}) {
    if (!el?.visible || !text) return;
    const font  = el.bold ? helveticaBold : helvetica;
    const size  = el.fontSize || 12;
    const color = hexToRgb(el.color || '#000000');
    const xPos  = px(el.x);
    const yPos  = py(el.y);

    let drawX = xPos;
    const textW = font.widthOfTextAtSize(text, size);
    if (el.align === 'center') drawX = xPos - textW / 2;
    else if (el.align === 'right') drawX = xPos - textW;

    page.drawText(text, { x: Math.max(0, drawX), y: yPos, size, font, color, ...opts });
  }

  const programLabel = {
    INTERNSHIP: 'Certificate of Internship',
    COURSE: 'Certificate of Completion',
    PARTICIPATION: 'Certificate of Participation',
    HACKATHON: 'Certificate of Achievement',
    OTHER: 'Certificate',
  }[programType] || 'Certificate';

  const roleText = role ? `${programLabel} — ${role}` : programLabel;
  const datesText = `${formatDate(startDate)} — ${formatDate(endDate)}`;
  const verifyUrl = `${env.FRONTEND_URL}/verify/${verificationHash}`;

  drawEl(layout.companyName, companyName);
  drawEl(layout.programType, roleText);
  drawEl(layout.subtitle, 'This is to certify that');
  drawEl(layout.name, truncateText(userName, layout.name.bold ? helveticaBold : helvetica, layout.name.fontSize || 38, width * 0.7));
  drawEl(layout.dates, datesText);
  if (custom_text) drawEl({ ...layout.dates, y: (layout.dates?.y || 67) + 7, fontSize: 11 }, custom_text);
  drawEl(layout.serial, `Certificate ID: ${certificateSerial}`);
  drawEl(layout.verification, `Verify: ${verifyUrl}`);

  // Company logo
  if (layout.logo?.visible && companyLogoUrl) {
    try {
      const logoBytes = await fetchBuffer(companyLogoUrl);
      const logoImg = await pdfDoc.embedJpg(logoBytes).catch(() => pdfDoc.embedPng(logoBytes));
      const lW = ((layout.logo.width || 80) / 100) * width * 0.3;
      const lH = ((layout.logo.height || 50) / 100) * height * 0.3;
      page.drawImage(logoImg, {
        x: px(layout.logo.x) - lW / 2,
        y: py(layout.logo.y) - lH / 2,
        width: lW,
        height: lH,
      });
    } catch { /* skip logo on error */ }
  }

  // QR Code
  const qr = layout.qrCode;
  if (qr?.visible) {
    const qrDataUrl = await generateQRCode(verifyUrl);
    if (qrDataUrl) {
      const qrSize = qr.size || 70;
      const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      const qrImage = await pdfDoc.embedPng(qrBytes);
      page.drawImage(qrImage, {
        x: px(qr.x) - qrSize / 2,
        y: py(qr.y) - qrSize / 2,
        width: qrSize,
        height: qrSize,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

const BADGE_TEXT = 'Securely Issued & Verified via Validstep';

function escapeXml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// The org's own green-verify badge glyph (14x14 viewBox: scalloped seal + checkmark),
// taken directly from greenverify.svg — used as-is for the checkmark stamped on certificates.
const GREEN_VERIFY_BADGE_PATH = 'M13.5094 6.37968C13.7969 6.74324 13.7969 7.25676 13.5094 7.62032L12.8223 8.48909C12.6763 8.67375 12.6001 8.90401 12.6071 9.13934L12.64 10.2387C12.6537 10.6963 12.355 11.1047 11.9148 11.2303L10.7996 11.5484C10.5783 11.6115 10.3855 11.7491 10.2539 11.9377L9.59794 12.8776C9.34115 13.2455 8.8707 13.3974 8.44724 13.249L7.33066 12.8578C7.1166 12.7828 6.8834 12.7828 6.66934 12.8578L5.55277 13.249C5.1293 13.3974 4.65886 13.2455 4.40206 12.8776L3.74615 11.9377C3.61446 11.7491 3.42173 11.6116 3.20045 11.5484L2.08521 11.2303C1.64502 11.1047 1.3463 10.6963 1.36 10.2387L1.3929 9.13934C1.39995 8.90402 1.32374 8.67376 1.1777 8.4891L0.490601 7.62032C0.203063 7.25676 0.203063 6.74324 0.490602 6.37968L1.1777 5.51091C1.32374 5.32625 1.39995 5.09599 1.3929 4.86066L1.36 3.76129C1.3463 3.30375 1.64502 2.89532 2.08521 2.76974L3.20045 2.45158C3.42172 2.38845 3.61446 2.25095 3.74615 2.06225L4.40206 1.12242C4.65885 0.754469 5.12929 0.60261 5.55276 0.750978L6.66934 1.14219C6.8834 1.21719 7.1166 1.21719 7.33066 1.14219L8.44723 0.750977C8.87069 0.602608 9.34114 0.754465 9.59794 1.12242L10.2538 2.06225C10.3855 2.25095 10.5783 2.38845 10.7995 2.45158L11.9148 2.76974C12.355 2.89532 12.6537 3.30375 12.64 3.76129L12.6071 4.86066C12.6001 5.09598 12.6763 5.32624 12.8223 5.5109L13.5094 6.37968Z';
const GREEN_VERIFY_CHECK_PATH = 'M9.88665 5.18556L5.93153 9.44103L4.11328 7.62278';

function greenVerifyBadgeSvg(x, y, size) {
  const scale = size / 14;
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="${GREEN_VERIFY_BADGE_PATH}" fill="#47B749"/>
    <path d="${GREEN_VERIFY_CHECK_PATH}" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>`;
}

/**
 * Overlays the Validstep verification badge (checkmark + brand text + short
 * verify URL + open-link glyph) onto a raster certificate image, preserving the
 * original format (JPG stays JPG, PNG stays PNG) — an admin-uploaded certificate
 * should read as "the same file, just stamped", not a converted document.
 */
// Every uploaded certificate is normalized to this width before the badge is drawn — designs
// arrive at wildly different resolutions (phone photos, Canva exports, scans), and without a
// fixed baseline the badge either engulfs a small image or reads as illegibly tiny on a large
// one. Pinning the width also means every issued certificate ends up at the same scale.
const TARGET_WIDTH = 2000;

// Baseline sizing at scale=100 — tuned to read like a footer wordmark/logo (e.g. "#startupindia"),
// not a watermark and not a headline.
const BASE_FONT_SIZE = 21;
const BASE_SMALL_FONT_SIZE = 14;
const BASE_CIRCLE_R = 15;

function clampBadgeParams({ x = 3, y = 96, scale = 100 }) {
  return {
    x: Math.min(97, Math.max(0, Number.isFinite(x) ? x : 3)),
    y: Math.min(100, Math.max(3, Number.isFinite(y) ? y : 96)),
    scale: Math.min(200, Math.max(40, Number.isFinite(scale) ? scale : 100)) / 100,
  };
}

// Real font-metric measurement (Helvetica is metric-compatible with the Arial/Helvetica
// stack the SVG badge text renders in) instead of a per-character-count guess — the guess
// consistently overshot, leaving visible empty space in the badge's white pill after the
// text. Fonts are embedded once and reused across every badge render.
let measureFontsPromise = null;
async function getMeasureFonts() {
  if (!measureFontsPromise) {
    measureFontsPromise = (async () => {
      const doc = await PDFDocument.create();
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      const regular = await doc.embedFont(StandardFonts.Helvetica);
      return { bold, regular };
    })();
  }
  return measureFontsPromise;
}

async function embedBadgeOnImage(buffer, mimeType, { verificationCode, frontendUrl, x, y, scale }) {
  let image = sharp(buffer);
  const meta = await image.metadata();
  if (meta.width !== TARGET_WIDTH) {
    image = image.resize({ width: TARGET_WIDTH });
  }
  const width = TARGET_WIDTH;
  const height = Math.round((meta.height / meta.width) * TARGET_WIDTH);

  const { x: clampedX, y: clampedY, scale: clampedScale } = clampBadgeParams({ x, y, scale });

  const verifyUrl = `URL : ${frontendUrl}/verify/${verificationCode}`;
  const fontSize = BASE_FONT_SIZE * clampedScale;
  const smallFontSize = BASE_SMALL_FONT_SIZE * clampedScale;
  const circleR = BASE_CIRCLE_R * clampedScale;
  const padX = 14 * clampedScale;
  const padY = 13 * clampedScale;
  const bandHeight = circleR * 2 + padY * 2;
  const { bold: measureBold } = await getMeasureFonts();
  const textBlockWidth = Math.round(Math.max(
    measureBold.widthOfTextAtSize(BADGE_TEXT, fontSize),
    measureBold.widthOfTextAtSize(verifyUrl, smallFontSize)
  ));
  // Band hugs its actual content — margin, circle, gap, text block, margin — with no
  // trailing slack (there's no open-link icon to reserve space for anymore).
  const bandWidth = Math.min(width - 16, circleR * 2 + padX * 3 + textBlockWidth + 2);

  // x% = badge's left edge from the left; y% = badge's vertical center from the top —
  // same convention as the ElementRow/CertPreview layout editor elsewhere in this app.
  const rawBandX = Math.round((clampedX / 100) * width);
  const rawBandCenterY = Math.round((clampedY / 100) * height);
  const rawBandY = rawBandCenterY - bandHeight / 2;
  const bandX = Math.min(Math.max(rawBandX, 8), width - bandWidth - 8);
  const bandY = Math.min(Math.max(rawBandY, 8), height - bandHeight - 8);

  const circleCx = bandX + padX + circleR;
  const circleCy = bandY + bandHeight / 2;
  const textX = circleCx + circleR + padX;

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${bandX}" y="${bandY}" width="${bandWidth}" height="${bandHeight}" rx="${bandHeight / 2}"
        fill="rgba(255,255,255,0.95)" stroke="rgba(15,23,42,0.10)" stroke-width="2"/>
  ${greenVerifyBadgeSvg(circleCx - circleR, circleCy - circleR, circleR * 2)}
  <text x="${textX}" y="${circleCy - fontSize * 0.15}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#1e293b">${escapeXml(BADGE_TEXT)}</text>
  <text x="${textX}" y="${circleCy + smallFontSize * 1.15}" font-family="Arial, Helvetica, sans-serif" font-size="${smallFontSize}" font-weight="600" fill="#475569">${escapeXml(verifyUrl)}</text>
</svg>`;

  const outputFormat = mimeType === 'image/png' ? 'png' : 'jpeg';
  return image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toFormat(outputFormat, outputFormat === 'jpeg' ? { quality: 92 } : {})
    .toBuffer();
}

// Baseline PDF badge sizing (points), same role as the image baseline constants above.
const BASE_CIRCLE_R_PDF = 16;
const BASE_FONT_SIZE_PDF = 15;
const BASE_SMALL_FONT_SIZE_PDF = 11;

/**
 * Overlays the same Validstep badge directly onto the last page of an existing
 * uploaded PDF (no new page added, no format change) — fallback path for
 * admins who upload a PDF instead of an image.
 */
async function embedBadgeOnPdf(buffer, { verificationCode, frontendUrl, x, y, scale }) {
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1];
  const { width: pageW, height: pageH } = page.getSize();

  const { x: clampedX, y: clampedY, scale: clampedScale } = clampBadgeParams({ x, y, scale });

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const verifyUrl = `URL : ${frontendUrl}/verify/${verificationCode}`;
  const circleR = BASE_CIRCLE_R_PDF * clampedScale;
  const fontSize = BASE_FONT_SIZE_PDF * clampedScale;
  const smallFontSize = BASE_SMALL_FONT_SIZE_PDF * clampedScale;

  // PDF's y-axis is bottom-up, so y% from the top must be inverted.
  const rawCircleY = pageH - (clampedY / 100) * pageH;
  const rawCircleX = (clampedX / 100) * pageW + circleR;
  const circleX = Math.min(Math.max(rawCircleX, circleR + 8), pageW - circleR - 8);
  const circleY = Math.min(Math.max(rawCircleY, circleR + 8), pageH - circleR - 8);

  // Same greenverify.svg glyph as the image path — drawn as two SVG paths (fill, then
  // stroke) since drawSvgPath composites one path per call. (x,y) is the anchor such that
  // the glyph's own center (7,7 in its 14x14 viewBox) lands exactly on (circleX, circleY).
  const badgeScale = (circleR * 2) / 14;
  const badgeAnchorX = circleX - 7 * badgeScale;
  const badgeAnchorY = circleY + 7 * badgeScale;
  page.drawSvgPath(GREEN_VERIFY_BADGE_PATH, { x: badgeAnchorX, y: badgeAnchorY, scale: badgeScale, color: rgb(0.278, 0.718, 0.290) });
  page.drawSvgPath(GREEN_VERIFY_CHECK_PATH, { x: badgeAnchorX, y: badgeAnchorY, scale: badgeScale, borderColor: rgb(1, 1, 1), borderWidth: 1.3 });

  const textX = circleX + circleR + 14 * clampedScale;
  page.drawText(BADGE_TEXT, { x: textX, y: circleY + circleR * 0.35, size: fontSize, font: helveticaBold, color: rgb(0.12, 0.16, 0.22) });
  page.drawText(verifyUrl, { x: textX, y: circleY - circleR * 0.55, size: smallFontSize, font: helvetica, color: rgb(0.28, 0.34, 0.42) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Main certificate generator - dispatch to correct template
 */
async function generateCertificate(data, template) {
  const templateType = template?.template_type || 'CLASSIC';

  switch (templateType) {
    case 'MODERN':
      return generateModernTemplate(data, template);
    case 'MINIMAL':
      return generateMinimalTemplate(data, template);
    case 'CUSTOM':
      return generateCustomTemplate(data, template);
    case 'CLASSIC':
    default:
      return generateClassicTemplate(data, template);
  }
}

module.exports = { generateCertificate, embedBadgeOnImage, embedBadgeOnPdf };
