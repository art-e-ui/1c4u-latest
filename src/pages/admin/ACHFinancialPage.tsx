import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/StatCard";
import { DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Landmark } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useMemo } from "react";

interface ACHTransaction {
  id: string;
  customer: string;
  type: "Deposit" | "Withdrawal" | "Fee";
  amount: number;
  status: "Completed" | "Pending" | "Failed";
  date: string;
  referralId?: string;
  referredBy?: string;
  memberOfAdminId?: string;
}

export default function ACHFinancialPage() {
  const { canSeeAll, allowedReferralIds, allowedStaffIds, allowedStaffDocIds, allowedAdminIds } = useAdminAccess();
  
  const transactions = useMemo(() => {
    const data: ACHTransaction[] = []; // Mock data
    return data;
  }, []);

  const filtered = useMemo(() => {
    if (canSeeAll) return transactions;
    return transactions.filter(tx => 
      (tx.referralId && allowedReferralIds.includes(tx.referralId)) ||
      (tx.referredBy && (allowedStaffIds.includes(tx.referredBy) || allowedStaffDocIds.includes(tx.referredBy))) ||
      (tx.memberOfAdminId && allowedAdminIds.includes(tx.memberOfAdminId))
    );
  }, [transactions, canSeeAll, allowedReferralIds, allowedStaffIds, allowedStaffDocIds, allowedAdminIds]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ACH Financials</h1>
        <p className="text-sm text-muted-foreground">Monitor ACH transaction volume and financial health.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total ACH Volume" value="$124,500" icon={DollarSign} trend={{ value: 12.5, isPositive: true }} />
        <StatCard label="Pending Settlements" value="$18,240" icon={Wallet} trend={{ value: 5.2, isPositive: false }} />
        <StatCard label="Success Rate" value="94.8%" icon={TrendingUp} trend={{ value: 0.8, isPositive: true }} />
      </div>

      <Card className="border-none shadow-theme-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Customer", "Amount", "Type", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left p-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-accent/50 transition-colors">
                  <td className="p-3.5 pl-5 font-medium">{tx.customer}</td>
                  <td className="p-3.5">
                    <span className={cn(
                      "font-bold",
                      tx.type === "Deposit" ? "text-success" : "text-danger"
                    )}>
                      {tx.type === "Deposit" ? "+" : "-"}${tx.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3.5 text-muted-foreground">{tx.type}</td>
                  <td className="p-3.5">
                    <StatusBadge 
                      label={tx.status} 
                      variant={tx.status === "Completed" ? "success" : tx.status === "Pending" ? "warning" : "danger"} 
                    />
                  </td>
                  <td className="p-3.5 text-muted-foreground">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

import { cn } from "@/lib/utils";
