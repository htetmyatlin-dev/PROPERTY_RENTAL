import { prisma } from "@/lib/prisma";
import { EscrowStatus } from "../../generated/prisma/enums";
export class EscrowRepository {
    static async create(payload, db = prisma) {
        return db.escrow.create({ data: payload });
    }
    static async findByPaymentId(paymentId, db = prisma) {
        return db.escrow.findUnique({ where: { paymentId } });
    }
    /** Hands the held funds to the landlord. Guarded on PENDING so escrow cannot be released twice. */
    static async release(paymentId, releaseDate, db = prisma) {
        return db.escrow.updateMany({
            where: { paymentId, status: EscrowStatus.PENDING },
            data: { status: EscrowStatus.RELEASED, releaseDate },
        });
    }
    static async refund(paymentId, releaseDate, db = prisma) {
        return db.escrow.updateMany({
            where: { paymentId, status: EscrowStatus.PENDING },
            data: { status: EscrowStatus.REFUNDED, releaseDate },
        });
    }
}
