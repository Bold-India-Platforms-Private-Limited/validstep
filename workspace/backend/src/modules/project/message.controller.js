import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { loadProjectWithAccess } from "./project.controller.js";
import { parsePagination, paginatedResult } from "../../utils/pagination.js";

export const sendProjectMessage = asyncHandler(async (req, res) => {
  await loadProjectWithAccess(req.params.projectId, req.user);
  const { content } = req.body;
  if (!content?.trim()) throw new ApiError(400, "content is required");

  const message = await prisma.projectMessage.create({
    data: { projectId: req.params.projectId, userId: req.user.id, content: content.trim() },
  });
  res.status(201).json({ message });
});

// A member sees only their own queries for this project (their notes to the PM are
// private, not a shared thread visible to the rest of the group).
export const getMyProjectMessages = asyncHandler(async (req, res) => {
  await loadProjectWithAccess(req.params.projectId, req.user);
  const messages = await prisma.projectMessage.findMany({
    where: { projectId: req.params.projectId, userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: messages });
});

// Admin: every query across every project in the workspace, most recent first.
export const getCandidateQueries = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 25 });
  const { search } = req.query;

  const where = {
    project: { workspaceId },
    ...(search && {
      OR: [
        { content: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.projectMessage.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.projectMessage.count({ where }),
  ]);

  res.json(paginatedResult({ data, total, page, limit }));
});
