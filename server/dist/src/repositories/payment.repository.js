import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "../../generated/prisma/enums";
export class PaymentRepository {
    static async create(payload, db = prisma) {
        return db.payment.create({ data: payload });
    }
    static async findById(id, db = prisma) {
        return db.payment.findUnique({
            where: { id },
            include: { escrow: true, rentRequest: { select: { id: true, propertyId: true } } },
        });
    }
    static async findByRentRequestId(rentRequestId, db = prisma) {
        return db.payment.findMany({
            where: { rentRequestId },
            include: { escrow: true },
            orderBy: { createdAt: "desc" },
        });
    }
    static async markCompleted(id, db = prisma) {
        return db.payment.update({
            where: { id },
            data: { status: PaymentStatus.COMPLETED },
        });
    }
    static async markFailed(id, db = prisma) {
        return db.payment.update({
            where: { id },
            data: { status: PaymentStatus.FAILED },
        });
    }
}
