import { Router } from "express";
import { updateTask, deleteTask, notifyTaskAssignees, listComments, addComment, deleteComment } from "./task.controller.js";

export const taskRouter = Router();
taskRouter.patch("/:taskId", updateTask);
taskRouter.delete("/:taskId", deleteTask);
taskRouter.post("/:taskId/notify", notifyTaskAssignees);
taskRouter.get("/:taskId/comments", listComments);
taskRouter.post("/:taskId/comments", addComment);
taskRouter.delete("/:taskId/comments/:commentId", deleteComment);
