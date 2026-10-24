import { z } from "zod";
export const depositSchema = z.object({
    amount: z.coerce.number().int("Amount must be a whole number").positive("Amount must be greater than 0"),
    paymentMethod: z.enum(["kbz_pay", "wave_pay", "bank_transfer", "credit_card"], {
        message: "Unsupported payment method",
    }),
    transactionId: z.string().trim().min(4, "Transaction reference is required").max(64),
});
export const depositRequestParamsSchema = z.object({
    id: z.string().trim().min(1, "Deposit request id is required"),
});
export const depositRequestQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    search: z.string().trim().max(64).optional(),
});
export const transactionQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    type: z.enum(["DEPOSIT", "RENT_PAYMENT", "WITHDRAWAL", "COMMISSION"]).optional(),
});
export const tenantDepositRequestQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});
export const withdrawSchema = z.object({
    amount: z.coerce.number().int("Amount must be a whole number").positive("Amount must be greater than 0"),
    paymentMethod: z.enum(["bank_account", "mobile_money", "paypal"], {
        message: "Unsupported payout method",
    }),
});
export const withdrawalRequestParamsSchema = z.object({
    id: z.string().trim().min(1, "Withdrawal request id is required"),
});
export const withdrawalRequestQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    search: z.string().trim().max(64).optional(),
});
export const myWithdrawalRequestQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});
