'use strict';

const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const QRCode = require('qrcode');
const https = require('https');
const http = require('http');
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

module.exports = { generateCertificate };
