import { Router } from "express";
import { requireWorkspaceMember } from "../../middleware/auth.js";
import { submitStandup, updateStandup, deleteStandup, getMyStandups, getStandupsByDate } from "./standup.controller.js";

export const standupRouter = Router({ mergeParams: true });

standupRouter.post("/", requireWorkspaceMember(), submitStandup);
standupRouter.get("/me", requireWorkspaceMember(), getMyStandups);
standupRouter.patch("/:standupId", requireWorkspaceMember(), updateStandup);
standupRouter.delete("/:standupId", requireWorkspaceMember(), deleteStandup);
standupRouter.get("/", requireWorkspaceMember({ adminOnly: true }), getStandupsByDate);
