import { prisma } from "@/lib/prisma";
import { PLATFORM_COMMISSION_RATE } from "@/utils/commission";
import { BookingStatus, DepositRequestStatus, EscrowStatus, PropertyType, RentRequestStatus, Role, Status, WithdrawalRequestStatus, } from "../../../generated/prisma/enums";
const toNumber = (value) => Number(value ?? 0);
const roundToOne = (value) => Math.round(value * 10) / 10;
const sumPayments = (aggregate) => ({
    amount: toNumber(aggregate._sum?.amount),
    commissionAmount: toNumber(aggregate._sum?.commissionAmount),
    landlordAmount: toNumber(aggregate._sum?.landlordAmount),
    count: aggregate._count,
});
/**
 * The platform never gets its own wallet: commission is only ever a number
 * sitting on `Payment`, and it becomes real money the moment the escrow is
 * released to the landlord. So every figure here is derived from
 * `Payment` + `Escrow` rather than tracked in a balance column that could
 * drift away from the payments it is supposed to summarise.
 */
export const getPlatformSummaryService = async () => {
    const byEscrowStatus = (status) => ({ escrow: { status } });
    const [releasedAgg, heldAgg, refundedAgg, walletsAgg, withdrawalsAgg] = await Promise.all([
        prisma.payment.aggregate({
            where: byEscrowStatus(EscrowStatus.RELEASED),
            _sum: { amount: true, commissionAmount: true, landlordAmount: true },
            _count: true,
        }),
        prisma.payment.aggregate({
            where: byEscrowStatus(EscrowStatus.PENDING),
            _sum: { amount: true, commissionAmount: true, landlordAmount: true },
            _count: true,
        }),
        prisma.payment.aggregate({
            where: byEscrowStatus(EscrowStatus.REFUNDED),
            _sum: { amount: true, commissionAmount: true, landlordAmount: true },
            _count: true,
        }),
        prisma.wallet.aggregate({ _sum: { balance: true } }),
        prisma.withdrawalRequest.aggregate({
            where: { status: WithdrawalRequestStatus.PENDING },
            _sum: { amount: true },
            _count: true,
        }),
    ]);
    const released = sumPayments(releasedAgg);
    const held = sumPayments(heldAgg);
    const refunded = sumPayments(refundedAgg);
    const entries = await prisma.payment.findMany({
        take: 25,
        orderBy: { createdAt: "desc" },
        include: {
            escrow: true,
            rentRequest: {
                include: {
                    property: { select: { id: true, title: true } },
                    landlord: { select: { id: true, username: true } },
                },
            },
        },
    });
    return {
        commissionRate: PLATFORM_COMMISSION_RATE,
        revenue: {
            earned: released.commissionAmount,
            held: held.commissionAmount,
            forgone: refunded.commissionAmount,
        },
        escrow: {
            held: held.amount,
            released: released.amount,
            refunded: refunded.amount,
            landlordPayouts: released.landlordAmount,
        },
        obligations: {
            userBalances: toNumber(walletsAgg._sum.balance),
            pendingWithdrawals: toNumber(withdrawalsAgg._sum.amount),
            pendingWithdrawalCount: withdrawalsAgg._count,
        },
        counts: {
            held: held.count,
            released: released.count,
            refunded: refunded.count,
        },
        entries: entries.map((payment) => ({
            id: payment.id,
            amount: toNumber(payment.amount),
            commissionAmount: toNumber(payment.commissionAmount),
            landlordAmount: toNumber(payment.landlordAmount),
            escrowStatus: payment.escrow?.status ?? null,
            createdAt: payment.createdAt,
            property: payment.rentRequest.property,
            landlord: payment.rentRequest.landlord,
        })),
    };
};
const REVENUE_MONTHS = 12;
/** Builds the 12 monthly buckets (oldest first) that the revenue chart plots. */
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
const sumMoney = (aggregate, field) => toNumber(aggregate._sum?.[field]);
/**
 * Everything the admin landing page renders, in one round-trip. Money figures
 * are derived the same way as `getPlatformSummaryService` (from `Payment` +
 * `Escrow`) so the dashboard can never disagree with the Platform page.
 */
