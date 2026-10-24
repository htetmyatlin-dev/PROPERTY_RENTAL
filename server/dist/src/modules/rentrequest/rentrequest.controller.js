import fs from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/utils/app.error";
import { leaseDir } from "@/utils/lease.pdf";
import { successResponse } from "@/utils/api.response";
import { asyncHandler } from "@/utils/async.handler";
import { approveRentRequestService, cancelRentRequestService, createRentRequestService, getAllRentRequestsService, getLandlordRentRequestsService, getLeaseAgreementService, getMyRentRequestsService, getRentRequestByIdService, refundEscrowService, rejectRentRequestService, releaseEscrowService, updateRentRequestService, } from "./rentrequest.service";
import { rentRequestQuerySchema } from "./rentrequest.validation";
const money = (value) => value !== null && value !== undefined && typeof value.toNumber === "function"
    ? value.toNumber()
    : value;
const serializeEscrow = (escrow) => (escrow ? { ...escrow, amount: money(escrow.amount) } : escrow);
const serializePayment = (payment) => ({
    ...payment,
    amount: money(payment.amount),
    landlordAmount: money(payment.landlordAmount),
    commissionAmount: money(payment.commissionAmount),
    escrow: serializeEscrow(payment.escrow),
});
const serializeRentRequest = (rentRequest) => ({
    ...rentRequest,
    amount: money(rentRequest.amount),
    depositAmount: money(rentRequest.depositAmount),
    payments: rentRequest.payments?.map(serializePayment),
});
const requireUser = (req) => {
    const user = req.user;
    if (!user)
        throw new AppError("Unauthorized", 401);
    return user;
};
export const createRentRequest = asyncHandler(async (req, res, _next) => {
    const user = requireUser(req);
    const rentRequest = await createRentRequestService(user.id, req.body);
    successResponse(res, "Rent request submitted", 201, { rentRequest: serializeRentRequest(rentRequest) });
});
export const getMyRentRequests = asyncHandler(async (req, res, _next) => {
    const user = requireUser(req);
    const parsed = rentRequestQuerySchema.safeParse(req.query);
    if (!parsed.success)
        throw parsed.error;
    const { rentRequests, totalPages, totalCount } = await getMyRentRequestsService(user.id, parsed.data);
    successResponse(res, "Rent requests fetched", 200, {
        rentRequests: rentRequests.map(serializeRentRequest),
        totalPages,
        totalCount,
    });
});
export const getLandlordRentRequests = asyncHandler(async (req, res, _next) => {
    const user = requireUser(req);
    const parsed = rentRequestQuerySchema.safeParse(req.query);
    if (!parsed.success)
        throw parsed.error;
    const { rentRequests, totalPages, totalCount } = await getLandlordRentRequestsService(user.id, parsed.data);
    successResponse(res, "Rent requests fetched", 200, {
        rentRequests: rentRequests.map(serializeRentRequest),
        totalPages,
        totalCount,
    });
});
export const getAllRentRequests = asyncHandler(async (req, res, _next) => {
    const parsed = rentRequestQuerySchema.safeParse(req.query);
    if (!parsed.success)
        throw parsed.error;
    const { rentRequests, totalPages, totalCount } = await getAllRentRequestsService(parsed.data);
    successResponse(res, "Rent requests fetched", 200, {
        rentRequests: rentRequests.map(serializeRentRequest),
        totalPages,
        totalCount,
    });
});
export const getRentRequestById = asyncHandler(async (req, res, _next) => {
    const user = requireUser(req);
    const { id } = req.params;
    const rentRequest = await getRentRequestByIdService(id, user.id, user.role);
    successResponse(res, "Rent request fetched", 200, { rentRequest: serializeRentRequest(rentRequest) });
});
export const downloadLeaseAgreement = asyncHandler(async (req, res, _next) => {
    const user = requireUser(req);
    const { id } = req.params;
    const fileName = await getLeaseAgreementService(id, user.id, user.role);
    const filePath = path.join(leaseDir, fileName);
    if (!(await fs.access(filePath).then(() => true).catch(() => false))) {
        throw new AppError("Lease agreement file is missing", 404);
    }
    const downloadName = `lease-agreement-${id.slice(0, 8)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    // Length is unknown until the file is read, so the response is streamed.
    res.sendFile(filePath);
});
export const updateRentRequest = asyncHandler(async (req, res, _next) => {
    const user = requireUser(req);
    const { id } = req.params;
    const rentRequest = await updateRentRequestService(id, user.id, req.body);
    successResponse(res, "Rent request updated", 200, { rentRequest: serializeRentRequest(rentRequest) });
});
export const cancelRentRequest = asyncHandler(async (req, res, _next) => {
    const user = requireUser(req);
    const { id } = req.params;
    const rentRequest = await cancelRentRequestService(id, user.id);
    successResponse(res, "Rent request cancelled", 200, { rentRequest: serializeRentRequest(rentRequest) });
});
export const approveRentRequest = asyncHandler(async (req, res, _next) => {
    const user = requireUser(req);
    const { id } = req.params;
    const rentRequest = await approveRentRequestService(id, user.id, req.body?.decisionReason);
    successResponse(res, "Rent request approved", 200, { rentRequest: serializeRentRequest(rentRequest) });
});
export const rejectRentRequest = asyncHandler(async (req, res, _next) => {
    const user = requireUser(req);
    const { id } = req.params;
    const rentRequest = await rejectRentRequestService(id, user.id, req.body?.decisionReason);
    successResponse(res, "Rent request rejected", 200, { rentRequest: serializeRentRequest(rentRequest) });
});
export const releaseEscrow = asyncHandler(async (req, res, _next) => {
    const user = requireUser(req);
    const { id } = req.params;
    const payment = await releaseEscrowService(id, user.id, user.role);
    successResponse(res, "Escrow released to landlord", 200, { payment: serializePayment(payment) });
});
export const refundEscrow = asyncHandler(async (req, res, _next) => {
    const { id } = req.params;
    const payment = await refundEscrowService(id);
    successResponse(res, "Escrow refunded to tenant", 200, { payment: serializePayment(payment) });
});
