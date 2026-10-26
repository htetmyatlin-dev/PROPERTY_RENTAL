import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "../../pages/HomePage";
import { AboutPage } from "@/pages/AboutPage";
import { ContactPage } from "@/pages/ContactPage";
import { PropertyListingPage } from "@/pages/PropertyListingPage";
import { TestimonialPage } from "@/pages/TestimonialPage";
import { LoginRegisterPage } from "@/pages/auth/LoginRegisterPage";
import { EmailVerificationPage } from "@/pages/auth/EmailVerificationPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Dashboard as LandlordDashboard } from "@/pages/dashboards/landlord/Dashboard";
import { Dashboard as TenantDashboard } from "@/pages/dashboards/tenant/Dashboard";
import { Tenants as LandlordTenants } from "@/pages/dashboards/landlord/Tenants";
import { Users as AdminUsers } from "@/pages/dashboards/admin/Users";
import { Properties as AdminProperties } from "@/pages/dashboards/admin/Properties";
import { Dashboard as AdminDashboard } from "@/pages/dashboards/admin/Dashboard";
import {
  LuChrome,
  LuLayoutDashboard,
  LuUsers,
  LuBell,
  LuCalendarDays,
  LuCalendar,
  LuWallet,
  LuHandCoins,
  LuFileText,
  LuLock,
  LuBanknote,
  LuCoins,
  LuUser,
  LuHeart,
} from "react-icons/lu";
import { Properties } from "@/pages/dashboards/landlord/Properties";
import { PropertyDetailsPage } from "@/pages/PropertyDetailsPage";
import { IoChatbubblesOutline } from "react-icons/io5";
import { ChatPage } from "@/pages/dashboards/ChatPage";
import { NotificationPage } from "@/pages/dashboards/NotificationPage";
import { Bookings } from "@/pages/dashboards/landlord/Bookings";
import { Bookings as TenantBookings } from "@/pages/dashboards/tenant/Bookings";
import { RentRequests } from "@/pages/dashboards/landlord/RentRequests";
import { RentRequests as TenantRentRequests } from "@/pages/dashboards/tenant/RentRequests";
import { Wishlist as TenantWishlist } from "@/pages/dashboards/tenant/Wishlist";
import { CalendarPage } from "@/pages/dashboards/landlord/CalendarPage";
import {WalletPage} from "@/pages/dashboards/WalletPage.tsx";
import { DepositRequests as AdminDepositRequests } from "@/pages/dashboards/admin/DepositRequests";
import { Withdrawals as AdminWithdrawals } from "@/pages/dashboards/admin/Withdrawals";
import { Escrow as AdminEscrow } from "@/pages/dashboards/admin/Escrow";
import { Platform as AdminPlatform } from "@/pages/dashboards/admin/Platform";
import { ProfilePage } from "@/pages/dashboards/ProfilePage";

const adminNavLinks = [
  { icon: LuLayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: LuHandCoins, label: "Deposit Requests", path: "/admin/deposit-requests" },
  { icon: LuBanknote, label: "Withdrawals", path: "/admin/withdrawals" },
  { icon: LuLock, label: "Escrow", path: "/admin/escrow" },
  { icon: LuCoins, label: "Platform", path: "/admin/platform" },
  { icon: LuChrome, label: "Properties", path: "/admin/properties" },
  { icon: LuUsers, label: "Users", path: "/admin/users" },
  { icon: LuBell, label: "Notifications", path: "/admin/notifications" },
];

const landlordNavLinks = [
  { icon: LuLayoutDashboard, label: "Dashboard", path: "/landlord/dashboard" },
  { icon: LuChrome, label: "Properties", path: "/landlord/properties" },
  { icon: LuUsers, label: "Tenants", path: "/landlord/tenants" },
  { icon: LuCalendarDays, label: "Bookings", path: "/landlord/bookings" },
  { icon: LuFileText, label: "Rent Requests", path: "/landlord/rent-requests" },
  { icon: IoChatbubblesOutline, label: "Chat", path: "/landlord/chat" },
  { icon: LuBell, label: "Notifications", path: "/landlord/notifications" },
  { icon: LuCalendar, label: "Calendar", path: "/landlord/calendar" },
  { icon: LuWallet, label: "Wallet", path: "/landlord/wallet" },
  { icon: LuUser, label: "Profile", path: "/landlord/profile" },
];

