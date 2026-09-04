'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('../../config/database');
const { redisGet, redisSet } = require('../../config/redis');
const { sanitizeDocId } = require('../../utils/docId');
const { parsePublicCertSheet } = require('./publicCertRepo.parser');
const { addUploadJob, getUploadJobStatus } = require('./publicCertRepo.worker');

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const MATCH_TTL_SECONDS = 30 * 60;

// In-memory fallback for the match cache when Redis is unavailable — this is an admin-only,
// one-operator-at-a-time tool, so a per-process Map degrades acceptably. Same approach as
// admin.service.js's bulkMatchMemoryCache.
const matchMemoryCache = new Map();

async function cacheMatchRows(token, rows) {
  const stored = await redisSet(`pubcert-match:${token}`, JSON.stringify(rows), MATCH_TTL_SECONDS);
  if (!stored) {
    matchMemoryCache.set(token, rows);
    const timer = setTimeout(() => matchMemoryCache.delete(token), MATCH_TTL_SECONDS * 1000);
    timer.unref?.();
  }
}

async function getCachedMatchRows(token) {
  const cached = await redisGet(`pubcert-match:${token}`);
  if (cached) return JSON.parse(cached);
  return matchMemoryCache.get(token) || null;
}

/**
 * Read-only dry run: parse the in-memory Excel sheet, scan a local folder of certificate
 * images named after the sheet's ID column, and report which rows are ready to upload. No DB
 * writes, no R2 uploads — the admin can re-run this freely before committing. The "ready"
 * rows are cached under a short-lived token so the commit step needs neither the sheet nor
 * the folder scan again.
 */
async function matchPublicCerts({ fileBuffer, folderPath }) {
  const trimmedPath = String(folderPath || '').trim();
  if (!trimmedPath) throw Object.assign(new Error('Folder path is required'), { statusCode: 400 });
  if (!fs.existsSync(trimmedPath) || !fs.statSync(trimmedPath).isDirectory()) {
    throw Object.assign(
      new Error(`Folder not found or not accessible from the server: "${trimmedPath}" — this path must exist on the machine running the backend`),
      { statusCode: 400 },
    );
  }

  const fileMap = new Map();
  for (const entry of fs.readdirSync(trimmedPath)) {
    const ext = path.extname(entry).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) continue;
    const docId = sanitizeDocId(path.basename(entry, ext));
    if (docId && !fileMap.has(docId)) fileMap.set(docId, path.join(trimmedPath, entry));
  }

  const { rows: parsedRows, errors: parseErrors } = parsePublicCertSheet(fileBuffer);

  const existing = await db.certificateRepoEntry.findMany({
    where: { offer_id: { in: parsedRows.map((r) => r.offerLetterId) } },
    select: { offer_id: true, upload_status: true },
  });
  const existingStatus = new Map(existing.map((e) => [e.offer_id, e.upload_status]));

  const resultRows = [];
  const readyRows = [];
  const seenIds = new Set();

  for (const row of parsedRows) {
    if (seenIds.has(row.offerLetterId)) {
      resultRows.push({ ...row, status: 'duplicate_id', reason: 'Another row in this sheet has the same ID' });
      continue;
    }
    seenIds.add(row.offerLetterId);

    const filePath = fileMap.get(row.offerLetterId);
    if (!filePath) {
      resultRows.push({ ...row, status: 'no_file', reason: `No file named ${row.offerLetterId}.(jpg|jpeg|png) in the folder` });
      continue;
    }

    if (existingStatus.get(row.offerLetterId) === 'UPLOADED') {
      resultRows.push({ ...row, status: 'already_uploaded', reason: 'Already uploaded — will be re-uploaded and overwritten' });
    } else {
      resultRows.push({ ...row, status: 'ready' });
    }
    readyRows.push({ ...row, filePath });
  }

  for (const err of parseErrors) {
    resultRows.push({ rowNum: err.rowNum, email: err.email || null, status: 'parse_error', reason: err.reason });
  }

  const summary = resultRows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  summary.total = resultRows.length;
  summary.ready = readyRows.length;

  const matchToken = crypto.randomUUID();
  await cacheMatchRows(matchToken, readyRows);

  return { matchToken, rows: resultRows, summary };
}

