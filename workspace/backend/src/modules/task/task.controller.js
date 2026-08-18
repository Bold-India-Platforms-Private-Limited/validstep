import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { loadProjectWithAccess } from "../project/project.controller.js";
import { sendMailBatch } from "../../config/mailer.js";
import { taskNotifyEmail } from "../../utils/emailTemplates.js";

const taskInclude = {
  assignees: { include: { user: { select: { id: true, name: true, image: true } } } },
  groups: { include: { group: { select: { id: true, name: true } } } },
  _count: { select: { comments: true } },
};

export const listTasks = asyncHandler(async (req, res) => {
  const { project, isAdmin } = await loadProjectWithAccess(req.params.projectId, req.user);

  const where = {
    projectId: req.params.projectId,
    ...(!isAdmin && {
      OR: [
        { groups: { none: {} } }, // no group narrowing set -> visible to the whole project
        { groups: { some: { group: { members: { some: { userId: req.user.id } } } } } },
      ],
    }),
  };

  const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: "desc" }, include: taskInclude });
  res.json({ data: tasks });
});

// Validates groupIds are a subset of the project's own assigned groups, and returns the
// set of userIds allowed to be assigned (members of those groups, or of the whole project
// if no group narrowing is requested).
async function resolveTaskGroups(project, groupIds) {
  const projectGroupIds = project.groups.map((g) => g.groupId);
  const validGroupIds = Array.isArray(groupIds) ? groupIds.filter((id) => projectGroupIds.includes(id)) : [];

  const scopeGroupIds = validGroupIds.length ? validGroupIds : projectGroupIds;
  const allowedUsers = scopeGroupIds.length
    ? await prisma.groupMember.findMany({ where: { groupId: { in: scopeGroupIds } }, select: { userId: true } })
    : [];
  const allowedUserIds = new Set(allowedUsers.map((m) => m.userId));

  return { validGroupIds, allowedUserIds };
}

export const createTask = asyncHandler(async (req, res) => {
  const { project, isAdmin } = await loadProjectWithAccess(req.params.projectId, req.user);
  if (!isAdmin && project.teamLeadId !== req.user.id) throw new ApiError(403, "Admin or team lead access required");

  const { title, description, priority, status, category, dueDate, assigneeIds = [], groupIds = [] } = req.body;
  if (!title?.trim()) throw new ApiError(400, "Task title is required");

  const { validGroupIds, allowedUserIds } = await resolveTaskGroups(project, groupIds);
  const validAssigneeIds = allowedUserIds.size
    ? assigneeIds.filter((id) => allowedUserIds.has(id))
    : assigneeIds; // project has no groups at all -> no narrowing possible, trust caller

  const task = await prisma.task.create({
    data: {
      projectId: project.id,
      title: title.trim(),
      description: description || null,
      priority: priority || "MEDIUM",
      status: status || "TODO",
      category: category || "TASK",
      dueDate: dueDate ? new Date(dueDate) : null,
      assignees: { create: validAssigneeIds.map((userId) => ({ userId })) },
      groups: { create: validGroupIds.map((groupId) => ({ groupId })) },
    },
    include: taskInclude,
  });

  res.status(201).json({ task });
});

async function loadTaskWithAccess(taskId, user) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new ApiError(404, "Task not found");
  const { project, isAdmin } = await loadProjectWithAccess(task.projectId, user);
  return { task, project, isAdmin };
}

export const updateTask = asyncHandler(async (req, res) => {
  const { task, project, isAdmin } = await loadTaskWithAccess(req.params.taskId, req.user);
  const isLead = project.teamLeadId === req.user.id;
  const { title, description, priority, status, category, dueDate, assigneeIds, groupIds } = req.body;

  // Group/project members may update status (e.g. move to DONE); full edits are lead/admin only
  if (!isAdmin && !isLead && Object.keys(req.body).some((k) => k !== "status")) {
    throw new ApiError(403, "Only admin or team lead can edit task details");
  }

  if (Array.isArray(groupIds)) {
    if (!isAdmin && !isLead) throw new ApiError(403, "Only admin or team lead can change task groups");
    const { validGroupIds } = await resolveTaskGroups(project, groupIds);
    await prisma.taskGroup.deleteMany({ where: { taskId: task.id } });
    if (validGroupIds.length) {
      await prisma.taskGroup.createMany({ data: validGroupIds.map((groupId) => ({ taskId: task.id, groupId })) });
    }
  }

  if (Array.isArray(assigneeIds)) {
    if (!isAdmin && !isLead) throw new ApiError(403, "Only admin or team lead can reassign tasks");
    const currentGroups = await prisma.taskGroup.findMany({ where: { taskId: task.id }, select: { groupId: true } });
    const { allowedUserIds } = await resolveTaskGroups(project, currentGroups.map((g) => g.groupId));
    const validAssigneeIds = allowedUserIds.size ? assigneeIds.filter((id) => allowedUserIds.has(id)) : assigneeIds;

    await prisma.taskAssignee.deleteMany({ where: { taskId: task.id } });
    if (validAssigneeIds.length) {
      await prisma.taskAssignee.createMany({ data: validAssigneeIds.map((userId) => ({ taskId: task.id, userId })) });
    }
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && { status }),
      ...(category !== undefined && { category }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
    include: taskInclude,
  });

  res.json({ task: updated });
});

// Manual, one-off email to every current assignee — separate from the automatic in-app
// notifications, for when an admin wants to make sure someone actually sees a task.
export const notifyTaskAssignees = asyncHandler(async (req, res) => {
  const { task, project, isAdmin } = await loadTaskWithAccess(req.params.taskId, req.user);
  if (!isAdmin && project.teamLeadId !== req.user.id) throw new ApiError(403, "Admin or team lead access required");

  const assignees = await prisma.taskAssignee.findMany({
    where: { taskId: task.id },
    include: { user: { select: { email: true, name: true } } },
  });
  if (assignees.length === 0) return res.json({ recipientCount: 0 });

  const { subject, html } = taskNotifyEmail({
    taskTitle: task.title,
    projectName: project.name,
    loginUrl: `${process.env.FRONTEND_URL}/login`,
  });
  await sendMailBatch(assignees.map((a) => ({ to: a.user.email, subject, html })));

  res.json({ recipientCount: assignees.length });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const { project, isAdmin } = await loadTaskWithAccess(req.params.taskId, req.user);
  if (!isAdmin && project.teamLeadId !== req.user.id) throw new ApiError(403, "Admin or team lead access required");
  await prisma.task.delete({ where: { id: req.params.taskId } });
  res.status(204).end();
});

// ---------- Comments ----------

export const listComments = asyncHandler(async (req, res) => {
  await loadTaskWithAccess(req.params.taskId, req.user);
  const comments = await prisma.comment.findMany({
    where: { taskId: req.params.taskId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
  res.json({ data: comments });
});

export const addComment = asyncHandler(async (req, res) => {
  await loadTaskWithAccess(req.params.taskId, req.user);
  const { content } = req.body;
  if (!content?.trim()) throw new ApiError(400, "content is required");

  const comment = await prisma.comment.create({
    data: { taskId: req.params.taskId, userId: req.user.id, content: content.trim() },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
  res.status(201).json({ comment });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new ApiError(404, "Comment not found");
  const { isAdmin } = await loadTaskWithAccess(comment.taskId, req.user);
  if (!isAdmin && comment.userId !== req.user.id) throw new ApiError(403, "You can only delete your own comment");
  await prisma.comment.delete({ where: { id: commentId } });
  res.status(204).end();
});
