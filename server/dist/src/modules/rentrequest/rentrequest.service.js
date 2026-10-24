import fs from "node:fs/promises";
import path from "node:path";
import { getIO } from "@/lib/socket";
import { prisma } from "@/lib/prisma";
import { EscrowRepository } from "@/repositories/escrow.repository";
import { PaymentRepository } from "@/repositories/payment.repository";
import { NotificationRepository } from "@/repositories/notification.repository";
import { RentRequestRepository } from "@/repositories/rent.request.repository";
import { WalletRepository } from "@/repositories/wallet.repository";
import { WalletTransactionRepository } from "@/repositories/wallet.transaction.repository";
import { AppError } from "@/utils/app.error";
import { PLATFORM_COMMISSION_RATE } from "@/utils/commission";
import { leaseDir, leaseFileNameFor, writeLeaseAgreement } from "@/utils/lease.pdf";
import { EscrowStatus, RentRequestStatus, Status as PropertyStatus, TransactionType, } from "../../../generated/prisma/enums";
/** Security deposit is held for this many months' rent. */
const DEPOSIT_MONTHS = 1;
const round2 = (value) => Math.round(value * 100) / 100;
/**
 * `amount` and `depositAmount` are always derived from `Property.baseRentPrice`
 * server-side. They are never read from the request body, otherwise a tenant
 * could name their own price.
 */
const quoteFor = (baseRentPrice, durationMonths) => ({
    amount: round2(baseRentPrice * durationMonths),
    depositAmount: round2(baseRentPrice * DEPOSIT_MONTHS),
});
const notify = async (userId, title, content) => {
    try {
        const notification = await NotificationRepository.createNotification(userId, title, content);
        getIO()?.to(userId).emit("notification_created", notification);
    }
    catch (error) {
        console.error("Failed to create notification", error);
    }
};
const parseDate = (value) => new Date(value);
/**
 * Throws 402 when the tenant's wallet cannot cover `amount`.
 */
const assertCanFundDeposit = async (userId, amount, db = prisma) => {
    await WalletRepository.createIfNotExist(userId, db);
    const wallet = await WalletRepository.findByUserId(userId, db);
    if (!wallet)
        throw new AppError("Wallet not found", 404);
    const balance = Number(wallet.balance);
    if (balance < amount) {
        throw new AppError(`Your wallet balance is too low. You need ${round2(amount)} for the security deposit but only have ${round2(balance)}. Top up your wallet before applying.`, 402);
    }
    return wallet;
};
export const createRentRequestService = async (userId, data) => {
    const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
    if (!property)
        throw new AppError("Property not found", 404);
    if (property.landlordId === userId)
        throw new AppError("You cannot rent your own property", 400);
    if (property.status !== PropertyStatus.AVAILABLE) {
        throw new AppError(`This property is ${property.status.toLowerCase()}`, 409);
    }
    if (property.leaseTermMonths && property.leaseTermMonths !== data.durationMonths) {
        throw new AppError(`This property requires a ${property.leaseTermMonths} month lease`, 400);
    }
    const existing = await RentRequestRepository.findLiveByUserAndProperty(userId, property.id);
    if (existing) {
        throw new AppError(`You already have a ${existing.status.toLowerCase()} request for this property`, 409);
    }
    const { amount, depositAmount } = quoteFor(property.baseRentPrice, data.durationMonths);
    await assertCanFundDeposit(userId, depositAmount);
    const rentRequest = await RentRequestRepository.create({
        userId,
        landlordId: property.landlordId,
        propertyId: property.id,
        amount,
        depositAmount,
        startDate: parseDate(data.startDate),
        endDate: parseDate(data.endDate),
        durationMonths: data.durationMonths,
        message: data.message ?? null,
    });
    await notify(property.landlordId, "New rent request", `You have a new rent request for "${property.title}".`);
    return RentRequestRepository.findDetailedById(rentRequest.id);
};
/** Admin view across every landlord, used to drive the escrow release queue. */
export const getAllRentRequestsService = async (query) => {
    const { page, limit, status, propertyId, escrowStatus, search } = query;
    const skip = (page - 1) * limit;
    const { rentRequests, totalCount } = await RentRequestRepository.findPaginatedAll({ status, propertyId, escrowStatus, search }, skip, limit);
    return { rentRequests, totalPages: Math.ceil(totalCount / limit), totalCount };
};
export const updateRentRequestService = async (id, userId, data) => {
    const rentRequest = await RentRequestRepository.findById(id);
    if (!rentRequest)
        throw new AppError("Rent request not found", 404);
    if (rentRequest.userId !== userId) {
        throw new AppError("You are not authorized to update this rent request", 403);
    }
    if (rentRequest.status !== RentRequestStatus.PENDING) {
        throw new AppError("Only pending rent requests can be updated", 400);
    }
    const property = await prisma.property.findUnique({ where: { id: rentRequest.propertyId } });
    if (!property)
        throw new AppError("Property not found", 404);
    if (property.status !== PropertyStatus.AVAILABLE) {
        throw new AppError(`This property is ${property.status.toLowerCase()}`, 409);
    }
    if (property.leaseTermMonths && property.leaseTermMonths !== data.durationMonths) {
        throw new AppError(`This property requires a ${property.leaseTermMonths} month lease`, 400);
    }
    const { amount, depositAmount } = quoteFor(property.baseRentPrice, data.durationMonths);
    const updated = await RentRequestRepository.updatePendingByTenant(id, userId, {
        amount,
        depositAmount,
        startDate: parseDate(data.startDate),
        endDate: parseDate(data.endDate),
        durationMonths: data.durationMonths,
        message: data.message ?? null,
    });
    if (updated.count !== 1) {
        throw new AppError("Only pending rent requests can be updated", 400);
    }
    return RentRequestRepository.findDetailedById(id);
};
export const cancelRentRequestService = async (id, userId) => {
    const rentRequest = await RentRequestRepository.findById(id);
    if (!rentRequest)
        throw new AppError("Rent request not found", 404);
    if (rentRequest.userId !== userId) {
        throw new AppError("You are not authorized to cancel this rent request", 403);
    }
    const cancelled = await RentRequestRepository.cancelPendingByTenant(id, userId);
    if (cancelled.count !== 1) {
        throw new AppError(`Rent request is already ${rentRequest.status.toLowerCase()}`, 409);
    }
    return RentRequestRepository.findDetailedById(id);
};
/**
 * Renders the lease PDF for an approved request and records the filename.
 */
