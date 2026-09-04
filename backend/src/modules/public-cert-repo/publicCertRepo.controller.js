'use strict';

const service = require('./publicCertRepo.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

// ─── Admin (super-admin only) ────────────────────────────────────────────────

async function match(req, res) {
  try {
    if (!req.file) return sendError(res, 'No Excel/CSV file uploaded', 400);
    const result = await service.matchPublicCerts({
      fileBuffer: req.file.buffer,
      folderPath: req.body.folder_path,
    });
    return sendSuccess(res, result, 'Match preview generated');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function start(req, res) {
  try {
    if (!req.body.match_token) return sendError(res, 'match_token is required', 400);
    const result = await service.startPublicCertUpload({
      matchToken: req.body.match_token,
      sourceLabel: req.body.source_label,
    });
    return sendSuccess(res, result, 'Public certificate upload started');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function status(req, res) {
  try {
    const result = await service.getUploadStatus(req.params.jobId);
    return sendSuccess(res, result, 'Job status retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function records(req, res) {
  try {
    const result = await service.listRecords({
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? Math.min(parseInt(req.query.limit, 10), 100) : 20,
      search: req.query.search,
      status: req.query.status,
    });
    return sendSuccess(res, result, 'Records retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── Public (no auth) ────────────────────────────────────────────────────────

async function lookup(req, res) {
  try {
    const result = await service.lookupPublicCertificate(req.query.q);
    if (!result) return sendError(res, 'No certificate found for that email or offer-letter ID', 404);
    return sendSuccess(res, result, 'Certificate found');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = { match, start, status, records, lookup };
