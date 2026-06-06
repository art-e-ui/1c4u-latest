import React, { useState, useEffect, useMemo } from "react";
import { 
  Store, User, ShoppingCart, Package, Trash2, Plus, Minus, Users, Circle, Search
} from "lucide-react";
import { LEVEL_PROFIT_MAP } from "@/lib/reseller-context-hooks";
import { STATIC_VIRTUAL_PROFILES } from "@/data/virtualProfiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger 
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import { useDbProducts } from "@/hooks/use-db-products";
import type { Product, Reseller } from "@/lib/types";
import { useUnifiedResellers } from "@/lib/unified-hooks";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { db } from "@/lib/firebase";
import { 
  collection, query, onSnapshot, addDoc, updateDoc, doc, getDoc, getDocs, where
} from "firebase/firestore";
import { cn } from "@/lib/utils";
import { handleFirestoreError, OperationType } from "@/lib/firebase";
import { useAdminAuth } from "@/lib/admin-auth-context-hooks";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface VirtualProfile {
  id: string;
  name: string;
  avatar?: string;
}

export default function VirtualOrderServicesPage() {
  const location = useLocation();
  const { data: dbProducts = [] } = useDbProducts();
  const resellers = useUnifiedResellers();
  
  const [virtualProfiles, setVirtualProfiles] = useState<VirtualProfile[]>(STATIC_VIRTUAL_PROFILES as VirtualProfile[]);
  const [selectedVirtualProfile, setSelectedVirtualProfile] = useState<VirtualProfile | null>(STATIC_VIRTUAL_PROFILES[0] as VirtualProfile);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(location.state?.reseller || null);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [resellerSearch, setResellerSearch] = useState("");
  const { user } = useAdminAuth();
  const { canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds } = useAdminAccess();

  const filteredResellers = useMemo(() => {
    let list = resellers || [];
    if (!canSeeAll) {
      list = list.filter((r) => 
        (r.referredBy && (
          allowedStaffIds.includes(String(r.referredBy)) || 
          allowedReferralIds.includes(String(r.referredBy)) ||
          allowedStaffDocIds.includes(String(r.referredBy))
        )) ||
        (r.memberOfAdminId && allowedAdminIds.includes(String(r.memberOfAdminId)))
      );
    }
    if (resellerSearch.trim()) {
      const q = resellerSearch.toLowerCase();
      list = list.filter(r => 
        r.firstName.toLowerCase().includes(q) ||
        r.lastName.toLowerCase().includes(q) ||
        r.shopName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.resellerId?.toString().includes(q)
      );
    }
    return list;
  }, [resellers, canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds, resellerSearch]);

  useEffect(() => {
    const q = query(collection(db, "reseller_chat_sessions"), where("is_online", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const status: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.reseller_id) {
          status[data.reseller_id] = data.is_online || false;
        }
      });
      setOnlineStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Fetch selected products for the selected reseller
  useEffect(() => {
    if (!selectedReseller) {
      setSelectedProductIds([]);
      return;
    }

    const fetchSelection = async () => {
      try {
        const q = query(
          collection(db, "reseller_product_selection"),
          where("reseller_id", "==", selectedReseller.id)
        );
        const snapshot = await getDocs(q);
        const ids = snapshot.docs.map(doc => doc.data().product_id);
        console.log(`[VIRTUAL_ORDER] Fetched ${ids.length} selected products for reseller ${selectedReseller.id}`);
        setSelectedProductIds(ids);
      } catch (error) {
        console.error("Error fetching reseller product selection:", error);
      }
    };

    fetchSelection();
  }, [selectedReseller]);

  // Fetch Virtual Profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      setVirtualProfiles(STATIC_VIRTUAL_PROFILES);
      if (!selectedVirtualProfile) setSelectedVirtualProfile(STATIC_VIRTUAL_PROFILES[0]);
    };
    fetchProfiles();
  }, [selectedVirtualProfile]);

  // Set initial selected reseller if not passed from navigation
  useEffect(() => {
    if (resellers.length > 0 && !selectedReseller) {
      setSelectedReseller(resellers[0]);
    }
  }, [resellers, selectedReseller]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, image: product.image }];
    });
    toast.success(`Added ${product.name} to order`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmitOrder = async () => {
    if (!selectedReseller) {
      toast.error("Please select a reseller first");
      return;
    }
    if (cart.length === 0) {
      toast.error("Order is empty");
      return;
    }
    if (!selectedVirtualProfile) {
      toast.error("Please select a virtual profile first");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Fetch reseller data to get referral info and current balance
      const resellerDoc = await getDoc(doc(db, "reseller_profiles", selectedReseller.id));
      const resellerData = resellerDoc.exists() ? resellerDoc.data() : null;

      // Generate a more unique Order ID
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const orderId = `VO-${timestamp}${random}`;
      
      const level = selectedReseller.level || 'VIP-0';
      const profitMargin = LEVEL_PROFIT_MAP[level] || 0.15;
      
      const serviceCost = Number(total.toFixed(2));
      const totalCost = Number((total * (1 + profitMargin)).toFixed(2));
      const profit = Number((totalCost - serviceCost).toFixed(2));

      // 2. Save to Firestore
      const orderData = {
        orderId,
        user_id: selectedVirtualProfile.id,
        customerName: selectedVirtualProfile.name,
        profileName: selectedVirtualProfile.name,
        resellerName: `${selectedReseller.firstName} ${selectedReseller.lastName}`,
        resellerId: selectedReseller.id,
        reseller_id: selectedReseller.id,
        resellerNumericId: selectedReseller.resellerId || resellerData?.reseller_id || 0,
        staffUsername: selectedReseller.staffName || "System",
        adminName: selectedReseller.adminMember || "System",
        total_amount: totalCost,
        totalCost: totalCost,
        total_cost: totalCost,
        serviceCost: serviceCost,
        service_cost: serviceCost,
        profit: profit,
        profits: profit,
        status: "Pending",
        focused: false,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        shippingAddress: "Virtual Address",
        referralId: selectedReseller.referralId || resellerData?.referral_id || "",
        referredBy: resellerData?.referred_by_staff_id || resellerData?.referredBy || "",
        memberOfAdminId: resellerData?.member_of_admin_id || resellerData?.memberOfAdminId || "",
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          image: item.image,
          price: item.price,
          qty: item.quantity
        }))
      };

      const orderRef = await addDoc(collection(db, "orders"), orderData);

      // Send push notification to reseller
      fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedReseller.id,
          title: `New Order Received!`,
          body: `You have a new order ${orderId} for $${totalCost.toFixed(2)}`,
          data: {
            type: 'order',
            orderId: orderId
          }
        })
      }).catch(err => console.error("[FCM] Failed to send push notification:", err));

      // 3. Create order_items subcollection
      for (const item of cart) {
        await addDoc(collection(db, "orders", orderRef.id, "order_items"), {
          product_id: item.id,
          name: item.name,
          price_at_time: item.price,
          adjusted_price: Number((item.price * (1 + profitMargin)).toFixed(2)),
          quantity: item.quantity,
          image: item.image,
          created_at: new Date().toISOString()
        });
      }

      // 4. Update Reseller Balance and Stats
      const resellerRef = doc(db, "reseller_profiles", selectedReseller.id);
      const currentUnpicked = Number(resellerData?.unpicked_balance || 0);
      const currentTotalOrders = Number(resellerData?.total_orders || 0);

      await updateDoc(resellerRef, {
        unpicked_balance: currentUnpicked + totalCost,
        total_orders: currentTotalOrders + 1,
        updated_at: new Date().toISOString()
      });

      toast.success(`Order ${orderId} submitted successfully to ${selectedReseller.firstName}`);
      setCart([]);
    } catch (error) {
      console.error("Error submitting order:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, "orders");
      } catch (e) {
        toast.error("Failed to submit order. Check console for details.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-background">
      {/* Header Widget */}
      <div className="border-b p-2 flex justify-between items-center bg-card">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" /> Virtual Order
        </h1>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                {selectedVirtualProfile ? `Acting as: ${selectedVirtualProfile.name}` : "Select Virtual Profile"}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Select Virtual Profile</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-2 max-h-[80vh] overflow-y-auto">
                {virtualProfiles.map(profile => (
                  <Button 
                    key={profile.id} 
                    variant={selectedVirtualProfile?.id === profile.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedVirtualProfile(profile)}
                  >
                    {profile.name} ({profile.id})
                  </Button>
                ))}
                {virtualProfiles.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">No virtual profiles found.</div>
                )}
              </div>
            </SheetContent>
          </Sheet>
          <Button 
            onClick={handleSubmitOrder} 
            disabled={cart.length === 0 || submitting}
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Order"}
          </Button>
        </div>
      </div>

      {/* Main Layout: 1.5 : 4 : 4 */}
      <div className="flex-1 grid grid-cols-[1.5fr_4fr_4fr] overflow-hidden">
        
        {/* Left Panel: Reseller Profiles (1.5) */}
        <div className="border-r p-0 flex flex-col bg-muted/30 overflow-hidden">
          <div className="p-4 border-b bg-card space-y-3">
            <h2 className="font-semibold flex items-center gap-2 text-primary">
              <Users className="h-4 w-4" /> Reseller Profiles
            </h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resellers..."
                value={resellerSearch}
                onChange={(e) => setResellerSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredResellers.map(reseller => {
              const isOnline = onlineStatus[reseller.id] || false;
              return (
                <Button 
                  key={reseller.id} 
                  variant={selectedReseller?.id === reseller.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start text-left h-auto py-3 px-3 gap-3 relative",
                    selectedReseller?.id === reseller.id && "bg-accent"
                  )}
                  onClick={() => setSelectedReseller(reseller)}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {(reseller.firstName || "U").charAt(0)}
                    </div>
                    <Circle className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3",
                      isOnline ? "fill-emerald-500 text-emerald-500" : "fill-muted text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{reseller.firstName} {reseller.lastName}</div>
                    <div className="text-[10px] opacity-70 truncate">{reseller.shopName || "No Shop Name"}</div>
                    <div className={cn(
                      "text-[10px] font-medium mt-0.5",
                      isOnline ? "text-emerald-600" : "text-muted-foreground"
                    )}>
                      {isOnline ? "Online" : "Offline"}
                    </div>
                  </div>
                </Button>
              );
            })}
            {resellers.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">No resellers found.</div>
            )}
          </div>
        </div>

        {/* Middle Panel: Order Submitting Panel (4) */}
        <div className="border-r flex flex-col bg-background overflow-hidden">
          {selectedReseller && (
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {(selectedReseller.firstName || "U").charAt(0)}
                  </div>
                  <Circle className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5",
                    onlineStatus[selectedReseller.id] ? "fill-emerald-500 text-emerald-500" : "fill-muted text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedReseller.firstName} {selectedReseller.lastName}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {selectedReseller.shopName || "No Shop Name"}
                    <span className={cn(
                      "ml-1 font-medium",
                      onlineStatus[selectedReseller.id] ? "text-emerald-600" : ""
                    )}>
                      · {onlineStatus[selectedReseller.id] ? "Online" : "Offline"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" /> Order Details
            </h2>
            <span className="text-sm font-bold text-primary">Total: ${total.toFixed(2)}</span>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <ShoppingCart className="h-12 w-12 mb-2" />
                <p>No items in order</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-sm transition-shadow">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border rounded-md">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t bg-muted/5">
            {/* Button moved to header */}
          </div>
        </div>

        {/* Right Panel: Product Panel (4) */}
        <div className="p-4 space-y-4 bg-muted/10 overflow-y-auto">
          <h2 className="font-semibold flex items-center gap-2 text-primary">
            <Store className="h-4 w-4" /> Product Catalog
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {dbProducts
              .filter(p => selectedProductIds.includes(p.id))
              .map((product) => (
              <Card key={product.id} className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer group" onClick={() => addToCart(product)}>
                <div className="relative aspect-square">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Plus className="text-white h-8 w-8" />
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-bold truncate">{product.name}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs font-mono text-primary">${product.price}</p>
                    <p className="text-[10px] text-muted-foreground">ID: {product.id}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
