import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, getDoc, doc } from "firebase/firestore";
import { useCustomerAuth } from "@/lib/customer-auth-context-hooks";
import {
  Package, ChevronRight, Truck, CheckCircle2, Clock, BoxIcon,
  RotateCcw, MessageCircle, HelpCircle, ChevronDown, ChevronUp,
  ShoppingBag, MapPin, CreditCard, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/cart-context-hooks";
import { useProducts } from "@/lib/products-context-hooks";
import { parseImageUrl } from "@/lib/utils";

/* ── order data ─────────────────────────────────────── */

interface OrderItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: "processing" | "confirmed" | "shipped" | "out_for_delivery" | "delivered";
  estimatedDelivery: string;
  items: OrderItem[];
  total: number;
  trackingNumber?: string;
}

const STATUS_STEPS = [
  { key: "processing", labelKey: "common.processing", icon: Clock },
  { key: "confirmed", labelKey: "common.confirmed", icon: BoxIcon },
  { key: "shipped", labelKey: "common.shipped", icon: Truck },
  { key: "out_for_delivery", labelKey: "common.outForDelivery", icon: MapPin },
  { key: "delivered", labelKey: "common.delivered", icon: CheckCircle2 },
] as const;

const statusIndex = (s: Order["status"]) =>
  STATUS_STEPS.findIndex((step) => step.key === s);

const statusVariant = (s: Order["status"]): "default" | "secondary" | "outline" => {
  if (s === "delivered") return "secondary";
  if (s === "shipped" || s === "out_for_delivery") return "default";
  return "outline";
};

/* ── component ────────────────────────────────────────────── */

