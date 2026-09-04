'use strict';

const XLSX = require('xlsx');
const { sanitizeDocId } = require('../../utils/docId');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toStr(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

// Column headers this module understands. Matched case-insensitively with whitespace
// collapsed, so "Delivered_Time", "delivered time" and "Delivered Time" all resolve.
const HEADER_ALIASES = {
  name: ['name', 'full name', 'fullname', 'student name', 'candidate name', 'intern name'],
  email: ['email', 'email id', 'emailid', 'e-mail', 'registered email', 'registered mail id'],
  offer_letter_id: ['id', 'offer letter id', 'offerletterid', 'offer id', 'certificate id', 'certificateid', 'doc id', 'docid'],
  duration: ['duration', 'internship duration', 'period'],
  issue_date_text: ['date', 'issue date', 'certificate date', 'issued on'],
  mail_address: ['mail address', 'mailaddress', 'mailing address', 'address'],
  mobile_no: ['mo no', 'mono', 'mobile', 'mobile no', 'mobile number', 'phone', 'phone no', 'contact', 'contact no'],
  delivery_status: ['status', 'delivery status', 'mail status'],
  delivered_at: ['delivered_time', 'delivered time', 'deliveredtime', 'delivered at', 'delivery time', 'sent time'],
  break_taken: ['break_taken', 'break taken', 'breaktaken', 'break'],
};

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[_\s]+/g, ' ');
}

function buildFieldMap(headerRow) {
  const map = {};
  headerRow.forEach((raw, idx) => {
    const norm = normalizeHeader(raw);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (map[field] === undefined && aliases.includes(norm)) map[field] = idx;
    }
  });
  return map;
}

/**
 * Parses an "email delivery log" style sheet — one row per recipient, columns:
 * name / email / id / duration / date / mail address / mo no / Status / Delivered_Time /
 * Break_Taken. `email` and `id` are the only required columns (they are the two public
 * lookup keys); everything else is display-only metadata. `Delivered_Time` is parsed to a
 * Date when possible, otherwise dropped — the value is not load-bearing.
 *
 * Returns { rows, errors } — malformed rows are reported with their spreadsheet row number,
 * never silently discarded.
 */
function parsePublicCertSheet(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

  const rows = [];
  const errors = [];

  if (grid.length === 0) {
    errors.push({ rowNum: 0, reason: 'File is empty' });
    return { rows, errors };
  }

  const fieldMap = buildFieldMap(grid[0]);
  if (fieldMap.email === undefined || fieldMap.offer_letter_id === undefined) {
    const missing = [
      fieldMap.email === undefined && 'Email',
      fieldMap.offer_letter_id === undefined && 'ID',
    ].filter(Boolean).join(' and ');
    errors.push({ rowNum: 1, reason: `Missing required ${missing} column header` });
    return { rows, errors };
  }

  const at = (row, field) => (fieldMap[field] === undefined ? null : toStr(row[fieldMap[field]]));

  for (let i = 1; i < grid.length; i++) {
    const rowNum = i + 1; // 1-indexed to match spreadsheet row numbers
    const row = grid[i];
    if (!row || row.every((c) => c === null)) continue; // skip blank rows

    const rawEmail = at(row, 'email')?.toLowerCase() || null;
    const email = rawEmail && EMAIL_RE.test(rawEmail) ? rawEmail : null;
    const offerLetterId = sanitizeDocId(at(row, 'offer_letter_id'));

    if (!email) { errors.push({ rowNum, reason: 'Missing or invalid email' }); continue; }
    if (!offerLetterId) { errors.push({ rowNum, email, reason: 'Missing or invalid ID' }); continue; }

    const deliveredRaw = fieldMap.delivered_at === undefined ? null : row[fieldMap.delivered_at];
    let deliveredAt = null;
    if (deliveredRaw instanceof Date && !isNaN(deliveredRaw)) {
      deliveredAt = deliveredRaw;
    } else if (deliveredRaw !== null && deliveredRaw !== undefined && String(deliveredRaw).trim() !== '') {
      const parsed = new Date(String(deliveredRaw).trim().replace(' ', 'T'));
      if (!isNaN(parsed)) deliveredAt = parsed;
    }

    rows.push({
      rowNum,
      name: at(row, 'name'),
      email,
      offerLetterId,
      duration: at(row, 'duration'),
      issueDateText: at(row, 'issue_date_text'),
      mailAddress: at(row, 'mail_address'),
      mobileNo: at(row, 'mobile_no'),
      deliveryStatus: at(row, 'delivery_status'),
      deliveredAt,
      breakTaken: at(row, 'break_taken'),
    });
  }

  return { rows, errors };
}

module.exports = { parsePublicCertSheet };
