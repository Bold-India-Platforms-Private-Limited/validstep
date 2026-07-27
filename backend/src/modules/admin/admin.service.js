'use strict';

const fs = require('fs');
const { Prisma } = require('@prisma/client');
const { db } = require('../../config/database');
const { redisGet, redisSet } = require('../../config/redis');
const { getTransactionFeesForPayuIds } = require('../accounting/accounting.service');
const { hashPassword, generateVerificationHash, generateRandomToken, sha256 } = require('../../utils/hash');
const { sendCompanyWelcomeEmail, sendSystemGeneratedPasswordEmail, sendCertificateIssuedEmail } = require('../../utils/email');
const { generateCertificateSerial } = require('../batch/batch.service');
const { parseUserImportFile } = require('../../utils/userImportParser');
const { parseTransactionReport, looksLikePayuTransactionReport } = require('../../utils/reportParsers');
const { logDeliveryEvent } = require('../../utils/deliveryLog');
const env = require('../../config/env');

// The PayU-review demo admin account is scoped to only these 2 customers' data —
// requested so reviewers validating the transaction flow never see real business scale.
const REVIEW_ALLOWED_EMAILS = ['sasianupalli@gmail.com', 'shriti2304@gmail.com'];
const isReviewLevel = (accessLevel) => accessLevel === 'review';

/**
 * certificate_serial is globally unique across every order, but Batch.id_prefix defaults to
 * the same "CERT" value for every batch and each batch's id_counter increments independently
 * of every other batch — so two different batches that both keep the default prefix will
 * eventually generate the exact same serial once their counters line up, failing the order
 * with a Prisma P2002 on certificate_serial. Batches can drift arbitrarily far apart under a
 * shared prefix (seen in practice: one batch's counter at 9 while another, also "CERT", had
 * already filled 1..497) — a naive "+1 and retry" would need hundreds of attempts to clear
 * that gap, so on a collision this jumps the batch's counter directly past the highest
 * existing number under that prefix (one query) instead of retrying one-by-one. No schema
 * change, no risk to any serial already printed on an issued certificate.
 */
