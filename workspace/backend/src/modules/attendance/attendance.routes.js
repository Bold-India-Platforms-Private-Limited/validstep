import { Router } from "express";
import { requireWorkspaceMember } from "../../middleware/auth.js";
import {
  markAttendance,
  checkOutAttendance,
  getMyAttendanceStatus,
  getMyAttendance,
  getAttendanceByDate,
  sendAttendanceReminders,
  deleteAttendance,
} from "./attendance.controller.js";

export const attendanceRouter = Router({ mergeParams: true });

attendanceRouter.post("/", requireWorkspaceMember(), markAttendance);
attendanceRouter.post("/checkout", requireWorkspaceMember(), checkOutAttendance);
attendanceRouter.get("/status", requireWorkspaceMember(), getMyAttendanceStatus);
attendanceRouter.get("/me", requireWorkspaceMember(), getMyAttendance);
attendanceRouter.get("/", requireWorkspaceMember({ adminOnly: true }), getAttendanceByDate);
attendanceRouter.post("/remind", requireWorkspaceMember({ adminOnly: true }), sendAttendanceReminders);
attendanceRouter.delete("/:attendanceId", requireWorkspaceMember({ adminOnly: true }), deleteAttendance);
