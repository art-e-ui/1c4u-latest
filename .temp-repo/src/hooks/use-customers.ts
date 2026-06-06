import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
  status: "Active" | "Inactive" | "Blocked";
  referralId?: string;
  referredBy?: string;
  memberOfAdminId?: string;
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      try {
        const customersQuery = query(collection(db, "users"), where("role", "==", "customer"));
        const snapshot = await getDocs(customersQuery);

        return snapshot.docs.map(doc => {
          const user = doc.data();
          return {
            id: doc.id,
            name: `${String(user.first_name || '')} ${String(user.last_name || '')}`.trim() || 'Unknown User',
            email: String(user.email || ''),
            phone: "N/A", // Not in schema yet
            totalOrders: 0, // Would need to aggregate from orders table
            totalSpent: 0, // Would need to aggregate from orders table
            lastOrder: String(user.created_at || ''), // Fallback
            status: "Active", // Assuming active for now
            referralId: user.referral_code || user.referralId || "",
            referredBy: user.referred_by || user.referredBy || "",
            memberOfAdminId: user.member_of_admin_id || user.memberOfAdminId || "",
          };
        }) as Customer[];
      } catch (error) {
        console.error("Error fetching customers:", error);
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
