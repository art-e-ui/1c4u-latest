import { useState, useMemo, useEffect, useCallback } from "react";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useUnifiedResellers } from "@/lib/unified-hooks";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDoc, getDocs, orderBy, limit } from "firebase/firestore";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal, Search, Archive, Trash2, Eye, CheckCircle,
  Star, Filter, ChevronLeft, ChevronRight
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";

/* ─── Types ─── */
import { OrderItem, OrderStatus } from "@/lib/types";

interface OrderRecord {
  id: string;
  orderId: string;
  resellerName: string;
  resellerId: string;
  resellerNumericId?: number;
  staffUsername: string;
  adminName: string;
  productCount: number;
  itemCount: number;
  totalCost: number;
  serviceCost: number;
  profit: number;
  status: OrderStatus;
  focused: boolean;
  createdAt: string;
  pickedUpAt?: string;
  completedAt?: string;
  referralId?: string;
  referredBy?: string;
  memberOfAdminId?: string;
}

/* ─── Status badge colors ─── */
function statusVariant(s: OrderStatus) {
  switch (s) {
    case "Pending": return "outline" as const;
    case "Ongoing": return "default" as const;
    case "Completed": return "default" as const;
    case "Cancelled": return "destructive" as const;
    default: return "outline" as const;
  }
}

function statusClass(s: OrderStatus) {
  switch (s) {
    case "Completed": return "bg-emerald-600/20 text-emerald-400 border-emerald-600/30";
    case "Ongoing": return "bg-blue-600/20 text-blue-400 border-blue-600/30";
    case "Pending": return "bg-amber-600/20 text-amber-400 border-amber-600/30";
    case "Cancelled": return "bg-destructive/20 text-destructive border-destructive/30";
    default: return "bg-muted/50 text-muted-foreground/60";
  }
}

/* ─── Page size ─── */
const PAGE_SIZE = 15;

