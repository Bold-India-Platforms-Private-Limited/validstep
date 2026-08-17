'use strict';

const XLSX = require('xlsx');
const { sanitizeDocId } = require('./docId');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toStr(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

const HEADER_ALIASES = {
  name: ['name', 'fullname', 'full name', 'student name', 'participant name'],
  email: ['email', 'emailid', 'email id', 'e-mail'],
  email2: ['email2', 'email 2', 'secondary email', 'alternate email', 'alt email', 'second email'],
  id: ['id', 'certificate id', 'certificateid', 'doc id', 'docid', 'document id', 'certificate no', 'certificate number'],
  duration: ['duration'],
  date: ['date', 'issue date', 'certificate date'],
};

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildFieldMap(headerRow) {
  const map = {};
  for (const raw of headerRow) {
    const norm = normalizeHeader(raw);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (!map[field] && aliases.includes(norm)) map[field] = raw;
    }
  }
  return map;
}

/**
 * Parse a bulk certificate-matching sheet (Name / Email / Email2 / ID / Duration / Date
 * columns — exported by the company alongside a folder of finished certificate files named
 * after the ID column). Email (or Email2, if the row's primary email doesn't match anything)
 * ties a row to a batch order, ID ties it to a file in the folder; Duration/Date are read
 * through for display only — they're already printed on the certificate image itself,
 * there's nothing to persist them into.
 * Returns { rows, errors } — malformed rows are reported, not silently dropped.
 */
function parseCertificateMatchFile(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

  const rows = [];
  const errors = [];

  if (grid.length === 0) {
    errors.push({ rowNum: 0, reason: 'File is empty' });
    return { rows, errors };
  }

  const fieldMap = buildFieldMap(grid[0]);
  if ((!fieldMap.email && !fieldMap.email2) || !fieldMap.id) {
    const missing = [(!fieldMap.email && !fieldMap.email2) && 'Email', !fieldMap.id && 'ID'].filter(Boolean).join(' and ');
    errors.push({ rowNum: 1, reason: `Missing required ${missing} column header` });
    return { rows, errors };
  }

  const headerRow = grid[0];
  const nameIdx = fieldMap.name ? headerRow.indexOf(fieldMap.name) : -1;
  const emailIdx = fieldMap.email ? headerRow.indexOf(fieldMap.email) : -1;
  const email2Idx = fieldMap.email2 ? headerRow.indexOf(fieldMap.email2) : -1;
  const idIdx = headerRow.indexOf(fieldMap.id);
  const durationIdx = fieldMap.duration ? headerRow.indexOf(fieldMap.duration) : -1;
  const dateIdx = fieldMap.date ? headerRow.indexOf(fieldMap.date) : -1;

  for (let i = 1; i < grid.length; i++) {
    const rowNum = i + 1; // 1-indexed, matches spreadsheet row numbers
    const row = grid[i];
    if (!row || row.every((c) => c === null)) continue; // skip blank rows

    const name = nameIdx >= 0 ? toStr(row[nameIdx]) : null;
    const rawEmail = emailIdx >= 0 ? toStr(row[emailIdx])?.toLowerCase() : null;
    const rawEmail2 = email2Idx >= 0 ? toStr(row[email2Idx])?.toLowerCase() : null;
    const email = rawEmail && EMAIL_RE.test(rawEmail) ? rawEmail : null;
    const email2 = rawEmail2 && EMAIL_RE.test(rawEmail2) ? rawEmail2 : null;
    const rawId = idIdx >= 0 ? toStr(row[idIdx]) : null;
    const id = sanitizeDocId(rawId);
    const duration = durationIdx >= 0 ? toStr(row[durationIdx]) : null;
    const date = dateIdx >= 0 ? toStr(row[dateIdx]) : null;

    if (!email && !email2) { errors.push({ rowNum, reason: 'Missing or invalid email (checked both Email and Email2 columns)' }); continue; }
    if (!id) { errors.push({ rowNum, email: email || email2, reason: 'Missing or invalid ID' }); continue; }

    rows.push({ rowNum, name, email, email2, id, duration, date });
  }

  return { rows, errors };
}

module.exports = { parseCertificateMatchFile };
