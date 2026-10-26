import type { Role } from "@/app/types";

/**
 * Each role's dashboard root. Kept in one place because the layout needs it
 * for the profile link while the router defines the routes independently, and
 * the two must not drift.
 */
const DASHBOARD_PATHS: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  LANDLORD: "/landlord/dashboard",
  TENANT: "/tenant/bookings",
};

export const dashboardPathFor = (role: string | undefined | null): string =>
  role && role in DASHBOARD_PATHS ? DASHBOARD_PATHS[role as Role] : "/properties";

/** Notifications live under a role-specific path. */
export const notificationsPathFor = (role: string | undefined | null): string | null => {
  if (role === "ADMIN") return "/admin/notifications";
  if (role === "TENANT") return "/tenant/notifications";
  if (role === "LANDLORD") return "/landlord/notifications";
  return null;
};

/** Profile lives under a role-specific path; admins have no such route. */
export const profilePathFor = (role: string | undefined | null): string | null => {
  if (role === "TENANT") return "/tenant/profile";
  if (role === "LANDLORD") return "/landlord/profile";
  return null;
};
