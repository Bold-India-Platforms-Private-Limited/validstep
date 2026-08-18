import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { loadProjectWithAccess } from "./project.controller.js";

export const listDocuments = asyncHandler(async (req, res) => {
  await loadProjectWithAccess(req.params.projectId, req.user);
  const documents = await prisma.projectDocument.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { createdAt: "desc" },
    include: { addedBy: { select: { id: true, name: true, image: true } } },
  });
  res.json({ data: documents });
});

export const addDocument = asyncHandler(async (req, res) => {
  const { project, isAdmin } = await loadProjectWithAccess(req.params.projectId, req.user);
  if (!isAdmin && project.teamLeadId !== req.user.id) throw new ApiError(403, "Admin or team lead access required");

  const { title, driveLink, description } = req.body;
  if (!title?.trim() || !driveLink?.trim()) throw new ApiError(400, "title and driveLink are required");

  const document = await prisma.projectDocument.create({
    data: {
      projectId: project.id,
      title: title.trim(),
      driveLink: driveLink.trim(),
      description: description || null,
      addedById: req.user.id,
    },
    include: { addedBy: { select: { id: true, name: true, image: true } } },
  });
  res.status(201).json({ document });
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const { project, isAdmin } = await loadProjectWithAccess(req.params.projectId, req.user);
  if (!isAdmin && project.teamLeadId !== req.user.id) throw new ApiError(403, "Admin or team lead access required");
  await prisma.projectDocument.delete({ where: { id: req.params.docId } });
  res.status(204).end();
});
