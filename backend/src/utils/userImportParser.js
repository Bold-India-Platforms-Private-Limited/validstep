'use strict';

const XLSX = require('xlsx');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toStr(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/**
 * Header names in real-world exports vary ("Mobile", "Phone", "Mobile No", "Email ID", ...).
 * Match case/space-insensitively against a few accepted spellings per field instead of
 * requiring an exact header.
 */
const HEADER_ALIASES = {
  name: ['name', 'fullname', 'full name', 'student name', 'participant name'],
  firstname: ['firstname', 'first name', 'fname'],
  lastname: ['lastname', 'last name', 'lname'],
  email: ['email', 'emailid', 'email id', 'e-mail'],
  phone: ['phone', 'mobile', 'mobileno', 'mobile no', 'mobile number', 'phone number', 'contact', 'contact number'],
};

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// A handful of column names that only ever appear in a raw PayU transaction-report export,
// never in a hand-built Name/Email/Mobile roster. Used only to produce a specific, actionable
// error message when the file genuinely can't be read as a roster (see parseUserImportFile) —
// it no longer blocks the file outright, since a PayU export's firstname/lastname/email/phone
// columns are enough to derive a roster directly (see buildFieldMap below).
const PAYU_REPORT_SIGNATURE = ['txnid', 'addedon', 'success_at', 'productinfo', 'merchant_id', 'settlement_date', 'bank_ref_no'];

function looksLikePayuReport(headerRow) {
  const normalized = new Set(headerRow.map(normalizeHeader));
  const matches = PAYU_REPORT_SIGNATURE.filter((col) => normalized.has(col));
  return matches.length >= 2;
}

function buildFieldMap(headerRow) {
  const map = {};
  for (const raw of headerRow) {
    const norm = normalizeHeader(raw);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (!map[field] && aliases.includes(norm)) map[field] = raw;
    }
  }
  // A raw PayU export (or any export) splits the name into firstname/lastname instead of a
  // single "name" column — treat that pair as equivalent to "name" so those files work here
  // without the admin having to hand-build a separate roster first.
  if (!map.name && (map.firstname || map.lastname)) map.name = '__firstname_lastname__';
  return map;
}

/**
 * Parse an admin Excel/CSV user import (Name / Email / Mobile columns only — the target
 * company + batch are chosen once in the upload form, not per row).
 * Returns { rows, errors } — malformed rows are reported, not silently dropped, so the
 * admin can see exactly which rows to fix and re-upload.
 */
function parseUserImportFile(buffer) {
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
  if (!fieldMap.email) {
    const reason = looksLikePayuReport(grid[0])
      ? 'This looks like a raw PayU transaction report, not a roster with an Email column. Bulk Upload needs at least an Email column — build one from your PayU export first, then upload it here.'
      : 'Missing required "Email" column header';
    errors.push({ rowNum: 1, reason });
    return { rows, errors };
  }

  const headerRow = grid[0];
  const usesFirstLastName = fieldMap.name === '__firstname_lastname__';
  const nameIdx = (fieldMap.name && !usesFirstLastName) ? headerRow.indexOf(fieldMap.name) : -1;
  const firstNameIdx = fieldMap.firstname ? headerRow.indexOf(fieldMap.firstname) : -1;
  const lastNameIdx = fieldMap.lastname ? headerRow.indexOf(fieldMap.lastname) : -1;
  const emailIdx = headerRow.indexOf(fieldMap.email);
  const phoneIdx = fieldMap.phone ? headerRow.indexOf(fieldMap.phone) : -1;

  for (let i = 1; i < grid.length; i++) {
    const rowNum = i + 1; // 1-indexed, matches spreadsheet row numbers
    const row = grid[i];
    if (!row || row.every((c) => c === null)) continue; // skip blank rows

    const rawName = usesFirstLastName
      ? [firstNameIdx >= 0 ? toStr(row[firstNameIdx]) : null, lastNameIdx >= 0 ? toStr(row[lastNameIdx]) : null].filter(Boolean).join(' ') || null
      : (nameIdx >= 0 ? toStr(row[nameIdx]) : null);
    const email = toStr(row[emailIdx])?.toLowerCase();
    const phone = phoneIdx >= 0 ? toStr(row[phoneIdx]) : null;

    if (!email || !EMAIL_RE.test(email)) { errors.push({ rowNum, email, reason: 'Missing or invalid email' }); continue; }
    // Name is optional — same fallback already used for PayU Button customers and imported
    // transactions elsewhere (see admin.service.js): the email's local part when no name is
    // available in the file, so a row is never rejected just for lacking a name.
    const name = rawName || email.split('@')[0];

    rows.push({ rowNum, name, email, phone });
  }

  return { rows, errors };
}

module.exports = { parseUserImportFile };
