'use strict';

const crypto = require('crypto');
const { db } = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/hash');
const { generateTokenPair } = require('../../utils/jwt');
const { redisGet, redisSet, redisDel, redisExists } = require('../../config/redis');
const { sendPasswordResetEmail } = require('../../utils/email');

const env = require('../../config/env');

/**
 * Register a new company
 */
async function registerCompany(data) {
  const { name, email, password, phone, website, description } = data;

  const existing = await db.company.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error('A company with this email already exists'), { statusCode: 409 });
  }

  const password_hash = await hashPassword(password);

  const company = await db.company.create({
    data: {
      name,
      email,
      password_hash,
      phone,
      website,
      description,
      is_active: true,
      is_verified: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      website: true,
      is_active: true,
      is_verified: true,
      created_at: true,
    },
  });

  const tokenPayload = { id: company.id, email: company.email, role: 'company' };
  const tokens = generateTokenPair(tokenPayload);

  return { company, tokens };
}

/**
 * Login a company
 */
async function loginCompany(email, password) {
  const company = await db.company.findUnique({ where: { email } });
  if (!company) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const isValid = await comparePassword(password, company.password_hash);
  if (!isValid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (!company.is_active) {
    throw Object.assign(new Error('Your account has been deactivated. Please contact support.'), { statusCode: 403 });
  }

  const tokenPayload = { id: company.id, email: company.email, role: 'company' };
  const tokens = generateTokenPair(tokenPayload);

  const { password_hash, ...companyData } = company;
  return { company: companyData, tokens };
}

/**
 * Register a new user (via batch link)
 */
async function registerUser(data) {
  const { name, email, password, phone, batch_slug } = data;

  // Try Redis cache first (same cache used by the public landing page endpoint)
  let batch = null;
  const cacheKey = `public:batch:${batch_slug}`;
  const cached = await redisGet(cacheKey);
  if (cached) {
    batch = JSON.parse(cached);
  } else {
    batch = await db.batch.findUnique({
      where: { unique_slug: batch_slug },
      include: { company: { select: { id: true, name: true, is_active: true } } },
    });
  }

  if (!batch) {
    throw Object.assign(new Error('Invalid batch link'), { statusCode: 404 });
  }

  if (!batch.is_active || batch.status === 'COMPLETED' || batch.status === 'HOLD') {
    const msg = batch.status === 'HOLD'
      ? 'Registrations for this batch are temporarily paused'
      : 'This batch is no longer accepting registrations';
    throw Object.assign(new Error(msg), { statusCode: 400 });
  }

  if (!batch.company?.is_active) {
    throw Object.assign(new Error('This company account is inactive'), { statusCode: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error('An account with this email already exists'), { statusCode: 409 });
  }

  const password_hash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      password_hash,
      is_verified: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      is_verified: true,
      created_at: true,
    },
  });

  const tokenPayload = { id: user.id, email: user.email, role: 'user' };
  const tokens = generateTokenPair(tokenPayload);

  return { user, batch: { id: batch.id, name: batch.name, slug: batch.unique_slug }, tokens };
}

/**
 * Login a user
 */
async function loginUser(email, password) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const tokenPayload = { id: user.id, email: user.email, role: 'user' };
  const tokens = generateTokenPair(tokenPayload);

  const { password_hash, ...userData } = user;
  return { user: userData, tokens };
}

/**
 * Login superadmin
 */
async function loginSuperAdmin(email, password) {
  const admin = await db.superAdmin.findUnique({ where: { email } });
  if (!admin) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const isValid = await comparePassword(password, admin.password_hash);
  if (!isValid) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const tokenPayload = { id: admin.id, email: admin.email, role: 'superadmin' };
  const tokens = generateTokenPair(tokenPayload);

  const { password_hash, ...adminData } = admin;
  return { admin: adminData, tokens };
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken) {
  const { verifyRefreshToken, generateAccessToken } = require('../../utils/jwt');

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  // Check if token is blacklisted
  const blacklisted = await redisGet(`blacklist:${refreshToken}`);
  if (blacklisted) {
    throw Object.assign(new Error('Token has been revoked'), { statusCode: 401 });
  }

  // Single DB query per role: verify exists + fetch name in one round-trip
  let entity = null;
  if (decoded.role === 'company') {
    entity = await db.company.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, is_active: true },
    });
    if (!entity || !entity.is_active) {
      throw Object.assign(new Error('Account not found or inactive'), { statusCode: 401 });
    }
  } else if (decoded.role === 'user') {
    entity = await db.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true },
    });
    if (!entity) {
      throw Object.assign(new Error('Account not found or inactive'), { statusCode: 401 });
    }
  } else if (decoded.role === 'superadmin') {
    entity = await db.superAdmin.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true },
    });
    if (!entity) {
      throw Object.assign(new Error('Account not found or inactive'), { statusCode: 401 });
    }
  }

  const tokenPayload = { id: decoded.id, email: decoded.email, role: decoded.role };
  const accessToken = generateAccessToken(tokenPayload);

  const user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    name: entity?.name,
  };

  return { accessToken, user };
}

/**
 * Logout — blacklist the refresh token
 */
async function logout(refreshToken) {
  if (!refreshToken) return;

  const { verifyRefreshToken } = require('../../utils/jwt');
  const decoded = verifyRefreshToken(refreshToken);

  if (decoded && decoded.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redisSet(`blacklist:${refreshToken}`, '1', ttl);
    }
  }
}

/**
 * Send forgot password email (company or user)
 */
async function forgotPassword(email, accountType) {
  // Look up entity
  let entity = null;
  if (accountType === 'company') {
    entity = await db.company.findUnique({ where: { email } });
  } else {
    entity = await db.user.findUnique({ where: { email } });
  }

  // Always return success — don't leak whether email exists
  if (!entity) return;

  // Generate a secure random token (raw = in the URL, hashed = stored in DB)
  const rawToken   = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expires    = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  if (accountType === 'company') {
    await db.company.update({
      where: { email },
      data: { reset_token: hashedToken, reset_token_expires: expires },
    });
  } else {
    await db.user.update({
      where: { email },
      data: { reset_token: hashedToken, reset_token_expires: expires },
    });
  }

  const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${rawToken}&type=${accountType}`;

  await sendPasswordResetEmail({
    name: entity.name,
    email: entity.email,
    resetUrl,
    accountType,
  });
}

/**
 * Reset password using token
 */
async function resetPassword(rawToken, newPassword, accountType) {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  let entity = null;
  if (accountType === 'company') {
    entity = await db.company.findFirst({
      where: {
        reset_token: hashedToken,
        reset_token_expires: { gt: new Date() },
      },
    });
  } else {
    entity = await db.user.findFirst({
      where: {
        reset_token: hashedToken,
        reset_token_expires: { gt: new Date() },
      },
    });
  }

  if (!entity) {
    throw Object.assign(new Error('Reset link is invalid or has expired'), { statusCode: 400 });
  }

  const password_hash = await hashPassword(newPassword);

  if (accountType === 'company') {
    await db.company.update({
      where: { id: entity.id },
      data: { password_hash, reset_token: null, reset_token_expires: null },
    });
  } else {
    await db.user.update({
      where: { id: entity.id },
      data: { password_hash, reset_token: null, reset_token_expires: null },
    });
  }
}

module.exports = {
  registerCompany,
  loginCompany,
  registerUser,
  loginUser,
  loginSuperAdmin,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
};
