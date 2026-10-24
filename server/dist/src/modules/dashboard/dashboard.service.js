import { prisma } from "@/lib/prisma";
import { BookingStatus, EscrowStatus, RentRequestStatus, Status, } from "../../../generated/prisma/enums";
const toNumber = (value) => Number(value ?? 0);
const roundToTwo = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const REVENUE_MONTHS = 12;
/** The 12 monthly buckets (oldest first) the earnings chart plots against. */
const buildMonthBuckets = () => {
    const now = new Date();
    return Array.from({ length: REVENUE_MONTHS }, (_, index) => {
        const offset = REVENUE_MONTHS - 1 - index;
        const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
        return {
            key: `${start.getFullYear()}-${start.getMonth() + 1}`,
            label: start.toLocaleString("en-US", { month: "short" }),
            start,
            end,
        };
    });
};
const countBy = (values, rows) => {
    const lookup = new Map(rows.map((row) => [row.key, row.count]));
    return values.map((label) => ({ label, count: lookup.get(label) ?? 0 }));
};
/** Rent is quoted per month as `total / durationMonths`; guard against a zero term. */
const monthlyAmount = (total, durationMonths) => durationMonths > 0 ? roundToTwo(total / durationMonths) : 0;
/**
 * There is no monthly billing model: a lease is a single approved `RentRequest`
 * and rent is assumed to fall on the monthly anniversary of `startDate`. Walk
 * forward from the start until we pass "now" to find the upcoming due date.
 */
const nextMonthlyDue = (startDate, now, durationMonths) => {
    if (startDate >= now)
        return startDate;
    const due = new Date(startDate);
    const limit = Math.max(durationMonths + 1, 1);
    for (let month = 1; month <= limit; month += 1) {
        due.setFullYear(startDate.getFullYear(), startDate.getMonth() + month, startDate.getDate());
        if (due >= now)
            return due;
    }
    return due;
};
/**
 * Everything the landlord landing page renders, in one round-trip. Earnings are
 * derived from released escrow (`Payment.landlordAmount`) rather than a balance
 * column, matching how the platform admin page computes money.
 */
export const getLandlordDashboardService = async (landlordId) => {
    const now = new Date();
    const monthBuckets = buildMonthBuckets();
    const rangeStart = monthBuckets[0].start;
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalProperties, propertyStatusRows, pendingRequests, activeTenantRows, releasedAgg, heldEscrowAgg, wallet, thisMonthAgg, pendingRentRequests, pendingVisitBookings, withdrawals, releasedPayments,] = await Promise.all([
        prisma.property.count({ where: { landlordId } }),
        prisma.property.groupBy({ by: ["status"], where: { landlordId }, _count: { _all: true } }),
        prisma.rentRequest.count({ where: { landlordId, status: RentRequestStatus.PENDING } }),
        prisma.rentRequest.findMany({
            where: { landlordId, status: RentRequestStatus.APPROVED, endDate: { gte: now } },
            distinct: ["userId"],
            select: { userId: true },
        }),
        prisma.payment.aggregate({
            where: { escrow: { status: EscrowStatus.RELEASED }, rentRequest: { landlordId } },
            _sum: { landlordAmount: true },
        }),
        prisma.payment.aggregate({
            where: { escrow: { status: EscrowStatus.PENDING }, rentRequest: { landlordId } },
            _sum: { amount: true },
        }),
        prisma.wallet.findUnique({ where: { userId: landlordId } }),
        prisma.payment.aggregate({
            where: {
                escrow: { status: EscrowStatus.RELEASED },
                rentRequest: { landlordId },
                createdAt: { gte: thisMonthStart },
            },
            _sum: { landlordAmount: true },
        }),
        prisma.rentRequest.findMany({
            where: { landlordId, status: RentRequestStatus.PENDING },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
                user: { select: { id: true, username: true, profilePicture: true } },
                property: { select: { id: true, title: true, baseRentPrice: true, images: true } },
            },
        }),
        prisma.visitBooking.findMany({
            where: { landlordId, status: BookingStatus.PENDING },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
                tenant: { select: { id: true, username: true, profilePicture: true } },
                property: { select: { id: true, title: true, images: true } },
            },
        }),
        prisma.withdrawalRequest.findMany({
            where: { userId: landlordId },
            orderBy: { createdAt: "desc" },
            take: 5,
        }),
        prisma.payment.findMany({
            where: {
                escrow: { status: EscrowStatus.RELEASED },
                rentRequest: { landlordId },
                createdAt: { gte: rangeStart },
            },
            select: { createdAt: true, landlordAmount: true },
        }),
    ]);
    const earningsMap = new Map();
    for (const payment of releasedPayments) {
        const key = `${payment.createdAt.getFullYear()}-${payment.createdAt.getMonth() + 1}`;
        earningsMap.set(key, (earningsMap.get(key) ?? 0) + toNumber(payment.landlordAmount));
    }
    return {
        cards: {
            totalProperties,
            activeTenants: activeTenantRows.length,
            netEarnings: toNumber(releasedAgg._sum?.landlordAmount),
            pendingRequests,
        },
        wallet: {
            balance: toNumber(wallet?.balance),
            escrowHeld: toNumber(heldEscrowAgg._sum?.amount),
        },
        earnings: {
            total: toNumber(releasedAgg._sum?.landlordAmount),
            thisMonth: toNumber(thisMonthAgg._sum?.landlordAmount),
            series: monthBuckets.map((bucket) => ({
                month: bucket.label,
                amount: earningsMap.get(bucket.key) ?? 0,
            })),
        },
        occupancy: countBy([Status.AVAILABLE, Status.RENTED, Status.RESERVED], propertyStatusRows.map((row) => ({ key: row.status, count: row._count._all }))),
        pendingRentRequests: pendingRentRequests.map((request) => ({
            id: request.id,
            amount: toNumber(request.amount),
            depositAmount: toNumber(request.depositAmount),
            startDate: request.startDate,
            endDate: request.endDate,
            durationMonths: request.durationMonths,
            createdAt: request.createdAt,
            tenant: request.user,
            property: {
                id: request.property.id,
                title: request.property.title,
                baseRentPrice: request.property.baseRentPrice,
                image: request.property.images[0] ?? null,
            },
        })),
        pendingVisitBookings: pendingVisitBookings.map((booking) => ({
            id: booking.id,
            phoneNumber: booking.phoneNumber,
            schedules: booking.schedules,
            createdAt: booking.createdAt,
            tenant: booking.tenant,
            property: {
                id: booking.property.id,
                title: booking.property.title,
                image: booking.property.images[0] ?? null,
            },
        })),
        withdrawals: withdrawals.map((withdrawal) => ({
            id: withdrawal.id,
            amount: toNumber(withdrawal.amount),
            paymentMethod: withdrawal.paymentMethod,
            status: withdrawal.status,
            createdAt: withdrawal.createdAt,
        })),
    };
};
/**
 * The tenant's active lease (APPROVED and not past its end date) drives the
 * "current rental" card and the derived next rent due date.
 */
