import { asyncHandler } from "@/utils/async.handler";
import { successResponse } from "@/utils/api.response";
import { getAdminUsersService, getAdminPropertiesService } from "./admin.service";
export const getAdminUsers = asyncHandler(async (req, res, _next) => {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const role = typeof req.query.role === "string" ? req.query.role : "";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const data = await getAdminUsersService({ search, role, page, limit });
    successResponse(res, "Users fetched", 200, data);
});
export const getAdminProperties = asyncHandler(async (req, res, _next) => {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const propertyType = typeof req.query.propertyType === "string" ? req.query.propertyType : "";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const data = await getAdminPropertiesService({ search, status, propertyType, page, limit });
    successResponse(res, "Properties fetched", 200, data);
});
