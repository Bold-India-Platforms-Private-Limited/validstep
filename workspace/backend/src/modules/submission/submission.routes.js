import { Router } from "express";
import { requireWorkspaceMember } from "../../middleware/auth.js";
import { createSubmission, getMySubmissions, getAllSubmissions, giveFeedback } from "./submission.controller.js";

export const submissionRouter = Router({ mergeParams: true });

submissionRouter.post("/", requireWorkspaceMember(), createSubmission);
submissionRouter.get("/me", requireWorkspaceMember(), getMySubmissions);
submissionRouter.get("/", requireWorkspaceMember({ adminOnly: true }), getAllSubmissions);
submissionRouter.patch("/:submissionId/feedback", requireWorkspaceMember({ adminOnly: true }), giveFeedback);
