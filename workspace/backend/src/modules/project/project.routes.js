import { Router } from "express";
import { requireWorkspaceMember } from "../../middleware/auth.js";
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getProjectPeople,
  notifyProjectMembers,
} from "./project.controller.js";
import { listTasks, createTask, notifyTaskAssignees } from "../task/task.controller.js";
import { listDocuments, addDocument, deleteDocument } from "./document.controller.js";
import { sendProjectMessage, getMyProjectMessages } from "./message.controller.js";

// Nested under /api/workspaces/:workspaceId/projects
export const workspaceProjectRouter = Router({ mergeParams: true });
workspaceProjectRouter.get("/", requireWorkspaceMember(), listProjects);
workspaceProjectRouter.post("/", requireWorkspaceMember({ adminOnly: true }), createProject);

// Mounted directly at /api/projects
export const projectRouter = Router();
projectRouter.get("/:projectId", getProject);
projectRouter.patch("/:projectId", updateProject);
projectRouter.delete("/:projectId", deleteProject);
projectRouter.get("/:projectId/people", getProjectPeople);
projectRouter.post("/:projectId/notify", notifyProjectMembers);
projectRouter.get("/:projectId/tasks", listTasks);
projectRouter.post("/:projectId/tasks", createTask);
projectRouter.get("/:projectId/documents", listDocuments);
projectRouter.post("/:projectId/documents", addDocument);
projectRouter.delete("/:projectId/documents/:docId", deleteDocument);
projectRouter.post("/:projectId/messages", sendProjectMessage);
projectRouter.get("/:projectId/messages/me", getMyProjectMessages);
