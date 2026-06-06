import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/lib/cart-context-hooks";
import { useTranslation } from "react-i18next";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ShieldCheck, Truck, RotateCcw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@/components/ui/separator";
import { parseImageUrl } from "@/lib/utils";
import { useCustomerAuth } from "@/lib/customer-auth-context-hooks";
import { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs, limit, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { LEVEL_PROFIT_MAP } from "@/lib/reseller-context-hooks";
import ResellerChatDialog from "@/components/messaging/ResellerChatDialog";

export default function Cart() {
  const { t } = useTranslation();
  const { items, totalPrice, totalItems, resellerId, removeItem, updateQuantity, clearCart } = useCart();
  const { user, isAuthenticated } = useCustomerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [resellerName, setResellerName] = useState("");
  const [activeResellerId, setActiveResellerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchResellerData = async () => {
      let targetId = resellerId;
      
      // If no reseller in cart, pick a random one
      if (!targetId) {
        try {
          const shopsQuery = query(collection(db, "retail_shops"), limit(10));
          const shopsSnap = await getDocs(shopsQuery);
          if (!shopsSnap.empty) {
            // Pick a random one from the first 10
            const randomIndex = Math.floor(Math.random() * shopsSnap.docs.length);
            const randomShop = shopsSnap.docs[randomIndex];
            targetId = randomShop.id;
            setResellerName(randomShop.data().shop_name || "Seller");
          }
        } catch (error) {
          console.error("Error fetching random reseller:", error);
        }
      }

      if (targetId) {
        setActiveResellerId(targetId);
        
        // If we already set the name from random pick, skip fetching
        if (resellerName && !resellerId) return;

        try {
          const resellerRef = doc(db, "retail_shops", targetId);
          const resellerSnap = await getDoc(resellerRef);
          if (resellerSnap.exists()) {
            setResellerName(resellerSnap.data().shop_name || "Seller");
          } else {
            // Fallback to reseller_profiles
            const profileRef = doc(db, "reseller_profiles", targetId);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
              setResellerName(profileSnap.data().shop_name || "Seller");
            }
          }
        } catch (error) {
          console.error("Error fetching reseller name:", error);
        }
      }
    };
    fetchResellerData();
  }, [resellerId, resellerName]);

  const taxRate = 0.08;
  const subtotal = totalPrice;
  const tax = subtotal * taxRate;
  const shipping = subtotal > 50 ? 0 : 4.99;
  const total = subtotal + tax + shipping;

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast({
        title: t('common.loginRequired'),
        description: t('common.loginToCheckout'),
        variant: "destructive",
      });
      navigate("/cart/login");
      return;
    }

    if (items.length === 0) return;

    setIsCheckingOut(true);
    try {
      let serviceCost = subtotal;
      let profitMargin = 0.15;
      let resellerData = null;

      // 1. If there's a resellerId, calculate the service cost (original price)
      let staffUsername = "Direct";
      let adminUsername = "Main Company";
      let referralId = "";
      let memberOfAdminId = "";
      let humanResellerId = "";

      if (resellerId) {
        const resellerRef = doc(db, "reseller_profiles", resellerId);
        const resellerSnap = await getDoc(resellerRef);
        if (resellerSnap.exists()) {
          resellerData = resellerSnap.data();
          const level = resellerData.level || "VIP-0";
          profitMargin = LEVEL_PROFIT_MAP[level] || 0.15;
          // The totalPrice in cart is already adjusted (price * (1 + profitMargin))
          // So serviceCost = totalPrice / (1 + profitMargin)
          serviceCost = subtotal / (1 + profitMargin);
          
          referralId = resellerData.referred_by_staff_id || "";
          memberOfAdminId = resellerData.member_of_admin_id || "";
          humanResellerId = resellerData.reseller_id ? `1CR${resellerData.reseller_id}` : resellerId;

          // Fetch staff/admin names
          if (referralId) {
            const staffSnap = await getDoc(doc(db, "sla_staff", referralId));
            if (staffSnap.exists()) {
              staffUsername = staffSnap.data().username || staffSnap.data().name || "Staff";
              if (!memberOfAdminId) memberOfAdminId = staffSnap.data().created_by_admin_id || "";
            }
          }
          if (memberOfAdminId) {
            const adminSnap = await getDoc(doc(db, "sla_admins", memberOfAdminId));
            if (adminSnap.exists()) {
              adminUsername = adminSnap.data().name || adminSnap.data().username || "Admin";
            }
          }
        }
      }

      const profit = total - serviceCost;

      // 2. Create order document
      const orderData = {
        user_id: user?.id,
        reseller_id: resellerId,
        resellerId: humanResellerId || resellerId,
        reseller_uid: resellerId,
        resellerName: resellerData?.shop_name || resellerData?.shopName || resellerName || "Direct",
        staffUsername,
        adminUsername,
        referralId,
        memberOfAdminId,
        customerName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Unknown',
        customerEmail: user?.email || '',
        total_amount: total,
        total_cost: total,
        totalCost: total,
        service_cost: serviceCost,
        serviceCost: serviceCost,
        profits: profit,
        profit: profit,
        subtotal: subtotal,
        tax: tax,
        shipping: shipping,
        status: "Pending",
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        order_number: `ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        orderId: `ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        items_count: items.reduce((acc, item) => acc + item.quantity, 0),
        products_count: items.length,
        profileName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Unknown',
        items: items.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          image: item.product.image,
          price: item.product.price / (1 + profitMargin),
          adjustedPrice: item.product.price,
          qty: item.quantity
        }))
      };

      const orderRef = await addDoc(collection(db, "orders"), orderData);

      // Send push notification to reseller if applicable
      if (resellerId) {
        fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: resellerId,
            title: `New Order Received!`,
            body: `A customer placed a new order ${orderData.orderId} for $${total.toFixed(2)}`,
            data: {
              type: 'order',
              orderId: orderData.orderId
            }
          })
        }).catch(err => console.error("[FCM] Failed to send push notification:", err));
      }

      // 3. Update Reseller Balance if applicable
      if (resellerId && resellerData) {
        const resellerRef = doc(db, "reseller_profiles", resellerId);
        const currentUnpicked = Number(resellerData.unpicked_balance || 0);
        const currentTotalOrders = resellerData.total_orders || 0;

        await updateDoc(resellerRef, {
          unpicked_balance: currentUnpicked + total,
          total_orders: currentTotalOrders + 1,
          updated_at: new Date().toISOString()
        });
      }

      // 4. Create order items in subcollection
      const itemPromises = items.map(item => 
        addDoc(collection(db, "orders", orderRef.id, "order_items"), {
          product_id: item.product.id,
          name: item.product.name,
          price_at_time: item.product.price / (1 + profitMargin), // Original price
          adjusted_price: item.product.price, // Price shown to customer
          quantity: item.quantity,
          image: item.product.image,
        })
      );

      await Promise.all(itemPromises);

      toast({
        title: t('common.orderPlaced'),
        description: t('common.orderPlacedDesc'),
      });

      clearCart();
      navigate("/account/orders");
    } catch (error) {
      console.error("Checkout error:", error);
      handleFirestoreError(error, OperationType.CREATE, "orders");
      toast({
        title: t('common.error'),
        description: t('common.checkoutFailed'),
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <ShoppingBag className="h-20 w-20 text-muted-foreground/40 mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-2">{t('common.emptyCart')}</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          {t('common.emptyCartDesc')}
        </p>
        <Link to="/">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('common.continueShopping')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {t('common.shoppingCart')} <span className="text-muted-foreground text-lg font-normal">({t('common.itemsCount', { count: totalItems })})</span>
        </h1>
        <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive hover:bg-destructive/10">
          {t('common.clearCart')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const discount = item.product.originalPrice
              ? Math.round(((item.product.originalPrice - item.product.price) / item.product.originalPrice) * 100)
              : 0;

            return (
              <div key={item.product.id} className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                {/* Image */}
                <Link to={`/products/${item.product.id}`} className="flex-shrink-0">
                  <img
                    src={parseImageUrl(item.product.image) || "/placeholder.svg"}
                    alt={item.product.name}
                    className="h-24 w-24 md:h-28 md:w-28 rounded-lg object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                </Link>

                {/* Details */}
                <div className="flex flex-1 flex-col min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/products/${item.product.id}`} className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-2">
                        {item.product.name}
                      </Link>
                      {item.product.seller && (
                        <p className="text-xs text-muted-foreground mt-0.5">{t('common.seller')}: {item.product.seller}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-auto flex items-end justify-between pt-3">
                    {/* Price */}
                    <div>
                      <span className="text-lg font-bold text-primary">${item.product.price.toFixed(2)}</span>
                      {item.product.originalPrice && (
                        <>
                          <span className="ml-2 text-sm text-muted-foreground line-through">${item.product.originalPrice.toFixed(2)}</span>
                          <span className="ml-1.5 text-xs font-semibold text-destructive">-{discount}%</span>
                        </>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-0 rounded-lg border border-border overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="flex h-8 w-10 items-center justify-center text-sm font-semibold border-x border-border bg-background">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-foreground">{t('common.orderSummary')}</h2>
            <Separator />

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('common.subtotal')} ({t('common.itemsCount', { count: totalItems })})</span>
                <span className="font-medium text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('common.shipping')}</span>
                <span className={`font-medium ${shipping === 0 ? "text-primary" : "text-foreground"}`}>
                  {shipping === 0 ? t('common.free') : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('common.tax')} (8%)</span>
                <span className="font-medium text-foreground">${tax.toFixed(2)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-base font-bold">
              <span className="text-foreground">{t('common.total')}</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>

            {shipping > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {t('common.addMoreForFreeShipping', { amount: (50 - subtotal).toFixed(2) })}
              </p>
            )}

            <Button 
              className="w-full text-base font-bold h-12"
              onClick={handleCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <>
                  <LoadingSpinner size={16} className="mr-2" />
                  {t('common.processing')}
                </>
              ) : (
                t('common.proceedToCheckout')
              )}
            </Button>

            <Button 
              variant="outline" 
              className="w-full gap-2 border-primary text-primary hover:bg-primary/5"
              onClick={() => {
                if (!isAuthenticated) {
                  toast({
                    title: t('common.loginRequired'),
                    description: t('common.loginToChat'),
                    variant: "destructive",
                  });
                  navigate("/cart/login");
                  return;
                }
                setIsChatOpen(true);
              }}
            >
              <MessageSquare className="h-4 w-4" />
              {t('common.talkWithSeller')}
            </Button>

            <Link to="/" className="block">
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('common.continueShopping')}
              </Button>
            </Link>

            {/* Trust badges */}
            <Separator />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="text-[10px] text-muted-foreground leading-tight">{t('common.secureCheckout')}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Truck className="h-5 w-5 text-primary" />
                <span className="text-[10px] text-muted-foreground leading-tight">{t('common.fastDelivery')}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RotateCcw className="h-5 w-5 text-primary" />
                <span className="text-[10px] text-muted-foreground leading-tight">{t('common.easyReturns')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeResellerId && user && (
        <ResellerChatDialog
          open={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          customerId={user.id}
          customerName={`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Customer'}
          resellerId={activeResellerId}
          resellerName={resellerName || "Seller"}
        />
      )}
    </div>
  );
}
