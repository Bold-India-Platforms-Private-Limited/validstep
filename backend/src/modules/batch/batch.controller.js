'use strict';

const batchService = require('./batch.service');
const { sendSuccess, sendCreated, sendError } = require('../../utils/apiResponse');

async function createBatch(req, res) {
  try {
    const batch = await batchService.createBatch(req.user.id, req.body);
    return sendCreated(res, batch, 'Batch created successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getBatches(req, res) {
  try {
    const result = await batchService.getBatches(req.user.id, req.query);
    return sendSuccess(res, result, 'Batches retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getBatchById(req, res) {
  try {
    const batch = await batchService.getBatchById(req.user.id, req.params.id);
    return sendSuccess(res, batch, 'Batch retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function updateBatch(req, res) {
  try {
    const batch = await batchService.updateBatch(req.user.id, req.params.id, req.body);
    return sendSuccess(res, batch, 'Batch updated successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function createOrUpdateTemplate(req, res) {
  try {
    const template = await batchService.createOrUpdateTemplate(
      req.user.id,
      req.params.id,
      req.body
    );
    return sendCreated(res, template, 'Template created/updated successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getTemplates(req, res) {
  try {
    const templates = await batchService.getTemplates(req.user.id, req.params.id);
    return sendSuccess(res, templates, 'Templates retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function issueCertificates(req, res) {
  try {
    const { order_ids } = req.body;
    const result = await batchService.issueCertificates(
      req.user.id,
      req.params.id,
      order_ids
    );
    return sendSuccess(res, result, 'Certificate issuance queued successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getBatchOrders(req, res) {
  try {
    const result = await batchService.getBatchOrders(
      req.user.id,
      req.params.id,
      req.query
    );
    return sendSuccess(res, result, 'Orders retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function exportBatchOrders(req, res) {
  try {
    const rows = await batchService.exportBatchOrders(
      req.user.id,
      req.params.id,
      req.query
    );
    return sendSuccess(res, rows, 'Export data retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getBatchCertificates(req, res) {
  try {
    const result = await batchService.getBatchCertificates(
      req.user.id,
      req.params.id,
      req.query
    );
    return sendSuccess(res, result, 'Certificates retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

// Public endpoints
async function getPublicBatch(req, res) {
  try {
    const batch = await batchService.getPublicBatchBySlug(req.params.slug);

    // ETag based on batch id + status — changes only when company updates the batch
    const etag = `"${batch.id}-${batch.status}"`;
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    // Cache at CDN/browser for 15 min — same as Redis TTL.
    // stale-while-revalidate: serve stale for 60s while fetching fresh in background.
    // stale-if-error: serve stale for 1h if origin is down.
    res.set({
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=60, stale-if-error=3600',
      'ETag': etag,
      'Vary': 'Accept-Encoding',
    });

    return sendSuccess(res, batch, 'Batch info retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  createOrUpdateTemplate,
  getTemplates,
  issueCertificates,
  getBatchOrders,
  exportBatchOrders,
  getBatchCertificates,
  getPublicBatch,
};
