import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parsePagination, paginatedResult } from "../../utils/pagination.js";
import { uniqueSlug } from "../../utils/slug.js";
import { sendMailBatch, sendMail } from "../../config/mailer.js";
import { welcomeCredentialsEmail, passwordResetEmail } from "../../utils/emailTemplates.js";

// ---------- Companies ----------

export const createCompany = asyncHandler(async (req, res) => {
  const { name, logoUrl } = req.body;
  if (!name?.trim()) throw new ApiError(400, "Company name is required");

  const slug = await uniqueSlug(name, (s) => prisma.company.findUnique({ where: { slug: s } }));

  const company = await prisma.company.create({
    data: { name: name.trim(), slug, logoUrl: logoUrl || "", createdById: req.user.id },
  });
  res.status(201).json({ company });
});

export const listCompanies = asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = parsePagination(req.query);
  const where = req.query.search
    ? { name: { contains: req.query.search, mode: "insensitive" } }
    : {};

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { workspaces: true } } },
    }),
    prisma.company.count({ where }),
  ]);

  res.json(paginatedResult({ data: companies, total, page, limit }));
});

export const deleteCompany = asyncHandler(async (req, res) => {
  await prisma.company.delete({ where: { id: req.params.companyId } });
  res.status(204).end();
});

// ---------- Workspaces (batches) ----------

export const createWorkspace = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { name, description, startDate, endDate } = req.body;
  if (!name?.trim()) throw new ApiError(400, "Batch name is required");

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new ApiError(404, "Company not found");

  const slug = await uniqueSlug(
    `${company.slug}-${name}`,
    (s) => prisma.workspace.findUnique({ where: { slug: s } })
  );

  const workspace = await prisma.workspace.create({
    data: {
      companyId,
      name: name.trim(),
      slug,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  // Creator (super admin) becomes a workspace admin so they can act inside it as a normal member too
  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: req.user.id, role: "ADMIN" },
  });

  res.status(201).json({ workspace });
});

export const listCompanyWorkspaces = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { page, limit, skip, take } = parsePagination(req.query);

  const where = { companyId };
  const [workspaces, total] = await Promise.all([
    prisma.workspace.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true, groups: true, projects: true } },
      },
    }),
    prisma.workspace.count({ where }),
  ]);

  res.json(paginatedResult({ data: workspaces, total, page, limit }));
});

// Workspaces the current logged-in user belongs to (used by both admins and interns to pick/enter a batch)
export const listMyWorkspaces = asyncHandler(async (req, res) => {
  if (req.user.isSuperAdmin) {
    const workspaces = await prisma.workspace.findMany({
      orderBy: { createdAt: "desc" },
      include: { company: true, _count: { select: { members: true, groups: true, projects: true } } },
    });
    return res.json({ data: workspaces.map((w) => ({ ...w, role: "ADMIN" })) });
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: req.user.id },
    include: {
      workspace: {
        include: { company: true, _count: { select: { members: true, groups: true, projects: true } } },
      },
    },
  });
  res.json({ data: memberships.map((m) => ({ ...m.workspace, role: m.role })) });
});

export const getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: req.params.workspaceId },
    include: { company: true, _count: { select: { members: true, groups: true, projects: true } } },
  });
  if (!workspace) throw new ApiError(404, "Batch not found");
  res.json({ workspace, role: req.membership.role });
});

export const updateWorkspace = asyncHandler(async (req, res) => {
  const { name, description, startDate, endDate, isArchived, ndaContent } = req.body;
  const workspace = await prisma.workspace.update({
    where: { id: req.params.workspaceId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(isArchived !== undefined && { isArchived }),
      ...(ndaContent !== undefined && { ndaContent }),
    },
  });
  res.json({ workspace });
});

export const deleteWorkspace = asyncHandler(async (req, res) => {
  await prisma.workspace.delete({ where: { id: req.params.workspaceId } });
  res.status(204).end();
});

