import { protect, restrictTo } from "@/middleware/auth.middleware";
import { Router } from "express";
import { getLandlordDashboard, getTenantDashboard } from "./dashboard.controller";
const router = Router();
router.use(protect);
router.get("/landlord", restrictTo("LANDLORD"), getLandlordDashboard);
router.get("/tenant", restrictTo("TENANT"), getTenantDashboard);
export { router as dashboardRouter };
