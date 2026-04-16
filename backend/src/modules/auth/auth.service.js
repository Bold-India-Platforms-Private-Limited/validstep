'use strict';

const { db } = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/hash');
const { generateTokenPair } = require('../../utils/jwt');
const { redisGet, redisSet, redisDel, redisExists } = require('../../config/redis');

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

  // Validate batch exists and is active
  const batch = await db.batch.findUnique({
    where: { unique_slug: batch_slug },
    include: { company: { select: { id: true, name: true, is_active: true } } },
  });

  if (!batch) {
    throw Object.assign(new Error('Invalid batch link'), { statusCode: 404 });
  }

  if (!batch.is_active || batch.status === 'COMPLETED') {
    throw Object.assign(new Error('This batch is no longer accepting registrations'), { statusCode: 400 });
  }

  if (!batch.company.is_active) {
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

  // Verify the entity still exists and is active
  let entityExists = false;
  if (decoded.role === 'company') {
    const company = await db.company.findUnique({ where: { id: decoded.id } });
    entityExists = company && company.is_active;
  } else if (decoded.role === 'user') {
    const user = await db.user.findUnique({ where: { id: decoded.id } });
    entityExists = !!user;
  } else if (decoded.role === 'superadmin') {
    const admin = await db.superAdmin.findUnique({ where: { id: decoded.id } });
    entityExists = !!admin;
  }

  if (!entityExists) {
    throw Object.assign(new Error('Account not found or inactive'), { statusCode: 401 });
  }

  const tokenPayload = { id: decoded.id, email: decoded.email, role: decoded.role };
  const accessToken = generateAccessToken(tokenPayload);

  // Return user info so frontend can restore session state
  const user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
  };

  // Fetch name from DB based on role
  if (decoded.role === 'company') {
    const company = await db.company.findUnique({ where: { id: decoded.id }, select: { name: true } });
    if (company) user.name = company.name;
  } else if (decoded.role === 'user') {
    const u = await db.user.findUnique({ where: { id: decoded.id }, select: { name: true } });
    if (u) user.name = u.name;
  } else if (decoded.role === 'superadmin') {
    const admin = await db.superAdmin.findUnique({ where: { id: decoded.id }, select: { name: true } });
    if (admin) user.name = admin.name;
  }

  return { accessToken, user };
}

/**
 * Logout - blacklist the refresh token
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

module.exports = {
  registerCompany,
  loginCompany,
  registerUser,
  loginUser,
  loginSuperAdmin,
  refreshAccessToken,
  logout,
};
