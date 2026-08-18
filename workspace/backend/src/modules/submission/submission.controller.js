import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parsePagination, paginatedResult } from "../../utils/pagination.js";

export const createSubmission = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { driveLink, note } = req.body;
  if (!driveLink?.trim()) throw new ApiError(400, "driveLink is required");

  const submission = await prisma.submission.create({
    data: { workspaceId, userId: req.user.id, driveLink: driveLink.trim(), note: note || null },
  });
  res.status(201).json({ submission });
});

export const getMySubmissions = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const submissions = await prisma.submission.findMany({
    where: { workspaceId, userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: submissions });
});

export const getAllSubmissions = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 25 });

  const where = { workspaceId };
  const [data, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    }),
    prisma.submission.count({ where }),
  ]);
  res.json(paginatedResult({ data, total, page, limit }));
});

export const giveFeedback = asyncHandler(async (req, res) => {
  const { adminFeedback } = req.body;
  const submission = await prisma.submission.update({
    where: { id: req.params.submissionId },
    data: { adminFeedback: adminFeedback || null },
  });
  res.json({ submission });
});
