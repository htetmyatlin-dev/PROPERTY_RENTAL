import { protect, restrictTo } from "@/middleware/auth.middleware";
import { Router } from "express";
import { getAdminProperties, getAdminUsers } from "./admin.controller";
const router = Router();
router.use(protect);
router.get("/users", restrictTo("ADMIN"), getAdminUsers);
router.get("/properties", restrictTo("ADMIN"), getAdminProperties);
export { router as adminRouter };
