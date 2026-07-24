'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('../../config/database');

const ARCHIVE_ROOT = path.join(__dirname, '../../../storage/master-accounting/originals');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Archive an uploaded original file read-only under
 * backend/storage/master-accounting/originals/{scopeFolder}/{subScopeFolder}/{year}/,
 * record its checksum, and create the SourceFileArchive DB row. This is the ONLY
 * write path for originals in Master Accounting — files are never modified or
 * deleted afterwards (chmod 444 immediately after write is a belt-and-suspenders
 * guard on top of that). Re-uploading byte-identical content is idempotent (returns
 * the existing record rather than writing a duplicate); re-uploading a same-named
 * file with different bytes gets a checksum-prefixed name so the original is never
 * silently overwritten.
 */
async function archiveSourceFile({
  buffer, originalFilename, fileType, brandId = null, gatewayId = null, bankAccountId = null,
  periodType = 'MONTHLY', periodLabel = null, uploadedBy = null, rowCount = 0, importedToLedger = true,
  scopeFolder, subScopeFolder,
}) {
  const checksum = sha256(buffer);

  const existing = await db.sourceFileArchive.findFirst({ where: { sha256_checksum: checksum } });
  if (existing) {
    // The file itself never changes on a re-upload, but row_count can be stale if an
    // earlier import of this same file ran against a parser that has since been fixed
    // (e.g. a report-shape bug) — keep it in sync so the archive listing stays accurate.
    if (existing.row_count !== rowCount) {
      return db.sourceFileArchive.update({ where: { id: existing.id }, data: { row_count: rowCount } });
    }
    return existing;
  }

  const year = String(new Date().getUTCFullYear());
  const dir = path.join(ARCHIVE_ROOT, scopeFolder, subScopeFolder, year);
  fs.mkdirSync(dir, { recursive: true });

  let targetName = originalFilename;
  let targetPath = path.join(dir, targetName);
  if (fs.existsSync(targetPath)) {
    targetName = `${checksum.slice(0, 8)}_${originalFilename}`;
    targetPath = path.join(dir, targetName);
  }

  fs.writeFileSync(targetPath, buffer);
  fs.chmodSync(targetPath, 0o444);

  const repoRoot = path.join(__dirname, '../../../..');
  const storedPath = path.relative(repoRoot, targetPath);

  return db.sourceFileArchive.create({
    data: {
      file_type: fileType,
      brand_id: brandId,
      gateway_id: gatewayId,
      bank_account_id: bankAccountId,
      original_filename: originalFilename,
      stored_path: storedPath,
      sha256_checksum: checksum,
      file_size: buffer.length,
      period_type: periodType,
      period_label: periodLabel,
      row_count: rowCount,
      imported_to_ledger: importedToLedger,
      uploaded_by: uploadedBy,
    },
  });
}

module.exports = { archiveSourceFile, ARCHIVE_ROOT };