async function jumpCounterPastExistingSerials(batchId) {
  const batch = await db.batch.findUnique({ where: { id: batchId }, select: { id_prefix: true } });
  const existing = await db.order.findMany({
    where: { certificate_serial: { startsWith: `${batch.id_prefix}-` } },
    select: { certificate_serial: true },
  });
  const maxNum = existing.reduce((max, o) => {
    const n = parseInt(o.certificate_serial.slice(batch.id_prefix.length + 1), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  await db.batch.updateMany({ where: { id: batchId, id_counter: { lt: maxNum } }, data: { id_counter: maxNum } });
}

async function withUniqueCertificateSerial(batchId, buildFn) {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const certificateSerial = await generateCertificateSerial(batchId);
    try {
      return await buildFn(certificateSerial);
    } catch (err) {
      const isSerialCollision = err instanceof Prisma.PrismaClientKnownRequestError
        && err.code === 'P2002'
        && err.meta?.target?.includes?.('certificate_serial');
      if (!isSerialCollision || attempt === MAX_ATTEMPTS) throw err;
      await jumpCounterPastExistingSerials(batchId);
    }
  }
}

/**
 * Get all companies (paginated)
 */
async function getCompanies(query = {}) {
  const { page = 1, limit = 20, search, is_active, is_verified } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(is_active && { is_active: is_active === 'true' }),
    ...(is_verified && { is_verified: is_verified === 'true' }),
  };

  const [companies, total] = await Promise.all([
    db.company.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        logo_url: true,
        website: true,
        is_active: true,
        is_verified: true,
        created_at: true,
        _count: {
          select: { batches: true, orders: true, certificates: true },
        },
      },
    }),
    db.company.count({ where }),
  ]);

  return {
    companies,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single company by ID (includes programs → batches)
 */
async function getCompanyById(id) {
  const company = await db.company.findUnique({
    where: { id },
    include: {
      programs: {
        orderBy: { created_at: 'asc' },
        include: {
          batches: {
            orderBy: { created_at: 'desc' },
            include: {
              _count: { select: { orders: true, certificates: true } },
            },
          },
        },
      },
      _count: {
        select: { batches: true, orders: true, certificates: true },
      },
    },
  });

  if (!company) {
    throw Object.assign(new Error('Company not found'), { statusCode: 404 });
  }

  const { password_hash, ...safeCompany } = company;
  return safeCompany;
}

/**
 * Get a single batch by ID (admin — no company restriction)
 */
async function getAdminBatchById(batchId) {
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: {
      program: { select: { id: true, name: true, type: true } },
      company: { select: { id: true, name: true, email: true } },
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
 * Get order stats for a batch (counts by status + revenue)
 */
async function getAdminBatchStats(batchId, accessLevel) {
  const where = {
    batch_id: batchId,
    ...(isReviewLevel(accessLevel) && { user: { email: { in: REVIEW_ALLOWED_EMAILS } } }),
  };
  const [grouped, revenue] = await Promise.all([
    db.order.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    }),
    db.order.aggregate({
      where: { ...where, status: 'PAID' },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const counts = { TOTAL: 0, PAID: 0, PENDING: 0, FAILED: 0, REFUNDED: 0 };
  for (const g of grouped) {
    counts[g.status] = g._count.id;
    counts.TOTAL += g._count.id;
  }

  return {
    orders: counts,
    paid_revenue: Number(revenue._sum.amount || 0),
  };
}

/**
 * Get orders for a batch (admin — no company restriction)
 */
async function getAdminBatchOrders(batchId, query = {}, accessLevel) {
  const { page = 1, limit = 100, status } = query;
  const skip = (page - 1) * Number(limit);

  const where = {
    batch_id: batchId,
    ...(status && { status }),
    ...(isReviewLevel(accessLevel) && { user: { email: { in: REVIEW_ALLOWED_EMAILS } } }),
  };

  const include = {
    user: { select: { id: true, name: true, email: true, phone: true } },
    certificate: {
      select: { id: true, is_issued: true, issued_at: true, certificate_serial: true, verification_hash: true },
    },
    payments: {
      where: { status: 'SUCCESS' },
      orderBy: { created_at: 'desc' },
      take: 1,
      select: { created_at: true, payu_txn_id: true, amount: true },
    },
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({ where, skip, take: Number(limit), orderBy: { created_at: 'desc' }, include }),
    db.order.count({ where }),
  ]);

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
 * Export all orders for a batch (admin — no pagination)
 */
async function exportAdminBatchOrders(batchId, query = {}, accessLevel) {
  const { status } = query;

  const where = {
    batch_id: batchId,
    ...(status && { status }),
    ...(isReviewLevel(accessLevel) && { user: { email: { in: REVIEW_ALLOWED_EMAILS } } }),
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
 * Get issued certificates for a batch (admin)
 */
async function getAdminBatchCertificates(batchId, query = {}, accessLevel) {
  const { page = 1, limit = 50 } = query;
  const skip = (page - 1) * Number(limit);
  const where = {
    batch_id: batchId,
    ...(isReviewLevel(accessLevel) && { user: { email: { in: REVIEW_ALLOWED_EMAILS } } }),
  };

  const [certificates, total] = await Promise.all([
    db.certificate.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { issued_at: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    db.certificate.count({ where }),
  ]);

  return {
    certificates,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  };
}

/**
 * Issue certificates for a batch (admin — no company restriction)
 */
async function issueCertificatesAdmin(batchId, orderIds) {
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: { templates: { where: { is_active: true }, take: 1 } },
  });

  if (!batch) throw Object.assign(new Error('Batch not found'), { statusCode: 404 });

  const orders = await db.order.findMany({
    where: { id: { in: orderIds }, batch_id: batchId, status: 'PAID' },
    include: { certificate: true, user: { select: { id: true, name: true, email: true } } },
  });

  if (orders.length === 0) {
    throw Object.assign(new Error('No valid paid orders found for issuance'), { statusCode: 400 });
  }

  const templateId = batch.templates[0]?.id || null;
  const { addCertificateJob } = require('../certificate/certificate.service');

  const results = [];
  for (const order of orders) {
    if (order.certificate && order.certificate.is_issued) {
      results.push({ orderId: order.id, status: 'already_issued' });
      continue;
    }
    await db.certificate.updateMany({
      where: { order_id: order.id },
      data: { is_issued: true, issued_at: new Date(), template_id: templateId },
    });
    await addCertificateJob({
      certificateId: order.certificate?.id,
      orderId: order.id,
      userId: order.user_id,
      batchId,
      companyId: batch.company_id,
      templateId,
    });
    logDeliveryEvent(order.user_id, 'CERTIFICATE_GENERATED', order.id);
    results.push({ orderId: order.id, status: 'queued' });
  }

  return { results, total: results.length };
}

/**
 * Update company status (activate/deactivate/verify)
 */
async function updateCompanyStatus(id, data) {
  const { is_active, is_verified } = data;

  const company = await db.company.findUnique({ where: { id } });
  if (!company) {
    throw Object.assign(new Error('Company not found'), { statusCode: 404 });
  }

  const updated = await db.company.update({
    where: { id },
    data: {
      ...(is_active !== undefined && { is_active }),
      ...(is_verified !== undefined && { is_verified }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      is_active: true,
      is_verified: true,
      updated_at: true,
    },
  });

  // Invalidate company cache
  const { redisDel } = require('../../config/redis');
  await redisDel(`company:profile:${id}`);

  return updated;
}

/**
 * Get all batches (admin view)
 */
async function getAllBatches(query = {}, accessLevel) {
  const { page = 1, limit = 20, status, company_id, search } = query;
  const skip = (page - 1) * limit;
  const restricted = isReviewLevel(accessLevel);
  const reviewUserFilter = { user: { email: { in: REVIEW_ALLOWED_EMAILS } } };

  const where = {
    ...(status && { status }),
    ...(company_id && { company_id }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
        { program: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [batches, total] = await Promise.all([
    db.batch.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      include: {
        company: { select: { id: true, name: true, email: true } },
        program: { select: { type: true, name: true } },
        _count: {
          select: {
            orders: restricted ? { where: reviewUserFilter } : true,
            certificates: restricted ? { where: reviewUserFilter } : true,
          },
        },
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
 * Get pricing configurations
 */
async function getPricingConfigs() {
  const configs = await db.pricingConfig.findMany({
    orderBy: { program_type: 'asc' },
  });
  return configs;
}

/**
 * Update pricing configuration
 */
async function updatePricingConfig(program_type, default_price) {
  const config = await db.pricingConfig.upsert({
    where: { program_type },
    update: { default_price },
    create: {
      program_type,
      default_price,
    },
  });

  return config;
}

/**
 * Monthly analytics for the last N months — paid revenue and new-customer signups per
 * calendar month, zero-filled so months with no activity still show a bar at 0 rather
 * than being skipped.
 */
async function getMonthlyAnalytics(query = {}, accessLevel) {
  const months = Math.min(Number(query.months) || 12, 24);
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCMonth(since.getUTCMonth() - (months - 1));
  const restricted = isReviewLevel(accessLevel);

  const [revenueRows, customerRows] = await Promise.all([
    restricted
      ? db.$queryRaw`
          SELECT to_char(date_trunc('month', o.created_at), 'YYYY-MM') AS month,
                 COALESCE(SUM(o.amount), 0) AS revenue
          FROM orders o
          JOIN users u ON u.id = o.user_id
          WHERE o.status = 'PAID' AND o.created_at >= ${since} AND u.email = ANY(${REVIEW_ALLOWED_EMAILS})
          GROUP BY 1
          ORDER BY 1
        `
      : db.$queryRaw`
          SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                 COALESCE(SUM(amount), 0) AS revenue
          FROM orders
          WHERE status = 'PAID' AND created_at >= ${since}
          GROUP BY 1
          ORDER BY 1
        `,
    restricted
      ? db.$queryRaw`
          SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                 COUNT(*) AS customers
          FROM users
          WHERE created_at >= ${since} AND email = ANY(${REVIEW_ALLOWED_EMAILS})
          GROUP BY 1
          ORDER BY 1
        `
      : db.$queryRaw`
          SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                 COUNT(*) AS customers
          FROM users
          WHERE created_at >= ${since}
          GROUP BY 1
          ORDER BY 1
        `,
  ]);

  const revenueByMonth = new Map(revenueRows.map((r) => [r.month, Number(r.revenue)]));
  const customersByMonth = new Map(customerRows.map((r) => [r.month, Number(r.customers)]));

  const series = [];
  const cursor = new Date(since);
  for (let i = 0; i < months; i += 1) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    series.push({
      month: key,
      label: cursor.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      revenue: revenueByMonth.get(key) || 0,
      customers: customersByMonth.get(key) || 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const orderWhere = restricted ? { user: { email: { in: REVIEW_ALLOWED_EMAILS } } } : {};
  const statusGroups = await db.order.groupBy({ by: ['status'], where: orderWhere, _count: { id: true } });
  const statusBreakdown = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((status) => ({
    status,
    count: statusGroups.find((g) => g.status === status)?._count.id || 0,
  }));

  return {
    series,
    statusBreakdown,
    totals: {
      revenue: series.reduce((sum, m) => sum + m.revenue, 0),
      customers: series.reduce((sum, m) => sum + m.customers, 0),
    },
  };
}

/**
 * Get global dashboard stats
 */
async function getDashboardStats(accessLevel) {
  const restricted = isReviewLevel(accessLevel);
  // Review accounts never hit the shared cache (it holds the real, unrestricted totals) —
  // recomputed scoped every time instead.
  const cacheKey = 'admin:dashboard';
  if (!restricted) {
    const cached = await redisGet(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const userWhere = restricted ? { email: { in: REVIEW_ALLOWED_EMAILS } } : {};
  const orderWhere = restricted ? { user: { email: { in: REVIEW_ALLOWED_EMAILS } } } : {};
  // A company/batch counts as "in scope" for the review account if at least one of its
  // orders belongs to one of the two allowed customers.
  const companyWhere = restricted ? { orders: { some: orderWhere } } : {};
  const batchWhere = restricted ? { orders: { some: orderWhere } } : {};

  const [
    totalCompanies,
    activeCompanies,
    verifiedCompanies,
    totalBatches,
    activeBatches,
    totalUsers,
    totalOrders,
    paidOrders,
    totalCertificates,
    issuedCertificates,
    revenueResult,
    recentCompanies,
    recentOrders,
  ] = await Promise.all([
    db.company.count({ where: companyWhere }),
    db.company.count({ where: { ...companyWhere, is_active: true } }),
    db.company.count({ where: { ...companyWhere, is_verified: true } }),
    db.batch.count({ where: batchWhere }),
    db.batch.count({ where: { ...batchWhere, status: 'ACTIVE' } }),
    db.user.count({ where: userWhere }),
    db.order.count({ where: orderWhere }),
    db.order.count({ where: { ...orderWhere, status: 'PAID' } }),
    db.certificate.count({ where: restricted ? { user: userWhere } : {} }),
    db.certificate.count({ where: { ...(restricted ? { user: userWhere } : {}), is_issued: true } }),
    db.order.aggregate({ where: { ...orderWhere, status: 'PAID' }, _sum: { amount: true } }),
    restricted
      ? Promise.resolve([])
      : db.company.findMany({
          take: 5,
          orderBy: { created_at: 'desc' },
          select: { id: true, name: true, email: true, is_verified: true, created_at: true },
        }),
    db.order.findMany({
      where: orderWhere,
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { name: true } },
        company: { select: { name: true } },
        batch: { select: { name: true } },
      },
    }),
  ]);

  const stats = {
    companies: { total: totalCompanies, active: activeCompanies, verified: verifiedCompanies },
    batches: { total: totalBatches, active: activeBatches },
    users: { total: totalUsers },
    orders: { total: totalOrders, paid: paidOrders },
    certificates: { total: totalCertificates, issued: issuedCertificates },
    revenue: { total: revenueResult._sum.amount || 0, currency: 'INR' },
    recent_companies: recentCompanies,
    recent_orders: recentOrders,
  };

  if (!restricted) await redisSet(cacheKey, JSON.stringify(stats), 120); // 2 min cache
  return stats;
}

/**
 * Sidebar nav badge counts for the review/demo account — how many orders, users, batches,
 * and organizations are in its scope (the two allowed customers only).
 */
async function getReviewScopeCounts() {
  const orderWhere = { user: { email: { in: REVIEW_ALLOWED_EMAILS } } };
  const [orders, users, batches, companies] = await Promise.all([
    db.order.count({ where: orderWhere }),
    db.user.count({ where: { email: { in: REVIEW_ALLOWED_EMAILS } } }),
    db.batch.count({ where: { orders: { some: orderWhere } } }),
    db.company.count({ where: { orders: { some: orderWhere } } }),
  ]);
  return { orders, users, batches, companies };
}

/**
 * Get all payments (admin view)
 */
async function getAllPayments(query = {}, accessLevel) {
  const { page = 1, limit = 20, status, company_id } = query;
  const skip = (page - 1) * limit;

  const orderFilter = {
    ...(company_id && { company_id }),
    ...(isReviewLevel(accessLevel) && { user: { email: { in: REVIEW_ALLOWED_EMAILS } } }),
  };
  const where = {
    ...(status && { status }),
    ...(Object.keys(orderFilter).length && { order: orderFilter }),
  };

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      include: {
        order: {
          include: {
            user: { select: { name: true, email: true } },
            company: { select: { name: true } },
            batch: { select: { name: true } },
            certificate: { select: { verification_hash: true, is_issued: true, certificate_serial: true } },
          },
        },
      },
    }),
    db.payment.count({ where }),
  ]);

  return { payments, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
}

/**
 * Get order for invoice (admin — any order)
 */
async function getOrderForInvoice(orderId) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      batch: { include: { program: { select: { name: true, type: true } }, company: { select: { name: true } } } },
      certificate: { select: { verification_hash: true, is_issued: true, certificate_serial: true, issued_at: true } },
      payments: { where: { status: 'SUCCESS' }, orderBy: { created_at: 'desc' }, take: 1 },
    },
  });
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  return order;
}

/**
 * Unified invoice list: real per-Order invoices (website checkout) plus PayU Button
 * transactions (captured, no Order behind them — see accounting module) shown as receipts.
 * PayU Button rows have no company_id, so they're excluded whenever filtering by company.
 * Both sources are fetched in full and merged/paginated in-process — acceptable at the current
 * scale (thousands of rows per quarter), revisit with a DB-level UNION if volume grows much
 * further.
 */
async function getAllInvoices(query = {}, accessLevel) {
  const { page = 1, limit = 20, search, company_id } = query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const restricted = isReviewLevel(accessLevel);

  const orderFilter = {
    ...(company_id && { company_id }),
    ...(restricted && { user: { email: { in: REVIEW_ALLOWED_EMAILS } } }),
  };
  const where = {
    ...(Object.keys(orderFilter).length && { order: orderFilter }),
    ...(search && {
      OR: [
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { payu_txn_id: { contains: search, mode: 'insensitive' } },
        { order: { user: { name: { contains: search, mode: 'insensitive' } } } },
        { order: { user: { email: { contains: search, mode: 'insensitive' } } } },
      ],
    }),
  };

  const orderInvoices = await db.invoice.findMany({
    where,
    orderBy: { generated_at: 'desc' },
    include: {
      order: {
        select: {
          id: true,
          certificate_serial: true,
          status: true,
          user: { select: { name: true, email: true } },
          company: { select: { name: true } },
          batch: {
            select: {
              name: true,
              program: { select: { name: true, type: true } },
            },
          },
        },
      },
    },
  });

  let payuInvoices = [];
  if (!company_id && !restricted) {
    const payuWhere = {
      status: 'captured',
      source_channel: 'PAYU_BUTTON',
      ...(search && {
        OR: [
          { txnid: { contains: search, mode: 'insensitive' } },
          { payu_id: { contains: search, mode: 'insensitive' } },
          { firstname: { contains: search, mode: 'insensitive' } },
          { lastname: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const transactions = await db.payuTransaction.findMany({ where: payuWhere, orderBy: { addedon: 'desc' } });
    payuInvoices = transactions.map((t) => ({
      id: `payu-${t.payu_id}`,
      type: 'PAYU_BUTTON',
      invoice_number: `PU-${t.payu_id}`,
      amount: t.amount,
      currency: 'INR',
      payu_txn_id: t.txnid,
      payu_id: t.payu_id,
      paid_at: t.success_at || t.addedon,
      generated_at: t.success_at || t.addedon,
      download_count: 0,
      order: {
        id: null,
        user: { name: [t.firstname, t.lastname].filter(Boolean).join(' ') || null, email: t.email },
        company: { name: null },
        batch: { name: t.productinfo, program: { name: null, type: null } },
      },
    }));
  }

  const combined = [
    ...orderInvoices.map((inv) => ({ ...inv, type: 'ORDER' })),
    ...payuInvoices,
  ].sort((a, b) => new Date(b.paid_at || b.generated_at || 0).getTime() - new Date(a.paid_at || a.generated_at || 0).getTime());

  const total = combined.length;
  const skip = (pageNum - 1) * limitNum;
  const pageItems = combined.slice(skip, skip + limitNum);

  // Fee/net breakdown is only computed for the current page's PayU Button rows (not all 1786+
  // at once) — each one needs a couple of settlement lookups, cheap for 20 rows, expensive for
  // the full list.
  const payuIdsOnPage = pageItems.filter((inv) => inv.type === 'PAYU_BUTTON').map((inv) => inv.payu_id);
  const feesByPayuId = await getTransactionFeesForPayuIds(payuIdsOnPage);
  const pageItemsWithFees = pageItems.map((inv) => {
    if (inv.type !== 'PAYU_BUTTON') return inv;
    const fee = feesByPayuId.get(inv.payu_id);
    if (!fee) return inv;
    return { ...inv, payu_fee: fee.totalFee, net_amount: fee.netAmount };
  });

  return {
    invoices: pageItemsWithFees,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Create a company on behalf of an organization — mirrors auth.service.registerCompany but
 * delivers credentials via a set-password link (reusing the reset_token flow already on the
 * Company model) instead of returning a session, since the admin is creating this for someone
 * else, not registering themselves.
 */
async function createCompany({ name, email, phone, website, description }) {
  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await db.company.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw Object.assign(new Error('A company with this email already exists'), { statusCode: 409 });
  }

  const password_hash = await hashPassword(generateRandomToken(24));
  const company = await db.company.create({
    data: {
      name,
      email: normalizedEmail,
      phone: phone || null,
      website: website || null,
      description: description || null,
      password_hash,
      is_active: true,
      is_verified: false,
    },
    select: {
      id: true, name: true, email: true, phone: true, website: true,
      is_active: true, is_verified: true, created_at: true,
    },
  });

  const rawToken = generateRandomToken(32);
  const hashedToken = sha256(rawToken);
  await db.company.update({
    where: { id: company.id },
    data: { reset_token: hashedToken, reset_token_expires: new Date(Date.now() + 60 * 60 * 1000) },
  });
  const setPasswordUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${rawToken}&type=company`;
  sendCompanyWelcomeEmail({ name: company.name, email: company.email, setPasswordUrl });

  return company;
}

/**
 * Get all users (admin view) — paginated, with each row's recent batch enrollments.
 */
async function listUsers(query = {}, accessLevel) {
  const { page = 1, limit = 20, search, company_id, batch_id } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(isReviewLevel(accessLevel) && { email: { in: REVIEW_ALLOWED_EMAILS } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    }),
    // Only real customers — someone actually enrolled in a batch (real payment or manual
    // comp), not a raw imported PayU-report contact that was never assigned anywhere.
    orders: { some: { ...(company_id && { company_id }), ...(batch_id && { batch_id }) } },
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        is_verified: true,
        created_at: true,
        orders: {
          orderBy: { created_at: 'desc' },
          take: 5,
          select: {
            status: true,
            is_manual_enrollment: true,
            batch: { select: { name: true } },
            company: { select: { name: true } },
          },
        },
        _count: { select: { orders: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  // "Joined" should read as the real transaction (PayU payment) date, not `user.created_at` —
  // for Excel/bulk-imported customers, created_at is just whenever the import ran, which can
  // trail the actual payment by days or weeks and misleads admins reading the table.
  const earliestOrders = await db.order.findMany({
    where: { user_id: { in: users.map((u) => u.id) } },
    select: {
      user_id: true,
      created_at: true,
      payments: { select: { created_at: true }, orderBy: { created_at: 'asc' }, take: 1 },
    },
  });
  const joinedAtByUser = new Map();
  for (const o of earliestOrders) {
    const txnDate = o.payments[0]?.created_at || o.created_at;
    const existing = joinedAtByUser.get(o.user_id);
    if (!existing || txnDate < existing) joinedAtByUser.set(o.user_id, txnDate);
  }
  const usersWithJoinedAt = users.map((u) => ({ ...u, joined_at: joinedAtByUser.get(u.id) || u.created_at }));

  return {
    users: usersWithJoinedAt,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  };
}

/**
 * Bulk-delete user accounts. Refuses to delete any user with a real (non-manual) order —
 * that would cascade-delete Payment/Invoice rows, destroying financial/audit records — so
 * only accidental duplicates, test accounts, or comp/manual-enrollment-only users can be
 * removed this way. One bad id never blocks the rest, matching the bulk-import UX pattern.
 */
async function deleteUsers(userIds = []) {
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      orders: { select: { is_manual_enrollment: true } },
    },
  });

  const foundIds = new Set(users.map((u) => u.id));
  const errors = [];
  const deletableIds = [];

  for (const id of userIds) {
    if (!foundIds.has(id)) { errors.push({ id, reason: 'User not found' }); continue; }
    const user = users.find((u) => u.id === id);
    const hasRealOrder = user.orders.some((o) => !o.is_manual_enrollment);
    if (hasRealOrder) {
      errors.push({ id, email: user.email, reason: 'Has a real paid enrollment — cannot delete' });
      continue;
    }
    deletableIds.push(id);
  }

  if (deletableIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: deletableIds } } });
  }

  return { deleted: deletableIds.length, errors };
}

/**
 * Admin-triggered delete for an organization — only allowed if it has never had a real
 * order or certificate under it, so a click can't ever destroy paid customer history.
 * Empty/test organizations (and their still-empty programs/batches) cascade-delete fine
 * since there's nothing under them to lose.
 */
async function deleteCompany(companyId) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, _count: { select: { orders: true, certificates: true } } },
  });
  if (!company) throw Object.assign(new Error('Organization not found'), { statusCode: 404 });
  if (company._count.orders > 0 || company._count.certificates > 0) {
    throw Object.assign(
      new Error('Cannot delete — this organization has orders or certificates on record'),
      { statusCode: 409 }
    );
  }
  await db.company.delete({ where: { id: companyId } });
  return { success: true };
}

/**
 * Admin-triggered delete for a batch — same real-activity guard as deleteCompany.
 */
async function deleteBatch(companyId, batchId) {
  const batch = await db.batch.findFirst({
    where: { id: batchId, company_id: companyId },
    select: { id: true, _count: { select: { orders: true, certificates: true } } },
  });
  if (!batch) throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  if (batch._count.orders > 0 || batch._count.certificates > 0) {
    throw Object.assign(
      new Error('Cannot delete — this batch has orders or certificates on record'),
      { statusCode: 409 }
    );
  }
  await db.batch.delete({ where: { id: batchId } });
  return { success: true };
}

/**
 * Admin-triggered "resend credentials" action for an organization login — same pattern as
 * resendUserPassword, for when a company admin never got (or lost) their original
 * set-password email.
 */
async function resendCompanyPassword(companyId) {
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw Object.assign(new Error('Organization not found'), { statusCode: 404 });

  const newPassword = generateRandomToken(8);
  const password_hash = await hashPassword(newPassword);
  await db.company.update({ where: { id: companyId }, data: { password_hash } });

  await sendSystemGeneratedPasswordEmail({
    name: company.name,
    email: company.email,
    password: newPassword,
    loginUrl: `${env.FRONTEND_URL}/auth/company/login`,
  });

  return { success: true };
}

/**
 * Admin-triggered "resend credentials" action — generates a brand new system password for
 * this account, saves it, and emails the literal password to the user so they can log in
 * immediately. Used from the Order Detail panel when a customer says they never got (or
 * lost) their original login email.
 */
async function resendUserPassword(userId) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const newPassword = generateRandomToken(8);
  const password_hash = await hashPassword(newPassword);
  await db.user.update({ where: { id: userId }, data: { password_hash } });

  await sendSystemGeneratedPasswordEmail({
    name: user.name,
    email: user.email,
    password: newPassword,
    loginUrl: `${env.FRONTEND_URL}/auth/user/login`,
  });
  logDeliveryEvent(userId, 'SYSTEM_PASSWORD_SENT');

  return { success: true };
}

/**
 * Admin-triggered "send certificate" action — emails the already-issued certificate to the
 * customer on demand. Distinct from automatic issuance (issueCertificatesAdmin generates and
 * queues the certificate); this just (re-)sends the notification email, for cases like the
 * original email bouncing or the customer asking for it again.
 */
async function resendCertificateEmail(orderId) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      batch: { include: { program: { select: { type: true } }, company: { select: { name: true } } } },
      certificate: true,
    },
  });
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  if (!order.certificate?.is_issued) {
    throw Object.assign(new Error('Certificate has not been issued yet'), { statusCode: 400 });
  }

  const verificationHash = order.certificate.verification_hash;
  await sendCertificateIssuedEmail({
    userName: order.user.name,
    userEmail: order.user.email,
    batchName: order.batch.name,
    companyName: order.batch.company.name,
    programType: order.batch.program.type,
    role: order.batch.role,
    startDate: order.batch.start_date,
    endDate: order.batch.end_date,
    certificateSerial: order.certificate_serial,
    verificationHash,
    verificationUrl: `${env.FRONTEND_URL}/verify/${verificationHash}`,
    downloadUrl: order.certificate.certificate_url,
  });
  logDeliveryEvent(order.user_id, 'CERTIFICATE_ISSUED_EMAIL_SENT', orderId);

  return { success: true };
}

/**
 * Register (or enroll an existing user in) a specific company + batch without a real payment —
 * used by both the manual "Add User" form and each row of a bulk Excel upload. Creates a PAID,
 * amount-0, is_manual_enrollment order so the company's existing "Issue Certificates" workflow
 * picks it up unchanged, but deliberately skips Payment/Invoice creation since no real
 * transaction happened (keeps these out of revenue/reconciliation reports).
 */
async function registerUserForBatch({ name, email, phone, company_id, batch_id }) {
  const normalizedEmail = String(email).toLowerCase().trim();

  const batch = await db.batch.findUnique({
    where: { id: batch_id },
    include: { company: { select: { id: true, name: true, is_active: true } } },
  });
  if (!batch) throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  if (batch.company_id !== company_id) {
    throw Object.assign(new Error('Batch does not belong to the selected company'), { statusCode: 400 });
  }
  if (!batch.company?.is_active) {
    throw Object.assign(new Error('This company account is inactive'), { statusCode: 400 });
  }
  if (!batch.is_active || batch.status === 'COMPLETED' || batch.status === 'HOLD') {
    throw Object.assign(new Error(`Batch is ${batch.status.toLowerCase()} — cannot enroll new participants`), { statusCode: 400 });
  }

  let user = await db.user.findUnique({ where: { email: normalizedEmail } });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const password_hash = await hashPassword(generateRandomToken(24));
    user = await db.user.create({
      data: { name, email: normalizedEmail, phone: phone || null, password_hash, is_verified: false },
    });
  } else {
    const existingOrder = await db.order.findFirst({ where: { user_id: user.id, batch_id } });
    if (existingOrder) {
      throw Object.assign(new Error(`${normalizedEmail} is already enrolled in this batch`), { statusCode: 409 });
    }
  }

  const order = await withUniqueCertificateSerial(batch_id, (certificateSerial) => db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        user_id: user.id,
        batch_id,
        company_id,
        certificate_serial: certificateSerial,
        amount: 0,
        currency: batch.currency,
        status: 'PAID',
        is_manual_enrollment: true,
      },
    });

    const verificationHash = generateVerificationHash(certificateSerial, user.id, batch_id);
    const template = await tx.certificateTemplate.findFirst({
      where: { batch_id, is_active: true },
      orderBy: { created_at: 'desc' },
    });
    await tx.certificate.create({
      data: {
        order_id: created.id,
        user_id: user.id,
        batch_id,
        company_id,
        certificate_serial: certificateSerial,
        template_id: template?.id || null,
        is_issued: false,
        verification_hash: verificationHash,
      },
    });

    return created;
  }));

  // No login/enrollment email is sent here — account creation and email delivery are
  // deliberately decoupled. An admin sends credentials explicitly, per user, via
  // resendUserPassword ("Send Login Email" in the Order Detail panel) whenever they're
  // actually ready to notify that participant, rather than every row in a bulk upload
  // firing an email automatically.

  return { user_id: user.id, order_id: order.id, is_new_user: isNewUser };
}

/**
 * Enroll a set of already-registered users (picked from the admin Users list) into a
 * company's batch — reuses registerUserForBatch's existing-user branch directly, so these
 * get the same PAID/₹0/is_manual_enrollment Order + "you've been enrolled" email as any
 * other existing-user enrollment path.
 */
async function enrollExistingUsers({ company_id, batch_id, user_ids }) {
  const users = await db.user.findMany({
    where: { id: { in: user_ids } },
    select: { id: true, email: true },
  });

  const result = { total: users.length, enrolled: 0, errors: [] };

  for (const u of users) {
    try {
      await registerUserForBatch({ email: u.email, company_id, batch_id });
      result.enrolled += 1;
    } catch (err) {
      result.errors.push({ user_id: u.id, email: u.email, reason: err.message });
    }
  }

  return result;
}

/**
 * Bulk-enroll users from an uploaded Excel/CSV file into one company + batch. One bad row never
 * aborts the rest — each row is processed independently and results are aggregated.
 *
 * Auto-detects a raw PayU transaction-report export (has both `amount` and `txnid` columns)
 * and routes it to bulkImportPayuTransactionsToBatch instead — that path creates real PAID
 * orders with the file's actual amount, a Payment, and an Invoice, rather than the ₹0
 * manual-enrollment orders a plain Name/Email roster produces. This is the single place PayU
 * export data enters the system (the standalone Accounting import page was removed).
 */
async function bulkUploadUsers({ company_id, batch_id, file }) {
  const buffer = fs.readFileSync(file.path);

  if (looksLikePayuTransactionReport(buffer)) {
    return bulkImportPayuTransactionsToBatch({ company_id, batch_id, buffer });
  }

  const { rows, errors: parseErrors } = parseUserImportFile(buffer);

  const result = { total_rows: rows.length, created: 0, enrolled_existing: 0, errors: [...parseErrors] };

  // registerUserForBatch does its own bcrypt hash + $transaction per new user — sequentially
  // awaiting that per row made even a moderate-sized roster feel like it hung (same class of
  // bug found and fixed for the PayU import paths earlier). Run rows concurrently in bounded
  // batches instead — generateCertificateSerial's atomic increment makes this safe.
  const CONCURRENCY = 5;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const outcomes = await Promise.allSettled(batch.map((row) => registerUserForBatch({
      name: row.name,
      email: row.email,
      phone: row.phone,
      company_id,
      batch_id,
    })));

    outcomes.forEach((outcome, idx) => {
      const row = batch[idx];
      if (outcome.status === 'fulfilled') {
        if (outcome.value.is_new_user) result.created += 1;
        else result.enrolled_existing += 1;
      } else {
        result.errors.push({ rowNum: row.rowNum, email: row.email, reason: outcome.reason.message });
      }
    });
    await new Promise((resolve) => setImmediate(resolve));
  }

  return result;
}

/**
 * Bulk-enroll from a raw PayU transaction-report export directly into one company + batch —
 * combines what used to be a two-step flow (Accounting import → per-batch Assign Transactions)
 * into the single Bulk Upload action. Every row is still upserted into payu_transactions (so
 * Order Log stays a complete record of every payment received, matched or not); only
 * `captured` rows go on to create a real Order + Certificate + Payment + Invoice.
 */
async function bulkImportPayuTransactionsToBatch({ company_id, batch_id, buffer }) {
  const batch = await db.batch.findUnique({
    where: { id: batch_id },
    include: { company: { select: { id: true, name: true, is_active: true } } },
  });
  if (!batch) throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  if (batch.company_id !== company_id) {
    throw Object.assign(new Error('Batch does not belong to the selected company'), { statusCode: 400 });
  }
  if (!batch.company?.is_active) {
    throw Object.assign(new Error('This company account is inactive'), { statusCode: 400 });
  }

  const { rows } = parseTransactionReport(buffer);
  const result = { total_rows: rows.length, created: 0, enrolled_existing: 0, skipped_not_captured: 0, errors: [] };

  const CONCURRENCY = 5;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    const outcomes = await Promise.allSettled(chunk.map((row) => importOnePayuRowToBatch(row, batch, company_id)));

    outcomes.forEach((outcome, idx) => {
      const row = chunk[idx];
      if (outcome.status === 'fulfilled') {
        if (outcome.value === 'not_captured') result.skipped_not_captured += 1;
        else if (outcome.value === 'created') result.created += 1;
        else result.enrolled_existing += 1;
      } else {
        result.errors.push({ email: row.email, reason: outcome.reason.message });
      }
    });
    await new Promise((resolve) => setImmediate(resolve));
  }

  return result;
}

/**
 * One row of a PayU transaction-report import: always upserts the raw transaction (audit
 * trail, regardless of outcome); only `captured` rows with an email go on to create a real
 * enrollment. Mirrors assignTransactionsToBatch's order/certificate/payment/invoice shape.
 */
async function importOnePayuRowToBatch(txn, batch, company_id) {
  await db.payuTransaction.upsert({
    where: { payu_id: txn.payu_id },
    create: txn,
    update: txn,
  });

  if ((txn.status || '').toLowerCase() !== 'captured') return 'not_captured';
  if (!txn.email) throw new Error('Captured transaction has no customer email');

  const email = txn.email.toLowerCase().trim();
  let user = await db.user.findUnique({ where: { email } });
  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    const name = [txn.firstname, txn.lastname].filter(Boolean).join(' ').trim() || email.split('@')[0];
    // Same tradeoff as importPayuButtonCustomers — no email step, password = email.
    const password_hash = await hashPassword(email);
    user = await db.user.create({
      data: { name, email, phone: txn.phone || null, password_hash, is_verified: true },
    });
  }

  const existingOrder = await db.order.findFirst({ where: { user_id: user.id, batch_id: batch.id } });
  if (existingOrder) return 'enrolled_existing';

  const paidAt = txn.success_at || txn.addedon || new Date();
  const amount = txn.amount || 0;

  await withUniqueCertificateSerial(batch.id, (certificateSerial) => db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        user_id: user.id,
        batch_id: batch.id,
        company_id,
        certificate_serial: certificateSerial,
        amount,
        currency: batch.currency || 'INR',
        status: 'PAID',
        payu_txn_id: txn.txnid,
        is_manual_enrollment: false,
      },
    });

    const verificationHash = generateVerificationHash(certificateSerial, user.id, batch.id);
    const template = await tx.certificateTemplate.findFirst({
      where: { batch_id: batch.id, is_active: true },
      orderBy: { created_at: 'desc' },
    });
    await tx.certificate.create({
      data: {
        order_id: order.id,
        user_id: user.id,
        batch_id: batch.id,
        company_id,
        certificate_serial: certificateSerial,
        template_id: template?.id || null,
        is_issued: false,
        verification_hash: verificationHash,
      },
    });

    await tx.payment.create({
      data: {
        order_id: order.id,
        payu_txn_id: txn.txnid,
        payu_payment_id: txn.payu_id,
        amount,
        currency: batch.currency || 'INR',
        status: 'SUCCESS',
        gateway_response: txn.raw || {},
        created_at: paidAt,
      },
    });

    await tx.invoice.create({
      data: {
        order_id: order.id,
        invoice_number: `INV-${certificateSerial}`,
        amount,
        currency: batch.currency || 'INR',
        payu_txn_id: txn.txnid,
        paid_at: paidAt,
      },
    });

    await tx.payuTransaction.update({ where: { payu_id: txn.payu_id }, data: { order_id: order.id } });

    if (isNewUser) {
      await tx.deliveryEvent.create({ data: { user_id: user.id, event: 'USER_CREATED' } });
    }
    await tx.deliveryEvent.create({ data: { user_id: user.id, order_id: order.id, event: 'BATCH_ASSIGNED' } });

    return order;
  }));

  return isNewUser ? 'created' : 'enrolled_existing';
}

/**
 * Import PayU Button customers (captured transactions with no ValidStep order behind them,
 * see PayuTransaction.source_channel) as standalone User accounts so they can log into the
 * customer portal. Password is set to the account's own email address (no set-password email,
 * no forced change) per explicit product decision — every account is otherwise a normal User row.
 * Existing accounts (matched by email) are left untouched, never overwritten.
 */
async function importPayuButtonCustomers() {
  const candidates = await db.payuTransaction.findMany({
    where: { source_channel: 'PAYU_BUTTON', status: 'captured', email: { not: null } },
    select: { email: true, firstname: true, lastname: true, phone: true },
    distinct: ['email'],
  });

  // One query to find which emails already have accounts, instead of N sequential lookups —
  // matters at this table's real scale (thousands of PayU Button transactions).
  const existing = await db.user.findMany({
    where: { email: { in: candidates.map((c) => c.email.toLowerCase().trim()) } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((u) => u.email));

  const toCreate = candidates.filter((c) => !existingEmails.has(c.email.toLowerCase().trim()));

  // bcrypt (bcryptjs, pure-JS, no native thread offload) is CPU-bound — an unbounded
  // Promise.all over thousands of rows queues that many CPU-bound continuations back-to-back
  // on the single event loop, starving every other request on this process (confirmed: this
  // exact pattern froze the entire server, including login, for 5+ minutes). Bounded batches
  // + an explicit yield between them keeps the server responsive throughout.
  const HASH_BATCH_SIZE = 5;
  const rows = [];
  for (let i = 0; i < toCreate.length; i += HASH_BATCH_SIZE) {
    const batch = toCreate.slice(i, i + HASH_BATCH_SIZE);
    const hashed = await Promise.all(batch.map(async (c) => {
      const email = c.email.toLowerCase().trim();
      const name = [c.firstname, c.lastname].filter(Boolean).join(' ').trim() || email.split('@')[0];
      const password_hash = await hashPassword(email);
      return { name, email, phone: c.phone || null, password_hash, is_verified: true };
    }));
    rows.push(...hashed);
    await new Promise((resolve) => setImmediate(resolve));
  }

  if (rows.length > 0) {
    await db.user.createMany({ data: rows, skipDuplicates: true });
  }

  return {
    total_candidates: candidates.length,
    created: rows.length,
    skipped_existing: candidates.length - rows.length,
  };
}

/**
 * List captured, not-yet-assigned transactions for the "assign to batch" picker.
 */
async function getAssignableTransactions({ from, to, search } = {}) {
  const addedonRange = {};
  if (from) addedonRange.gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setUTCHours(23, 59, 59, 999);
    addedonRange.lte = end;
  }

  const where = {
    status: 'captured',
    order_id: null,
    ...(Object.keys(addedonRange).length && { addedon: addedonRange }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstname: { contains: search, mode: 'insensitive' } },
        { lastname: { contains: search, mode: 'insensitive' } },
        { txnid: { contains: search, mode: 'insensitive' } },
        { payu_id: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const transactions = await db.payuTransaction.findMany({
    where,
    orderBy: { addedon: 'desc' },
    take: 200,
    select: {
      payu_id: true, txnid: true, email: true, firstname: true, lastname: true,
      amount: true, addedon: true, success_at: true, productinfo: true,
    },
  });

  return { transactions };
}

/**
 * Assign a set of imported, captured PayU transactions to a company's batch — the
 * real-money counterpart to registerUserForBatch (which stays as-is for genuine $0 comp
 * enrollments). Creates a real Order (actual amount + payu_txn_id), Payment, and Invoice,
 * backdated to the transaction's own success_at/addedon — this data represents actual
 * collected revenue and must show up in Payments/Invoices, unlike manual enrollments.
 */
async function assignTransactionsToBatch({ company_id, batch_id, payu_ids }) {
  const batch = await db.batch.findUnique({
    where: { id: batch_id },
    include: { company: { select: { id: true, name: true, is_active: true } } },
  });
  if (!batch) throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  if (batch.company_id !== company_id) {
    throw Object.assign(new Error('Batch does not belong to the selected company'), { statusCode: 400 });
  }

  const transactions = await db.payuTransaction.findMany({
    where: { payu_id: { in: payu_ids }, status: 'captured' },
  });

  const result = { total: transactions.length, assigned: 0, errors: [] };

  for (const txn of transactions) {
    try {
      if (txn.order_id) {
        throw Object.assign(new Error('Transaction is already assigned to a batch'), { statusCode: 409 });
      }
      if (!txn.email) {
        throw Object.assign(new Error('Transaction has no customer email'), { statusCode: 400 });
      }

      const email = txn.email.toLowerCase().trim();
      let user = await db.user.findUnique({ where: { email } });
      let isNewUser = false;
      if (!user) {
        isNewUser = true;
        const name = [txn.firstname, txn.lastname].filter(Boolean).join(' ').trim() || email.split('@')[0];
        // Same tradeoff as importPayuTransactions — no email step, password = email.
        const password_hash = await hashPassword(email);
        user = await db.user.create({
          data: { name, email, phone: txn.phone || null, password_hash, is_verified: true },
        });
      }

      const existingOrder = await db.order.findFirst({ where: { user_id: user.id, batch_id } });
      if (existingOrder) {
        throw Object.assign(new Error(`${email} is already enrolled in this batch`), { statusCode: 409 });
      }

      const paidAt = txn.success_at || txn.addedon || new Date();
      const amount = txn.amount || 0;

      await withUniqueCertificateSerial(batch_id, (certificateSerial) => db.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            user_id: user.id,
            batch_id,
            company_id,
            certificate_serial: certificateSerial,
            amount,
            currency: batch.currency || 'INR',
            status: 'PAID',
            payu_txn_id: txn.txnid,
            is_manual_enrollment: false,
          },
        });

        const verificationHash = generateVerificationHash(certificateSerial, user.id, batch_id);
        const template = await tx.certificateTemplate.findFirst({
          where: { batch_id, is_active: true },
          orderBy: { created_at: 'desc' },
        });
        await tx.certificate.create({
          data: {
            order_id: order.id,
            user_id: user.id,
            batch_id,
            company_id,
            certificate_serial: certificateSerial,
            template_id: template?.id || null,
            is_issued: false,
            verification_hash: verificationHash,
          },
        });

        await tx.payment.create({
          data: {
            order_id: order.id,
            payu_txn_id: txn.txnid,
            payu_payment_id: txn.payu_id,
            amount,
            currency: batch.currency || 'INR',
            status: 'SUCCESS',
            gateway_response: txn.raw || {},
            created_at: paidAt,
          },
        });

        await tx.invoice.create({
          data: {
            order_id: order.id,
            invoice_number: `INV-${certificateSerial}`,
            amount,
            currency: batch.currency || 'INR',
            payu_txn_id: txn.txnid,
            paid_at: paidAt,
          },
        });

        await tx.payuTransaction.update({ where: { payu_id: txn.payu_id }, data: { order_id: order.id } });

        if (isNewUser) {
          await tx.deliveryEvent.create({ data: { user_id: user.id, event: 'USER_CREATED' } });
        }
        await tx.deliveryEvent.create({ data: { user_id: user.id, order_id: order.id, event: 'BATCH_ASSIGNED' } });
      }));

      result.assigned += 1;
    } catch (err) {
      result.errors.push({ payu_id: txn.payu_id, email: txn.email, reason: err.message });
    }
  }

  return result;
}

/**
 * Order Log — compliance-facing report pairing every imported PayU transaction with its
 * enrollment/order status. Built for exactly the kind of evidence a payment processor risk
 * review asks for: "here's every payment we received, verified against the PayU transaction
 * report, and here's the participant enrollment record it produced." Includes transactions
 * that haven't been assigned to a batch yet (shown as unlinked) so nothing imported is hidden.
 */
async function getOrderLog(query = {}, accessLevel) {
  const { page = 1, limit = 20, from, to, status, company_id, search } = query;
  const skip = (page - 1) * limit;

  const createdRange = {};
  if (from) createdRange.gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setUTCHours(23, 59, 59, 999);
    createdRange.lte = end;
  }

  const where = {
    ...(isReviewLevel(accessLevel) && { user: { email: { in: REVIEW_ALLOWED_EMAILS } } }),
    ...(Object.keys(createdRange).length && { created_at: createdRange }),
    ...(status && { status }),
    ...(company_id && { company_id }),
    ...(search && {
      OR: [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
        { batch: { name: { contains: search, mode: 'insensitive' } } },
        { certificate_serial: { contains: search, mode: 'insensitive' } },
        { payu_txn_id: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      select: {
        id: true, certificate_serial: true, amount: true, currency: true, status: true,
        is_manual_enrollment: true, payu_txn_id: true, created_at: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        company: { select: { id: true, name: true } },
        batch: {
          select: {
            name: true, start_date: true, end_date: true, certificate_delivery_date: true,
            program: { select: { name: true, type: true } },
          },
        },
        certificate: { select: { is_issued: true, issued_at: true } },
        invoice: { select: { invoice_number: true } },
        payments: {
          where: { status: 'SUCCESS' },
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { created_at: true, payu_txn_id: true },
        },
      },
    }),
    db.order.count({ where }),
  ]);

  const orderLog = orders.map((o) => ({
    ...o,
    payment_date: o.payments[0]?.created_at || null,
    payments: undefined,
  }));

  return {
    orderLog,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  };
}

/**
 * Full detail for a single order — everything the "View Detailed" panel shows: the
 * enrollment itself, its delivery-event timeline (order created, emails sent, certificate
 * generated/downloaded, invoice downloaded), how many times its certificate has been
 * verified, and any queries the customer has raised about it.
 */
async function getOrderDetail(orderId, accessLevel) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, created_at: true } },
      company: { select: { id: true, name: true } },
      batch: { include: { program: { select: { name: true, type: true } } } },
      certificate: true,
      invoice: true,
      payments: { orderBy: { created_at: 'desc' } },
    },
  });
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  if (isReviewLevel(accessLevel) && !REVIEW_ALLOWED_EMAILS.includes(order.user?.email)) {
    throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  }

  const [events, verificationCount, queries] = await Promise.all([
    db.deliveryEvent.findMany({
      where: { OR: [{ order_id: orderId }, { user_id: order.user_id, order_id: null }] },
      orderBy: { created_at: 'asc' },
    }),
    order.certificate
      ? db.verificationLog.count({ where: { certificate_id: order.certificate.id } })
      : Promise.resolve(0),
    db.customerQuery.findMany({
      where: { OR: [{ order_id: orderId }, { user_id: order.user_id, order_id: null }] },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return { order, events, verification_count: verificationCount, queries };
}

async function resolveQuery(queryId) {
  const query = await db.customerQuery.findUnique({ where: { id: queryId } });
  if (!query) throw Object.assign(new Error('Query not found'), { statusCode: 404 });
  return db.customerQuery.update({ where: { id: queryId }, data: { status: query.status === 'OPEN' ? 'RESOLVED' : 'OPEN' } });
}

module.exports = {
  getCompanies,
  getCompanyById,
  updateCompanyStatus,
  getAllBatches,
  getAllPayments,
  getOrderForInvoice,
  getAllInvoices,
  getPricingConfigs,
  updatePricingConfig,
  getDashboardStats,
  getReviewScopeCounts,
  getMonthlyAnalytics,
  getAdminBatchById,
  getAdminBatchStats,
  getAdminBatchOrders,
  exportAdminBatchOrders,
  getAdminBatchCertificates,
  issueCertificatesAdmin,
  listUsers,
  deleteUsers,
  deleteCompany,
  deleteBatch,
  resendCompanyPassword,
  resendUserPassword,
  resendCertificateEmail,
  registerUserForBatch,
  bulkUploadUsers,
  importPayuButtonCustomers,
  createCompany,
  enrollExistingUsers,
  getAssignableTransactions,
  assignTransactionsToBatch,
  getOrderLog,
  getOrderDetail,
  resolveQuery,
};
