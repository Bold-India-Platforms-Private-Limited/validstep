import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parsePagination, paginatedResult } from "../../utils/pagination.js";

const HISTORY_CAP = 200;

// ---------- List / Create ----------

export const listGroups = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 30 });
  const isAdmin = req.membership.role === "ADMIN";

  const where = {
    workspaceId,
    ...(!isAdmin && { members: { some: { userId: req.user.id } } }),
  };

  const [groups, total] = await Promise.all([
    prisma.group.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { user: { select: { name: true } } } },
      },
    }),
    prisma.group.count({ where }),
  ]);

  const data = groups.map((g) => ({
    ...g,
    lastMessage: g.messages[0] || null,
    messages: undefined,
  }));

  res.json(paginatedResult({ data, total, page, limit }));
});

// Lean {id, name} for every group in the workspace — powers "select all" in the group
// pickers without paginating through them or dragging along member lists/last messages.
export const listAllGroupIds = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const groups = await prisma.group.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json({ data: groups });
});

export const createGroup = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { name, memberIds = [] } = req.body;
  if (!name?.trim()) throw new ApiError(400, "Group name is required");

  const validMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId, userId: { in: memberIds } },
    select: { userId: true },
  });

  const group = await prisma.group.create({
    data: {
      workspaceId,
      name: name.trim(),
      members: { create: validMembers.map((m) => ({ userId: m.userId })) },
    },
    include: { members: true },
  });

  res.status(201).json({ group });
});

// Splices all ungrouped workspace members into N-person groups in ONE transaction
// (avoids the sequential-request-per-group pattern of the reference app).
export const bulkGenerateGroups = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const membersPerGroup = Math.max(1, parseInt(req.body.membersPerGroup, 10) || 4);
  const namePrefix = (req.body.namePrefix || "Group").trim();

  const ungrouped = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      role: "MEMBER",
      user: { groupMemberships: { none: { group: { workspaceId } } } },
    },
    select: { userId: true },
  });

  if (ungrouped.length === 0) {
    return res.status(201).json({ groups: [], created: 0 });
  }

  const existingCount = await prisma.group.count({ where: { workspaceId } });

  const chunks = [];
  for (let i = 0; i < ungrouped.length; i += membersPerGroup) {
    chunks.push(ungrouped.slice(i, i + membersPerGroup));
  }

  const groups = await prisma.$transaction(
    chunks.map((chunk, idx) =>
      prisma.group.create({
        data: {
          workspaceId,
          name: `${namePrefix} ${existingCount + idx + 1}`,
          members: { create: chunk.map((m) => ({ userId: m.userId })) },
        },
        include: { _count: { select: { members: true } } },
      })
    ),
    { timeout: 30000 }
  );

  res.status(201).json({ groups, created: groups.length });
});

// Preview only — computed without writing anything
export const bulkGeneratePreview = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const membersPerGroup = Math.max(1, parseInt(req.query.membersPerGroup, 10) || 4);

  const totalUngrouped = await prisma.workspaceMember.count({
    where: {
      workspaceId,
      role: "MEMBER",
      user: { groupMemberships: { none: { group: { workspaceId } } } },
    },
  });

  const groupsNeeded = Math.ceil(totalUngrouped / membersPerGroup);
  const fullGroups = Math.floor(totalUngrouped / membersPerGroup);
  const remainder = totalUngrouped % membersPerGroup;

  res.json({ totalUngrouped, membersPerGroup, groupsNeeded, fullGroups, remainder });
});

// ---------- Single group ----------

async function loadGroupWithAccess(groupId, user) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } } },
  });
  if (!group) throw new ApiError(404, "Group not found");

  if (user.isSuperAdmin) return { group, isAdmin: true };

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: group.workspaceId, userId: user.id } },
  });
  if (!membership) throw new ApiError(403, "Not a member of this workspace");

  const isAdmin = membership.role === "ADMIN";
  const isGroupMember = group.members.some((m) => m.userId === user.id);
  if (!isAdmin && !isGroupMember) throw new ApiError(403, "Not a member of this group");

  return { group, isAdmin };
}