export const generateLeaseAgreement = async (id) => {
    const rentRequest = await RentRequestRepository.findDetailedById(id);
    if (!rentRequest)
        throw new AppError("Rent request not found", 404);
    if (rentRequest.status !== RentRequestStatus.APPROVED) {
        throw new AppError("A lease agreement can only be generated for an approved rent request", 400);
    }
    await fs.mkdir(leaseDir, { recursive: true });
    const depositAmount = round2(Number(rentRequest.depositAmount ?? rentRequest.amount));
    const durationMonths = rentRequest.durationMonths;
    const fileName = leaseFileNameFor(rentRequest.id);
    const finalPath = path.join(leaseDir, fileName);
    const tempPath = `${finalPath}.tmp`; // Write to a temp file first, then rename to avoid partial files on crash.
    await writeLeaseAgreement({
        reference: rentRequest.id.slice(0, 8).toUpperCase(),
        generatedOn: new Date(),
        property: {
            title: rentRequest.property.title,
            address: rentRequest.property.locationAddress,
        },
        landlord: {
            username: rentRequest.landlord?.username ?? "Landlord",
            email: rentRequest.landlord?.email ?? "",
        },
        tenant: {
            username: rentRequest.user?.username ?? "Tenant",
            email: rentRequest.user?.email ?? "",
        },
        startDate: rentRequest.startDate,
        endDate: rentRequest.endDate,
        durationMonths,
        monthlyRent: durationMonths > 0 ? round2(Number(rentRequest.amount) / durationMonths) : 0,
        totalRent: round2(Number(rentRequest.amount)),
        securityDeposit: depositAmount,
    }, tempPath);
    await fs.rename(tempPath, finalPath);
    await RentRequestRepository.updateLeaseAgreement(rentRequest.id, fileName);
    return fileName;
};
/**
 * Resolves the lease filename for an approved request, generating it if necessary
 */
