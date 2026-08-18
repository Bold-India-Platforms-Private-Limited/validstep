import { Router } from "express";
import { requireWorkspaceMember } from "../../middleware/auth.js";
import {
  listGroups,
  listAllGroupIds,
  createGroup,
  bulkGenerateGroups,
  bulkGeneratePreview,
  bulkDeleteGroups,
  bulkClearChat,
  bulkBroadcastMessage,
  getGroup,
  updateGroupMembers,
  deleteGroup,
  listGroupMessages,
  createGroupMessage,
  clearGroupMessages,
} from "./group.controller.js";

// Nested under /api/workspaces/:workspaceId/groups
export const workspaceGroupRouter = Router({ mergeParams: true });
workspaceGroupRouter.get("/", requireWorkspaceMember(), listGroups);
workspaceGroupRouter.get("/all", requireWorkspaceMember({ adminOnly: true }), listAllGroupIds);
workspaceGroupRouter.post("/", requireWorkspaceMember({ adminOnly: true }), createGroup);
workspaceGroupRouter.get("/bulk-generate/preview", requireWorkspaceMember({ adminOnly: true }), bulkGeneratePreview);
workspaceGroupRouter.post("/bulk-generate", requireWorkspaceMember({ adminOnly: true }), bulkGenerateGroups);
workspaceGroupRouter.post("/bulk-delete", requireWorkspaceMember({ adminOnly: true }), bulkDeleteGroups);
workspaceGroupRouter.post("/bulk-clear-chat", requireWorkspaceMember({ adminOnly: true }), bulkClearChat);
workspaceGroupRouter.post("/bulk-broadcast", requireWorkspaceMember({ adminOnly: true }), bulkBroadcastMessage);

// Mounted directly at /api/groups (access resolved per-group inside controller)
export const groupRouter = Router();
groupRouter.get("/:groupId", getGroup);
groupRouter.patch("/:groupId/members", updateGroupMembers);
groupRouter.delete("/:groupId", deleteGroup);
groupRouter.get("/:groupId/messages", listGroupMessages);
groupRouter.post("/:groupId/messages", createGroupMessage);
groupRouter.delete("/:groupId/messages", clearGroupMessages);
