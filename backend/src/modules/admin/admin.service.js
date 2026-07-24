'use strict';

const fs = require('fs');
const { db } = require('../../config/database');
const { redisGet, redisSet } = require('../../config/redis');
const { getTransactionFeesForPayuIds } = require('../accounting/accounting.service');
const { hashPassword, generateVerificationHash, generateRandomToken, sha256 } = require('../../utils/hash');
const { sendUserWelcomeEmail, sendBatchEnrollmentEmail, sendCompanyWelcomeEmail } = require('../../utils/email');
const { generateCertificateSerial } = require('../batch/batch.service');
const { parseUserImportFile } = require('../../utils/userImportParser');
const { parseTransactionReport } = require('../../utils/reportParsers');
const { logDeliveryEvent } = require('../../utils/deliveryLog');
const env = require('../../config/env');

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
async function getAllBatches(query = {}) {
  const { page = 1, limit = 20, status, company_id, search } = query;
  const skip = (page - 1) * limit;

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
  const { page = 1, limit = 20, status, company_id, search } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(company_id && { company_id }),
    ...(search && {
      OR: [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { batch: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
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
        payments: { select: { status: true, payu_txn_id: true }, orderBy: { created_at: 'desc' }, take: 1 },
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

/**
 * Unified invoice list: real per-Order invoices (website checkout) plus PayU Button
 * transactions (captured, no Order behind them — see accounting module) shown as receipts.
 * PayU Button rows have no company_id, so they're excluded whenever filtering by company.
 * Both sources are fetched in full and merged/paginated in-process — acceptable at the current
 * scale (thousands of rows per quarter), revisit with a DB-level UNION if volume grows much
 * further.
 */
async function getAllInvoices(query = {}) {
  const { page = 1, limit = 20, search, company_id } = query;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const where = {
    ...(company_id && { order: { company_id } }),
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
  if (!company_id) {
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
async function listUsers(query = {}) {
  const { page = 1, limit = 20, search } = query;
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

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

  return {
    users,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  };
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

  const certificateSerial = await generateCertificateSerial(batch_id);

  const order = await db.$transaction(async (tx) => {
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
  });

  // Fire-and-forget email — never let a delivery failure fail the enrollment itself.
  if (isNewUser) {
    const rawToken = generateRandomToken(32);
    const hashedToken = sha256(rawToken);
    await db.user.update({
      where: { id: user.id },
      data: { reset_token: hashedToken, reset_token_expires: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const setPasswordUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${rawToken}&type=user`;
    sendUserWelcomeEmail({ name: user.name, email: user.email, companyName: batch.company.name, batchName: batch.name, setPasswordUrl });
  } else {
    const loginUrl = `${env.FRONTEND_URL}/auth/user/login`;
    sendBatchEnrollmentEmail({ name: user.name, email: user.email, companyName: batch.company.name, batchName: batch.name, loginUrl });
  }

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
 */
async function bulkUploadUsers({ company_id, batch_id, file }) {
  const buffer = fs.readFileSync(file.path);
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

const CAPTURED_LIKE = new Set(['captured']);
const REFUNDED_LIKE = new Set(['refunded', 'refund']);
const FAILED_LIKE = new Set(['failed', 'failure']);
const CANCELLED_LIKE = new Set(['usercancelled', 'cancelled', 'cancel']);
const PENDING_LIKE = new Set(['pending', 'inprogress', 'not_found']);

/**
 * Import a PayU transaction-report export (CSV/Excel, same format the accounting module
 * already parses via parseTransactionReport). Every row is upserted into payu_transactions
 * (payu_id is the de-dupe key — matches what PayU itself treats as the unique payment
 * identifier); a User account is created for every NEW, captured row's distinct email that
 * doesn't already have one, so it immediately shows up in the admin Users list ready to be
 * assigned to a batch. Returns the exact import-summary shape the admin UI shows.
 */
async function importPayuTransactions(file) {
  const buffer = fs.readFileSync(file.path);
  const { rows } = parseTransactionReport(buffer);

  const existing = await db.payuTransaction.findMany({
    where: { payu_id: { in: rows.map((r) => r.payu_id) } },
    select: { payu_id: true },
  });
  const existingIds = new Set(existing.map((e) => e.payu_id));

  const summary = { total_rows: rows.length, imported: 0, duplicate: 0, refunded: 0, failed: 0, cancelled: 0, pending: 0, other: 0 };
  const capturedNewByEmail = new Map();

  // Upsert every row into Postgres, concurrently in bounded batches — sequentially awaiting
  // 1000+ single-row upserts one at a time made large report imports feel hung (same class
  // of bug already fixed for the password-hashing step below).
  const UPSERT_CONCURRENCY = 20;
  for (let i = 0; i < rows.length; i += UPSERT_CONCURRENCY) {
    const chunk = rows.slice(i, i + UPSERT_CONCURRENCY);
    await Promise.all(chunk.map((row) => db.payuTransaction.upsert({
      where: { payu_id: row.payu_id },
      create: { ...row },
      update: { ...row },
    })));
  }

  for (const row of rows) {
    const isDuplicate = existingIds.has(row.payu_id);
    const status = (row.status || '').toLowerCase();

    // Summary buckets stay a clean partition of total_rows: a duplicate payu_id is counted as
    // "duplicate" only, not also re-counted into imported/refunded/failed/etc.
    if (isDuplicate) {
      summary.duplicate += 1;
    } else if (CAPTURED_LIKE.has(status)) {
      summary.imported += 1;
    } else if (REFUNDED_LIKE.has(status)) {
      summary.refunded += 1;
    } else if (FAILED_LIKE.has(status)) {
      summary.failed += 1;
    } else if (CANCELLED_LIKE.has(status)) {
      summary.cancelled += 1;
    } else if (PENDING_LIKE.has(status)) {
      summary.pending += 1;
    } else {
      summary.other += 1;
    }

    // Collect every captured row's email regardless of duplicate status, separately from the
    // summary above — account creation below is already idempotent (checked against existing
    // Users), and a transaction being a "duplicate" of an earlier import attempt doesn't
    // guarantee that attempt ever reached the account-creation step (e.g. a killed/failed
    // import can leave transactions upserted with no corresponding User — must still be
    // repaired on re-upload).
    if (CAPTURED_LIKE.has(status) && row.email) {
      capturedNewByEmail.set(row.email.toLowerCase().trim(), {
        firstname: row.firstname, lastname: row.lastname, phone: row.phone,
      });
    }
  }

  const candidateEmails = [...capturedNewByEmail.keys()];
  let newUsersCreated = 0;
  if (candidateEmails.length > 0) {
    const existingUsers = await db.user.findMany({
      where: { email: { in: candidateEmails } },
      select: { email: true },
    });
    const existingUserEmails = new Set(existingUsers.map((u) => u.email));
    const toCreate = candidateEmails.filter((e) => !existingUserEmails.has(e));

    // bcrypt (bcryptjs, pure-JS, no native thread offload) is CPU-bound — firing all hashes
    // via one unbounded Promise.all doesn't actually parallelize them, it just queues hundreds
    // of CPU-bound continuations back-to-back on the single event loop, which starves *every*
    // other request on this process (including login) for the whole duration. A small bounded
    // batch size + an explicit yield between batches keeps the server responsive to other
    // traffic throughout a large import, at the cost of the import itself taking a bit longer.
    const HASH_BATCH_SIZE = 5;
    const userRows = [];
    for (let i = 0; i < toCreate.length; i += HASH_BATCH_SIZE) {
      const batch = toCreate.slice(i, i + HASH_BATCH_SIZE);
      const hashed = await Promise.all(batch.map(async (email) => {
        const info = capturedNewByEmail.get(email);
        const name = [info.firstname, info.lastname].filter(Boolean).join(' ').trim() || email.split('@')[0];
        // No welcome/set-password email is sent for imported transactions (bulk, high-volume) —
        // password = email so the account is immediately usable, same tradeoff already confirmed
        // for importPayuButtonCustomers.
        const password_hash = await hashPassword(email);
        return { name, email, phone: info.phone || null, password_hash, is_verified: true };
      }));
      userRows.push(...hashed);
      await new Promise((resolve) => setImmediate(resolve));
    }

    if (userRows.length > 0) {
      await db.user.createMany({ data: userRows, skipDuplicates: true });
      newUsersCreated = userRows.length;

      const newUsers = await db.user.findMany({
        where: { email: { in: userRows.map((u) => u.email) } },
        select: { id: true },
      });
      await db.deliveryEvent.createMany({
        data: newUsers.flatMap((u) => [
          { user_id: u.id, event: 'PAYMENT_IMPORTED' },
          { user_id: u.id, event: 'USER_CREATED' },
        ]),
      });
    }
  }

  return { ...summary, new_users_created: newUsersCreated };
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

      const certificateSerial = await generateCertificateSerial(batch_id);
      const paidAt = txn.success_at || txn.addedon || new Date();
      const amount = txn.amount || 0;

      await db.$transaction(async (tx) => {
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
      });

      result.assigned += 1;
    } catch (err) {
      result.errors.push({ payu_id: txn.payu_id, email: txn.email, reason: err.message });
    }
  }

  return result;
}

module.exports = {
  getCompanies,
  getCompanyById,
  updateCompanyStatus,
  getAllBatches,
  getAllOrders,
  getAllPayments,
  getOrderForInvoice,
  getAllInvoices,
  getPricingConfigs,
  updatePricingConfig,
  getDashboardStats,
  getAdminBatchById,
  getAdminBatchStats,
  getAdminBatchOrders,
  exportAdminBatchOrders,
  getAdminBatchCertificates,
  issueCertificatesAdmin,
  listUsers,
  registerUserForBatch,
  bulkUploadUsers,
  importPayuButtonCustomers,
  createCompany,
  enrollExistingUsers,
  importPayuTransactions,
  getAssignableTransactions,
  assignTransactionsToBatch,
};
