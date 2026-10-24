import { prisma } from "@/lib/prisma";
import { RentRequestStatus } from "../../generated/prisma/enums";
const counterpartySelect = {
    id: true,
    username: true,
    email: true,
    profilePicture: true,
};
const propertySelect = {
    id: true,
    title: true,
    baseRentPrice: true,
    status: true,
    locationAddress: true,
};
const listInclude = {
    property: { select: propertySelect },
    payments: {
        include: { escrow: true },
        orderBy: { createdAt: "desc" },
    },
};
export class RentRequestRepository {
    static async create(payload, db = prisma) {
        return db.rentRequest.create({ data: payload });
    }
    static async findById(id, db = prisma) {
        return db.rentRequest.findUnique({ where: { id } });
    }
    static async findDetailedById(id, db = prisma) {
        return db.rentRequest.findUnique({
            where: { id },
            include: {
                property: { select: propertySelect },
                user: { select: counterpartySelect },
                landlord: { select: counterpartySelect },
                payments: { include: { escrow: true } },
            },
        });
    }
    /** Guards against a tenant stacking multiple live applications on one property. */
    static async findLiveByUserAndProperty(userId, propertyId, db = prisma) {
        return db.rentRequest.findFirst({
            where: {
                userId,
                propertyId,
                status: { in: [RentRequestStatus.PENDING, RentRequestStatus.APPROVED] },
            },
        });
    }
    static async findPaginatedByUserId(userId, filters, skip, limit, db = prisma) {
        const where = { userId };
        if (filters.status)
            where.status = filters.status;
        if (filters.propertyId)
            where.propertyId = filters.propertyId;
        const [rentRequests, totalCount] = await Promise.all([
            db.rentRequest.findMany({
                where,
                include: listInclude,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            db.rentRequest.count({ where }),
        ]);
        return { rentRequests, totalCount };
    }
    static async findPaginatedByLandlordId(landlordId, filters, skip, limit, db = prisma) {
        const where = { landlordId };
        if (filters.status)
            where.status = filters.status;
        if (filters.propertyId)
            where.propertyId = filters.propertyId;
        const [rentRequests, totalCount] = await Promise.all([
            db.rentRequest.findMany({
                where,
                include: {
                    ...listInclude,
                    user: { select: counterpartySelect },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            db.rentRequest.count({ where }),
        ]);
        return { rentRequests, totalCount };
    }
    /**
     * Only one request per property may ever be APPROVED, so approval has to
     * check for a rival before claiming.
     */
    static async findApprovedByPropertyId(propertyId, excludeId, db = prisma) {
        return db.rentRequest.findFirst({
            where: {
                propertyId,
                status: RentRequestStatus.APPROVED,
                id: { not: excludeId },
            },
        });
    }
    /**
     * Admin view across every landlord. `escrowStatus` matches requests that
     * have a payment holding funds in that custody state, which is how the
     * admin release queue is driven.
     */
    static async findPaginatedAll(filters, skip, limit, db = prisma) {
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.propertyId)
            where.propertyId = filters.propertyId;
        if (filters.escrowStatus) {
            where.payments = { some: { escrow: { is: { status: filters.escrowStatus } } } };
        }
        if (filters.search && filters.search.trim().length > 0) {
            const term = filters.search.trim();
            const insensitive = { contains: term, mode: "insensitive" };
            where.OR = [
                { property: { is: { title: insensitive } } },
                { user: { is: { username: insensitive } } },
                { landlord: { is: { username: insensitive } } },
            ];
        }
        const [rentRequests, totalCount] = await Promise.all([
            db.rentRequest.findMany({
                where,
                include: {
                    property: { select: propertySelect },
                    user: { select: counterpartySelect },
                    landlord: { select: counterpartySelect },
                    payments: { include: { escrow: true }, orderBy: { createdAt: "desc" } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            db.rentRequest.count({ where }),
        ]);
        return { rentRequests, totalCount };
    }
    static async claimPending(id, data, db = prisma) {
        return db.rentRequest.updateMany({
            where: { id, status: RentRequestStatus.PENDING },
            data,
        });
    }
    /** Records the generated lease filename so the download route can find it. */
    static async updateLeaseAgreement(id, fileName, db = prisma) {
        return db.rentRequest.update({
            where: { id },
            data: { leaseAgreement: fileName, leaseGeneratedAt: new Date() },
        });
    }
    static async updatePendingByTenant(id, userId, data, db = prisma) {
        return db.rentRequest.updateMany({
            where: { id, userId, status: RentRequestStatus.PENDING },
            data,
        });
    }
    static async cancelPendingByTenant(id, userId, db = prisma) {
        return db.rentRequest.updateMany({
            where: { id, userId, status: RentRequestStatus.PENDING },
            data: { status: RentRequestStatus.CANCELLED, decidedAt: new Date() },
        });
    }
}
