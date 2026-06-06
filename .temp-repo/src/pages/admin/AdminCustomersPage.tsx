import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomers, type Customer } from "@/hooks/use-customers";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Search, MoreVertical, UserPlus, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useMemo, useState } from "react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminCustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  const { canSeeAll, allowedReferralIds, allowedStaffIds, allowedAdminIds, allowedStaffDocIds } = useAdminAccess();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = customers || [];
    if (!canSeeAll) {
      list = list.filter((c) => 
        (c.referralId && allowedReferralIds.includes(c.referralId)) ||
        (c.referredBy && (allowedStaffIds.includes(c.referredBy) || allowedStaffDocIds.includes(c.referredBy))) ||
        (c.memberOfAdminId && allowedAdminIds.includes(c.memberOfAdminId))
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, canSeeAll, allowedReferralIds, allowedStaffIds, allowedAdminIds, allowedStaffDocIds, search]);

  const getStatusVariant = (status: Customer["status"]) => {
    switch (status) {
      case "Active": return "success";
      case "Inactive": return "warning";
      case "Blocked": return "danger";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your customer base and view their activity.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 h-8">
          <UserPlus className="h-3.5 w-3.5" />
          Add Customer
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 w-full sm:w-72">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search customers..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full h-6 focus-visible:ring-0 p-0" 
        />
      </div>

      <Card className="border-none shadow-theme-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Customer", "Contact", "Orders", "Spent", "Status", ""].map((h) => (
                  <th key={h} className="text-left p-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">Loading customers...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">No customers found.</td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {customer.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{customer.name}</span>
                          <span className="text-xs text-muted-foreground">{customer.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-sm text-foreground">{customer.totalOrders}</td>
                    <td className="p-3.5 text-sm font-semibold text-foreground">${customer.totalSpent.toFixed(2)}</td>
                    <td className="p-3.5">
                      <StatusBadge label={customer.status} variant={getStatusVariant(customer.status)} />
                    </td>
                    <td className="p-3.5 pr-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-md hover:bg-accent transition-colors">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            View Orders
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                            Block Customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
