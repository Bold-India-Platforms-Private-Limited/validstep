'use strict';

const path = require('path');

/**
 * Companies already print their own document ID on the certificate design itself (e.g. "Scan
 * to Verify Doc: BFDA82407"), and name the exported file after that same ID (BFDA82407.jpg) —
 * so we reuse it as the verification_code instead of minting an unrelated random one. That
 * keeps the ID Validstep prints in the badge consistent with whatever the company's own design
 * already shows elsewhere on the certificate.
 */
function extractDocIdFromFilename(originalname) {
  const base = path.basename(originalname || '', path.extname(originalname || ''));
  return sanitizeDocId(base);
}

/**
 * Same normalization applied to a raw ID value that didn't come from a filename (e.g. an
 * Excel "id" column) — so a bulk match's spreadsheet ID and a folder file's ID compare equal
 * whenever a human would consider them the same certificate ID.
 */
function sanitizeDocId(raw) {
  const sanitized = String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  return sanitized || null;
}

module.exports = { extractDocIdFromFilename, sanitizeDocId };
