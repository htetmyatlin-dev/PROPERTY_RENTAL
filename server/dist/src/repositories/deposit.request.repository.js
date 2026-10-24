import { prisma } from "@/lib/prisma";
import { DepositRequestStatus } from "../../generated/prisma/enums";
const tenantSelect = {
    id: true,
    username: true,
    email: true,
};
const buildWhere = (filters) => {
    const where = {};
    if (filters.status)
        where.status = filters.status;
    if (filters.search && filters.search.trim().length > 0) {
        const term = filters.search.trim();
        const insensitive = { contains: term, mode: "insensitive" };
        where.OR = [
            { transactionId: insensitive },
            { paymentMethod: insensitive },
            { user: {
                    is: {
                        OR: [{ username: insensitive }, { email: insensitive }]
                    }
                }
            },
        ];
    }
    return where;
};
export class DepositRequestRepository {
    static async create(payload, db = prisma) {
        return db.depositRequest.create({
            data: payload
        });
    }
    static async findById(id, db = prisma) {
        return db.depositRequest.findUnique({
            where: { id }
        });
    }
    static async claimPending(id, status, db = prisma) {
        return db.depositRequest.updateMany({
            where: { id, status: DepositRequestStatus.PENDING },
            data: { status }
        });
    }
    static async findAll(filters, skip, limit, db = prisma) {
        const where = buildWhere(filters);
        const [depositRequests, totalCount] = await Promise.all([
            db.depositRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { user: { select: tenantSelect } },
            }),
            db.depositRequest.count({ where }),
        ]);
        return { depositRequests, totalCount };
    }
    static async findPaginatedByTenantId(tenantId, filters, skip, limit, db = prisma) {
        const where = { userId: tenantId };
        if (filters.status)
            where.status = filters.status;
        const [depositRequests, totalCount] = await Promise.all([
            db.depositRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            db.depositRequest.count({ where }),
        ]);
        return { depositRequests, totalCount };
    }
    static async findPendingByTransactionRef(tenantId, transactionId, db = prisma) {
        return db.depositRequest.findFirst({
            where: {
                userId: tenantId,
                transactionId,
                status: DepositRequestStatus.PENDING
            }
        });
    }
}
