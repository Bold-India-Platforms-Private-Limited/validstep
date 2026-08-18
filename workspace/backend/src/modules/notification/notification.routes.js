import { Router } from "express";
import { requireWorkspaceMember } from "../../middleware/auth.js";
import { listNotifications, createNotification, updateNotification, deleteNotification } from "./notification.controller.js";

export const notificationRouter = Router({ mergeParams: true });

notificationRouter.get("/", requireWorkspaceMember(), listNotifications);
notificationRouter.post("/", requireWorkspaceMember({ adminOnly: true }), createNotification);
notificationRouter.patch("/:notificationId", requireWorkspaceMember({ adminOnly: true }), updateNotification);
notificationRouter.delete("/:notificationId", requireWorkspaceMember({ adminOnly: true }), deleteNotification);
