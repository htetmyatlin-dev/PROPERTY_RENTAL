import { axiosInstance } from "../axios-instance";

export const AuthApi = {
    login: async(payload: Record<"email" | "password", string>) => {
        return (await axiosInstance.post("/auth/login", payload)).data
    },

    register: async(payload: {
        username: string;
        email: string;
        password: string;
        confirmPassword: string;
        role: "TENANT" | "LANDLORD";
    }) => {
        return (await axiosInstance.post("/auth/register", payload)).data
    },

    logout: async() => {
        return (await axiosInstance.post("/auth/logout")).data
    },

    verifyEmail : async(payload: Record<"otp" | "email", string>) => {
        return (await axiosInstance.post("/auth/verify-email", payload)).data
    },

    sendVerifyEmailOTP : async(email: string) => {
        return (await axiosInstance.post("/auth/send-verify-email-otp", { email })).data
    },

    forgotPassword: async(payload: { email: string }) => {
        return (await axiosInstance.post("/auth/forgot-password", payload)).data
    },

    sendResetPasswordOTP : async(email: string) => {
        return (await axiosInstance.post("/auth/send-reset-password-otp", { email }))
    },

    resetPassword: async(payload: Record<"otp" | "email" | "newPassword"| "confirmNewPassword", string>) => {
        return (await axiosInstance.post("/auth/reset-password", payload)).data
    },
}