import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma.js";
import { signToken } from "../../utils/jwt.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendMail } from "../../config/mailer.js";
import { passwordResetEmail } from "../../utils/emailTemplates.js";

// Bootstraps the single platform super-admin from env credentials on first login.
async function ensureSuperAdmin(email) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: "Super Admin", email, isSuperAdmin: true },
    });
  } else if (!user.isSuperAdmin) {
    user = await prisma.user.update({ where: { id: user.id }, data: { isSuperAdmin: true } });
  }
  return user;
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "Email and password are required");
  const normalizedEmail = email.toLowerCase().trim();

  if (
    normalizedEmail === (process.env.ADMIN_EMAIL || "").toLowerCase() &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const user = await ensureSuperAdmin(normalizedEmail);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = signToken(user.id);
    return res.json({ token, user: sanitizeUser(user) });
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.passwordHash) throw new ApiError(401, "Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = signToken(user.id);
  res.json({ token, user: sanitizeUser(user) });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// Simple in-memory per-email cooldown so a refresh-mashing user can't trigger a flood of
// emails; fine for a single instance, not meant as a distributed rate limiter.
const lastResetRequestAt = new Map();
const RESET_COOLDOWN_MS = 60_000;

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) throw new ApiError(400, "Email is required");
  const normalizedEmail = email.toLowerCase().trim();

  // Always respond the same way regardless of whether the email exists, so this endpoint
  // can't be used to enumerate registered users.
  const genericResponse = { message: "If that email is registered, a new password has been sent to it." };

  const lastRequest = lastResetRequestAt.get(normalizedEmail);
  if (lastRequest && Date.now() - lastRequest < RESET_COOLDOWN_MS) {
    return res.json(genericResponse);
  }
  lastResetRequestAt.set(normalizedEmail, Date.now());

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || normalizedEmail === (process.env.ADMIN_EMAIL || "").toLowerCase()) {
    // Super admin's credentials live in .env, not the DB — nothing to reset there.
    return res.json(genericResponse);
  }

  const tempPassword = crypto.randomBytes(4).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  const { subject, html } = passwordResetEmail({
    name: user.name,
    email: user.email,
    password: tempPassword,
    loginUrl: `${process.env.FRONTEND_URL}/login`,
  });
  await sendMail({ to: user.email, subject, html });

  res.json(genericResponse);
});

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
