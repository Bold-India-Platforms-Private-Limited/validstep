import { Router } from "express";
import { login, getMe, forgotPassword } from "./auth.controller.js";
import { protect } from "../../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.get("/me", protect, getMe);

export default router;
