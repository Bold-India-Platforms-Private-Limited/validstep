import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parsePagination, paginatedResult } from "../../utils/pagination.js";
import { sendMailBatch } from "../../config/mailer.js";
import { projectNotifyEmail } from "../../utils/emailTemplates.js";

export const listProjects = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 20 });
  const isAdmin = req.membership.role === "ADMIN";

  const where = {
    workspaceId,
    ...(!isAdmin && {
      groups: { some: { group: { members: { some: { userId: req.user.id } } } } },
    }),
  };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        teamLead: { select: { id: true, name: true, image: true } },
        groups: { include: { group: { select: { id: true, name: true } } } },
        _count: { select: { tasks: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  res.json(paginatedResult({ data: projects, total, page, limit }));
});

export const createProject = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { name, description, priority, status, teamLeadId, startDate, endDate, groupIds = [] } = req.body;
  if (!name?.trim()) throw new ApiError(400, "Project name is required");

  const validGroups = groupIds.length
    ? await prisma.group.findMany({ where: { id: { in: groupIds }, workspaceId }, select: { id: true } })
    : [];

  const project = await prisma.project.create({
    data: {
      workspaceId,
      name: name.trim(),
      description: description || null,
      priority: priority || "MEDIUM",
      status: status || "ACTIVE",
      teamLeadId: teamLeadId || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      groups: { create: validGroups.map((g) => ({ groupId: g.id })) },
    },
    include: { groups: { include: { group: true } } },
  });

  res.status(201).json({ project });
});

async function loadProjectWithAccess(projectId, user) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      teamLead: { select: { id: true, name: true, image: true } },
      groups: { include: { group: { select: { id: true, name: true } } } },
    },
  });
  if (!project) throw new ApiError(404, "Project not found");

  if (user.isSuperAdmin) return { project, isAdmin: true };

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: user.id } },
  });
  if (!membership) throw new ApiError(403, "Not a member of this workspace");
  const isAdmin = membership.role === "ADMIN";

  if (!isAdmin) {
    const groupIds = project.groups.map((g) => g.groupId);
    const hasAccess = groupIds.length
      ? await prisma.groupMember.findFirst({ where: { groupId: { in: groupIds }, userId: user.id } })
      : null;
    if (!hasAccess) throw new ApiError(403, "This project isn't assigned to your group");
  }

  return { project, isAdmin };
}

export const getProject = asyncHandler(async (req, res) => {
  const { project, isAdmin } = await loadProjectWithAccess(req.params.projectId, req.user);
  res.json({ project, isAdmin });
});

// De-duplicated member list across every group assigned to this project, plus a per-user
// task-assignment count — resolved in one query rather than the client fetching each
// group's full member list separately.
export const getProjectPeople = asyncHandler(async (req, res) => {
  const { project } = await loadProjectWithAccess(req.params.projectId, req.user);
  const groupIds = project.groups.map((g) => g.groupId);

  const [members, assignmentCounts, taskAssignees] = await Promise.all([
    groupIds.length
      ? prisma.groupMember.findMany({
          where: { groupId: { in: groupIds } },
          distinct: ["userId"],
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        })
      : [],
    prisma.task.count({ where: { projectId: project.id } }),
    prisma.taskAssignee.groupBy({
      by: ["userId"],
      where: { task: { projectId: project.id } },
      _count: { userId: true },
    }),
  ]);

  const taskCountByUser = new Map(taskAssignees.map((t) => [t.userId, t._count.userId]));
  const people = members.map((m) => ({
    ...m.user,
    isTeamLead: m.user.id === project.teamLeadId,
    assignedTaskCount: taskCountByUser.get(m.user.id) || 0,
  }));

  res.json({ data: people, totalTasks: assignmentCounts });
});

export const updateProject = asyncHandler(async (req, res) => {
  const { project, isAdmin } = await loadProjectWithAccess(req.params.projectId, req.user);
  if (!isAdmin && project.teamLeadId !== req.user.id) throw new ApiError(403, "Admin or team lead access required");

  const { name, description, priority, status, teamLeadId, startDate, endDate, progress, groupIds } = req.body;

  if (Array.isArray(groupIds)) {
    const validGroups = await prisma.group.findMany({
      where: { id: { in: groupIds }, workspaceId: project.workspaceId },
      select: { id: true },
    });
    await prisma.projectGroup.deleteMany({ where: { projectId: project.id } });
    if (validGroups.length) {
      await prisma.projectGroup.createMany({
        data: validGroups.map((g) => ({ projectId: project.id, groupId: g.id })),
      });
    }
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && { status }),
      ...(teamLeadId !== undefined && { teamLeadId }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(progress !== undefined && { progress }),
    },
    include: { groups: { include: { group: true } }, teamLead: { select: { id: true, name: true } } },
  });

  res.json({ project: updated });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const { isAdmin } = await loadProjectWithAccess(req.params.projectId, req.user);
  if (!isAdmin) throw new ApiError(403, "Admin access required");
  await prisma.project.delete({ where: { id: req.params.projectId } });
  res.status(204).end();
});

// Manual, one-off email to everyone in the project's assigned groups.
export const notifyProjectMembers = asyncHandler(async (req, res) => {
  const { project, isAdmin } = await loadProjectWithAccess(req.params.projectId, req.user);
  if (!isAdmin && project.teamLeadId !== req.user.id) throw new ApiError(403, "Admin or team lead access required");

  const groupIds = project.groups.map((g) => g.groupId);
  const members = groupIds.length
    ? await prisma.groupMember.findMany({
        where: { groupId: { in: groupIds } },
        distinct: ["userId"],
        include: { user: { select: { email: true } } },
      })
    : [];
  if (members.length === 0) return res.json({ recipientCount: 0 });

  const { subject, html } = projectNotifyEmail({
    projectName: project.name,
    loginUrl: `${process.env.FRONTEND_URL}/login`,
  });
  await sendMailBatch(members.map((m) => ({ to: m.user.email, subject, html })));

  res.json({ recipientCount: members.length });
});

export { loadProjectWithAccess };
