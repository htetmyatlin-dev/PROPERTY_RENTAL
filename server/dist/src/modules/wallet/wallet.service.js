import { prisma } from "@/lib/prisma";
import { DepositRequestRepository } from "@/repositories/deposit.request.repository";
import { WalletRepository } from "@/repositories/wallet.repository";
import { WalletTransactionRepository } from "@/repositories/wallet.transaction.repository";
import { WithdrawalRequestRepository } from "@/repositories/withdrawal.request.repository";
import { AppError } from "@/utils/app.error";
import { DepositRequestStatus, TransactionType, WithdrawalRequestStatus } from "../../../generated/prisma/enums";
export const getMyWalletService = async (userId) => {
    return WalletRepository.createIfNotExist(userId);
};
export const depositService = async (userId, data) => {
    const { amount, paymentMethod, transactionId } = data;
    const duplicate = await DepositRequestRepository.findPendingByTransactionRef(userId, transactionId);
    if (duplicate)
        throw new AppError('This transaction reference is already under review', 409);
    return prisma.$transaction(async (tx) => {
        await WalletRepository.createIfNotExist(userId, tx);
        return DepositRequestRepository.create({ userId, amount, paymentMethod, transactionId }, tx);
    });
};
export const approveDepositRequestService = async (id) => {
    return prisma.$transaction(async (tx) => {
        const deposit = await DepositRequestRepository.findById(id, tx);
        if (!deposit)
            throw new AppError('Deposit request not found', 404);
        const claimed = await DepositRequestRepository.claimPending(id, DepositRequestStatus.APPROVED, tx);
        if (claimed.count !== 1) {
            throw new AppError(`Deposit request is already ${deposit.status.toLowerCase()}`, 400);
        }
        const amount = Number(deposit.amount);
        await WalletRepository.createIfNotExist(deposit.userId, tx);
        const wallet = await WalletRepository.increaseBalance(deposit.userId, amount, tx);
        await WalletTransactionRepository.create({
            walletId: wallet.id,
            type: TransactionType.DEPOSIT,
            amount,
            balanceAfter: Number(wallet.balance)
        }, tx);
        return deposit;
    });
};
export const rejectDepositRequestService = async (id) => {
    return prisma.$transaction(async (tx) => {
        const deposit = await DepositRequestRepository.findById(id, tx);
        if (!deposit)
            throw new AppError('Deposit request not found', 404);
        const claimed = await DepositRequestRepository.claimPending(id, DepositRequestStatus.REJECTED, tx);
        if (claimed.count !== 1) {
            throw new AppError(`Deposit request is already ${deposit.status.toLowerCase()}`, 400);
        }
        return deposit;
    });
};
export const getWalletTransactionsService = async (userId, query) => {
    const { page, limit, type } = query;
    const skip = (page - 1) * limit;
    const wallet = await WalletRepository.createIfNotExist(userId);
    const { walletTransactions, totalCount } = await WalletTransactionRepository.findPaginatedByWalletId(wallet.id, { type }, skip, limit);
    return { walletTransactions, totalPages: Math.ceil(totalCount / limit), totalCount };
};
export const getTenantDepositRequestsService = async (userId, query) => {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;
    const { depositRequests, totalCount } = await DepositRequestRepository.findPaginatedByTenantId(userId, { status }, skip, limit);
    return { depositRequests, totalPages: Math.ceil(totalCount / limit), totalCount };
};
export const getAllDepositRequestsService = async (query) => {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;
    const { depositRequests, totalCount } = await DepositRequestRepository.findAll({ status, search }, skip, limit);
    return { depositRequests, totalPages: Math.ceil(totalCount / limit), totalCount };
};
/**
 * The payout is only booked as a request here; no money leaves the wallet
 * until an admin approves it, which is what the UI tells the user.
 */
export const withdrawalService = async (userId, data) => {
    const { amount, paymentMethod } = data;
    const pending = await WithdrawalRequestRepository.findPendingByUserId(userId);
    if (pending)
        throw new AppError('You already have a withdrawal awaiting review', 409);
    const wallet = await WalletRepository.createIfNotExist(userId);
    if (Number(wallet.balance) < amount)
        throw new AppError('Amount exceeds your available balance', 402);
    return prisma.$transaction(async (tx) => {
        return WithdrawalRequestRepository.create({ userId, amount, paymentMethod }, tx);
    });
};
export const approveWithdrawalRequestService = async (id) => {
    return prisma.$transaction(async (tx) => {
        const withdrawal = await WithdrawalRequestRepository.findById(id, tx);
        if (!withdrawal)
            throw new AppError('Withdrawal request not found', 404);
        const claimed = await WithdrawalRequestRepository.claimPending(id, WithdrawalRequestStatus.APPROVED, tx);
        if (claimed.count !== 1) {
            throw new AppError(`Withdrawal request is already ${withdrawal.status.toLowerCase()}`, 400);
        }
        const amount = Number(withdrawal.amount);
        const debited = await WalletRepository.decreaseBalanceIfSufficient(withdrawal.userId, amount, tx);
        if (debited.count !== 1) {
            // Throwing rolls the claim above back, so the request stays PENDING
            throw new AppError('Wallet balance is no longer sufficient to cover this payout', 402);
        }
        const wallet = await WalletRepository.findByUserId(withdrawal.userId, tx);
        if (wallet) {
            await WalletTransactionRepository.create({
                walletId: wallet.id,
                type: TransactionType.WITHDRAWAL,
                amount,
                balanceAfter: Number(wallet.balance)
            }, tx);
        }
        return withdrawal;
    });
};
export const rejectWithdrawalRequestService = async (id) => {
    return prisma.$transaction(async (tx) => {
        const withdrawal = await WithdrawalRequestRepository.findById(id, tx);
        if (!withdrawal)
            throw new AppError('Withdrawal request not found', 404);
        const claimed = await WithdrawalRequestRepository.claimPending(id, WithdrawalRequestStatus.REJECTED, tx);
        if (claimed.count !== 1) {
            throw new AppError(`Withdrawal request is already ${withdrawal.status.toLowerCase()}`, 400);
        }
        return withdrawal;
    });
};
export const getMyWithdrawalRequestsService = async (userId, query) => {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;
    const { withdrawalRequests, totalCount } = await WithdrawalRequestRepository.findPaginatedByUserId(userId, { status }, skip, limit);
    return { withdrawalRequests, totalPages: Math.ceil(totalCount / limit), totalCount };
};
export const getAllWithdrawalRequestsService = async (query) => {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;
    const { withdrawalRequests, totalCount } = await WithdrawalRequestRepository.findAll({ status, search }, skip, limit);
    return { withdrawalRequests, totalPages: Math.ceil(totalCount / limit), totalCount };
};
