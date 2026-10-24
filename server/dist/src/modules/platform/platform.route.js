import { protect, restrictTo } from "@/middleware/auth.middleware";
import { Router } from "express";
import { getAdminDashboard, getPlatformSummary } from "./platform.controller";
const router = Router();
router.use(protect);
router.get('/summary', restrictTo("ADMIN"), getPlatformSummary);
router.get('/dashboard', restrictTo("ADMIN"), getAdminDashboard);
export { router as platformRouter };
