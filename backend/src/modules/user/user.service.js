'use strict';

const { db } = require('../../config/database');
const { redisGet, redisSet, redisDel } = require('../../config/redis');

/**
 * Get user dashboard data
 */
async function getDashboard(userId) {
  const cacheKey = `user:dashboard:${userId}`;
  const cached = await redisGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const [user, orders, certificates, recentOrders] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, created_at: true },
    }),
    db.order.count({ where: { user_id: userId } }),
    db.certificate.count({ where: { user_id: userId } }),
    db.order.findMany({
      where: { user_id: userId },
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        batch: {
          include: {
            company: { select: { name: true, logo_url: true } },
            program: { select: { type: true, name: true } },
          },
        },
        certificate: {
          select: { is_issued: true, certificate_url: true, verification_hash: true },
        },
      },
    }),
  ]);

  const paidOrders = await db.order.count({
    where: { user_id: userId, status: 'PAID' },
  });

  const issuedCertificates = await db.certificate.count({
    where: { user_id: userId, is_issued: true },
  });

  const dashboard = {
    user,
    stats: {
      total_orders: orders,
      paid_orders: paidOrders,
      total_certificates: certificates,
      issued_certificates: issuedCertificates,
    },
    recent_orders: recentOrders,
  };

  await redisSet(cacheKey, JSON.stringify(dashboard), 60); // 1 min cache
  return dashboard;
}

/**
 * Get user orders
 */
async function getOrders(userId, query = {}) {
  const { page = 1, limit = 20, status } = query;
  const skip = (page - 1) * limit;

  const where = {
    user_id: userId,
    ...(status && { status }),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      include: {
        batch: {
          include: {
            company: { select: { id: true, name: true, logo_url: true } },
            program: { select: { type: true, name: true } },
          },
        },
        certificate: {
          select: {
            id: true,
            is_issued: true,
            issued_at: true,
            certificate_serial: true,
            certificate_url: true,
            verification_hash: true,
          },
        },
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
 * Get user profile
 */
async function getProfile(userId) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      is_verified: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  return user;
}

/**
 * Update user profile
 */
async function updateProfile(userId, data) {
  const { name, phone } = data;

  const user = await db.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      is_verified: true,
      updated_at: true,
    },
  });

  // Invalidate dashboard cache
  await redisDel(`user:dashboard:${userId}`);

  return user;
}

/**
 * Get payment history for a user
 */
async function getPaymentHistory(userId, query = {}) {
  const { page = 1, limit = 20, status } = query;
  const skip = (page - 1) * limit;

  const where = {
    order: { user_id: userId },
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
            batch: { include: { company: { select: { name: true } }, program: { select: { name: true, type: true } } } },
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
 * Get order data for invoice generation
 */
async function getOrderForInvoice(userId, orderId) {
  const order = await db.order.findFirst({
    where: { id: orderId, user_id: userId },
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

async function getUserInvoices(userId, query = {}) {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * Number(limit);

  const where = { order: { user_id: userId } };

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { generated_at: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            certificate_serial: true,
            status: true,
            batch: {
              select: {
                name: true,
                program: { select: { name: true, type: true } },
                company: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    db.invoice.count({ where }),
  ]);

  return {
    invoices,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  };
}

module.exports = {
  getDashboard,
  getOrders,
  getProfile,
  updateProfile,
  getPaymentHistory,
  getOrderForInvoice,
  getUserInvoices,
};
