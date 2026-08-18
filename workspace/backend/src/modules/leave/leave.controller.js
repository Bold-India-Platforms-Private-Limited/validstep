import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parsePagination, paginatedResult } from "../../utils/pagination.js";

export const submitLeave = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { startDate, endDate, type, reason } = req.body;
  if (!startDate || !endDate || !type || !reason?.trim()) {
    throw new ApiError(400, "startDate, endDate, type and reason are required");
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      workspaceId,
      userId: req.user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type,
      reason: reason.trim(),
    },
  });
  res.status(201).json({ leave });
});

export const getMyLeaves = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const leaves = await prisma.leaveRequest.findMany({
    where: { workspaceId, userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: leaves });
});

export const cancelLeave = asyncHandler(async (req, res) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.leaveId } });
  if (!leave) throw new ApiError(404, "Leave request not found");
  const isOwner = leave.userId === req.user.id;
  if (!isOwner && req.membership.role !== "ADMIN") throw new ApiError(403, "Not allowed");
  if (isOwner && leave.status !== "PENDING") throw new ApiError(400, "Only pending requests can be cancelled");
  await prisma.leaveRequest.delete({ where: { id: leave.id } });
  res.status(204).end();
});

// ---------- admin ----------

export const getAllLeaves = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 25 });
  const { status } = req.query;

  const where = { workspaceId, ...(status && { status }) };
  const [data, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    }),
    prisma.leaveRequest.count({ where }),
  ]);
  res.json(paginatedResult({ data, total, page, limit }));
});

export const reviewLeave = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body;
  if (!["APPROVED", "REJECTED"].includes(status)) throw new ApiError(400, "status must be APPROVED or REJECTED");

  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.leaveId },
    data: { status, adminNote: adminNote || null, reviewedAt: new Date() },
  });
  res.json({ leave });
});
