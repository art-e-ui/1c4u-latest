import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export function useAchCustomers() {
  return useQuery({
    queryKey: ["ach_customers"],
    queryFn: async () => {
      try {
        const snapshot = await getDocs(collection(db, "ach_customers"));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error fetching ACH customers:", error);
        return []; // Fallback to empty array if collection doesn't exist yet
      }
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useAchFinancials() {
  return useQuery({
    queryKey: ["ach_financials"],
    queryFn: async () => {
      try {
        const snapshot = await getDocs(collection(db, "ach_financials"));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error fetching ACH financials:", error);
        return []; // Fallback to empty array if collection doesn't exist yet
      }
    },
    staleTime: 30 * 60 * 1000,
  });
}
