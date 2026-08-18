import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parsePagination, paginatedResult } from "../../utils/pagination.js";

function dayKey(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export const submitStandup = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { title, type, description, date: clientDate } = req.body;
  if (!title?.trim() || !type || !description?.trim()) {
    throw new ApiError(400, "title, type and description are required");
  }

  // Client sends its own local calendar date so an entry logged near midnight lands on
  // the day the intern actually experienced, not the server's UTC "today".
  const date = clientDate ? dayKey(clientDate) : dayKey();
  const dayDiff = Math.abs(date.getTime() - dayKey().getTime()) / 86_400_000;
  if (dayDiff > 2) throw new ApiError(400, "Invalid standup date");

  const entry = await prisma.standupEntry.create({
    data: { workspaceId, userId: req.user.id, title: title.trim(), type, description: description.trim(), date },
  });
  res.status(201).json({ entry });
});

export const updateStandup = asyncHandler(async (req, res) => {
  const entry = await prisma.standupEntry.findUnique({ where: { id: req.params.standupId } });
  if (!entry) throw new ApiError(404, "Entry not found");
  if (entry.userId !== req.user.id) throw new ApiError(403, "You can only edit your own entries");

  // Time-boxed rather than a server-UTC calendar-day comparison, since the entry's date
  // reflects the intern's local day and could otherwise mismatch the server's clock.
  const hoursSinceCreated = (Date.now() - entry.createdAt.getTime()) / 3_600_000;
  if (hoursSinceCreated > 24) throw new ApiError(400, "This entry can no longer be edited");

  const { title, type, description } = req.body;
  const updated = await prisma.standupEntry.update({
    where: { id: entry.id },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(description !== undefined && { description }),
    },
  });
  res.json({ entry: updated });
});

export const deleteStandup = asyncHandler(async (req, res) => {
  const entry = await prisma.standupEntry.findUnique({ where: { id: req.params.standupId } });
  if (!entry) throw new ApiError(404, "Entry not found");
  if (entry.userId !== req.user.id && req.membership.role !== "ADMIN") throw new ApiError(403, "Not allowed");
  await prisma.standupEntry.delete({ where: { id: entry.id } });
  res.status(204).end();
});

export const getMyStandups = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 20 });
  const where = { workspaceId, userId: req.user.id };
  const [data, total] = await Promise.all([
    prisma.standupEntry.findMany({ where, orderBy: { date: "desc" }, skip, take }),
    prisma.standupEntry.count({ where }),
  ]);
  res.json(paginatedResult({ data, total, page, limit }));
});

// admin: everyone's entries for a given date
export const getStandupsByDate = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const date = dayKey(req.query.date);
  const data = await prisma.standupEntry.findMany({
    where: { workspaceId, date },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({ date, data });
});
