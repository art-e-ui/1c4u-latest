import { useMemo } from "react";
import { useAdminAuth } from "@/lib/admin-auth-context-hooks";
import { useDbSlaStaff, dbStaffToLegacy } from "./use-db-sla";

export function useAdminAccess() {
  const { session } = useAdminAuth();
  const { data: dbStaff } = useDbSlaStaff();

  return useMemo(() => {
    if (!session) {
      return {
        isOwner: false,
        isAdmin: false,
        isStaff: false,
        allowedStaffIds: [] as string[],
        allowedStaffDocIds: [] as string[],
        allowedReferralIds: [] as string[],
        allowedAdminIds: [] as string[],
        allowedIds: [] as string[],
        canSeeAll: false,
      };
    }

    if (session.role === "Owner") {
      return {
        isOwner: true,
        isAdmin: false,
        isStaff: false,
        allowedStaffIds: [] as string[],
        allowedStaffDocIds: [] as string[],
        allowedReferralIds: [] as string[],
        allowedAdminIds: [] as string[],
        allowedIds: [] as string[],
        canSeeAll: true,
      };
    }

    const allStaff = (dbStaff ?? []).map(dbStaffToLegacy);

    if (session.role === "Admin") {
      const myStaff = allStaff.filter((s) => s.createdByAdminId === session.accountId);
      const myStaffIds = myStaff.map((s) => s.staffId);
      const myStaffDocIds = myStaff.map((s) => s.id);
      return {
        isOwner: false,
        isAdmin: true,
        isStaff: false,
        allowedStaffIds: myStaffIds.filter(Boolean) as string[],
        allowedStaffDocIds: myStaffDocIds.filter(Boolean) as string[],
        allowedReferralIds: myStaff.map((s) => s.referralId).filter(Boolean) as string[],
        allowedAdminIds: [session.accountId, session.uid].filter(Boolean) as string[],
        allowedIds: [session.accountId, session.uid, ...myStaffIds, ...myStaffDocIds].filter(Boolean) as string[],
        canSeeAll: false,
      };
    }

    if (session.role === "User") {
      const me = allStaff.find((s) => s.staffId === session.accountId || s.id === session.uid);
      return {
        isOwner: false,
        isAdmin: false,
        isStaff: true,
        allowedStaffIds: me ? [me.staffId] : [],
        allowedStaffDocIds: me ? [me.id] : [],
        allowedReferralIds: me ? [me.referralId] : [],
        allowedAdminIds: me ? [me.createdByAdminId] : [],
        allowedIds: session.accountId ? [session.accountId] : [],
        canSeeAll: false,
      };
    }

    return {
      isOwner: false,
      isAdmin: false,
      isStaff: false,
      allowedStaffIds: [] as string[],
      allowedStaffDocIds: [] as string[],
      allowedReferralIds: [] as string[],
      allowedAdminIds: [] as string[],
      allowedIds: [] as string[],
      canSeeAll: false,
    };
  }, [session, dbStaff]);
}
