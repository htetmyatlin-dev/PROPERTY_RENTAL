import { prisma } from "@/lib/prisma";
import { DepositRequestRepository } from "@/repositories/deposit.request.repository";
import { UserRepository } from "@/repositories/user.repository";
import { WalletRepository } from "@/repositories/wallet.repository";
import { WalletTransactionRepository } from "@/repositories/wallet.transaction.repository";
import { WithdrawalRequestRepository } from "@/repositories/withdrawal.request.repository";
import { AppError } from "@/utils/app.error";
import { formatNotificationAmount, notifyAdmins, notifyUser } from "@/utils/notify";
import { DepositRequestStatus, TransactionType, WithdrawalRequestStatus } from "../../../generated/prisma/enums";
import type {
    DepositRequestQuery,
    DepositSchema,
    MyWithdrawalRequestQuery,
    TenantDepositRequestQuery,
    TransactionQuery,
    WithdrawalRequestQuery,
    WithdrawSchema,
} from "./wallet.validation";

export const getMyWalletService = async (userId: string) => {
    return WalletRepository.createIfNotExist(userId)
}

export const depositService = async (userId: string, data: DepositSchema) => {
    const { amount, paymentMethod, transactionId } = data;

    const duplicate = await DepositRequestRepository.findPendingByTransactionRef(userId, transactionId);
    if (duplicate) throw new AppError('This transaction reference is already under review', 409);

    const deposit = await prisma.$transaction(async (tx) => {
        await WalletRepository.createIfNotExist(userId, tx);
        return DepositRequestRepository.create({ userId, amount, paymentMethod, transactionId }, tx);
    })

    const user = await UserRepository.findById(userId);
    await notifyAdmins(
        "New deposit request",
        `${user?.username ?? "A user"} submitted a deposit request of ${formatNotificationAmount(Number(deposit.amount))}.`,
    );
    await notifyUser(
        userId,
        "Deposit request submitted",
        `Your deposit request of ${formatNotificationAmount(Number(deposit.amount))} is awaiting admin approval.`,
    );

    return deposit;
}

export const approveDepositRequestService = async (id: string) => {
    const deposit = await prisma.$transaction(async (tx) => {
        const deposit = await DepositRequestRepository.findById(id, tx);
        if (!deposit) throw new AppError('Deposit request not found', 404);

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
    })

    await notifyUser(
        deposit.userId,
        "Deposit approved",
        `Your deposit of ${formatNotificationAmount(Number(deposit.amount))} was approved and added to your wallet.`,
    );

    return deposit;
}

export const rejectDepositRequestService = async (id: string) => {
    const deposit = await prisma.$transaction(async (tx) => {
        const deposit = await DepositRequestRepository.findById(id, tx);
        if (!deposit) throw new AppError('Deposit request not found', 404);

        const claimed = await DepositRequestRepository.claimPending(id, DepositRequestStatus.REJECTED, tx);
        if (claimed.count !== 1) {
            throw new AppError(`Deposit request is already ${deposit.status.toLowerCase()}`, 400);
        }

        return deposit;
    })

    await notifyUser(
        deposit.userId,
        "Deposit rejected",
        `Your deposit request of ${formatNotificationAmount(Number(deposit.amount))} was rejected.`,
    );

    return deposit;
}

export const getWalletTransactionsService = async (userId: string, query: TransactionQuery) => {
    const { page, limit, type } = query;
    const skip = (page - 1) * limit;

    const wallet = await WalletRepository.createIfNotExist(userId);
    const { walletTransactions, totalCount } = await WalletTransactionRepository.findPaginatedByWalletId(
        wallet.id,
        { type },
        skip,
        limit
    );

    return { walletTransactions, totalPages: Math.ceil(totalCount / limit), totalCount };
}

export const getTenantDepositRequestsService = async (userId: string, query: TenantDepositRequestQuery) => {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const { depositRequests, totalCount } = await DepositRequestRepository.findPaginatedByTenantId(
        userId,
        { status },
        skip,
        limit
    );

    return { depositRequests, totalPages: Math.ceil(totalCount / limit), totalCount };
}

export const getAllDepositRequestsService = async (query: DepositRequestQuery) => {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const { depositRequests, totalCount } = await DepositRequestRepository.findAll(
        { status, search },
        skip,
        limit
    );

    return { depositRequests, totalPages: Math.ceil(totalCount / limit), totalCount };
}

/**
 * The payout is only booked as a request here; no money leaves the wallet
 * until an admin approves it, which is what the UI tells the user.
 */
export const withdrawalService = async (userId: string, data: WithdrawSchema) => {
    const { amount, paymentMethod } = data;

    const pending = await WithdrawalRequestRepository.findPendingByUserId(userId);
    if (pending) throw new AppError('You already have a withdrawal awaiting review', 409);

    const wallet = await WalletRepository.createIfNotExist(userId);
    if (Number(wallet.balance) < amount) throw new AppError('Amount exceeds your available balance', 402);

    const withdrawal = await prisma.$transaction(async (tx) => {
        return WithdrawalRequestRepository.create({ userId, amount, paymentMethod }, tx);
    })

    const user = await UserRepository.findById(userId);
    await notifyAdmins(
        "New withdrawal request",
        `${user?.username ?? "A user"} requested a withdrawal of ${formatNotificationAmount(Number(withdrawal.amount))}.`,
    );
    await notifyUser(
        userId,
        "Withdrawal request submitted",
        `Your withdrawal request of ${formatNotificationAmount(Number(withdrawal.amount))} is awaiting admin review.`,
    );

    return withdrawal;
}

export const approveWithdrawalRequestService = async (id: string) => {
    const withdrawal = await prisma.$transaction(async (tx) => {
        const withdrawal = await WithdrawalRequestRepository.findById(id, tx);
        if (!withdrawal) throw new AppError('Withdrawal request not found', 404);

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
    })

    await notifyUser(
        withdrawal.userId,
        "Withdrawal approved",
        `Your withdrawal of ${formatNotificationAmount(Number(withdrawal.amount))} was approved and paid out.`,
    );

    return withdrawal;
}

export const rejectWithdrawalRequestService = async (id: string) => {
    const withdrawal = await prisma.$transaction(async (tx) => {
        const withdrawal = await WithdrawalRequestRepository.findById(id, tx);
        if (!withdrawal) throw new AppError('Withdrawal request not found', 404);

        const claimed = await WithdrawalRequestRepository.claimPending(id, WithdrawalRequestStatus.REJECTED, tx);
        if (claimed.count !== 1) {
            throw new AppError(`Withdrawal request is already ${withdrawal.status.toLowerCase()}`, 400);
        }

        return withdrawal;
    })

    await notifyUser(
        withdrawal.userId,
        "Withdrawal rejected",
        `Your withdrawal request of ${formatNotificationAmount(Number(withdrawal.amount))} was rejected.`,
    );

    return withdrawal;
}

export const getMyWithdrawalRequestsService = async (userId: string, query: MyWithdrawalRequestQuery) => {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const { withdrawalRequests, totalCount } = await WithdrawalRequestRepository.findPaginatedByUserId(
        userId,
        { status },
        skip,
        limit
    );

    return { withdrawalRequests, totalPages: Math.ceil(totalCount / limit), totalCount };
}

export const getAllWithdrawalRequestsService = async (query: WithdrawalRequestQuery) => {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const { withdrawalRequests, totalCount } = await WithdrawalRequestRepository.findAll(
        { status, search },
        skip,
        limit
    );

    return { withdrawalRequests, totalPages: Math.ceil(totalCount / limit), totalCount };
}

