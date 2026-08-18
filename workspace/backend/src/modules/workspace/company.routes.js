import { Router } from "express";
import { requireSuperAdmin } from "../../middleware/auth.js";
import {
  createCompany,
  listCompanies,
  deleteCompany,
  createWorkspace,
  listCompanyWorkspaces,
} from "./workspace.controller.js";

const router = Router();

router.use(requireSuperAdmin);

router.get("/", listCompanies);
router.post("/", createCompany);
router.delete("/:companyId", deleteCompany);

router.get("/:companyId/workspaces", listCompanyWorkspaces);
router.post("/:companyId/workspaces", createWorkspace);

export default router;
