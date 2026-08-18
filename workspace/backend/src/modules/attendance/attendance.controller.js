import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { uploadBase64Image, deleteObjectByUrl } from "../../config/r2.js";
import { parsePagination, paginatedResult } from "../../utils/pagination.js";
import { sendMailBatch } from "../../config/mailer.js";
import { attendanceReminderEmail } from "../../utils/emailTemplates.js";

function todayKey() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dayKey(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export const markAttendance = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { imageBase64, date: clientDate } = req.body;
  if (!imageBase64) throw new ApiError(400, "imageBase64 is required");

  // The client sends its own local calendar date (YYYY-MM-DD) so a check-in near midnight
  // lands on the day the intern actually experienced, not whatever date it happens to be
  // in the server's UTC clock. Bounded to a 2-day window either side to prevent abuse.
  const date = clientDate ? dayKey(clientDate) : todayKey();
  const dayDiff = Math.abs(date.getTime() - todayKey().getTime()) / 86_400_000;
  if (dayDiff > 2) throw new ApiError(400, "Invalid attendance date");

  const existing = await prisma.attendance.findUnique({
    where: { workspaceId_userId_date: { workspaceId, userId: req.user.id, date } },
  });
  if (existing) return res.json({ attendance: existing, alreadyMarked: true });

  const imageUrl = await uploadBase64Image(imageBase64, `attendance/${workspaceId}/${req.user.id}/${date.toISOString().slice(0, 10)}`);

  const attendance = await prisma.attendance.create({
    data: { workspaceId, userId: req.user.id, date, imageUrl },
  });
  res.status(201).json({ attendance });
});

export const checkOutAttendance = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { date: clientDate } = req.body;
  const date = clientDate ? dayKey(clientDate) : todayKey();

  const existing = await prisma.attendance.findUnique({
    where: { workspaceId_userId_date: { workspaceId, userId: req.user.id, date } },
  });
  if (!existing) throw new ApiError(400, "Check in before checking out");
  if (existing.checkOutTime) return res.json({ attendance: existing, alreadyCheckedOut: true });

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOutTime: new Date() },
  });
  res.json({ attendance });
});

export const getMyAttendanceStatus = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const attendance = await prisma.attendance.findUnique({
    where: { workspaceId_userId_date: { workspaceId, userId: req.user.id, date: todayKey() } },
  });
  res.json({ markedToday: !!attendance, attendance: attendance || null });
});

export const getMyAttendance = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 31 });

  const where = { workspaceId, userId: req.user.id };
  const [data, total] = await Promise.all([
    prisma.attendance.findMany({ where, orderBy: { date: "desc" }, skip, take }),
    prisma.attendance.count({ where }),
  ]);
  res.json(paginatedResult({ data, total, page, limit }));
});

// Admin: everyone's check-ins for a given date, plus who from the roster hasn't checked in.
export const getAttendanceByDate = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const date = dayKey(req.query.date);

  const [present, allMembers] = await Promise.all([
    prisma.attendance.findMany({
      where: { workspaceId, date },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId, role: "MEMBER" },
      select: { userId: true, user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const presentIds = new Set(present.map((a) => a.userId));
  const absent = allMembers.filter((m) => !presentIds.has(m.userId)).map((m) => m.user);

  res.json({ date, present, absent, presentCount: present.length, absentCount: absent.length });
});

// Emails everyone who hasn't checked in yet today. Target set resolved server-side and
// the send happens in the background, same fire-and-forget pattern as bulk credentials.
export const sendAttendanceReminders = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const date = todayKey();

  const [checkedIn, allMembers] = await Promise.all([
    prisma.attendance.findMany({ where: { workspaceId, date }, select: { userId: true } }),
    prisma.workspaceMember.findMany({
      where: { workspaceId, role: "MEMBER" },
      select: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const checkedInIds = new Set(checkedIn.map((a) => a.userId));
  const pending = allMembers.map((m) => m.user).filter((u) => !checkedInIds.has(u.id));

  if (pending.length === 0) return res.json({ recipientCount: 0 });
  res.json({ recipientCount: pending.length });

  (async () => {
    try {
      await sendMailBatch(
        pending.map((u) => {
          const { subject, html } = attendanceReminderEmail({
            name: u.name,
            loginUrl: `${process.env.FRONTEND_URL}/login`,
          });
          return { to: u.email, subject, html };
        })
      );
    } catch (err) {
      console.error(`Attendance reminder batch failed for workspace ${workspaceId}:`, err.message);
    }
  })();
});

export const deleteAttendance = asyncHandler(async (req, res) => {
  const attendance = await prisma.attendance.findUnique({ where: { id: req.params.attendanceId } });
  if (!attendance) throw new ApiError(404, "Record not found");
  await deleteObjectByUrl(attendance.imageUrl);
  await prisma.attendance.delete({ where: { id: attendance.id } });
  res.status(204).end();
});
