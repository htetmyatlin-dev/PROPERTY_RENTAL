import { prisma } from "@/lib/prisma";
export class WalletTransactionRepository {
    static async create(payload, db = prisma) {
        return db.walletTransaction.create({
            data: payload
        });
    }
    static async findPaginatedByWalletId(walletId, filters, skip, limit, db = prisma) {
        const where = { walletId };
        if (filters.type)
            where.type = filters.type;
        const [walletTransactions, totalCount] = await Promise.all([
            db.walletTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            db.walletTransaction.count({ where }),
        ]);
        return { walletTransactions, totalCount };
    }
}
