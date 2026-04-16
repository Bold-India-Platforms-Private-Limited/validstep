'use strict';

const { db } = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/hash');
const { redisGet, redisSet, redisDel } = require('../../config/redis');

const CACHE_TTL = 300; // 5 minutes

/**
 * Get company profile
 */
async function getProfile(companyId) {
  const cacheKey = `company:profile:${companyId}`;
  const cached = await redisGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      logo_url: true,
      website: true,
      description: true,
      is_active: true,
      is_verified: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!company) {
    throw Object.assign(new Error('Company not found'), { statusCode: 404 });
  }

  await redisSet(cacheKey, JSON.stringify(company), CACHE_TTL);
  return company;
}

/**
 * Update company profile
 */
async function updateProfile(companyId, data) {
  const { name, phone, logo_url, website, description } = data;

  const company = await db.company.update({
    where: { id: companyId },
    data: {
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
      ...(logo_url !== undefined && { logo_url }),
      ...(website !== undefined && { website }),
      ...(description !== undefined && { description }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      logo_url: true,
      website: true,
      description: true,
      is_active: true,
      is_verified: true,
      updated_at: true,
    },
  });

  // Invalidate cache
  await redisDel(`company:profile:${companyId}`);

  return company;
}

/**
 * Create a program
 */
async function createProgram(companyId, data) {
  const { type, name, description } = data;

  const program = await db.program.create({
    data: {
      company_id: companyId,
      type,
      name,
      description,
    },
  });

  return program;
}

/**
 * Get programs for a company
 */
async function getPrograms(companyId, query = {}) {
  const { page = 1, limit = 20, type } = query;
  const skip = (page - 1) * limit;

  const where = {
    company_id: companyId,
    ...(type && { type }),
  };

  const [programs, total] = await Promise.all([
    db.program.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { batches: true } },
      },
    }),
    db.program.count({ where }),
  ]);

  return {
    programs,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get company dashboard stats
 */
async function getDashboardStats(companyId) {
  const cacheKey = `company:dashboard:${companyId}`;
  const cached = await redisGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const [
    totalBatches,
    activeBatches,
    totalOrders,
    paidOrders,
    totalCertificates,
    issuedCertificates,
    recentOrders,
  ] = await Promise.all([
    db.batch.count({ where: { company_id: companyId } }),
    db.batch.count({ where: { company_id: companyId, status: 'ACTIVE' } }),
    db.order.count({ where: { company_id: companyId } }),
    db.order.count({ where: { company_id: companyId, status: 'PAID' } }),
    db.certificate.count({ where: { company_id: companyId } }),
    db.certificate.count({ where: { company_id: companyId, is_issued: true } }),
    db.order.findMany({
      where: { company_id: companyId },
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        batch: { select: { name: true } },
      },
    }),
  ]);

  // Revenue calculation
  const revenueResult = await db.order.aggregate({
    where: { company_id: companyId, status: 'PAID' },
    _sum: { amount: true },
  });

  const stats = {
    batches: { total: totalBatches, active: activeBatches },
    orders: { total: totalOrders, paid: paidOrders },
    certificates: { total: totalCertificates, issued: issuedCertificates },
    revenue: {
      total: revenueResult._sum.amount || 0,
      currency: 'INR',
    },
    recent_orders: recentOrders,
  };

  await redisSet(cacheKey, JSON.stringify(stats), 60); // 1 min cache
  return stats;
}

/**
 * Get payment history for a company (all payments on company's batches)
 */
async function getPaymentHistory(companyId, query = {}) {
  const { page = 1, limit = 20, status, batch_id } = query;
  const skip = (page - 1) * limit;

  const where = {
    order: {
      company_id: companyId,
      ...(batch_id && { batch_id }),
    },
    ...(status && { status }),
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
            user: { select: { name: true, email: true, phone: true } },
            batch: { select: { name: true, id: true } },
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
 * Get order for invoice (company)
 */
async function getOrderForInvoice(companyId, orderId) {
  const order = await db.order.findFirst({
    where: { id: orderId, company_id: companyId },
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
 * Update a program
 */
async function updateProgram(companyId, programId, data) {
  const program = await db.program.findFirst({ where: { id: programId, company_id: companyId } });
  if (!program) throw Object.assign(new Error('Program not found'), { statusCode: 404 });
  return db.program.update({ where: { id: programId }, data });
}

/**
 * Delete a program
 */
async function deleteProgram(companyId, programId) {
  const program = await db.program.findFirst({ where: { id: programId, company_id: companyId } });
  if (!program) throw Object.assign(new Error('Program not found'), { statusCode: 404 });
  return db.program.delete({ where: { id: programId } });
}

module.exports = {
  getProfile,
  updateProfile,
  createProgram,
  getPrograms,
  updateProgram,
  deleteProgram,
  getDashboardStats,
  getPaymentHistory,
  getOrderForInvoice,
};
