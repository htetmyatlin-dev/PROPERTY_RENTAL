import { prisma } from "@/lib/prisma";
import { WithdrawalRequestStatus } from "../../generated/prisma/enums";
const userSelect = {
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
            { paymentMethod: insensitive },
            { user: { is: { OR: [{ username: insensitive }, { email: insensitive }] } } },
        ];
    }
    return where;
};
export class WithdrawalRequestRepository {
    static async create(payload, db = prisma) {
        return db.withdrawalRequest.create({
            data: payload
        });
    }
    static async findById(id, db = prisma) {
        return db.withdrawalRequest.findUnique({
            where: { id }
        });
    }
    static async claimPending(id, status, db = prisma) {
        return db.withdrawalRequest.updateMany({
            where: { id, status: WithdrawalRequestStatus.PENDING },
            data: {
                status,
                ...(status === WithdrawalRequestStatus.APPROVED ? { approvedAt: new Date() } : {})
            }
        });
    }
    static async findAll(filters, skip, limit, db = prisma) {
        const where = buildWhere(filters);
        const [withdrawalRequests, totalCount] = await Promise.all([
            db.withdrawalRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { user: { select: userSelect } },
            }),
            db.withdrawalRequest.count({ where }),
        ]);
        return { withdrawalRequests, totalCount };
    }
    static async findPaginatedByUserId(userId, filters, skip, limit, db = prisma) {
        const where = { userId };
        if (filters.status)
            where.status = filters.status;
        const [withdrawalRequests, totalCount] = await Promise.all([
            db.withdrawalRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            db.withdrawalRequest.count({ where }),
        ]);
        return { withdrawalRequests, totalCount };
    }
    static async findPendingByUserId(userId, db = prisma) {
        return db.withdrawalRequest.findFirst({
            where: {
                userId,
                status: WithdrawalRequestStatus.PENDING
            }
        });
    }
}