export const getTenantDashboardService = async (userId) => {
    const now = new Date();
    const [wallet, wishlistCount, pendingRequestCount, activeRental, wishlist, visitBookings, rentRequests, spentAgg, reviewCount,] = await Promise.all([
        prisma.wallet.findUnique({ where: { userId } }),
        prisma.wishlist.count({ where: { userId } }),
        prisma.rentRequest.count({ where: { userId, status: RentRequestStatus.PENDING } }),
        prisma.rentRequest.findFirst({
            where: { userId, status: RentRequestStatus.APPROVED, endDate: { gte: now } },
            orderBy: { createdAt: "desc" },
            include: {
                landlord: { select: { id: true, username: true, profilePicture: true } },
                property: { select: { id: true, title: true, images: true, locationAddress: true } },
            },
        }),
        prisma.wishlist.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
                property: {
                    select: {
                        id: true,
                        title: true,
                        propertyType: true,
                        status: true,
                        baseRentPrice: true,
                        images: true,
                        locationAddress: true,
                    },
                },
            },
        }),
        prisma.visitBooking.findMany({
            where: { tenantId: userId },
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
                landlord: { select: { id: true, username: true, profilePicture: true } },
                property: { select: { id: true, title: true, images: true } },
            },
        }),
        prisma.rentRequest.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
                property: { select: { id: true, title: true, images: true } },
            },
        }),
        prisma.payment.aggregate({ where: { rentRequest: { userId } }, _sum: { amount: true } }),
        prisma.review.count({ where: { userId } }),
    ]);
    let rental = null;
    let nextRentDue = null;
    if (activeRental) {
        const amount = toNumber(activeRental.amount);
        const monthlyRent = monthlyAmount(amount, activeRental.durationMonths);
        const start = activeRental.startDate.getTime();
        const end = activeRental.endDate.getTime();
        const totalMs = end - start;
        const progress = totalMs > 0 ? clamp(((now.getTime() - start) / totalMs) * 100, 0, 100) : 0;
        rental = {
            id: activeRental.id,
            propertyId: activeRental.property.id,
            propertyTitle: activeRental.property.title,
            propertyImage: activeRental.property.images[0] ?? null,
            locationAddress: activeRental.property.locationAddress,
            landlord: activeRental.landlord,
            monthlyRent,
            depositAmount: toNumber(activeRental.depositAmount),
            amount,
            startDate: activeRental.startDate,
            endDate: activeRental.endDate,
            durationMonths: activeRental.durationMonths,
            progress: roundToTwo(progress),
            hasLease: Boolean(activeRental.leaseAgreement),
        };
        nextRentDue = {
            amount: monthlyRent,
            dueDate: nextMonthlyDue(activeRental.startDate, now, activeRental.durationMonths),
        };
    }
    return {
        cards: {
            nextRentDue,
            wishlistCount,
            walletBalance: toNumber(wallet?.balance),
            activeRequests: pendingRequestCount,
        },
        rental,
        spending: {
            totalSpent: toNumber(spentAgg._sum?.amount),
            reviewCount,
        },
        wishlist: wishlist.map((entry) => ({
            id: entry.id,
            propertyId: entry.property.id,
            title: entry.property.title,
            propertyType: entry.property.propertyType,
            status: entry.property.status,
            baseRentPrice: toNumber(entry.property.baseRentPrice),
            image: entry.property.images[0] ?? null,
            locationAddress: entry.property.locationAddress,
        })),
        visitBookings: visitBookings.map((booking) => ({
            id: booking.id,
            status: booking.status,
            phoneNumber: booking.phoneNumber,
            schedules: booking.schedules,
            createdAt: booking.createdAt,
            landlord: booking.landlord,
            property: {
                id: booking.property.id,
                title: booking.property.title,
                image: booking.property.images[0] ?? null,
            },
        })),
        rentRequests: rentRequests.map((request) => ({
            id: request.id,
            status: request.status,
            amount: toNumber(request.amount),
            depositAmount: toNumber(request.depositAmount),
            startDate: request.startDate,
            endDate: request.endDate,
            durationMonths: request.durationMonths,
            createdAt: request.createdAt,
            property: {
                id: request.property.id,
                title: request.property.title,
                image: request.property.images[0] ?? null,
            },
        })),
    };
};
