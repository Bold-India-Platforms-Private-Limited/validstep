import { Router } from "express";
import { updateMe } from "./user.controller.js";

const router = Router();
router.patch("/me", updateMe);

export default router;
