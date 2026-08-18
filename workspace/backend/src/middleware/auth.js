import { prisma } from "../config/prisma.js";
import { verifyToken } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Not authenticated");

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired session");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, name: true, email: true, image: true, isSuperAdmin: true, mobile: true },
  });
  if (!user) throw new ApiError(401, "User no longer exists");

  req.user = user;
  next();
});

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.isSuperAdmin) throw new ApiError(403, "Super admin access required");
  next();
};

// Attaches req.membership for :workspaceId param routes; optionally enforces admin role
export const requireWorkspaceMember = ({ adminOnly = false } = {}) =>
  asyncHandler(async (req, res, next) => {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    if (!workspaceId) throw new ApiError(400, "workspaceId is required");

    if (req.user.isSuperAdmin) {
      req.membership = { role: "ADMIN", workspaceId, userId: req.user.id, isSuperAdmin: true };
      return next();
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
    });
    if (!membership) throw new ApiError(403, "Not a member of this workspace");
    if (adminOnly && membership.role !== "ADMIN") throw new ApiError(403, "Workspace admin access required");

    req.membership = membership;
    next();
  });
