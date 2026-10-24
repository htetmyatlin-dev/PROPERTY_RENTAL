import { z } from "zod";
const isoDate = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD)")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");
const durationMonths = z.coerce
    .number()
    .int()
    .min(1, "Lease must be at least 1 month")
    .max(120, "Lease cannot exceed 120 months");
const leaseShape = {
    startDate: isoDate,
    endDate: isoDate,
    durationMonths,
};
const isOrderedLeaseWindow = (value) => Date.parse(value.endDate) > Date.parse(value.startDate);
const leaseWindowError = {
    path: ["endDate"],
    message: "End date must be after start date",
};
export const createRentRequestSchema = z
    .object({
    propertyId: z.string().trim().min(1, "Property is required"),
    ...leaseShape,
    message: z.string().trim().max(1000, "Message cannot exceed 1000 characters").optional(),
})
    .refine(isOrderedLeaseWindow, leaseWindowError);
export const updateRentRequestSchema = createRentRequestSchema;
export const decideRentRequestSchema = z.object({
    decisionReason: z.string().trim().max(500, "Reason cannot exceed 500 characters").optional(),
});
export const rentRequestParamsSchema = z.object({
    id: z.string().trim().min(1, "Rent request id is required"),
});
export const rentRequestQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
    propertyId: z.string().trim().min(1).optional(),
    escrowStatus: z.enum(["PENDING", "RELEASED", "REFUNDED"]).optional(),
    search: z.string().trim().max(120).optional(),
});