export const getGroup = asyncHandler(async (req, res) => {
  const { group, isAdmin } = await loadGroupWithAccess(req.params.groupId, req.user);
  res.json({ group, isAdmin });
});

export const updateGroupMembers = asyncHandler(async (req, res) => {
  const { group, isAdmin } = await loadGroupWithAccess(req.params.groupId, req.user);
  if (!isAdmin) throw new ApiError(403, "Admin access required");

  const { addUserIds = [], removeUserIds = [] } = req.body;

  if (addUserIds.length) {
    const validMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId: group.workspaceId, userId: { in: addUserIds } },
      select: { userId: true },
    });
    await prisma.groupMember.createMany({
      data: validMembers.map((m) => ({ groupId: group.id, userId: m.userId })),
      skipDuplicates: true,
    });
  }

  if (removeUserIds.length) {
    await prisma.groupMember.deleteMany({ where: { groupId: group.id, userId: { in: removeUserIds } } });
  }

  const updated = await prisma.group.findUnique({
    where: { id: group.id },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  res.json({ group: updated });
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const { isAdmin } = await loadGroupWithAccess(req.params.groupId, req.user);
  if (!isAdmin) throw new ApiError(403, "Admin access required");
  await prisma.group.delete({ where: { id: req.params.groupId } });
  res.status(204).end();
});

// ---------- Bulk group ops ----------

export const bulkDeleteGroups = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { groupIds } = req.body;
  if (!Array.isArray(groupIds) || groupIds.length === 0) throw new ApiError(400, "groupIds[] is required");
  const result = await prisma.group.deleteMany({ where: { id: { in: groupIds }, workspaceId } });
  res.json({ deleted: result.count });
});

export const bulkClearChat = asyncHandler(async (req, res) => {
  const { groupIds } = req.body;
  if (!Array.isArray(groupIds) || groupIds.length === 0) throw new ApiError(400, "groupIds[] is required");
  const result = await prisma.groupMessage.deleteMany({ where: { groupId: { in: groupIds } } });
  res.json({ deleted: result.count });
});

export const bulkBroadcastMessage = asyncHandler(async (req, res) => {
  const { groupIds, content } = req.body;
  if (!Array.isArray(groupIds) || groupIds.length === 0) throw new ApiError(400, "groupIds[] is required");
  if (!content?.trim()) throw new ApiError(400, "content is required");

  await prisma.groupMessage.createMany({
    data: groupIds.map((groupId) => ({ groupId, userId: req.user.id, content: content.trim() })),
  });

  const io = req.app.get("io");
  groupIds.forEach((groupId) => {
    io.to(`group:${groupId}`).emit("group_message", { groupId, userId: req.user.id, content });
  });

  res.status(201).json({ broadcastTo: groupIds.length });
});

// ---------- Chat ----------

export const listGroupMessages = asyncHandler(async (req, res) => {
  await loadGroupWithAccess(req.params.groupId, req.user);
  const { groupId } = req.params;
  const { after } = req.query;

  if (after) {
    const messages = await prisma.groupMessage.findMany({
      where: { groupId, createdAt: { gt: new Date(after) } },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    return res.json({ data: messages });
  }

  const messages = await prisma.groupMessage.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_CAP,
    include: { user: { select: { id: true, name: true, image: true } } },
  });
  res.json({ data: messages.reverse() });
});

export const createGroupMessage = asyncHandler(async (req, res) => {
  await loadGroupWithAccess(req.params.groupId, req.user);
  const { groupId } = req.params;
  const { content } = req.body;
  if (!content?.trim()) throw new ApiError(400, "content is required");

  const message = await prisma.groupMessage.create({
    data: { groupId, userId: req.user.id, content: content.trim() },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  const io = req.app.get("io");
  io.to(`group:${groupId}`).emit("group_message", message);

  res.status(201).json({ message });
});

export const clearGroupMessages = asyncHandler(async (req, res) => {
  const { isAdmin } = await loadGroupWithAccess(req.params.groupId, req.user);
  if (!isAdmin) throw new ApiError(403, "Admin access required");
  await prisma.groupMessage.deleteMany({ where: { groupId: req.params.groupId } });
  res.status(204).end();
});
