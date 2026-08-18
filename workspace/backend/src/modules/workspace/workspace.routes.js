import { Router } from "express";
import { requireWorkspaceMember } from "../../middleware/auth.js";
import {
  listMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  listWorkspaceMembers,
  bulkInviteMembers,
  removeWorkspaceMembers,
  resetMemberPassword,
  sendBulkCredentials,
  getNdaStatus,
  signNda,
  setMyStatus,
  getDashboardSummary,
} from "./workspace.controller.js";
import { getCandidateQueries } from "../project/message.controller.js";

const router = Router();

router.get("/mine", listMyWorkspaces);

router.get("/:workspaceId", requireWorkspaceMember(), getWorkspace);
router.patch("/:workspaceId", requireWorkspaceMember({ adminOnly: true }), updateWorkspace);
router.delete("/:workspaceId", requireWorkspaceMember({ adminOnly: true }), deleteWorkspace);

router.get("/:workspaceId/members", requireWorkspaceMember({ adminOnly: true }), listWorkspaceMembers);
router.post("/:workspaceId/members/bulk", requireWorkspaceMember({ adminOnly: true }), bulkInviteMembers);
router.delete("/:workspaceId/members", requireWorkspaceMember({ adminOnly: true }), removeWorkspaceMembers);
router.post(
  "/:workspaceId/members/:userId/reset-password",
  requireWorkspaceMember({ adminOnly: true }),
  resetMemberPassword
);
router.post(
  "/:workspaceId/members/send-credentials",
  requireWorkspaceMember({ adminOnly: true }),
  sendBulkCredentials
);

router.patch("/:workspaceId/members/me/status", requireWorkspaceMember(), setMyStatus);
router.get("/:workspaceId/dashboard-summary", requireWorkspaceMember(), getDashboardSummary);

router.get("/:workspaceId/nda", requireWorkspaceMember(), getNdaStatus);
router.post("/:workspaceId/nda/sign", requireWorkspaceMember(), signNda);

router.get(
  "/:workspaceId/candidate-queries",
  requireWorkspaceMember({ adminOnly: true }),
  getCandidateQueries
);

export default router;
