import { AppError } from "@/utils/app.error";
import { asyncHandler } from "@/utils/async.handler";
import { successResponse } from "@/utils/api.response";
import { approveDepositRequestService, approveWithdrawalRequestService, depositService, getAllDepositRequestsService, getAllWithdrawalRequestsService, getMyWalletService, getMyWithdrawalRequestsService, getTenantDepositRequestsService, getWalletTransactionsService, rejectDepositRequestService, rejectWithdrawalRequestService, withdrawalService, } from "./wallet.service";
import { depositRequestQuerySchema, myWithdrawalRequestQuerySchema, tenantDepositRequestQuerySchema, transactionQuerySchema, withdrawalRequestQuerySchema, } from "./wallet.validation";
// `Wallet.balance` is a BigInt, which JSON.stringify cannot handle
const serializeWallet = (wallet) => ({
    ...wallet,
    balance: Number(wallet.balance),
});
// `WithdrawalRequest.amount` is a Prisma Decimal, which serializes as a string
const serializeWithdrawal = (withdrawal) => ({
    ...withdrawal,
    amount: Number(withdrawal.amount),
});
const serializeWithdrawals = (withdrawals) => withdrawals.map((withdrawal) => serializeWithdrawal(withdrawal));
export const getMyWallet = asyncHandler(async (req, res, _next) => {
    const userId = req.user?.id;
    if (!userId)
        throw new AppError('Unauthorized', 401);
    const wallet = await getMyWalletService(userId);
    successResponse(res, 'Wallet fetched', 200, { wallet: serializeWallet(wallet) });
});
export const createWalletIfNotExist = asyncHandler(async (req, res, _next) => {
    const userId = req.user?.id;
    if (!userId)
        throw new AppError('Unauthorized', 401);
    const wallet = await getMyWalletService(userId);
    successResponse(res, 'Wallet created!', 200, { wallet: serializeWallet(wallet) });
});
export const deposit = asyncHandler(async (req, res, _next) => {
    const userId = req.user?.id;
    if (!userId)
        throw new AppError('Unauthorized', 401);
    const depositRequest = await depositService(userId, req.body);
    successResponse(res, 'Deposit request submitted for approval', 201, { deposit: depositRequest });
});
export const approveDepositRequest = asyncHandler(async (req, res, _next) => {
    const { id } = req.params;
    await approveDepositRequestService(id);
    successResponse(res, 'Deposit request approved', 200, null);
});
export const rejectDepositRequest = asyncHandler(async (req, res, _next) => {
    const { id } = req.params;
    await rejectDepositRequestService(id);
    successResponse(res, 'Deposit request rejected', 200, null);
});
export const withdrawal = asyncHandler(async (req, res, _next) => {
    const userId = req.user?.id;
    if (!userId)
        throw new AppError('Unauthorized', 401);
    const withdrawalRequest = await withdrawalService(userId, req.body);
    successResponse(res, 'Withdrawal request submitted for review', 201, { withdrawal: serializeWithdrawal(withdrawalRequest) });
});
export const approveWithdrawalRequest = asyncHandler(async (req, res, _next) => {
    const { id } = req.params;
    await approveWithdrawalRequestService(id);
    successResponse(res, 'Withdrawal approved', 200, null);
});
export const rejectWithdrawalRequest = asyncHandler(async (req, res, _next) => {
    const { id } = req.params;
    await rejectWithdrawalRequestService(id);
    successResponse(res, 'Withdrawal rejected', 200, null);
});
export const getMyWithdrawalRequests = asyncHandler(async (req, res, _next) => {
    const userId = req.user?.id;
    if (!userId)
        throw new AppError('Unauthorized', 401);
    const parsed = myWithdrawalRequestQuerySchema.safeParse(req.query);
    if (!parsed.success)
        throw parsed.error;
    const { withdrawalRequests, totalPages, totalCount } = await getMyWithdrawalRequestsService(userId, parsed.data);
    successResponse(res, 'Withdrawal requests fetched', 200, {
        withdrawalRequests: serializeWithdrawals(withdrawalRequests),
        totalPages,
        totalCount
    });
});
export const getAllWithdrawalRequests = asyncHandler(async (req, res, _next) => {
    const parsed = withdrawalRequestQuerySchema.safeParse(req.query);
    if (!parsed.success)
        throw parsed.error;
    const { withdrawalRequests, totalPages, totalCount } = await getAllWithdrawalRequestsService(parsed.data);
    successResponse(res, 'All withdrawal requests fetched', 200, {
        withdrawalRequests: serializeWithdrawals(withdrawalRequests),
        totalPages,
        totalCount
    });
});
export const getWalletTransactions = asyncHandler(async (req, res, _next) => {
    const userId = req.user?.id;
    if (!userId)
        throw new AppError('Unauthorized', 401);
    const parsed = transactionQuerySchema.safeParse(req.query);
    if (!parsed.success)
        throw parsed.error;
    const { walletTransactions, totalPages, totalCount } = await getWalletTransactionsService(userId, parsed.data);
    successResponse(res, 'Wallet transactions fetched', 200, { walletTransactions, totalPages, totalCount });
});
export const getAllDepositRequests = asyncHandler(async (req, res, _next) => {
    const parsed = depositRequestQuerySchema.safeParse(req.query);
    if (!parsed.success)
        throw parsed.error;
    const { depositRequests, totalPages, totalCount } = await getAllDepositRequestsService(parsed.data);
    successResponse(res, 'All deposit requests fetched', 200, { depositRequests, totalPages, totalCount });
});
export const getDepositRequestsByTenant = asyncHandler(async (req, res, _next) => {
    const userId = req.user?.id;
    if (!userId)
        throw new AppError('Unauthorized', 401);
    const parsed = tenantDepositRequestQuerySchema.safeParse(req.query);
    if (!parsed.success)
        throw parsed.error;
    const { depositRequests, totalPages, totalCount } = await getTenantDepositRequestsService(userId, parsed.data);
    successResponse(res, 'Tenant deposit requests fetched', 200, { depositRequests, totalPages, totalCount });
});
