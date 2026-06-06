import { useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { playNotificationSound, startTabFlash } from "./use-notifications";
import { useAdminAccess } from "./use-admin-access";
import { useAdminAuth } from "@/lib/admin-auth-context-hooks";

export function useAdminGlobalNotifications() {
  const isFirstRun = useRef({
    customers: true,
    resellers: true,
    r2a: true,
    virtualChat: true,
    deposit: true,
    withdrawal: true,
  });

  const { session } = useAdminAuth();
  const { isOwner, isAdmin, isStaff } = useAdminAccess();
  
  // They have access if they have a session and any of these roles
  const hasAccess = !!session && (isOwner || isAdmin || isStaff);

  useEffect(() => {
    // We only mount listeners if user has some form of admin portal access
    if (!hasAccess) return;

    // 1. New Customers
    const qCustomers = query(collection(db, "users"), where("role", "==", "customer"));
    const unsubCustomers = onSnapshot(qCustomers, (snap) => {
      if (isFirstRun.current.customers) {
        isFirstRun.current.customers = false;
        return;
      }
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          toast.success("A new customer just registered!");
          playNotificationSound();
          startTabFlash();
        }
      });
    }, () => {});

    // 2. New Resellers
    const qResellers = query(collection(db, "reseller_profiles"));
    const unsubResellers = onSnapshot(qResellers, (snap) => {
      if (isFirstRun.current.resellers) {
        isFirstRun.current.resellers = false;
        return;
      }
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          toast.success("A new reseller profile was created!");
          playNotificationSound();
          startTabFlash();
        }
      });
    }, () => {});

    // 3. Reseller 2 Admin page (Support messages)
    const qR2A = query(collection(db, "reseller_chat_messages"), where("sender", "==", "reseller"));
    const unsubR2A = onSnapshot(qR2A, (snap) => {
      if (isFirstRun.current.r2a) {
        isFirstRun.current.r2a = false;
        return;
      }
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          toast("New message received in Reseller Support Chat!");
          playNotificationSound();
          startTabFlash();
        }
      });
    }, () => {});

    // 4. Virtual Chat page (Customer Services)
    const qVirtualChat = query(collection(db, "reseller_customer_chat_messages"), where("sender", "==", "reseller"));
    const unsubVirtualChat = onSnapshot(qVirtualChat, (snap) => {
      if (isFirstRun.current.virtualChat) {
        isFirstRun.current.virtualChat = false;
        return;
      }
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          toast("New message received from reseller in Virtual Chat!");
          playNotificationSound();
          startTabFlash();
        }
      });
    }, () => {});

    // 5. Deposit Requests
    const qDeposit = query(collection(db, "deposit_requests"));
    const unsubDeposit = onSnapshot(qDeposit, (snap) => {
      if (isFirstRun.current.deposit) {
        isFirstRun.current.deposit = false;
        return;
      }
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          toast.success("New deposit request received!");
          playNotificationSound();
          startTabFlash();
        }
      });
    }, () => {});

    // 6. Withdrawal Requests
    const qWithdrawal = query(collection(db, "withdrawal_requests"));
    const unsubWithdrawal = onSnapshot(qWithdrawal, (snap) => {
      if (isFirstRun.current.withdrawal) {
        isFirstRun.current.withdrawal = false;
        return;
      }
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          toast.success("New withdrawal request received!");
          playNotificationSound();
          startTabFlash();
        }
      });
    }, () => {});

    return () => {
      unsubCustomers();
      unsubResellers();
      unsubR2A();
      unsubVirtualChat();
      unsubDeposit();
      unsubWithdrawal();
    };
  }, [hasAccess]);
}