export const getAdminDashboardService = async () => {
    const now = new Date();
    const monthBuckets = buildMonthBuckets();
    const rangeStart = monthBuckets[0].start;
    const [totalUsers, totalProperties, activeRentals, totalReviews, activeChats, pendingVisitBookings, pendingDepositCount, pendingWithdrawalCount, releasedAgg, heldEscrowAgg, walletsAgg, pendingDepositAgg, pendingWithdrawalAgg, rentRequestRows, propertyStatusRows, propertyTypeRows, roleRows, releasedPayments, pendingDepositRequests, pendingWithdrawalRequests, reviewGroups,] = await Promise.all([
        prisma.user.count(),
        prisma.property.count(),
        prisma.rentRequest.count({
            where: { status: RentRequestStatus.APPROVED, endDate: { gte: now } },
        }),
        prisma.review.count(),
        prisma.chat.count({ where: { lastMessage: { not: null } } }),
        prisma.visitBooking.count({ where: { status: BookingStatus.PENDING } }),
        prisma.depositRequest.count({ where: { status: DepositRequestStatus.PENDING } }),
        prisma.withdrawalRequest.count({ where: { status: WithdrawalRequestStatus.PENDING } }),
        prisma.payment.aggregate({
            where: { escrow: { status: EscrowStatus.RELEASED } },
            _sum: { commissionAmount: true },
        }),
        prisma.payment.aggregate({
            where: { escrow: { status: EscrowStatus.PENDING } },
            _sum: { amount: true },
        }),
        prisma.wallet.aggregate({ _sum: { balance: true } }),
        prisma.depositRequest.aggregate({
            where: { status: DepositRequestStatus.PENDING },
            _sum: { amount: true },
        }),
        prisma.withdrawalRequest.aggregate({
            where: { status: WithdrawalRequestStatus.PENDING },
            _sum: { amount: true },
        }),
        prisma.rentRequest.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.property.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.property.groupBy({ by: ["propertyType"], _count: { _all: true } }),
        prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
        prisma.payment.findMany({
            where: { escrow: { status: EscrowStatus.RELEASED }, createdAt: { gte: rangeStart } },
            select: { createdAt: true, amount: true, commissionAmount: true },
        }),
        prisma.depositRequest.findMany({
            where: { status: DepositRequestStatus.PENDING },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { user: { select: { id: true, username: true, email: true } } },
        }),
        prisma.withdrawalRequest.findMany({
            where: { status: WithdrawalRequestStatus.PENDING },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { user: { select: { id: true, username: true, email: true } } },
        }),
        prisma.review.groupBy({
            by: ["propertyId"],
            _avg: { rating: true },
            _count: { rating: true },
        }),
    ]);
    const revenueMap = new Map();
    for (const payment of releasedPayments) {
        const key = `${payment.createdAt.getFullYear()}-${payment.createdAt.getMonth() + 1}`;
        const bucket = revenueMap.get(key) ?? { revenue: 0, deposits: 0 };
        bucket.revenue += toNumber(payment.commissionAmount);
        bucket.deposits += toNumber(payment.amount);
        revenueMap.set(key, bucket);
    }
    const topRated = reviewGroups
        .map((group) => ({
        propertyId: group.propertyId,
        averageRating: roundToOne(toNumber(group._avg.rating)),
        reviewCount: group._count.rating,
    }))
        .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
        .slice(0, 5);
    const topRatedProperties = topRated.length
        ? (await prisma.property.findMany({
            where: { id: { in: topRated.map((item) => item.propertyId) } },
            select: { id: true, title: true, propertyType: true, status: true, images: true },
        })).map((property) => {
            const stat = topRated.find((item) => item.propertyId === property.id);
            return {
                id: property.id,
                title: property.title,
                propertyType: property.propertyType,
                status: property.status,
                image: property.images[0] ?? null,
                averageRating: stat.averageRating,
                reviewCount: stat.reviewCount,
            };
        })
        : [];
    return {
        cards: {
            totalUsers,
            totalProperties,
            activeRentals,
            commissionEarned: sumMoney(releasedAgg, "commissionAmount"),
            escrowHeld: sumMoney(heldEscrowAgg, "amount"),
            totalWalletBalance: sumMoney(walletsAgg, "balance"),
            pendingDeposits: {
                count: pendingDepositCount,
                amount: sumMoney(pendingDepositAgg, "amount"),
            },
            pendingWithdrawals: {
                count: pendingWithdrawalCount,
                amount: sumMoney(pendingWithdrawalAgg, "amount"),
            },
        },
        revenueOverview: monthBuckets.map((bucket) => {
            const value = revenueMap.get(bucket.key) ?? { revenue: 0, deposits: 0 };
            return { month: bucket.label, revenue: value.revenue, deposits: value.deposits };
        }),
        rentRequests: countBy([
            RentRequestStatus.PENDING,
            RentRequestStatus.APPROVED,
            RentRequestStatus.REJECTED,
            RentRequestStatus.CANCELLED,
        ], rentRequestRows.map((row) => ({ key: row.status, count: row._count._all }))),
        propertyStatus: countBy([Status.AVAILABLE, Status.RENTED, Status.RESERVED], propertyStatusRows.map((row) => ({ key: row.status, count: row._count._all }))),
        propertyTypes: countBy([PropertyType.Apartment, PropertyType.House, PropertyType.Condo, PropertyType.Villa], propertyTypeRows.map((row) => ({ key: row.propertyType, count: row._count._all }))),
        usersByRole: countBy([Role.TENANT, Role.LANDLORD, Role.ADMIN], roleRows.map((row) => ({ key: row.role, count: row._count._all }))),
        platformActivity: {
            pendingVisitBookings,
            activeChats,
            totalReviews,
        },
        pendingDepositRequests: pendingDepositRequests.map((request) => ({
            id: request.id,
            amount: toNumber(request.amount),
            paymentMethod: request.paymentMethod,
            createdAt: request.createdAt,
            user: request.user,
        })),
        pendingWithdrawalRequests: pendingWithdrawalRequests.map((request) => ({
            id: request.id,
            amount: toNumber(request.amount),
            paymentMethod: request.paymentMethod,
            createdAt: request.createdAt,
            user: request.user,
        })),
        topRatedProperties,
    };
};
