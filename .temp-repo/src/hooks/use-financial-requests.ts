import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, orderBy, where } from "firebase/firestore";
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
  return useQuery({
    queryKey: ["deposit-requests"],
    queryFn: async () => {
      const path = "deposit_requests";
      try {
        const q = query(collection(db, path));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DepositRequest[];
        return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useWithdrawalRequests() {
  return useQuery({
    queryKey: ["withdrawal-requests"],
    queryFn: async () => {
      const path = "withdrawal_requests";
      try {
        const q = query(collection(db, path));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WithdrawalRequest[];
        return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    },
    staleTime: 30 * 60 * 1000,
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