export const getLeaseAgreementService = async (id, userId, role) => {
    const rentRequest = await RentRequestRepository.findDetailedById(id);
    if (!rentRequest)
        throw new AppError("Rent request not found", 404);
    const isParty = role === "ADMIN" || rentRequest.userId === userId || rentRequest.landlordId === userId;
    if (!isParty)
        throw new AppError("You are not authorized to view this lease", 403);
    const fileName = rentRequest.leaseAgreement ?? leaseFileNameFor(rentRequest.id);
    const exists = await fs
        .access(path.join(leaseDir, fileName))
        .then(() => true)
        .catch(() => false);
    if (exists)
        return fileName;
    if (rentRequest.status === RentRequestStatus.APPROVED) {
        return generateLeaseAgreement(rentRequest.id);
    }
    throw new AppError("No lease agreement has been generated for this request", 404);
};
export const approveRentRequestService = async (id, landlordId, decisionReason) => {
    const { rentRequest, propertyTitle, monthlyRent } = await prisma.$transaction(async (tx) => {
        const rentRequest = await RentRequestRepository.findById(id, tx);
        if (!rentRequest)
            throw new AppError("Rent request not found", 404);
        if (rentRequest.landlordId !== landlordId) {
            throw new AppError("You are not authorized to decide this rent request", 403);
        }
        if (rentRequest.status !== RentRequestStatus.PENDING) {
            throw new AppError(`Rent request is already ${rentRequest.status.toLowerCase()}`, 409);
        }
        const rival = await RentRequestRepository.findApprovedByPropertyId(rentRequest.propertyId, id, tx);
        if (rival) {
            throw new AppError("Another request for this property is already approved", 409);
        }
        const property = await tx.property.findUnique({ where: { id: rentRequest.propertyId } });
        if (!property)
            throw new AppError("Property not found", 404);
        if (property.status !== PropertyStatus.AVAILABLE) {
            throw new AppError(`This property is ${property.status.toLowerCase()}`, 409);
        }
        // one concurrent approver can win.
        const claimed = await RentRequestRepository.claimPending(id, {
            status: RentRequestStatus.APPROVED,
            decisionReason: decisionReason ?? null,
            decidedAt: new Date(),
        }, tx);
        // `count !== 1 means concurrent approval already happened
        if (claimed.count !== 1) {
            throw new AppError("Rent request has already been decided", 409);
        }
        // Take the deposit into escrow.
        const depositAmount = Number(rentRequest.depositAmount ?? rentRequest.amount);
        await assertCanFundDeposit(rentRequest.userId, depositAmount, tx);
        // Re-verified atomically: the balance can drop between the check above
        // and this write (e.g. a concurrent withdrawal).
        const debited = await WalletRepository.decreaseBalanceIfSufficient(rentRequest.userId, depositAmount, tx);
        if (debited.count !== 1) {
            throw new AppError("Tenant wallet has insufficient funds for the security deposit", 402);
        }
        const wallet = await WalletRepository.findByUserId(rentRequest.userId, tx);
        await WalletTransactionRepository.create({
            walletId: wallet.id,
            type: TransactionType.RENT_PAYMENT,
            amount: depositAmount,
            balanceAfter: Number(wallet.balance),
        }, tx);
        const commissionAmount = round2(depositAmount * PLATFORM_COMMISSION_RATE);
        const payment = await PaymentRepository.create({
            rentRequestId: rentRequest.id,
            amount: depositAmount,
            landlordAmount: round2(depositAmount - commissionAmount),
            commissionAmount,
        }, tx);
        await PaymentRepository.markCompleted(payment.id, tx);
        await EscrowRepository.create({ paymentId: payment.id, amount: depositAmount }, tx);
        await tx.property.update({
            where: { id: property.id },
            data: { status: PropertyStatus.RESERVED },
        });
        return {
            rentRequest,
            propertyTitle: property.title,
            monthlyRent: Number(property.baseRentPrice),
        };
    });
    // The lease is rendered outside the transaction: PDF work and filesystem I/O
    // must not hold a database transaction open. Failure here leaves the approval
    // intact, and the agreement can be regenerated on demand.
    await generateLeaseAgreement(rentRequest.id);
    await notify(rentRequest.userId, "Rent request approved", `Your rent request for "${propertyTitle}" was approved. The security deposit is held in escrow and your lease agreement is ready to download.`);
    return RentRequestRepository.findDetailedById(id);
};
export const rejectRentRequestService = async (id, landlordId, decisionReason) => {
    const rentRequest = await prisma.$transaction(async (tx) => {
        const rentRequest = await RentRequestRepository.findById(id, tx);
        if (!rentRequest)
            throw new AppError("Rent request not found", 404);
        if (rentRequest.landlordId !== landlordId) {
            throw new AppError("You are not authorized to decide this rent request", 403);
        }
        const claimed = await RentRequestRepository.claimPending(id, {
            status: RentRequestStatus.REJECTED,
            decisionReason: decisionReason ?? null,
            decidedAt: new Date(),
        }, tx);
        if (claimed.count !== 1) {
            throw new AppError(`Rent request is already ${rentRequest.status.toLowerCase()}`, 409);
        }
        return rentRequest;
    });
    await notify(rentRequest.userId, "Rent request rejected", decisionReason
        ? `Your rent request was rejected: ${decisionReason}`
        : "Your rent request was rejected.");
    return RentRequestRepository.findDetailedById(id);
};
export const getRentRequestByIdService = async (id, requesterId, requesterRole) => {
    const rentRequest = await RentRequestRepository.findDetailedById(id);
    if (!rentRequest)
        throw new AppError("Rent request not found", 404);
    const isParty = rentRequest.userId === requesterId || rentRequest.landlordId === requesterId;
    if (!isParty && requesterRole !== "ADMIN") {
        throw new AppError("You are not authorized to view this rent request", 403);
    }
    return rentRequest;
};
export const getMyRentRequestsService = async (userId, query) => {
    const { page, limit, status, propertyId } = query;
    const skip = (page - 1) * limit;
    const { rentRequests, totalCount } = await RentRequestRepository.findPaginatedByUserId(userId, { status, propertyId }, skip, limit);
    return { rentRequests, totalPages: Math.ceil(totalCount / limit), totalCount };
};
export const getLandlordRentRequestsService = async (landlordId, query) => {
    const { page, limit, status, propertyId } = query;
    const skip = (page - 1) * limit;
    const { rentRequests, totalCount } = await RentRequestRepository.findPaginatedByLandlordId(landlordId, { status, propertyId }, skip, limit);
    return { rentRequests, totalPages: Math.ceil(totalCount / limit), totalCount };
};
export const releaseEscrowService = async (paymentId, callerId, callerRole) => {
    const { rentRequest, landlordAmount } = await prisma.$transaction(async (tx) => {
        const payment = await PaymentRepository.findById(paymentId, tx);
        if (!payment)
            throw new AppError("Payment not found", 404);
        const rentRequest = await RentRequestRepository.findById(payment.rentRequestId, tx);
        if (!rentRequest)
            throw new AppError("Rent request not found", 404);
        // An admin may release on a landlord's behalf, e.g. when the landlord
        // is unresponsive. The funds still land in the landlord's wallet.
        if (callerRole !== "ADMIN" && rentRequest.landlordId !== callerId) {
            throw new AppError("You are not authorized to release this escrow", 403);
        }
        const escrow = payment.escrow;
        if (!escrow)
            throw new AppError("Escrow not found", 404);
        if (escrow.status !== EscrowStatus.PENDING) {
            throw new AppError(`Escrow is already ${escrow.status.toLowerCase()}`, 409);
        }
        const released = await EscrowRepository.release(payment.id, new Date(), tx);
        if (released.count !== 1) {
            throw new AppError("Escrow has already been released", 409);
        }
        await WalletRepository.createIfNotExist(rentRequest.landlordId, tx);
        const credited = await WalletRepository.increaseBalance(rentRequest.landlordId, Number(payment.landlordAmount), tx);
        await WalletTransactionRepository.create({
            walletId: credited.id,
            type: TransactionType.RENT_PAYMENT,
            amount: Number(payment.landlordAmount),
            balanceAfter: Number(credited.balance),
        }, tx);
        await tx.property.update({
            where: { id: rentRequest.propertyId },
            data: { status: PropertyStatus.RENTED },
        });
        return { rentRequest, landlordAmount: Number(payment.landlordAmount) };
    });
    await notify(rentRequest.userId, "Deposit released", `The security deposit of ${landlordAmount} has been released to the landlord.`);
    return PaymentRepository.findById(paymentId);
};
export const refundEscrowService = async (paymentId) => {
    const { rentRequest, amount } = await prisma.$transaction(async (tx) => {
        const payment = await PaymentRepository.findById(paymentId, tx);
        if (!payment)
            throw new AppError("Payment not found", 404);
        const rentRequest = await RentRequestRepository.findById(payment.rentRequestId, tx);
        if (!rentRequest)
            throw new AppError("Rent request not found", 404);
        const escrow = payment.escrow;
        if (!escrow)
            throw new AppError("Escrow not found", 404);
        if (escrow.status !== EscrowStatus.PENDING) {
            throw new AppError(`Escrow is already ${escrow.status.toLowerCase()}`, 409);
        }
        const refunded = await EscrowRepository.refund(payment.id, new Date(), tx);
        if (refunded.count !== 1) {
            throw new AppError("Escrow has already been refunded", 409);
        }
        // The collection itself succeeded, so `Payment` stays COMPLETED; the
        // REFUNDED custody outcome is recorded on the escrow.
        await WalletRepository.createIfNotExist(rentRequest.userId, tx);
        const credited = await WalletRepository.increaseBalance(rentRequest.userId, Number(payment.amount), tx);
        await WalletTransactionRepository.create({
            walletId: credited.id,
            type: TransactionType.DEPOSIT,
            amount: Number(payment.amount),
            balanceAfter: Number(credited.balance),
        }, tx);
        return { rentRequest, amount: Number(payment.amount) };
    });
    await notify(rentRequest.userId, "Deposit refunded", `Your security deposit of ${amount} has been refunded to your wallet.`);
    return PaymentRepository.findById(paymentId);
};
