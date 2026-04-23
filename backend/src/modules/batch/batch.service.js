'use strict';

const { db } = require('../../config/database');
const { redisGet, redisSet, redisDel } = require('../../config/redis');
const { generateBatchSlug } = require('../../utils/slugGenerator');

const BATCH_CACHE_TTL = 900; // 15 minutes base TTL
// Jitter ±60s prevents cache stampede when many slugs expire simultaneously
const batchCacheTTL = () => BATCH_CACHE_TTL + Math.floor(Math.random() * 120) - 60;

/**
 * Create a new batch
 */
async function createBatch(companyId, data) {
  const {
    program_id,
    name,
    start_date,
    end_date,
    role,
    id_prefix,
    certificate_price,
    currency = 'INR',
  } = data;

  // Verify program belongs to company
  const program = await db.program.findFirst({
    where: { id: program_id, company_id: companyId },
    include: { company: { select: { name: true } } },
  });

  if (!program) {
    throw Object.assign(new Error('Program not found'), { statusCode: 404 });
  }

  // Generate unique slug
  let unique_slug;
  let attempts = 0;
  while (attempts < 5) {
    const candidate = generateBatchSlug(program.company.name, program.type);
    const existing = await db.batch.findUnique({ where: { unique_slug: candidate } });
    if (!existing) {
      unique_slug = candidate;
      break;
    }
    attempts++;
  }

  if (!unique_slug) {
    throw Object.assign(new Error('Failed to generate unique batch slug'), { statusCode: 500 });
  }

  const batch = await db.batch.create({
    data: {
      program_id,
      company_id: companyId,
      name,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      role: role || null,
      id_prefix: id_prefix || 'CERT',
      certificate_price,
      currency,
      unique_slug,
      status: 'DRAFT',
      is_active: true,
    },
    include: {
      program: { select: { id: true, name: true, type: true } },
    },
  });

  return batch;
}

/**
 * Get all batches for a company
 */
