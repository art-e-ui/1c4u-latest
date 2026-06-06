import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "User"; // Mapping from db roles
  lastLogin: string;
  status: "Active" | "Inactive";
}

export function useAdmins() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "in", ["owner", "admin", "staff"])
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const user = doc.data();
        return {
          id: doc.id,
          name: `${String(user.first_name || '')} ${String(user.last_name || '')}`.trim() || 'Unknown User',
          email: String(user.email || ''),
          role: user.role === 'owner' ? 'Owner' : user.role === 'admin' ? 'Admin' : 'User',
          lastLogin: String(user.created_at || ''), // Fallback to created_at if last_login doesn't exist
          status: "Active", // Assuming active for now
        };
      }) as AdminUser[];
      queryClient.setQueryData(["admins"], data);
    }, (error) => {
      console.error("Error fetching admins:", error);
    });
    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      return queryClient.getQueryData<AdminUser[]>(["admins"]) || [];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}
