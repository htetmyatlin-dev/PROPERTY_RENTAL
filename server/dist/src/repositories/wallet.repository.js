import { prisma } from "@/lib/prisma";
export class WalletRepository {
    static async createIfNotExist(userId, db = prisma) {
        return db.wallet.upsert({
            where: { userId },
            update: {},
            create: { userId }
        });
    }
    static async increaseBalance(userId, amount, db = prisma) {
        return db.wallet.update({
            where: { userId },
            data: {
                balance: { increment: amount }
            }
        });
    }
    static async decreaseBalance(userId, amount, db = prisma) {
        return db.wallet.update({
            where: { userId },
            data: {
                balance: { decrement: amount }
            }
        });
    }
    static async decreaseBalanceIfSufficient(userId, amount, db = prisma) {
        return db.wallet.updateMany({
            where: { userId, balance: { gte: amount } },
            data: { balance: { decrement: amount } }
        });
    }
    static async findByUserId(userId, db = prisma) {
        return db.wallet.findFirst({
            where: { userId }
        });
    }
}