// Personal dashboard summary for the logged-in member — resolved in a handful of
// aggregate queries server-side rather than the client fetching every project's tasks
// just to compute a few counts.
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.id;
  const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  const [taskStatusCounts, taskPriorityCounts, attendanceThisMonth, pendingLeaves, groupCount, projectCount] =
    await Promise.all([
      prisma.task.groupBy({
        by: ["status"],
        where: { assignees: { some: { userId } }, project: { workspaceId } },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ["priority"],
        where: { assignees: { some: { userId } }, project: { workspaceId } },
        _count: { _all: true },
      }),
      prisma.attendance.count({ where: { workspaceId, userId, date: { gte: startOfMonth } } }),
      prisma.leaveRequest.count({ where: { workspaceId, userId, status: "PENDING" } }),
      prisma.groupMember.count({ where: { userId, group: { workspaceId } } }),
      prisma.projectGroup.count({
        where: { group: { workspaceId, members: { some: { userId } } } },
      }),
    ]);

  const tasksByStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  taskStatusCounts.forEach((t) => (tasksByStatus[t.status] = t._count._all));

  const tasksByPriority = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  taskPriorityCounts.forEach((t) => (tasksByPriority[t.priority] = t._count._all));

  const totalTasks = tasksByStatus.TODO + tasksByStatus.IN_PROGRESS + tasksByStatus.DONE;

  res.json({
    tasksByStatus,
    tasksByPriority,
    totalTasks,
    attendanceThisMonth,
    pendingLeaves,
    groupCount,
    projectCount,
  });
});

// ---------- NDA ----------

export const getNdaStatus = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const [workspace, membership] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ndaContent: true } }),
    req.user.isSuperAdmin
      ? null
      : prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
          select: { ndaSignedAt: true, ndaSignatureName: true },
        }),
  ]);
  res.json({
    ndaContent: workspace?.ndaContent || "",
    signed: req.user.isSuperAdmin ? true : !!membership?.ndaSignedAt,
    signedAt: membership?.ndaSignedAt || null,
  });
});

// ---------- Presence status (Available / Busy / Be Right Back) ----------

export const setMyStatus = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { status } = req.body;
  if (!["AVAILABLE", "BUSY", "BE_RIGHT_BACK"].includes(status)) throw new ApiError(400, "Invalid status");

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
    data: { status },
  });

  // Push to anyone watching this workspace's presence room, same channel as online/offline,
  // so admins see status changes live without polling.
  req.app.get("io")?.to(`presence:${workspaceId}`).emit("status_update", { userId: req.user.id, status });

  res.json({ status });
});

export const signNda = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { signatureName } = req.body;
  if (!signatureName?.trim()) throw new ApiError(400, "Type your full name to sign");

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
    data: { ndaSignedAt: new Date(), ndaSignatureName: signatureName.trim() },
  });
  res.json({ signed: true });
});

// ---------- Members ----------

export const listWorkspaceMembers = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 25 });
  const { search, groupless } = req.query;

  const where = {
    workspaceId,
    ...(search && {
      user: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
    }),
    ...(groupless === "true" && { user: { groupMemberships: { none: { group: { workspaceId } } } } }),
  };

  const [members, total] = await Promise.all([
    prisma.workspaceMember.findMany({
      where,
      skip,
      take,
      orderBy: { joinedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, lastLoginAt: true } },
      },
    }),
    prisma.workspaceMember.count({ where }),
  ]);

  res.json(paginatedResult({ data: members, total, page, limit }));
});

