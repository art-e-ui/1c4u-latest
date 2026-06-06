import { createContext, useContext } from "react";

export type SLARole = "Owner" | "Admin" | "User";

export interface AdminSession {
  name: string;
  email: string;
  role: SLARole;
  accountId: string | null;
  uid: string;
}

export const STAFF_ALLOWED_PATHS = new Set([
  "/admin",
  "/admin/inventory",
  "/admin/orders",
  "/admin/resellers",
  "/admin/customer-service",
  "/admin/content",
  "/admin/ach/customers",
  "/admin/ach/financial",
  "/admin/ach/miscellaneous",
  "/admin/sla/site-advertising",
  "/admin/sla/broadcast-news",
  "/admin/sla/sqc",
  "/admin/sla/sqc-orders",
  "/admin/ars/reseller-profiles",
  "/admin/ars/retail-shops",
  "/admin/ars/orders",
  "/admin/customer-care/staffs",
  "/admin/customer-care/reseller-profile",
  "/admin/customer-care/virtual-services",
  "/admin/customer-care/order-services",
]);

export const ADMIN_BLOCKED_PATHS = new Set([
  "/admin/sla/ownership",
]);

// Management & Financing paths that Staff cannot access
export const MANAGEMENT_FINANCING_PATHS = new Set([
  "/admin/sla/ownership",
  "/admin/sla/administrator",
  "/admin/sla/reseller-2-admin",
  "/admin/ars/payment-info",
  "/admin/ars/deposit",
  "/admin/ars/withdrawal",
  "/admin/admins",
]);

export function isPathAllowed(role: SLARole, pathname: string): boolean {
  const p = pathname.replace(/\/$/, "") || "/admin";
  if (p.startsWith("/admin/auth")) return true;
  if (role === "Owner") return true;
  if (role === "Admin") {
    return !ADMIN_BLOCKED_PATHS.has(p);
  }
  return STAFF_ALLOWED_PATHS.has(p);
}

export interface AdminAuthContextType {
  session: AdminSession | null;
  signIn: (email: string, password: string) => Promise<{success: boolean, message?: string}>;
  signOut: () => Promise<void>;
  loading: boolean;
}

export const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
