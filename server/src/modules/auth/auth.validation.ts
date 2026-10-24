import z, { email } from "zod";

export const registerSchema = z.object({
    username: z.string().min(2, "Username must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(6, "Confirm Password must be at least 6 characters long"),
    role: z.enum(["TENANT", "LANDLORD"], "Role must be either TENANT or LANDLORD").default("TENANT"),
}).refine((data) => data.password === data.confirmPassword, { message: "Passwords do not match" })

export const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
})

export const resetPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    otp: z.string().min(6, "OTP must be at least 6 characters long"),
    newPassword: z.string().min(6, "Password must be at least 6 characters long"),
    confirmNewPassword: z.string().min(6, "Confirm Password must be at least 6 characters long"),
}).refine((data) => data.newPassword === data.confirmNewPassword, { message: "Passwords do not match" })

export type RegisterSchema = z.infer<typeof registerSchema>
export type LoginSchema = z.infer<typeof loginSchema>