export default function Orders() {
  const { t } = useTranslation();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const { toast } = useToast();
  const { addItem } = useCart();
  const { products } = useProducts();
  const { user } = useCustomerAuth();

  const statusLabel = (s: Order["status"]) => {
    const map: Record<Order["status"], string> = {
      processing: t("common.processing"),
      confirmed: t("common.confirmed"),
      shipped: t("common.shipped"),
      out_for_delivery: t("common.outForDelivery"),
      delivered: t("common.delivered"),
    };
    return map[s];
  };

  const { data: dbOrders = [], isLoading } = useQuery({
    queryKey: ["customer-orders", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("user_id", "==", user!.id)
        );
        const snapshot = await getDocs(q);

        const orders = snapshot.docs.map((orderDoc) => {
          const orderData = orderDoc.data();
          
          const items = (orderData.items || []).map((itemData: any) => ({
            id: String(itemData.product_id || itemData.productId || 'unknown'),
            name: String(itemData.name || 'Unknown Product'),
            image: parseImageUrl(itemData.image || 'https://picsum.photos/seed/placeholder/100/100'),
            price: Number(itemData.price_at_time || itemData.price || 0),
            quantity: Number(itemData.quantity || itemData.qty || 1),
          }));

          let status: Order["status"] = "processing";
          const dbStatus = String(orderData.status || "").toLowerCase();
          if (dbStatus === "shipped") status = "shipped";
          else if (dbStatus === "delivered" || dbStatus === "completed") status = "delivered";
          else if (dbStatus === "cancelled") status = "processing"; // fallback

          const createdAt = orderData.created_at?.toDate ? orderData.created_at.toDate() :
                            orderData.createdAt?.toDate ? orderData.createdAt.toDate() :
                            new Date(orderData.created_at || orderData.createdAt || Date.now());

          return {
            id: orderDoc.id,
            orderNumber: orderData.orderId || `ORD-${orderDoc.id.substring(0, 8).toUpperCase()}`,
            date: createdAt.toLocaleDateString(),
            status,
            estimatedDelivery: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            items,
            total: Number(orderData.total_amount || orderData.totalCost || orderData.total_cost || 0),
            trackingNumber: orderData.tracking_number || undefined,
            createdAtTime: createdAt.getTime(),
          } as Order & { createdAtTime: number };
        });
        
        // Sort explicitly by date descending locally to skip composite index dependency
        orders.sort((a, b) => b.createdAtTime - a.createdAtTime);
        
        return orders;
      } catch (error) {
        console.error("Error fetching customer orders:", error);
        return [];
      }
    }
  });

  const toggle = (id: string) => setExpandedOrder((prev) => (prev === id ? null : id));

  const handleReorder = (order: Order) => {
    order.items.forEach((item) => {
      const found = products.find((p) => p.id === item.id);
      if (found) addItem(found, item.quantity);
    });
    toast({ 
      title: t("common.itemsAddedToCart"), 
      description: t("common.itemsAddedToCartDesc", { count: order.items.length, orderNumber: order.orderNumber }) 
    });
  };

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">{t("common.home")}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/account" className="hover:text-foreground transition-colors">{t("common.myAccount")}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{t("common.orders")}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-12 md:px-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("common.myOrders")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("common.trackManageReorder")}</p>

        {/* Orders list */}
        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">{t("common.loadingOrders")}</div>
          ) : dbOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t("common.noOrdersYet")}</div>
          ) : (
            dbOrders.map((order) => {
              const expanded = expandedOrder === order.id;
              const currentIdx = statusIndex(order.status);
              const progressValue = ((currentIdx + 1) / STATUS_STEPS.length) * 100;

            return (
              <div key={order.id} className="rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm">
                {/* ── Order Header ── */}
                <button
                  onClick={() => toggle(order.id)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 md:px-6 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{order.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-bold text-foreground">${order.total.toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {order.status === "delivered"
                          ? t("common.delivered")
                          : `${t("common.estimatedDelivery")}: ${order.estimatedDelivery}`}
                      </p>
                    </div>
                    <Badge variant={statusVariant(order.status)} className="text-[10px]">
                      {statusLabel(order.status)}
                    </Badge>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* ── Expanded content ── */}
                {expanded && (
                  <div className="border-t border-border px-4 pb-5 pt-4 md:px-6 space-y-6">
                    {/* Status line */}
                    <div className="text-sm font-medium text-foreground">
                      {statusLabel(order.status)} — {t("common.estimatedDelivery")}: {order.estimatedDelivery}
                      {order.trackingNumber && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {t("common.tracking")}: {order.trackingNumber}
                        </span>
                      )}
                    </div>

                    {/* ── Visual Progress Tracker ── */}
                    <div>
                      <Progress value={progressValue} className="h-2 mb-3" />
                      <div className="flex justify-between">
                        {STATUS_STEPS.map((step, i) => {
                          const done = i <= currentIdx;
                          const StepIcon = step.icon;
                          return (
                            <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                                  done
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <StepIcon className="h-4 w-4" />
                              </div>
                              <span className={`text-[10px] text-center leading-tight ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                {t(step.labelKey)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Items Summary ── */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">{t("common.itemsCount", { count: order.items.length })}</h3>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                            <img 
                              src={parseImageUrl(item.image) || "/placeholder.svg"} 
                              alt={item.name} 
                              className="h-14 w-14 rounded-lg object-cover shrink-0" 
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{t("common.qty")}: {item.quantity}</p>
                            </div>
                            <p className="text-sm font-bold text-foreground shrink-0">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Shipping & Payment Info ── */}
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{t("common.shippingPayment")}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t("common.usedDefaultInfo")}
                          </p>
                          <Link to="/account" className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
                            {t("common.viewEditProfileSettings")} →
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* ── Support & Actions ── */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">{t("common.supportActions")}</h3>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 justify-start text-xs"
                          onClick={() => handleReorder(order)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> {t("common.reorderItems")}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 justify-start text-xs"
                          onClick={() => window.dispatchEvent(new CustomEvent('open-support-chat'))}
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> {t("common.contactSupport")}
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 justify-start text-xs" asChild>
                          <a href="#faq">
                            <HelpCircle className="h-3.5 w-3.5" /> {t("common.faqs")}
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }))}
        </div>

        {/* ── FAQ Section ── */}
        <div id="faq" className="mt-10">
          <h2 className="text-lg font-bold text-foreground">{t("common.frequentlyAskedQuestions")}</h2>
          <Separator className="my-3" />
          <div className="space-y-3">
            {[
              { q: t("common.faqTrackOrderQ"), a: t("common.faqTrackOrderA") },
              { q: t("common.faqCancelModifyQ"), a: t("common.faqCancelModifyA") },
              { q: t("common.faqReturnPolicyQ"), a: t("common.faqReturnPolicyA") },
              { q: t("common.faqDeliveryTimeQ"), a: t("common.faqDeliveryTimeA") },
            ].map((faq) => (
              <details key={faq.q} className="group rounded-lg border border-border bg-card">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-foreground">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-3 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
