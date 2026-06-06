import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Search, Filter, Download, CreditCard, Building2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useMemo, useState } from "react";

interface ACHCustomer {
  id: string;
  name: string;
  bank: string;
  accountType: string;
  status: "Active" | "Pending" | "Suspended";
  lastTransaction: string;
  referralId?: string;
  referredBy?: string;
  memberOfAdminId?: string;
}

export default function ACHCustomersPage() {
  const { canSeeAll, allowedReferralIds, allowedStaffIds, allowedStaffDocIds, allowedAdminIds } = useAdminAccess();
  const [search, setSearch] = useState("");
  
  const achCustomers = useMemo(() => {
    const data: ACHCustomer[] = []; // Mock data
    return data;
  }, []);

  const filtered = useMemo(() => {
    let list = achCustomers;
    if (!canSeeAll) {
      list = list.filter(c => 
        (c.referralId && allowedReferralIds.includes(c.referralId)) ||
        (c.referredBy && (allowedStaffIds.includes(c.referredBy) || allowedStaffDocIds.includes(c.referredBy))) ||
        (c.memberOfAdminId && allowedAdminIds.includes(c.memberOfAdminId))
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.bank.toLowerCase().includes(q));
    }
    return list;
  }, [achCustomers, canSeeAll, allowedReferralIds, allowedStaffIds, allowedStaffDocIds, allowedAdminIds, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ACH Customers</h1>
          <p className="text-sm text-muted-foreground">Manage customers using Automated Clearing House (ACH) payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <UserCheck className="h-3.5 w-3.5" />
            Verify New
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 w-full sm:w-72">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search ACH customers..." className="bg-transparent border-none outline-none text-sm w-full h-6 focus-visible:ring-0 p-0" />
      </div>

      <Card className="border-none shadow-theme-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Customer", "Bank Details", "Account Type", "Status", "Last Transaction"].map((h) => (
                  <th key={h} className="text-left p-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((customer) => (
                <tr key={customer.id} className="hover:bg-accent/50 transition-colors">
                  <td className="p-3.5 pl-5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{customer.name}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-muted-foreground">{customer.bank}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      {customer.accountType}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <StatusBadge 
                      label={customer.status} 
                      variant={customer.status === "Active" ? "success" : customer.status === "Pending" ? "warning" : "danger"} 
                    />
                  </td>
                  <td className="p-3.5 text-muted-foreground">{customer.lastTransaction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
