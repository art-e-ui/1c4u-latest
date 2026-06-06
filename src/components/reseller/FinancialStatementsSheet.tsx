import { useState, useEffect } from "react";
import { FileText, ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useReseller } from "@/lib/reseller-context-hooks";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type TransactionType = "deposit" | "withdrawal";
type TransactionStatus = "pending" | "approved" | "rejected";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  date: string;
}

type FilterType = "all" | "deposit" | "withdrawal";

export default function FinancialStatementsSheet() {
  const { reseller } = useReseller();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const statusConfig = {
    pending: { icon: Clock, label: t("reseller.pending"), className: "text-yellow-500 bg-yellow-500/10" },
    approved: { icon: CheckCircle2, label: t("reseller.approved"), className: "text-emerald-500 bg-emerald-500/10" },
    rejected: { icon: XCircle, label: t("reseller.rejected"), className: "text-destructive bg-destructive/10" },
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!reseller || !open) return;
      setLoading(true);
      try {
        const depositQuery = query(
          collection(db, "deposit_requests"),
          where("resellerDocId", "==", reseller.id),
          orderBy("createdAt", "desc")
        );
        const withdrawalQuery = query(
          collection(db, "withdrawal_requests"),
          where("resellerDocId", "==", reseller.id),
          orderBy("createdAt", "desc")
        );

        const [depositSnap, withdrawalSnap] = await Promise.all([
          getDocs(depositQuery),
          getDocs(withdrawalQuery)
        ]);

        const deposits: Transaction[] = depositSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: "deposit",
            amount: data.amount,
            status: data.status.toLowerCase() as TransactionStatus,
            date: data.createdAt ? data.createdAt.split('T')[0] : 'N/A'
          };
        });

        const withdrawals: Transaction[] = withdrawalSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: "withdrawal",
            amount: data.amount,
            status: data.status.toLowerCase() as TransactionStatus,
            date: data.createdAt ? data.createdAt.split('T')[0] : 'N/A'
          };
        });

        const all = [...deposits, ...withdrawals].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setTransactions(all);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [reseller, open]);

  const filtered = transactions.filter(
    (t) => filter === "all" || t.type === filter
  );

  return (
    <>
      {/* Trigger Card */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-card-foreground">{t("reseller.financialStatements")}</p>
            <p className="text-xs text-muted-foreground">{t("reseller.depositsWithdrawalsHistory")}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Bottom Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-4 pb-8">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("reseller.financialStatements")}
            </SheetTitle>
          </SheetHeader>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {(["all", "deposit", "withdrawal"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f === "all" ? t("common.all") : f === "deposit" ? t("reseller.deposit") : t("reseller.withdrawal")}
              </button>
            ))}
          </div>

          {/* Transaction list */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <LoadingSpinner size={32} />
                <p className="text-xs text-muted-foreground">{t("reseller.loadingTransactions")}</p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">{t("reseller.noTransactionsFound")}</p>
            ) : (
              filtered.map((tx) => {
                const config = statusConfig[tx.status];
                const StatusIcon = config.icon;
                const isDeposit = tx.type === "deposit";
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                        isDeposit ? "bg-emerald-500/10" : "bg-orange-500/10"
                       }`}>
                        {isDeposit ? (
                          <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ArrowUpFromLine className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {isDeposit ? "+" : "-"}${tx.amount.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {isDeposit ? t("reseller.deposit") : t("reseller.withdrawal")} • {tx.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3.5 w-3.5 ${config.className.split(" ")[0]}`} />
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${config.className}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
