import { Navigate } from "react-router-dom";
import { useAdminAuth, isPathAllowed } from "@/lib/admin-auth-context-hooks";
import { adminPath } from "@/lib/subdomain";
import type { ReactNode } from "react";

interface RoleGuardProps {
  children: ReactNode;
  path: string;
}

/**
 * Client-side route guard that checks if the current admin role
 * is allowed to access the given path. Redirects to dashboard if not.
 */
export function RoleGuard({ children, path }: RoleGuardProps) {
  const { session, loading } = useAdminAuth();

  if (loading) return null;

  if (!session) {
    return <Navigate to={adminPath("/admin/auth/sign-in")} replace />;
  }

  if (!isPathAllowed(session.role, path)) {
    return <Navigate to={adminPath("/admin")} replace />;
  }

  return <>{children}</>;
}
