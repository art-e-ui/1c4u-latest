import { useState, useEffect } from "react";
import { ArrowDownToLine, Clock, CheckCircle2, XCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { collection, addDoc, query, where, orderBy, onSnapshot, runTransaction, doc } from "firebase/firestore";
import { useReseller } from "@/lib/reseller-context-hooks";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { useTranslation } from "react-i18next";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | undefined | null;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | undefined | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ResellerWithdrawalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WithdrawalRecord {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  date: string;
}

export default function ResellerWithdrawalSheet({ open, onOpenChange }: ResellerWithdrawalSheetProps) {
  const { reseller } = useReseller();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [history, setHistory] = useState<WithdrawalRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const statusConfig = {
    pending: { icon: Clock, label: t("reseller.pending"), className: "text-yellow-500 bg-yellow-500/10" },
    approved: { icon: CheckCircle2, label: t("reseller.approved"), className: "text-emerald-500 bg-emerald-500/10" },
    rejected: { icon: XCircle, label: t("reseller.rejected"), className: "text-destructive bg-destructive/10" },
  };

  useEffect(() => {
    if (!reseller || !open) return;

    const q = query(
      collection(db, "withdrawal_requests"),
      where("resellerDocId", "==", reseller.id)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const records = snap.docs.map(doc => ({
        id: doc.id,
        amount: doc.data().amount,
        status: doc.data().status.toLowerCase(),
        date: doc.data().createdAt.split('T')[0],
        createdAt: doc.data().createdAt
      })) as (WithdrawalRecord & { createdAt: string })[];
      
      // Sort in memory
      records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setHistory(records);
    });

    return () => unsubscribe();
  }, [reseller, open]);

  const handleSubmit = async () => {
    if (!reseller) return;
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      toast({ title: t("common.invalidAmount"), description: t("common.enterValidAmount"), variant: "destructive" });
      return;
    }
    if (num > (reseller?.balance || 0)) {
      toast({ title: t("common.insufficientBalance"), description: t("common.withdrawalExceedsBalance"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const resellerRef = doc(db, "reseller_profiles", reseller.id);
        const resellerSnap = await transaction.get(resellerRef);
        
        if (!resellerSnap.exists()) {
          throw new Error("Reseller profile not found.");
        }

        const currentBalance = resellerSnap.data().balance || 0;
        if (currentBalance < num) {
          throw new Error("Insufficient balance.");
        }

        // 1. Deduct balance
        transaction.update(resellerRef, {
          balance: currentBalance - num,
          updated_at: new Date().toISOString()
        });

        // 2. Create withdrawal request
        const withdrawalRef = doc(collection(db, "withdrawal_requests"));
        transaction.set(withdrawalRef, {
          resellerId: `GRS${reseller.resellerId}`,
          resellerDocId: reseller.id,
          resellerName: `${reseller.firstName} ${reseller.lastName}`,
          amount: num,
          status: "Pending",
          method: reseller.usdtAddress ? "USDT (TRC20)" : "Bank Transfer",
          createdAt: new Date().toISOString(),
          usdtAddress: reseller.usdtAddress || "",
          bankInfo: reseller.bankInfo || null,
          referralId: reseller.referralCode || null,
          memberOfAdminId: reseller.memberOfAdminId || null,
        });
      });

      // Send Telegram Notification
      try {
        const telegramMessage = `<b>New Withdrawal Request</b>\n\n` +
          `👤 Reseller: ${reseller.firstName} ${reseller.lastName}\n` +
          `🆔 Reseller ID: GRS${reseller.resellerId}\n` +
          `💰 Amount: $${num.toFixed(2)}\n` +
          `💸 Method: ${reseller.usdtAddress ? "USDT (TRC20)" : "Bank Transfer"}\n` +
          `📅 Date: ${new Date().toLocaleString()}`;
        
        await fetch('/api/telegram/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: telegramMessage, threadId: 1 }),
        }).catch(err => console.error("Telegram notification failed:", err));
      } catch (e) {
        console.error("Error triggering telegram notification:", e);
      }

      toast({ title: t("reseller.withdrawalRequested"), description: `${t("reseller.withdrawalOf")} $${num.toFixed(2)} ${t("reseller.withdrawalSubmitted")}` });
      setAmount("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      const errorMessage = error instanceof Error ? error.message : t("reseller.failedToSubmitWithdrawal");
      toast({ title: t("common.error"), description: errorMessage, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-4 pb-8">
        <SheetHeader className="pb-3">
          <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-primary" />
            {t("reseller.withdrawFunds")}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Balance display */}
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t("reseller.availableBalance")}</p>
            <p className="text-2xl font-bold text-foreground">${reseller?.balance?.toFixed(2) || "0.00"}</p>
          </div>

          {/* Amount input */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Label htmlFor="withdraw-amount" className="text-xs font-medium text-muted-foreground">
              {t("reseller.withdrawalAmount")}
            </Label>
            <Input
              id="withdraw-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("reseller.enterAmount")}
              className="rounded-xl text-lg font-semibold h-12"
              min={0}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("reseller.fundsWillBeSentToSavedMethod")}
            </p>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || submitting}
            className="w-full rounded-xl gap-2 h-12 text-sm font-semibold"
          >
            <Send className="h-4 w-4" />
            {submitting ? t("common.submitting") : t("reseller.requestWithdrawal")}
          </Button>

          <Separator />

          {/* Withdrawal status / history */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{t("reseller.withdrawalStatus")}</h3>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{t("reseller.noWithdrawalRequestsYet")}</p>
            ) : (
              <div className="space-y-2">
                {history.map((record) => {
                  const config = statusConfig[record.status];
                  const StatusIcon = config.icon;
                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.className}`}>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">${record.amount.toFixed(2)}</p>
                          <p className="text-[11px] text-muted-foreground">{record.date}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.className}`}>
                        {config.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
