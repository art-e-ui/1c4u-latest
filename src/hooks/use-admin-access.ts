import { useMemo } from "react";
import { useAdminAuth } from "@/lib/admin-auth-context-hooks";
import { useDbSlaStaff, dbStaffToLegacy } from "./use-db-sla";

export function useAdminAccess() {
  const { session } = useAdminAuth();
  const { data: dbStaff } = useDbSlaStaff();

  return useMemo(() => {
    if (!session) {
      return {
        session: null,
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
        session,
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
        session,
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
      const sessionAccountId = session.accountId?.replace(/^GA/, "OC") || session.accountId;
      const me = allStaff.find((s) => s.staffId === sessionAccountId || s.id === session.uid);
      
      const staffIds = [session.accountId, sessionAccountId];
      if (me?.staffId) staffIds.push(me.staffId);
      
      const docIds = [session.uid];
      if (me?.id) docIds.push(me.id);
      
      return {
        session,
        isOwner: false,
        isAdmin: false,
        isStaff: true,
        allowedStaffIds: Array.from(new Set(staffIds.filter(Boolean))) as string[],
        allowedStaffDocIds: Array.from(new Set(docIds.filter(Boolean))) as string[],
        allowedReferralIds: me?.referralId ? [me.referralId] : [],
        allowedAdminIds: me?.createdByAdminId ? [me.createdByAdminId] : [],
        allowedIds: [session.accountId, session.uid].filter(Boolean) as string[],
        canSeeAll: false,
      };
    }

    return {
      session,
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