// Bulk-invite members via batch queries (findMany + createMany), not a loop of per-row
// awaits — the previous version ran bcrypt.hash and individual queries inside a single
// interactive transaction, which blew past Prisma's 5s transaction timeout on anything
// more than ~30 invites at once. bcrypt is CPU work and doesn't belong inside a DB
// transaction to begin with.
export const bulkInviteMembers = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { members } = req.body; // [{ name, email }]
  if (!Array.isArray(members) || members.length === 0) {
    throw new ApiError(400, "members[] is required");
  }

  const parsed = members
    .map((m) => ({ name: m.name?.trim(), email: (m.email || "").toLowerCase().trim() }))
    .filter((m) => m.email);
  const byEmail = new Map(parsed.map((m) => [m.email, m])); // de-dupe repeated emails in the input
  const emails = [...byEmail.keys()];
  if (emails.length === 0) throw new ApiError(400, "No valid emails provided");

  const existingUsers = await prisma.user.findMany({ where: { email: { in: emails } } });
  const existingEmails = new Set(existingUsers.map((u) => u.email));
  const newEmails = emails.filter((e) => !existingEmails.has(e));

  const newAccounts = await Promise.all(
    newEmails.map(async (email) => {
      const m = byEmail.get(email);
      const tempPassword = crypto.randomBytes(4).toString("hex");
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      return { name: m.name || email.split("@")[0], email, passwordHash, tempPassword };
    })
  );

  await prisma.$transaction(
    async (tx) => {
      if (newAccounts.length) {
        await tx.user.createMany({
          data: newAccounts.map(({ name, email, passwordHash }) => ({ name, email, passwordHash })),
          skipDuplicates: true,
        });
      }
      const allUsers = await tx.user.findMany({ where: { email: { in: emails } } });
      await tx.workspaceMember.createMany({
        data: allUsers.map((u) => ({ workspaceId, userId: u.id, role: "MEMBER" })),
        skipDuplicates: true,
      });
    },
    { timeout: 30000 }
  );

  const allUsers = await prisma.user.findMany({ where: { email: { in: emails } } });
  const passwordByEmail = new Map(newAccounts.map((a) => [a.email, a.tempPassword]));
  const results = allUsers.map((u) => ({
    userId: u.id,
    name: u.name,
    email: u.email,
    tempPassword: passwordByEmail.get(u.email),
    isNew: passwordByEmail.has(u.email),
  }));

  res.status(201).json({ data: results });

  // Fire-and-forget: don't hold a bulk invite of hundreds/thousands of interns open on the
  // HTTP connection waiting for SMTP round-trips — the response above already gives the
  // admin every temp password as a fallback if some emails are slow or bounce.
  if (newAccounts.length === 0) return;

  (async () => {
    try {
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      await sendMailBatch(
        results.filter((r) => r.isNew).map((r) => {
          const { subject, html } = welcomeCredentialsEmail({
            name: r.name,
            email: r.email,
            password: r.tempPassword,
            workspaceName: workspace?.name || "your workspace",
            loginUrl: `${process.env.FRONTEND_URL}/login`,
          });
          return { to: r.email, subject, html };
        })
      );
    } catch (err) {
      console.error(`Bulk invite email batch failed for workspace ${workspaceId}:`, err.message);
    }
  })();
});

// Admin resets one member's password and emails them the new one.
export const resetMemberPassword = asyncHandler(async (req, res) => {
  const { workspaceId, userId } = req.params;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { user: true },
  });
  if (!membership) throw new ApiError(404, "This user isn't a member of this batch");

  const tempPassword = crypto.randomBytes(4).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  const { subject, html } = passwordResetEmail({
    name: membership.user.name,
    email: membership.user.email,
    password: tempPassword,
    loginUrl: `${process.env.FRONTEND_URL}/login`,
  });
  const emailSent = await sendMail({ to: membership.user.email, subject, html });

  res.json({ tempPassword, emailSent });
});

// Bulk credential (re)send — resolves the target set server-side (never pulls a full
// member list across the wire just to send emails) and streams passwords out in the
// background, same pattern as bulkInviteMembers.
export const sendBulkCredentials = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { userIds, target } = req.body;

  let members;
  if (Array.isArray(userIds) && userIds.length > 0) {
    members = await prisma.workspaceMember.findMany({
      where: { workspaceId, userId: { in: userIds } },
      include: { user: true },
    });
  } else if (target === "never_logged_in") {
    members = await prisma.workspaceMember.findMany({
      where: { workspaceId, role: "MEMBER", user: { lastLoginAt: null } },
      include: { user: true },
    });
  } else if (target === "all") {
    members = await prisma.workspaceMember.findMany({
      where: { workspaceId, role: "MEMBER" },
      include: { user: true },
    });
  } else {
    throw new ApiError(400, "Provide userIds[] or target: 'all' | 'never_logged_in'");
  }

  if (members.length === 0) return res.json({ recipientCount: 0 });

  res.json({ recipientCount: members.length });

  (async () => {
    try {
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      const messages = [];
      for (const m of members) {
        const tempPassword = crypto.randomBytes(4).toString("hex");
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        await prisma.user.update({ where: { id: m.userId }, data: { passwordHash } });

        const { subject, html } = welcomeCredentialsEmail({
          name: m.user.name,
          email: m.user.email,
          password: tempPassword,
          workspaceName: workspace?.name || "your workspace",
          loginUrl: `${process.env.FRONTEND_URL}/login`,
        });
        messages.push({ to: m.user.email, subject, html });
      }
      await sendMailBatch(messages);
    } catch (err) {
      console.error(`Bulk credential send failed for workspace ${workspaceId}:`, err.message);
    }
  })();
});

export const removeWorkspaceMembers = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { userIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) throw new ApiError(400, "userIds[] is required");

  await prisma.workspaceMember.deleteMany({ where: { workspaceId, userId: { in: userIds } } });
  res.status(204).end();
});