async function getBatches(companyId, query = {}) {
  const { page = 1, limit = 20, status, program_id } = query;
  const skip = (page - 1) * limit;

  const where = {
    company_id: companyId,
    ...(status && { status }),
    ...(program_id && { program_id }),
  };

  const [batches, total] = await Promise.all([
    db.batch.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      include: {
        program: { select: { id: true, name: true, type: true } },
        _count: { select: { orders: true, certificates: true } },
      },
    }),
    db.batch.count({ where }),
  ]);

  return {
    batches,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single batch by ID
 */
async function getBatchById(companyId, batchId) {
  const batch = await db.batch.findFirst({
    where: { id: batchId, company_id: companyId },
    include: {
      program: { select: { id: true, name: true, type: true } },
      templates: {
        where: { is_active: true },
        orderBy: { created_at: 'desc' },
        take: 1,
      },
      _count: { select: { orders: true, certificates: true } },
    },
  });

  if (!batch) {
    throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  }

  return batch;
}

/**
 * Update a batch
 */
async function updateBatch(companyId, batchId, data) {
  const batch = await db.batch.findFirst({
    where: { id: batchId, company_id: companyId },
  });

  if (!batch) {
    throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  }

  const {
    name,
    start_date,
    end_date,
    role,
    id_prefix,
    certificate_price,
    currency,
    is_active,
    status,
  } = data;

  const updated = await db.batch.update({
    where: { id: batchId },
    data: {
      ...(name !== undefined && { name }),
      ...(start_date && { start_date: new Date(start_date) }),
      ...(end_date && { end_date: new Date(end_date) }),
      ...(role !== undefined && { role }),
      ...(id_prefix !== undefined && { id_prefix }),
      ...(certificate_price !== undefined && { certificate_price }),
      ...(currency !== undefined && { currency }),
      ...(is_active !== undefined && { is_active }),
      ...(status !== undefined && { status }),
    },
    include: {
      program: { select: { id: true, name: true, type: true } },
    },
  });

  // Invalidate cache
  await redisDel(`public:batch:${batch.unique_slug}`);

  return updated;
}

/**
 * Create or update a certificate template for a batch
 */
async function createOrUpdateTemplate(companyId, batchId, data) {
  const batch = await db.batch.findFirst({
    where: { id: batchId, company_id: companyId },
  });

  if (!batch) {
    throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  }

  const {
    template_name,
    template_type = 'CLASSIC',
    background_color = '#FFFFFF',
    accent_color = '#1a237e',
    font_family = 'Helvetica',
    show_logo = true,
    show_signature = false,
    signature_url,
    custom_text,
    layout_config,
    background_image_url,
  } = data;

  // Deactivate existing templates for this batch
  await db.certificateTemplate.updateMany({
    where: { batch_id: batchId },
    data: { is_active: false },
  });

  const template = await db.certificateTemplate.create({
    data: {
      batch_id: batchId,
      company_id: companyId,
      template_name,
      template_type,
      background_color,
      accent_color,
      font_family,
      show_logo,
      show_signature,
      signature_url: signature_url || null,
      custom_text: custom_text || null,
      layout_config: layout_config || null,
      background_image_url: background_image_url || null,
      is_active: true,
    },
  });

  // Invalidate public batch cache so new template is reflected
  await redisDel(`public:batch:${batch.unique_slug}`);

  return template;
}

/**
 * Upload a background image for a batch template
 */
async function uploadTemplateBackground(companyId, batchId, file) {
  const batch = await db.batch.findFirst({
    where: { id: batchId, company_id: companyId },
  });
  if (!batch) throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  if (!file) throw Object.assign(new Error('No file uploaded'), { statusCode: 400 });

  const env = require('../../config/env');
  const url = `${env.BACKEND_URL}/uploads/templates/${file.filename}`;
  return { url };
}

/**
 * Get templates for a batch
 */
async function getTemplates(companyId, batchId) {
  const batch = await db.batch.findFirst({
    where: { id: batchId, company_id: companyId },
  });

  if (!batch) {
    throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  }

  const templates = await db.certificateTemplate.findMany({
    where: { batch_id: batchId, company_id: companyId },
    orderBy: { created_at: 'desc' },
  });

  return templates;
}

/**
 * Issue certificates to paid users (batch operation)
 */
async function issueCertificates(companyId, batchId, orderIds) {
  const batch = await db.batch.findFirst({
    where: { id: batchId, company_id: companyId },
    include: {
      templates: { where: { is_active: true }, take: 1 },
    },
  });

  if (!batch) {
    throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  }

  // Get paid orders that don't have issued certificates
  const orders = await db.order.findMany({
    where: {
      id: { in: orderIds },
      batch_id: batchId,
      company_id: companyId,
      status: 'PAID',
    },
    include: {
      certificate: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (orders.length === 0) {
    throw Object.assign(new Error('No valid paid orders found for issuance'), { statusCode: 400 });
  }

  const templateId = batch.templates[0]?.id || null;

  // Add certificate generation jobs to BullMQ queue
  const { addCertificateJob } = require('../certificate/certificate.service');

  const results = [];
  for (const order of orders) {
    if (order.certificate && order.certificate.is_issued) {
      results.push({ orderId: order.id, status: 'already_issued' });
      continue;
    }

    // Update certificate to mark as issued (job will generate the PDF)
    await db.certificate.updateMany({
      where: { order_id: order.id },
      data: {
        is_issued: true,
        issued_at: new Date(),
        template_id: templateId,
      },
    });

    // Add to generation queue
    await addCertificateJob({
      certificateId: order.certificate?.id,
      orderId: order.id,
      userId: order.user_id,
      batchId,
      companyId,
      templateId,
    });

    results.push({ orderId: order.id, status: 'queued' });
  }

  return { results, total: results.length };
}

/**
 * Get orders for a batch
 */
async function getBatchOrders(companyId, batchId, query = {}) {
  const { page = 1, limit = 100, status } = query;
  const skip = (page - 1) * limit;

  const batch = await db.batch.findFirst({
    where: { id: batchId, company_id: companyId },
  });

  if (!batch) {
    throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  }

  const where = {
    batch_id: batchId,
    ...(status && { status }),
  };

  const include = {
    user: { select: { id: true, name: true, email: true, phone: true } },
    certificate: {
      select: { id: true, is_issued: true, issued_at: true, certificate_serial: true },
    },
    payments: {
      where: { status: 'SUCCESS' },
      orderBy: { created_at: 'desc' },
      take: 1,
      select: { created_at: true, payu_txn_id: true, amount: true },
    },
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      include,
    }),
    db.order.count({ where }),
  ]);

  // Flatten payment datetime onto each order
  const enriched = orders.map((o) => ({
    ...o,
    paid_at: o.payments?.[0]?.created_at || null,
    payu_txn_id: o.payu_txn_id || o.payments?.[0]?.payu_txn_id || null,
  }));

  return {
    orders: enriched,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  };
}

/**
 * Export ALL orders for a batch (no pagination) for Excel download
 */
async function exportBatchOrders(companyId, batchId, query = {}) {
  const { status } = query;

  const batch = await db.batch.findFirst({
    where: { id: batchId, company_id: companyId },
  });

  if (!batch) {
    throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  }

  const where = {
    batch_id: batchId,
    ...(status && { status }),
  };

  const orders = await db.order.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      certificate: { select: { is_issued: true, issued_at: true, certificate_serial: true } },
      payments: {
        where: { status: 'SUCCESS' },
        orderBy: { created_at: 'desc' },
        take: 1,
        select: { created_at: true, payu_txn_id: true },
      },
    },
  });

  return orders.map((o) => ({
    name: o.user?.name || '',
    email: o.user?.email || '',
    phone: o.user?.phone || '',
    certificate_serial: o.certificate_serial,
    amount: Number(o.amount),
    status: o.status,
    paid_at: o.payments?.[0]?.created_at
      ? new Date(o.payments[0].created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : '',
    payu_txn_id: o.payu_txn_id || o.payments?.[0]?.payu_txn_id || '',
    certificate_issued: o.certificate?.is_issued ? 'Yes' : 'No',
    issued_at: o.certificate?.issued_at
      ? new Date(o.certificate.issued_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : '',
    ordered_at: new Date(o.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  }));
}

/**
 * Get issued certificates for a batch (company view)
 */
async function getBatchCertificates(companyId, batchId, query = {}) {
  const { page = 1, limit = 50 } = query;
  const skip = (page - 1) * limit;

  const batch = await db.batch.findFirst({
    where: { id: batchId, company_id: companyId },
  });

  if (!batch) {
    throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  }

  const [certificates, total] = await Promise.all([
    db.certificate.findMany({
      where: { batch_id: batchId, company_id: companyId },
      skip,
      take: Number(limit),
      orderBy: { issued_at: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.certificate.count({ where: { batch_id: batchId, company_id: companyId } }),
  ]);

  return {
    certificates,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get public batch info by slug (for order page)
 */
async function getPublicBatchBySlug(slug) {
  const cacheKey = `public:batch:${slug}`;
  const cached = await redisGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const batch = await db.batch.findUnique({
    where: { unique_slug: slug },
    include: {
      program: { select: { id: true, name: true, type: true } },
      company: {
        select: {
          id: true,
          name: true,
          logo_url: true,
          website: true,
          description: true,
          is_active: true,
        },
      },
      templates: {
        where: { is_active: true },
        take: 1,
        select: {
          id: true,
          template_type: true,
          background_color: true,
          accent_color: true,
        },
      },
    },
  });

  if (!batch) {
    throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  }

  if (!batch.is_active || batch.status === 'COMPLETED') {
    throw Object.assign(new Error('This batch is no longer active'), { statusCode: 410 });
  }
  if (batch.status === 'HOLD') {
    throw Object.assign(new Error('This batch is temporarily paused'), { statusCode: 503 });
  }

  // Remove sensitive fields
  const publicBatch = {
    id: batch.id,
    name: batch.name,
    start_date: batch.start_date,
    end_date: batch.end_date,
    role: batch.role,
    certificate_price: batch.certificate_price,
    currency: batch.currency,
    status: batch.status,
    is_active: batch.is_active,
    unique_slug: batch.unique_slug,
    program: batch.program,
    company: batch.company,
    template: batch.templates[0] || null,
  };

  await redisSet(cacheKey, JSON.stringify(publicBatch), batchCacheTTL());
  return publicBatch;
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
  getPublicBatchBySlug,
};
