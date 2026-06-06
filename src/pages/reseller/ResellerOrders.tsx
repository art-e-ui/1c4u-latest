import { useState, useEffect, useCallback, useMemo } from "react";
import { useReseller } from "@/lib/reseller-context-hooks";
import { useNavigate, useLocation } from "react-router-dom";
import { resellerPath } from "@/lib/subdomain";
import { Package, ShoppingCart, CreditCard, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
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
    },
    operationType,
    path
  };
  console.error('[FIRESTORE_ERROR]', JSON.stringify(errInfo));
  return errInfo;
}
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, getDocs, or, FirestoreError } from "firebase/firestore";
import { Order, OrderStatus, OrderItem } from "@/lib/types";
import { LucideIcon } from "lucide-react";
import { parseImageUrl } from "@/lib/utils";
import { useUpdateOrderStatus } from "@/hooks/use-orders";
import { useTranslation } from "react-i18next";

type FilterTab = "All" | "Pending" | "Ongoing" | "Completed";

export default function ResellerOrders() {
  const { reseller, updateProfile } = useReseller();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<FilterTab>(location.state?.tab || "All");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const updateStatusMutation = useUpdateOrderStatus();

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon | typeof LoadingSpinner }> = {
    Pending: { label: t("reseller.pending"), color: "bg-warning/15 text-warning", icon: Clock },
    Ongoing: { label: t("reseller.ongoing"), color: "bg-info/15 text-info", icon: LoadingSpinner },
    Completed: { label: t("reseller.completed"), color: "bg-success/15 text-success", icon: CheckCircle },
    Cancelled: { label: t("reseller.cancelled"), color: "bg-destructive/15 text-destructive", icon: Package },
  };

  const TABS: FilterTab[] = ["All", "Pending", "Ongoing", "Completed"];

  // Subscribe to orders in real-time
  useEffect(() => {
    if (!reseller?.id) return;

    setLoading(true);
    
    const conditions = [
      where("reseller_id", "==", reseller.id),
      where("resellerId", "==", reseller.id),
      where("reseller_uid", "==", reseller.id),
    ];

    const q = query(
      collection(db, "orders"),
      or(...conditions)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => {
        const data = doc.data();
        let statusStr = data.status || "Pending";
        // Normalize status string to start with capital letter for UI consistency
        statusStr = (statusStr || "").charAt(0).toUpperCase() + (statusStr || "").slice(1).toLowerCase();
        
        return {
          id: doc.id,
          orderId: data.orderId || data.order_number || doc.id,
          resellerId: data.resellerId || data.reseller_id,
          resellerName: data.resellerName,
          items: data.items || [],
          totalCost: Number(data.totalCost || data.total_cost || data.total_amount || 0),
          serviceCost: Number(data.serviceCost || data.service_cost || 0),
          profit: Number(data.profit || data.profits || 0),
          status: statusStr as OrderStatus,
          createdAt: data.createdAt || data.created_at,
          shippingAddress: data.shippingAddress || data.shipping_address,
          profileName: data.profileName || data.customerName || "Unknown"
        } as Order;
      });
      
      // Sort by date descending
      fetchedOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error: FirestoreError) => {
      const errInfo = handleFirestoreError(error, OperationType.LIST, "orders");
      setLoading(false);
      toast.error(`Sync Fail: ${error.code}. ${error.message.split('\n')[0]}`);
    });

    return () => unsubscribe();
  }, [reseller?.id, reseller?.resellerId, t]);

  const usableBalance = reseller ? reseller.balance - (reseller.guaranteeBalance ?? 0) : 0;

  const handlePickUp = async (order: Order) => {
    if (!reseller) return;
    
    if (usableBalance < order.serviceCost) {
      toast.error(t("reseller.insufficientBalanceOrder"), {
        duration: 3000,
      });
      setTimeout(() => navigate(resellerPath("/reseller/profile")), 1500);
      return;
    }

    try {
      // Use the centralized status update mutation which also handles balance transfers
      await updateStatusMutation.mutateAsync({ 
        orderId: order.id, 
        status: "Ongoing"
      });

      toast.success(t("reseller.orderPickedUp"), {
        description: `$${order.serviceCost.toFixed(2)} ${t("reseller.deductedFromBalance")}. $${order.totalCost.toFixed(2)} ${t("reseller.addedToPendingBalance")}.`,
      });
    } catch (error) {
      console.error("Error picking up order:", error);
      toast.error(t("reseller.failedToPickUpOrder"));
    }
  };

  const filtered = useMemo(() => {
    if (activeTab === "All") return orders;
    return orders.filter(o => o.status === activeTab);
  }, [orders, activeTab]);

  if (!reseller) return null;

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t("reseller.orders")}</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "All" ? t("common.all") : t(`reseller.${tab.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {/* Order cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <LoadingSpinner size={32} />
            <p className="text-sm mt-2">{t("reseller.loadingOrders")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card/40 rounded-3xl border border-dashed border-border">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{t("reseller.noOrdersFound", { status: activeTab !== "All" ? t(`reseller.${activeTab.toLowerCase()}`).toLowerCase() : "" })}</p>
          </div>
        ) : (
          filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;
            const StatusIcon = cfg.icon;
            const totalItems = (order.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);

            return (
              <div
                key={order.id}
                className="rounded-3xl border border-border bg-card/60 backdrop-blur-md p-4 space-y-4 shadow-sm"
              >
                {/* Header: ID + Status */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono font-bold text-muted-foreground">{order.orderId}</p>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1 rounded-full ${cfg.color}`}>
                    <StatusIcon size={12} />
                    {cfg.label}
                  </span>
                </div>

                {/* Product thumbnails */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {(order.items || []).map((item, i) => (
                    <div key={i} className="relative flex-shrink-0">
                      <img
                        src={parseImageUrl(item.image) || "https://placehold.co/100x100?text=No+Image"}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image";
                        }}
                        className="h-16 w-16 rounded-2xl object-cover border border-border"
                      />
                      {(item.qty || 0) > 1 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold h-4 w-4 flex items-center justify-center rounded-full border border-background">
                          {item.qty}
                        </span>
                      )}
                    </div>
                  ))}
                  {(!order.items || order.items.length === 0) && (
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center border border-border">
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Order Info */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/50 pb-3">
                  <div className="flex gap-3">
                    <span>{(order.items || []).length} {t("reseller.products")}</span>
                    <span>{totalItems} {t("reseller.itemsTotal")}</span>
                  </div>
                </div>

                {/* Financial breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-semibold">{t("reseller.totalCost")}</p>
                    <p className="text-sm font-bold text-foreground">${order.totalCost.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-semibold">{t("reseller.serviceCost")}</p>
                    <p className="text-sm font-bold text-destructive">${order.serviceCost.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-semibold">{t("reseller.profits")}</p>
                    <p className="text-sm font-bold text-success">${order.profit.toFixed(2)}</p>
                  </div>
                </div>

                {/* Pick up button */}
                {order.status === "Pending" && (
                  <button
                    onClick={() => handlePickUp(order)}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-bold py-3 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]"
                  >
                    {t("reseller.pickUp")}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
