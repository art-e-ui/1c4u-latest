import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrders, useCancelOrder, useUpdateOrderStatus, type Order } from "@/hooks/use-orders";
import { useUnifiedResellers } from "@/lib/unified-hooks";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { format } from "date-fns";
import { Search, Filter, MoreVertical, Eye, Trash2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useMemo, useState } from "react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminOrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const resellers = useUnifiedResellers();
  const cancelOrderMutation = useCancelOrder();
  const updateStatusMutation = useUpdateOrderStatus();
  const { canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds } = useAdminAccess();
  const [search, setSearch] = useState("");
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);

  const handleCancelOrder = async () => {
    if (orderToCancel) {
      await cancelOrderMutation.mutateAsync(orderToCancel);
      setOrderToCancel(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: Order["status"]) => {
    await updateStatusMutation.mutateAsync({ orderId, status });
  };

  const filtered = useMemo(() => {
    let list = orders || [];
    
    // Determine allowed reseller IDs
    const allowedResellerIds = new Set<string>();
    if (!canSeeAll) {
      const allowedResellers = resellers.filter(r => {
        const referredBy = r.referredBy;
        const memberOfAdminId = r.memberOfAdminId;
        return (referredBy && (
          allowedReferralIds.includes(String(referredBy)) || 
          allowedStaffIds.includes(String(referredBy)) || 
          allowedStaffDocIds.includes(String(referredBy))
        )) || (memberOfAdminId && allowedAdminIds.includes(memberOfAdminId));
      });
      // We store both the raw ID and the formatted GRS/1CR ID to be safe
      allowedResellers.forEach(r => {
        allowedResellerIds.add(String(r.id));
        allowedResellerIds.add(`1CR${r.resellerId}`);
      });
      
      list = list.filter((o) => allowedResellerIds.has(String(o.resellerId)));
    }

    // Enrich with reseller data for searching
    const enriched = list.map(o => {
      const reseller = resellers.find(r => 
        `1CR${r.resellerId}` === o.resellerId || 
        r.id === o.resellerId
      );
      return {
        ...o,
        resellerId: reseller ? (String(reseller.resellerId || "").startsWith("1CR") ? String(reseller.resellerId) : (/^\d+$/.test(String(reseller.resellerId || "")) ? `1CR${reseller.resellerId}` : String(reseller.resellerId))) : o.resellerId,
        resellerName: reseller ? `${reseller.firstName} ${reseller.lastName}` : o.resellerName || "N/A",
        shopName: reseller?.shopName || ""
      };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      return enriched.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          o.resellerId.toLowerCase().includes(q) ||
          o.resellerName.toLowerCase().includes(q) ||
          o.shopName.toLowerCase().includes(q)
      );
    }
    return enriched;
  }, [orders, resellers, canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds, search]);

  const getStatusVariant = (status: Order["status"]) => {
    switch (status) {
      case "Completed": return "success";
      case "Ongoing": return "info";
      case "Pending": return "warning";
      case "Cancelled": return "danger";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Order Tracking & Management</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage all reseller orders across the system.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
          <Button size="sm" className="gap-1.5 h-8">
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 w-full sm:w-72">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search orders..." 
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
                {[
                  "Order ID", 
                  "Reseller ID", 
                  "Reseller Name", 
                  "Staff", 
                  "Admin", 
                  "Products", 
                  "Counts", 
                  "Total Cost", 
                  "Service Cost", 
                  "Profits", 
                  "Status", 
                  "Actions"
                ].map((h) => (
                  <th key={h} className="text-left p-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider first:pl-5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-muted-foreground">Loading orders...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-muted-foreground">No orders found.</td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-accent/50 transition-colors text-xs">
                    <td className="p-3.5 pl-5 font-medium text-foreground">{order.id}</td>
                    <td className="p-3.5 text-muted-foreground">{order.resellerId}</td>
                    <td className="p-3.5 font-medium text-foreground">{order.resellerName}</td>
                    <td className="p-3.5 text-muted-foreground">{order.staffUsername}</td>
                    <td className="p-3.5 text-muted-foreground">{order.adminUsername}</td>
                    <td className="p-3.5 text-foreground text-center">{order.products}</td>
                    <td className="p-3.5 text-foreground text-center">{order.items}</td>
                    <td className="p-3.5 font-medium text-foreground">${order.totalCost.toFixed(2)}</td>
                    <td className="p-3.5 font-medium text-foreground">${order.serviceCost.toFixed(2)}</td>
                    <td className="p-3.5 font-semibold text-primary">${order.profits.toFixed(2)}</td>
                    <td className="p-3.5">
                      <StatusBadge label={order.status} variant={getStatusVariant(order.status)} />
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
                            <Eye className="h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            className="gap-2 text-info"
                            onClick={() => handleUpdateStatus(order.id, "Ongoing")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Clock className="h-4 w-4" /> Mark as Ongoing
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            className="gap-2 text-success"
                            onClick={() => handleUpdateStatus(order.id, "Completed")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Mark as Completed
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => setOrderToCancel(order.id)}
                          >
                            <Trash2 className="h-4 w-4" /> Cancel Order
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

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!orderToCancel} onOpenChange={(open) => !open && setOrderToCancel(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Order
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel order <strong>{orderToCancel}</strong>? This action will mark the order as cancelled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOrderToCancel(null)}>Keep Order</Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelOrder}
              disabled={cancelOrderMutation.isPending}
            >
              {cancelOrderMutation.isPending ? "Cancelling..." : "Yes, Cancel Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
