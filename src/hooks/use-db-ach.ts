import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export function useAchCustomers() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "ach_customers"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      queryClient.setQueryData(["ach_customers"], data);
    }, (error) => {
      console.error("Error fetching ACH customers:", error);
    });
    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ["ach_customers"],
    queryFn: async () => {
      return queryClient.getQueryData<Record<string, unknown>[]>(["ach_customers"]) || [];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useAchFinancials() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "ach_financials"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      queryClient.setQueryData(["ach_financials"], data);
    }, (error) => {
      console.error("Error fetching ACH financials:", error);
    });
    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ["ach_financials"],
    queryFn: async () => {
      return queryClient.getQueryData<Record<string, unknown>[]>(["ach_financials"]) || [];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}