/**
 * Commits a matched set: upserts every ready row into certificate_repo_entries (status
 * PENDING), keyed by offer_id so re-running a sheet updates rather than duplicates, then
 * hands the rows to the background upload queue.
 */
async function startPublicCertUpload({ matchToken, sourceLabel }) {
  const rows = await getCachedMatchRows(matchToken);
  if (!rows) throw Object.assign(new Error('Match session expired — re-run matching and try again'), { statusCode: 400 });
  if (!rows.length) throw Object.assign(new Error('No matched rows to upload'), { statusCode: 400 });

  const label = String(sourceLabel || '').trim() || null;

  for (const row of rows) {
    const data = {
      name: row.name || null,
      email: row.email,
      mail_address: row.mailAddress || null,
      mobile_no: row.mobileNo || null,
      duration: row.duration || null,
      issue_date_text: row.issueDateText || null,
      delivery_status: row.deliveryStatus || null,
      delivered_at: row.deliveredAt ? new Date(row.deliveredAt) : null,
      break_taken: row.breakTaken || null,
      source_label: label,
      upload_status: 'PENDING',
      upload_error: null,
    };
    await db.certificateRepoEntry.upsert({
      where: { offer_id: row.offerLetterId },
      create: { offer_id: row.offerLetterId, ...data },
      update: data,
    });
  }

  const outcome = await addUploadJob({ rows });
  return { total: rows.length, ...outcome };
}

async function getUploadStatus(jobId) {
  return getUploadJobStatus(jobId);
}

/**
 * Paginated table for the admin page. `search` matches name / email / offer_id
 * (case-insensitive contains). `status` filters by upload_status.
 */
async function listRecords({ page = 1, limit = 20, search, status }) {
  const where = {};
  if (status) where.upload_status = status;
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { offer_id: { contains: q.toUpperCase() } },
    ];
  }

  const [total, records] = await Promise.all([
    db.certificateRepoEntry.count({ where }),
    db.certificateRepoEntry.findMany({
      where,
      orderBy: { uploaded_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const stats = await db.certificateRepoEntry.groupBy({ by: ['upload_status'], _count: true });
  const byStatus = stats.reduce((acc, s) => { acc[s.upload_status] = s._count; return acc; }, {});

  return {
    records,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    stats: { total: Object.values(byStatus).reduce((a, b) => a + b, 0), ...byStatus },
  };
}

/**
 * Public, no-auth lookup. Tries offer-letter ID first (sanitized the same way filenames and
 * the sheet's ID column are), then falls back to an exact email match. Only returns a
 * certificate that has actually landed in R2 (upload_status UPLOADED) and exposes just the
 * fields a recipient needs to recognise and download their own certificate — never the
 * email/phone/address columns from the source sheet.
 */
async function lookupPublicCertificate(rawQuery) {
  const q = String(rawQuery || '').trim();
  if (!q) return null;

  const record = await db.certificateRepoEntry.findFirst({
    where: {
      upload_status: 'UPLOADED',
      OR: [
        { offer_id: sanitizeDocId(q) || '__none__' },
        { email: q.toLowerCase() },
      ],
    },
  });
  if (!record || !record.certificate_url) return null;

  db.certificateRepoEntry.update({
    where: { id: record.id },
    data: { download_count: { increment: 1 }, last_downloaded_at: new Date() },
  }).catch(() => {});

  return {
    name: record.name,
    offer_letter_id: record.offer_id,
    duration: record.duration,
    issue_date_text: record.issue_date_text,
    download_url: record.certificate_url,
  };
}

module.exports = {
  matchPublicCerts,
  startPublicCertUpload,
  getUploadStatus,
  listRecords,
  lookupPublicCertificate,
};
