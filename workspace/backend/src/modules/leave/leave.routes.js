import { Router } from "express";
import { requireWorkspaceMember } from "../../middleware/auth.js";
import { submitLeave, getMyLeaves, cancelLeave, getAllLeaves, reviewLeave } from "./leave.controller.js";

export const leaveRouter = Router({ mergeParams: true });

leaveRouter.post("/", requireWorkspaceMember(), submitLeave);
leaveRouter.get("/me", requireWorkspaceMember(), getMyLeaves);
leaveRouter.delete("/:leaveId", requireWorkspaceMember(), cancelLeave);
leaveRouter.get("/", requireWorkspaceMember({ adminOnly: true }), getAllLeaves);
leaveRouter.patch("/:leaveId/review", requireWorkspaceMember({ adminOnly: true }), reviewLeave);
