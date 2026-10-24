import { asyncHandler } from "@/utils/async.handler";
import { successResponse } from "@/utils/api.response";
import { getAdminDashboardService, getPlatformSummaryService } from "./platform.service";
export const getPlatformSummary = asyncHandler(async (_req, res, _next) => {
    const summary = await getPlatformSummaryService();
    successResponse(res, 'Platform summary fetched', 200, { summary });
});
export const getAdminDashboard = asyncHandler(async (_req, res, _next) => {
    const dashboard = await getAdminDashboardService();
    successResponse(res, 'Admin dashboard fetched', 200, { dashboard });
});