export default function ARSTrackOrdersPage() {
  const { toast } = useToast();
  const { canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds } = useAdminAccess();
  const rawResellers = useUnifiedResellers();

  const allowedResellers = useMemo(() => {
    if (canSeeAll) return rawResellers;
    return rawResellers.filter(r => {
      const referredBy = r.referredBy; // This is the staff doc ID
      const memberOfAdminId = r.memberOfAdminId;
      return (referredBy && (
        allowedReferralIds.includes(String(referredBy)) || 
        allowedStaffIds.includes(String(referredBy)) || 
        allowedStaffDocIds.includes(String(referredBy))
      )) || (memberOfAdminId && allowedAdminIds.includes(memberOfAdminId));
    });
  }, [rawResellers, canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds]);

  const allowedResellerIds = useMemo(() => {
    const ids = new Set<string>();
    allowedResellers.forEach(r => {
      ids.add(String(r.id));
      if (r.resellerId) {
        ids.add(`1CR${r.resellerId}`);
      }
      ids.add(String(r.resellerId));
    });
    return ids;
  }, [allowedResellers]);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch orders from Firestore
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"), 
        orderBy("created_at", "desc"), 
        limit(300)
      );
      const snapshot = await getDocs(q);
      const fetchedOrders = snapshot.docs.map(doc => {
        const data = doc.data();
        const items = data.items || [];
        let statusStr = String(data.status || "Pending");
        statusStr = (statusStr || "").charAt(0).toUpperCase() + (statusStr || "").slice(1).toLowerCase();
        
        return {
          id: doc.id,
          orderId: data.orderId || "",
          resellerName: data.resellerName || "",
          resellerId: data.resellerId || "",
          resellerNumericId: data.resellerNumericId,
          staffUsername: data.staffUsername || "System",
          adminName: data.adminName || "System",
          productCount: items.length,
          itemCount: items.reduce((sum: number, i: OrderItem) => sum + (i.qty || 1), 0),
          totalCost: data.totalCost || data.total_cost || data.total_amount || 0,
          serviceCost: data.serviceCost || data.service_cost || 0,
          profit: data.profit || data.profits || 0,
          status: statusStr as OrderStatus,
          focused: data.focused || false,
          createdAt: data.createdAt || data.created_at,
          pickedUpAt: data.picked_up_at || data.pickedUpAt,
          completedAt: data.completed_at || data.completedAt,
          referralId: data.referralId,
          referredBy: data.referredBy,
          memberOfAdminId: data.memberOfAdminId,
        };
      });
      
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const intervalId = setInterval(fetchOrders, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchOrders]);

  const [search, setSearch] = useState("");
  const [resellerSearch, setResellerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [viewOrder, setViewOrder] = useState<OrderRecord | null>(null);

  /* ─── Filtering ─── */
  const filtered = useMemo(() => {
    let list = orders.filter((o) => {
      if (canSeeAll) return true;
      return allowedResellerIds.has(o.resellerId);
    });

    const enriched = list.map((o) => {
      const reseller = rawResellers.find(r => r.id === o.resellerId || r.resellerId?.toString() === o.resellerNumericId);
      
      let formattedId = 'N/A';
      if (reseller) {
        formattedId = `1CR${reseller.resellerId}`;
      } else {
        const fallbackId = o.resellerNumericId || o.resellerId;
        if (fallbackId) {
          const str = String(fallbackId);
          formattedId = str.startsWith('1CR') ? str : (/^\d+$/.test(str) ? `1CR${str}` : str);
        }
      }

      return {
        ...o,
        resellerName: reseller ? reseller.name : o.resellerName || 'N/A',
        resellerNumericId: formattedId
      };
    });
    list = enriched;

    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    if (resellerSearch.trim()) {
      const q = resellerSearch.toLowerCase();
      list = list.filter((o) => 
        (o.resellerId || "").toLowerCase().includes(q) || 
        (o.resellerNumericId && String(o.resellerNumericId).toLowerCase().includes(q)) ||
        (o.resellerName && String(o.resellerName).toLowerCase().includes(q))
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          (o.orderId || "").toLowerCase().includes(q) ||
          (o.resellerName || "").toLowerCase().includes(q) ||
          (o.staffUsername || "").toLowerCase().includes(q) ||
          (o.adminName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, search, resellerSearch, statusFilter, canSeeAll, allowedResellerIds, rawResellers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ─── Bulk selections ─── */
  const allPageSelected = paged.length > 0 && paged.every((o) => selectedIds.has(o.id));
  const toggleAll = () => {
    const next = new Set(selectedIds);
    if (allPageSelected) paged.forEach((o) => next.delete(o.id));
    else paged.forEach((o) => next.add(o.id));
    setSelectedIds(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  /* ─── Actions ─── */
  const archiveOrder = async (id: string) => {
    try {
      await updateDoc(doc(db, "orders", id), { status: "Archived" });
      toast({ title: "Order archived" });
    } catch (error) {
      toast({ title: "Failed to archive order", variant: "destructive" });
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const orderRef = doc(db, "orders", id);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const resellerId = orderData.resellerId || orderData.reseller_id;
        const totalCost = Number(orderData.totalCost || orderData.total_cost || orderData.total_amount || 0);
        
        // Update reseller pending balance
        if (resellerId) {
          const resellerRef = doc(db, "reseller_profiles", resellerId);
          const resellerSnap = await getDoc(resellerRef);
          if (resellerSnap.exists()) {
            const resellerData = resellerSnap.data();
            const currentPending = Number(resellerData.pending_balance || 0);
            await updateDoc(resellerRef, {
              pending_balance: +(currentPending - totalCost).toFixed(2)
            });
          }
        }
      }

      await deleteDoc(orderRef);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast({ title: "Order deleted and pending balance updated" });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({ title: "Failed to delete order", variant: "destructive" });
    }
  };

  const toggleFocus = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, "orders", id), { focused: !current });
      toast({ title: "Focus toggled" });
    } catch (error) {
      toast({ title: "Failed to toggle focus", variant: "destructive" });
    }
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      const orderRef = doc(db, "orders", id);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) {
        toast({ title: "Order not found", variant: "destructive" });
        return;
      }
      
      const orderData = orderSnap.data();
      const oldStatus = orderData.status;
      
      // If moving to Completed, update reseller balance
      if (status === "Completed" && oldStatus !== "Completed") {
        const resellerId = orderData.resellerId || orderData.reseller_id;
        const totalCost = Number(orderData.totalCost || orderData.total_cost || orderData.total_amount || 0);
        const profit = Number(orderData.profit || orderData.profits || 0);
        
        const resellerRef = doc(db, "reseller_profiles", resellerId);
        const resellerSnap = await getDoc(resellerRef);
        
        if (resellerSnap.exists()) {
          const resellerData = resellerSnap.data();
          const currentBalance = Number(resellerData.balance) || 0;
          const currentPending = Number(resellerData.pending_balance) || 0;
          const currentEarnings = Number(resellerData.total_earnings) || 0;
          
          await updateDoc(resellerRef, {
            balance: +(currentBalance + totalCost).toFixed(2),
            pending_balance: +(currentPending - totalCost).toFixed(2),
            total_earnings: +(currentEarnings + profit).toFixed(2)
          });
        }
      }

      const updateData: Record<string, unknown> = { status };
      if (status === "Completed" && oldStatus !== "Completed") {
        updateData.completed_at = new Date().toISOString();
      } else if (status === "Ongoing" && (oldStatus === "Pending" || oldStatus === "pending")) {
        updateData.picked_up_at = new Date().toISOString();
      }

      await updateDoc(orderRef, updateData);
      toast({ title: `Order marked as ${(status || "").toLowerCase()}` });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  /* Bulk actions */
  const bulkArchive = async () => {
    const promises = Array.from(selectedIds).map(id => updateDoc(doc(db, "orders", id), { status: "Archived" }));
    await Promise.all(promises);
    toast({ title: `${selectedIds.size} orders archived` });
    setSelectedIds(new Set());
  };

  const bulkDelete = async () => {
    const promises = Array.from(selectedIds).map(id => deleteDoc(doc(db, "orders", id)));
    await Promise.all(promises);
    toast({ title: `${selectedIds.size} orders deleted` });
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb / Header */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">ARS Management &gt; Track &amp; Manage Orders</p>
        <h1 className="text-2xl font-bold text-foreground">Track &amp; Manage Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor reseller orders, follow up on pending items, and manage the order lifecycle.
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order ID, Staff or Admin..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Reseller Search */}
        <div className="relative w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Reseller ID (e.g. 1CR25031)"
            className="pl-9 bg-background"
            value={resellerSearch}
            onChange={(e) => { setResellerSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[170px] bg-background">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Ongoing">Ongoing</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" onClick={bulkArchive}>
              <Archive className="h-4 w-4 mr-1" /> Archive
            </Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Reseller Subtotal Summary */}
      {resellerSearch.trim() && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-wrap gap-6 items-center">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Reseller Summary</span>
            <span className="text-sm font-medium">{resellerSearch.toUpperCase()}</span>
          </div>
          <div className="h-8 w-px bg-border hidden sm:block"></div>
          <div className="flex gap-6 flex-wrap">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Completed Orders</span>
              <span className="text-sm font-semibold text-emerald-600">{filtered.filter(o => o.status === 'Completed').length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Ongoing Orders</span>
              <span className="text-sm font-semibold text-blue-600">{filtered.filter(o => o.status === 'Ongoing').length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Pending Orders</span>
              <span className="text-sm font-semibold text-amber-600">{filtered.filter(o => o.status === 'Pending').length}</span>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Cost</span>
              <span className="text-sm font-semibold">${filtered.reduce((sum, o) => sum + o.totalCost, 0).toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Profit</span>
              <span className="text-sm font-semibold text-emerald-600">${filtered.reduce((sum, o) => sum + o.profit, 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAll}
                  className="rounded border-border"
                />
              </TableHead>
              <TableHead className="whitespace-nowrap">Order ID</TableHead>
              <TableHead className="whitespace-nowrap">Reseller ID</TableHead>
              <TableHead className="whitespace-nowrap">Reseller Name</TableHead>
              <TableHead className="whitespace-nowrap">Staff</TableHead>
              <TableHead className="whitespace-nowrap">Admin</TableHead>
              <TableHead className="whitespace-nowrap text-center">Products</TableHead>
              <TableHead className="whitespace-nowrap text-center">Counts</TableHead>
              <TableHead className="whitespace-nowrap text-right">Total Cost</TableHead>
              <TableHead className="whitespace-nowrap text-right">Service Cost</TableHead>
              <TableHead className="whitespace-nowrap text-right">Profits</TableHead>
              <TableHead className="whitespace-nowrap">Creation Date</TableHead>
              <TableHead className="whitespace-nowrap">Picked Up Date</TableHead>
              <TableHead className="whitespace-nowrap">Completed Date</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-12">
                  <LoadingSpinner size={32} />
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-12 text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((order) => (
                <TableRow
                  key={order.id}
                  className={order.focused ? "bg-primary/5 border-l-2 border-l-primary" : ""}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.id)}
                      onChange={() => toggleOne(order.id)}
                      className="rounded border-border"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {order.focused && <Star className="inline h-3 w-3 text-primary mr-1" />}
                    {order.orderId}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#009000] whitespace-nowrap">
                    {order.resellerNumericId || order.resellerId}
                  </TableCell>
                  <TableCell className="font-medium text-xs whitespace-nowrap">
                    {order.resellerName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{order.staffUsername}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{order.adminName}</TableCell>
                  <TableCell className="text-center">{order.productCount}</TableCell>
                  <TableCell className="text-center">{order.itemCount}</TableCell>
                  <TableCell className="text-right font-mono">${order.totalCost.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">${order.serviceCost.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-500">${order.profit.toFixed(2)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {order.pickedUpAt ? new Date(order.pickedUpAt).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {order.completedAt ? new Date(order.completedAt).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(order.status)} className={statusClass(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setViewOrder(order)}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleFocus(order.id, order.focused)}>
                          <Star className="h-4 w-4 mr-2" />
                          {order.focused ? "Remove Focus" : "Mark as Focus"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(order.id, "Completed")}>
                          <CheckCircle className="h-4 w-4 mr-2" /> Mark Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => updateStatus(order.id, "Cancelled")}>
                          <Trash2 className="h-4 w-4 mr-2" /> Cancel Order
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => archiveOrder(order.id)}>
                          <Archive className="h-4 w-4 mr-2" /> Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteOrder(order.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtered.length} orders total</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>Page {page} of {totalPages}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={(o) => !o && setViewOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Order Details — {viewOrder?.orderId}</DialogTitle>
          <DialogHeader>
            <DialogDescription>Full breakdown of order information.</DialogDescription>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-3 text-sm">
              <Row label="Reseller ID" value={String(viewOrder.resellerNumericId || viewOrder.resellerId)} />
              <Row label="Reseller Name" value={viewOrder.resellerName} />
              <Row label="Staff" value={viewOrder.staffUsername} />
              <Row label="Admin" value={viewOrder.adminName} />
              <Row label="Products" value={String(viewOrder.productCount)} />
              <Row label="Item Counts" value={String(viewOrder.itemCount)} />
              <Row label="Total Cost" value={`$${viewOrder.totalCost.toFixed(2)}`} />
              <Row label="Service Cost" value={`$${viewOrder.serviceCost.toFixed(2)}`} />
              <Row label="Profit" value={`$${viewOrder.profit.toFixed(2)}`} />
              <Row label="Status" value={viewOrder.status} />
              <Row label="Created" value={viewOrder.createdAt ? new Date(viewOrder.createdAt).toLocaleDateString() : "-"} />
              <Row label="Picked Up" value={viewOrder.pickedUpAt ? new Date(viewOrder.pickedUpAt).toLocaleDateString() : "-"} />
              <Row label="Completed" value={viewOrder.completedAt ? new Date(viewOrder.completedAt).toLocaleDateString() : "-"} />
              <Row label="Focus" value={viewOrder.focused ? "Yes ⭐" : "No"} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOrder(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
