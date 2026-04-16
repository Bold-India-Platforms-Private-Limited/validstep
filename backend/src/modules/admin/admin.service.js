'use strict';

const { db } = require('../../config/database');
const { redisGet, redisSet } = require('../../config/redis');

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
    ...(is_active !== undefined && { is_active: is_active === 'true' }),
    ...(is_verified !== undefined && { is_verified: is_verified === 'true' }),
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
async function getAdminBatchStats(batchId) {
  const [grouped, revenue] = await Promise.all([
    db.order.groupBy({
      by: ['status'],
      where: { batch_id: batchId },
      _count: { id: true },
    }),
    db.order.aggregate({
      where: { batch_id: batchId, status: 'PAID' },
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
async function getAdminBatchOrders(batchId, query = {}) {
  const { page = 1, limit = 100, status } = query;
  const skip = (page - 1) * Number(limit);

  const where = {
    batch_id: batchId,
    ...(status && { status }),
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
async function exportAdminBatchOrders(batchId, query = {}) {
  const { status } = query;

  const where = { batch_id: batchId, ...(status && { status }) };

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
async function getAdminBatchCertificates(batchId, query = {}) {
  const { page = 1, limit = 50 } = query;
  const skip = (page - 1) * Number(limit);

  const [certificates, total] = await Promise.all([
    db.certificate.findMany({
      where: { batch_id: batchId },
      skip,
      take: Number(limit),
      orderBy: { issued_at: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    db.certificate.count({ where: { batch_id: batchId } }),
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
async function getAllBatches(query = {}) {
  const { page = 1, limit = 20, status, company_id } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(company_id && { company_id }),
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
 * Get all orders (admin view)
 */
async function getAllOrders(query = {}) {
  const { page = 1, limit = 20, status, company_id } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(company_id && { company_id }),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
        certificate: { select: { is_issued: true, certificate_serial: true } },
      },
    }),
    db.order.count({ where }),
  ]);

  return {
    orders,
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
 * Get global dashboard stats
 */
async function getDashboardStats() {
  const cacheKey = 'admin:dashboard';
  const cached = await redisGet(cacheKey);
  if (cached) return JSON.parse(cached);

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
    db.company.count(),
    db.company.count({ where: { is_active: true } }),
    db.company.count({ where: { is_verified: true } }),
    db.batch.count(),
    db.batch.count({ where: { status: 'ACTIVE' } }),
    db.user.count(),
    db.order.count(),
    db.order.count({ where: { status: 'PAID' } }),
    db.certificate.count(),
    db.certificate.count({ where: { is_issued: true } }),
    db.order.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    db.company.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      select: { id: true, name: true, email: true, is_verified: true, created_at: true },
    }),
    db.order.findMany({
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

  await redisSet(cacheKey, JSON.stringify(stats), 120); // 2 min cache
  return stats;
}

/**
 * Get all payments (admin view)
 */
async function getAllPayments(query = {}) {
  const { page = 1, limit = 20, status, company_id } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(company_id && { order: { company_id } }),
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

module.exports = {
  getCompanies,
  getCompanyById,
  updateCompanyStatus,
  getAllBatches,
  getAllOrders,
  getAllPayments,
  getOrderForInvoice,
  getPricingConfigs,
  updatePricingConfig,
  getDashboardStats,
  getAdminBatchById,
  getAdminBatchStats,
  getAdminBatchOrders,
  exportAdminBatchOrders,
  getAdminBatchCertificates,
  issueCertificatesAdmin,
};
