'use strict';

const authService = require('./auth.service');
const {
  sendSuccess,
  sendCreated,
  sendError,
} = require('../../utils/apiResponse');
const {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require('../../utils/jwt');

async function companyRegister(req, res) {
  try {
    const { company, tokens } = await authService.registerCompany(req.body);
    setRefreshTokenCookie(res, tokens.refreshToken);
    return sendCreated(res, { company, accessToken: tokens.accessToken }, 'Company registered successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function companyLogin(req, res) {
  try {
    const { email, password } = req.body;
    const { company, tokens } = await authService.loginCompany(email, password);
    setRefreshTokenCookie(res, tokens.refreshToken);
    return sendSuccess(res, { company, accessToken: tokens.accessToken }, 'Login successful');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function userRegister(req, res) {
  try {
    const { user, batch, tokens } = await authService.registerUser(req.body);
    setRefreshTokenCookie(res, tokens.refreshToken);
    return sendCreated(res, { user, batch, accessToken: tokens.accessToken }, 'Registration successful');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function userLogin(req, res) {
  try {
    const { email, password } = req.body;
    const { user, tokens } = await authService.loginUser(email, password);
    setRefreshTokenCookie(res, tokens.refreshToken);
    return sendSuccess(res, { user, accessToken: tokens.accessToken }, 'Login successful');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function superAdminLogin(req, res) {
  try {
    const { email, password } = req.body;
    const { admin, tokens } = await authService.loginSuperAdmin(email, password);
    setRefreshTokenCookie(res, tokens.refreshToken);
    return sendSuccess(res, { admin, accessToken: tokens.accessToken }, 'Login successful');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function refreshToken(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return sendError(res, 'Refresh token not found', 401);
    }
    const { accessToken, user } = await authService.refreshAccessToken(refreshToken);
    return sendSuccess(res, { accessToken, user }, 'Token refreshed successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function logout(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);
    clearRefreshTokenCookie(res);
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    // Still clear the cookie even if blacklisting fails
    clearRefreshTokenCookie(res);
    return sendSuccess(res, null, 'Logged out successfully');
  }
}

module.exports = {
  companyRegister,
  companyLogin,
  userRegister,
  userLogin,
  superAdminLogin,
  refreshToken,
  logout,
};
