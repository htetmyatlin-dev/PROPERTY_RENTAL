import z from "zod";
export const updateProfileSchema = z.object({
    username: z.string().trim().min(2, "Username must be at least 2 characters").max(50, "Username must be at most 50 characters"),
    phone: z.string().trim().max(20, "Phone number must be at most 20 characters").transform((value) => (value ? value : null)),
}).refine((data) => !data.phone || data.phone.length >= 6, { message: "Enter a valid phone number", path: ["phone"] });
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(6, "Current password must be at least 6 characters long"),
    newPassword: z.string().min(6, "New password must be at least 6 characters long"),
    confirmNewPassword: z.string().min(6, "Confirm password must be at least 6 characters long"),
})
    .refine((data) => data.newPassword === data.confirmNewPassword, { message: "Passwords do not match", path: ["confirmNewPassword"] })
    .refine((data) => data.newPassword !== data.currentPassword, { message: "New password must be different from your current password", path: ["newPassword"] });
