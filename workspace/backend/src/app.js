import express from "express";
import cors from "cors";
import compression from "compression";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import companyRoutes from "./modules/workspace/company.routes.js";
import workspaceRoutes from "./modules/workspace/workspace.routes.js";
import { workspaceGroupRouter, groupRouter } from "./modules/group/group.routes.js";
import { workspaceProjectRouter, projectRouter } from "./modules/project/project.routes.js";
import { taskRouter } from "./modules/task/task.routes.js";
import { attendanceRouter } from "./modules/attendance/attendance.routes.js";
import { leaveRouter } from "./modules/leave/leave.routes.js";
import { standupRouter } from "./modules/standup/standup.routes.js";
import { noticeRouter } from "./modules/notice/notice.routes.js";
import { notificationRouter } from "./modules/notification/notification.routes.js";
import { submissionRouter } from "./modules/submission/submission.routes.js";
import { protect, requireWorkspaceMember } from "./middleware/auth.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/", (req, res) => res.json({ status: "ok" }));
  app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);

  app.use("/api/users", protect, userRoutes);
  app.use("/api/companies", protect, companyRoutes);
  app.use("/api/workspaces", protect, workspaceRoutes);

  // Nested workspace-scoped resources
  app.use("/api/workspaces/:workspaceId/groups", protect, workspaceGroupRouter);
  app.use("/api/workspaces/:workspaceId/projects", protect, workspaceProjectRouter);
  app.use("/api/workspaces/:workspaceId/attendance", protect, attendanceRouter);
  app.use("/api/workspaces/:workspaceId/leave", protect, leaveRouter);
  app.use("/api/workspaces/:workspaceId/standup", protect, standupRouter);
  app.use("/api/workspaces/:workspaceId/notices", protect, noticeRouter);
  app.use("/api/workspaces/:workspaceId/notifications", protect, notificationRouter);
  app.use("/api/workspaces/:workspaceId/submissions", protect, submissionRouter);

  // Directly-addressed resources (access resolved per-record inside controllers)
  app.use("/api/groups", protect, groupRouter);
  app.use("/api/projects", protect, projectRouter);
  app.use("/api/tasks", protect, taskRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
