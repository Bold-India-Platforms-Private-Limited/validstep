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
  email: ['email', 'emailid', 'email id', 'e-mail'],
  phone: ['phone', 'mobile', 'mobileno', 'mobile no', 'mobile number', 'phone number', 'contact', 'contact number'],
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
  if (!fieldMap.name || !fieldMap.email) {
    errors.push({ rowNum: 1, reason: 'Missing required "Name" and/or "Email" column header' });
    return { rows, errors };
  }

  const headerRow = grid[0];
  const nameIdx = headerRow.indexOf(fieldMap.name);
  const emailIdx = headerRow.indexOf(fieldMap.email);
  const phoneIdx = fieldMap.phone ? headerRow.indexOf(fieldMap.phone) : -1;

  for (let i = 1; i < grid.length; i++) {
    const rowNum = i + 1; // 1-indexed, matches spreadsheet row numbers
    const row = grid[i];
    if (!row || row.every((c) => c === null)) continue; // skip blank rows

    const name = toStr(row[nameIdx]);
    const email = toStr(row[emailIdx])?.toLowerCase();
    const phone = phoneIdx >= 0 ? toStr(row[phoneIdx]) : null;

    if (!name) { errors.push({ rowNum, email, reason: 'Missing name' }); continue; }
    if (!email || !EMAIL_RE.test(email)) { errors.push({ rowNum, email, reason: 'Missing or invalid email' }); continue; }

    rows.push({ rowNum, name, email, phone });
  }

  return { rows, errors };
}

module.exports = { parseUserImportFile };
