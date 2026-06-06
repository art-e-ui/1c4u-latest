import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { collection, doc, setDoc, query, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";

export interface DepositRequest {
  id: string;
  resellerId: string;
  resellerDocId: string;
  resellerName: string;
  amount: number;
  status: "Pending" | "Approved" | "Rejected";
  method: "Bank Transfer" | "USDT (TRC20)";
  bankInfo?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  usdtAddress?: string;
  proofImage: string;
  remark?: string;
  createdAt: string;
  memberOfAdminId?: string;
  referralId?: string;
  staffId?: string;
  adminId?: string;
}

export interface WithdrawalRequest {
  id: string;
  resellerId: string;
  resellerDocId: string;
  resellerName: string;
  amount: number;
  status: "Pending" | "Approved" | "Rejected";
  method: "Bank Transfer" | "USDT (TRC20)";
  bankInfo?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  usdtAddress?: string;
  remark?: string;
  createdAt: string;
  memberOfAdminId?: string;
  referralId?: string;
  staffId?: string;
  adminId?: string;
}

export function useDepositRequests() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const q = query(collection(db, "deposit_requests"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => {
        const d = doc.data();
        let createdAt = d.createdAt || new Date().toISOString();
        if (d.createdAt?.toDate) createdAt = d.createdAt.toDate().toISOString();
        else if (d.createdAt?.seconds) createdAt = new Date(d.createdAt.seconds * 1000).toISOString();
        return { id: doc.id, ...d, createdAt };
      }) as DepositRequest[];
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      queryClient.setQueryData(["deposit-requests"], sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "deposit_requests");
    });
    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ["deposit-requests"],
    queryFn: async () => {
      return queryClient.getQueryData<DepositRequest[]>(["deposit-requests"]) || [];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useWithdrawalRequests() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const q = query(collection(db, "withdrawal_requests"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => {
        const d = doc.data();
        let createdAt = d.createdAt || new Date().toISOString();
        if (d.createdAt?.toDate) createdAt = d.createdAt.toDate().toISOString();
        else if (d.createdAt?.seconds) createdAt = new Date(d.createdAt.seconds * 1000).toISOString();
        return { id: doc.id, ...d, createdAt };
      }) as WithdrawalRequest[];
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      queryClient.setQueryData(["withdrawal-requests"], sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "withdrawal_requests");
    });
    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ["withdrawal-requests"],
    queryFn: async () => {
      return queryClient.getQueryData<WithdrawalRequest[]>(["withdrawal-requests"]) || [];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useFinancialMutations() {
  const queryClient = useQueryClient();

  const updateDepositStatus = useMutation({
    mutationFn: async ({ id, status, remark }: { id: string; status: string; remark?: string }) => {
      const docRef = doc(db, "deposit_requests", id);
      const updateData: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
      if (remark !== undefined) updateData.remark = remark;
      await setDoc(docRef, updateData, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposit-requests"] });
    }
  });

  const updateWithdrawalStatus = useMutation({
    mutationFn: async ({ id, status, remark }: { id: string; status: string; remark?: string }) => {
      const docRef = doc(db, "withdrawal_requests", id);
      const updateData: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
      if (remark !== undefined) updateData.remark = remark;
      await setDoc(docRef, updateData, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
    }
  });

  return { updateDepositStatus, updateWithdrawalStatus };
}
