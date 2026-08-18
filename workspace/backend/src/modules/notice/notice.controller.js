import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const listNotices = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const isAdmin = req.membership.role === "ADMIN";
  const notices = await prisma.notice.findMany({
    where: { workspaceId, ...(!isAdmin && { published: true }) },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  res.json({ data: notices });
});

export const createNotice = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { title, content, type, priority } = req.body;
  if (!title?.trim() || !content?.trim()) throw new ApiError(400, "title and content are required");

  const notice = await prisma.notice.create({
    data: { workspaceId, title: title.trim(), content: content.trim(), type: type || "INFO", priority: priority || 0 },
  });
  res.status(201).json({ notice });
});

export const updateNotice = asyncHandler(async (req, res) => {
  const { title, content, type, priority } = req.body;
  const notice = await prisma.notice.update({
    where: { id: req.params.noticeId },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(type !== undefined && { type }),
      ...(priority !== undefined && { priority }),
    },
  });
  res.json({ notice });
});

export const publishNotice = asyncHandler(async (req, res) => {
  const { published } = req.body;
  const notice = await prisma.notice.update({ where: { id: req.params.noticeId }, data: { published: !!published } });
  res.json({ notice });
});

export const deleteNotice = asyncHandler(async (req, res) => {
  await prisma.notice.delete({ where: { id: req.params.noticeId } });
  res.status(204).end();
});