const tenantNavLinks = [
  { icon: LuLayoutDashboard, label: "Dashboard", path: "/tenant/dashboard" },
  { icon: LuHeart, label: "Wishlist", path: "/tenant/wishlist" },
  { icon: LuCalendarDays, label: "Bookings", path: "/tenant/bookings" },
  { icon: LuFileText, label: "Rent Requests", path: "/tenant/rent-requests" },
  { icon: IoChatbubblesOutline, label: "Chat", path: "/tenant/chat" },
  { icon: LuBell, label: "Notifications", path: "/tenant/notifications" },
  { icon: LuWallet, label: "Wallet", path: "/tenant/wallet" },
  { icon: LuUser, label: "Profile", path: "/tenant/profile" },
]

export const router = createBrowserRouter([
  // Public Routes
  { path: "/", element: <HomePage /> },
  { path: "/about", element: <AboutPage /> },
  { path: "/contact", element: <ContactPage /> },
  { path: "/properties", element: <PropertyListingPage /> },
  { path: "/properties/:propertyId", element: <PropertyDetailsPage /> },
  { path: "/testimonial", element: <TestimonialPage /> },
  { path: "/login-register", element: <LoginRegisterPage /> },
  { path: "/verify-email", element: <EmailVerificationPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },

  // Admin Routes
  {
    element: <ProtectedRoute allowedRoles={["ADMIN"]} />,
    children: [
      {
        path: "/admin",
        element: <DashboardLayout navLinks={adminNavLinks} />,
        children: [
          { path: "dashboard", element: <AdminDashboard /> },
          { path: "deposit-requests", element: <AdminDepositRequests /> },
          { path: "withdrawals", element: <AdminWithdrawals /> },
          { path: "escrow", element: <AdminEscrow /> },
          { path: "platform", element: <AdminPlatform /> },
          { path: "users", element: <AdminUsers /> },
          { path: "properties", element: <AdminProperties /> },
          { path: "notifications", element: <NotificationPage /> },
        ],
      },
    ],
  },

  // LANDLORD Routes
  {
    element: <ProtectedRoute allowedRoles={["LANDLORD"]} />,
    children: [
      {
        path: "/landlord",
        element: <DashboardLayout navLinks={landlordNavLinks} />,
        children: [
          { path: "dashboard", element: <LandlordDashboard /> },
          { path: "tenants", element: <LandlordTenants /> },
          { path: "properties", element: <Properties /> },
          { path: "chat", element: <ChatPage /> },
          { path: "notifications", element: <NotificationPage /> },
          { path: "bookings", element: <Bookings /> },
          { path: "rent-requests", element: <RentRequests /> },
          { path: "calendar", element: <CalendarPage /> },
          { path: "wallet", element: <WalletPage /> },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
    ],
  },

  // TENANT Routes
  {
    element: <ProtectedRoute allowedRoles={["TENANT"]} />,
    children: [
      {
        path: "/tenant",
        element: <DashboardLayout navLinks={tenantNavLinks} />,
        children: [
          { path: "dashboard", element: <TenantDashboard /> },
          { path: "wishlist", element: <TenantWishlist /> },
          {  path: "bookings", element: <TenantBookings /> },
          { path: "rent-requests", element: <TenantRentRequests /> },
          {  path: "chat", element: <ChatPage /> },
          { path: "notifications", element: <NotificationPage /> },
          { path: "wallet", element: <WalletPage /> },
          { path: "profile", element: <ProfilePage /> },
        ]
       }
    ]
  }

]);
