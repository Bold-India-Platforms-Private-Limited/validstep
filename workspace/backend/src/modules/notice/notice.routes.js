import { Router } from "express";
import { requireWorkspaceMember } from "../../middleware/auth.js";
import { listNotices, createNotice, updateNotice, publishNotice, deleteNotice } from "./notice.controller.js";

export const noticeRouter = Router({ mergeParams: true });

noticeRouter.get("/", requireWorkspaceMember(), listNotices);
noticeRouter.post("/", requireWorkspaceMember({ adminOnly: true }), createNotice);
noticeRouter.patch("/:noticeId", requireWorkspaceMember({ adminOnly: true }), updateNotice);
noticeRouter.patch("/:noticeId/publish", requireWorkspaceMember({ adminOnly: true }), publishNotice);
noticeRouter.delete("/:noticeId", requireWorkspaceMember({ adminOnly: true }), deleteNotice);
