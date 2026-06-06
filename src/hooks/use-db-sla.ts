import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

// Types for compatibility
export interface DbSlaAdmin {
  id: string;
  account_id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  avatar: string;
  joined_at: string;
  last_login: string;
  permissions: string[];
}

export interface DbSlaStaff {
  id: string;
  staff_id: string;
  referral_id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  joined_at: string;
  last_active: string;
  created_by_admin_id: string;
  department: string;
}

export interface DbSystemSetting {
  setting_id: string;
  key: string;
  label: string;
  value: string;
  category: string;
  updated_at_display: string;
  updated_by: string;
}

// ── SLA Admins ──────────────────────────────────────

export function useDbSlaAdmins() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "sla_admins"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DbSlaAdmin));
      queryClient.setQueryData(["sla_admins"], data);
    }, (error) => {
      console.error("Error fetching SLA admins:", error);
    });
    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ["sla_admins"],
    queryFn: async (): Promise<DbSlaAdmin[]> => {
      return queryClient.getQueryData<DbSlaAdmin[]>(["sla_admins"]) || [];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// ── SLA Staff ───────────────────────────────────────

export function useDbSlaStaff() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "sla_staff"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DbSlaStaff));
      queryClient.setQueryData(["sla_staff"], data);
    }, (error) => {
      console.error("Error fetching SLA staff:", error);
    });
    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ["sla_staff"],
    queryFn: async (): Promise<DbSlaStaff[]> => {
      return queryClient.getQueryData<DbSlaStaff[]>(["sla_staff"]) || [];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// ── System Settings ─────────────────────────────────

export function useDbSystemSettings() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "system_settings"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as DbSystemSetting));
      queryClient.setQueryData(["system_settings"], data);
    }, (error) => {
      console.error("Error fetching system settings:", error);
    });
    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ["system_settings"],
    queryFn: async (): Promise<DbSystemSetting[]> => {
      return queryClient.getQueryData<DbSystemSetting[]>(["system_settings"]) || [];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// ── Adapters to legacy shapes ───────────────────────

export interface LegacySlaAdmin {
  id: string;
  accountId: string;
  name: string;
  role: "Admin";
  email: string;
  phone: string;
  status: "Active" | "Inactive" | "Suspended";
  avatar: string;
  joinedAt: string;
  lastLogin: string;
  permissions: string[];
}

export function dbAdminToLegacy(a: DbSlaAdmin): LegacySlaAdmin {
  return {
    id: a.id,
    accountId: a.account_id.replace(/^GA/, "OC"),
    name: a.name,
    role: "Admin",
    email: a.email,
    phone: a.phone ?? "",
    status: a.status as "Active" | "Inactive" | "Suspended",
    avatar: a.avatar ?? "",
    joinedAt: a.joined_at,
    lastLogin: a.last_login || "Never",
    permissions: a.permissions ?? [],
  };
}

export interface LegacySlaStaff {
  id: string;
  staffId: string;
  referralId: string;
  name: string;
  email: string;
  phone: string;
  role: "User";
  status: "Active" | "Inactive" | "Suspended";
  joinedAt: string;
  lastActive: string;
  createdByAdminId: string;
  department: string;
}

export function dbStaffToLegacy(s: DbSlaStaff): LegacySlaStaff {
  return {
    id: s.id,
    staffId: s.staff_id.replace(/^GA/, "OC"),
    referralId: s.referral_id,
    name: s.name,
    email: s.email,
    phone: s.phone ?? "",
    role: "User",
    status: s.status as "Active" | "Inactive" | "Suspended",
    joinedAt: s.joined_at,
    lastActive: s.last_active || "Never",
    createdByAdminId: s.created_by_admin_id,
    department: s.department ?? "Unassigned",
  };
}

export interface LegacySystemSetting {
  id: string;
  key: string;
  label: string;
  value: string;
  category: "General" | "Security" | "Notifications" | "Maintenance";
  updatedAt: string;
  updatedBy: string;
}

export function dbSettingToLegacy(s: DbSystemSetting): LegacySystemSetting {
  return {
    id: s.setting_id,
    key: s.key,
    label: s.label,
    value: s.value,
    category: s.category as LegacySystemSetting["category"],
    updatedAt: s.updated_at_display || "",
    updatedBy: s.updated_by || "System",
  };
}

// ── ID Generators ───────────────────────────────────

export function getNextAdminId(admins: LegacySlaAdmin[]): string {
  const num = admins.length + 1;
  return `OC${String(num).padStart(2, "0")}`;
}

export function getNextStaffId(adminAccountId: string, staff: LegacySlaStaff[]): string {
  const staffUnderAdmin = staff.filter((s) => s.createdByAdminId === adminAccountId);
  const num = staffUnderAdmin.length + 1;
  return `${adminAccountId}S${String(num).padStart(2, "0")}`;
}

// ── Referral ID Generator ───────────────────────────

function shuffle(array: string[]): string[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateReferralId(
  staffId: string,
  staffUsername: string
): string {
  // Get 2 random letters from username
  const letters = staffUsername.replace(/[^a-zA-Z]/g, "").toUpperCase();
  let randomLetters = "";
  if (letters.length >= 2) {
    const idx1 = Math.floor(Math.random() * letters.length);
    let idx2 = Math.floor(Math.random() * letters.length);
    while (idx2 === idx1 && letters.length > 1) {
      idx2 = Math.floor(Math.random() * letters.length);
    }
    randomLetters = letters[idx1] + letters[idx2];
  } else {
    // Fallback if username is too short or has no letters
    randomLetters = "XY";
  }

  const combined = (staffId + randomLetters).split("");
  return shuffle(combined).join("");
}
