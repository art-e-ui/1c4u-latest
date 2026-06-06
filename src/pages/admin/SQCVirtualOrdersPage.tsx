import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, addDoc, where, limit } from "firebase/firestore";
import { useProducts } from "@/lib/products-context-hooks";
import { useUpdateOrderStatus } from "@/hooks/use-orders";
import { STATIC_VIRTUAL_PROFILES } from "@/data/virtualProfiles";
import { LEVEL_PROFIT_MAP } from "@/lib/reseller-context-hooks";
import { useAdminAuth } from "@/lib/admin-auth-context-hooks";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useUnifiedResellers } from "@/lib/unified-hooks";
import { cn, parseImageUrl } from "@/lib/utils";
import {
  ChevronDown, ChevronUp, MoreHorizontal, UserCheck,
  Search, ShoppingBag, Plus, Minus, Trash2, Send, Package,
  Circle, X,
} from "lucide-react";
import { Product, Order, OrderStatus } from "@/lib/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface VirtualProfile {
  id: string;
  name: string;
  email: string;
  shipping_address: string;
  region: string;
  status: string;
}

interface ResellerSession {
  id: string;
  reseller_id: string;
  reseller_name: string;
  reseller_avatar: string;
  is_online: boolean;
  last_message_at: string;
}

interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  qty: number;
}

interface VirtualOrder {
  id: string;
  orderId: string;
  profileName: string;
  resellerName: string;
  resellerId: string;
  items: CartItem[];
  totalCost: number;
  serviceCost: number;
  profit: number;
  status: OrderStatus;
  createdAt: string;
  shippingAddress: string;
  referralId?: string;
  referredBy?: string;
  memberOfAdminId?: string;
}

const orderCounter = 1000;

export default function SQCVirtualOrdersPage() {
  const { session } = useAdminAuth();
  const { isOwner, isAdmin, isStaff, allowedAdminIds, allowedStaffIds, allowedReferralIds, allowedStaffDocIds, canSeeAll } = useAdminAccess();
  const resellers = useUnifiedResellers();
  const [profiles, setProfiles] = useState<VirtualProfile[]>(STATIC_VIRTUAL_PROFILES);
  const [realUsers, setRealUsers] = useState<Record<string, unknown>[]>([]);
  const [useRealUsers, setUseRealUsers] = useState(false);
  const [tableOpen, setTableOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [resellerSearch, setResellerSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<VirtualProfile | null>(null);
  const [editProfile, setEditProfile] = useState<VirtualProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Reseller panel
  const [resellerSessions, setResellerSessions] = useState<ResellerSession[]>([]);
  const [activeReseller, setActiveReseller] = useState<ResellerSession | null>(null);

  // Cart & Orders
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<VirtualOrder[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { products } = useProducts();
  const updateStatusMutation = useUpdateOrderStatus();

  // Fetch selected products for the active reseller
  useEffect(() => {
    if (!activeReseller) {
      setSelectedProductIds([]);
      return;
    }

    const fetchSelection = async () => {
      try {
        const q = query(
          collection(db, "reseller_product_selection"),
          where("reseller_id", "==", activeReseller.id)
        );
        const snapshot = await getDocs(q);
        const ids = snapshot.docs.map(doc => doc.data().product_id);
        console.log(`[SQC_VIRTUAL_ORDER] Fetched ${ids.length} selected products for reseller ${activeReseller.id}`);
        setSelectedProductIds(ids);
      } catch (error) {
        console.error("Error fetching reseller product selection:", error);
      }
    };

    fetchSelection();
  }, [activeReseller]);

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    setProfiles(STATIC_VIRTUAL_PROFILES);
    try {
      const q = query(collection(db, "users"), orderBy("created_at", "desc"), limit(50));
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRealUsers(users);
    } catch (error) {
      console.error("Error fetching real users:", error);
    }
  }, []);

  // Fetch reseller sessions
  const fetchResellerSessions = useCallback(async () => {
    try {
      const q = query(
        collection(db, "reseller_chat_sessions"), 
        orderBy("last_message_at", "desc"),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResellerSession))
        .filter(s => s.reseller_name !== "Ahmad Fauzi" && s.reseller_name !== "Maria Santos");
      setResellerSessions(sessions);
    } catch (error) {
      console.error("Error fetching reseller sessions:", error);
    }
  }, []);

  // Fetch cart & orders
  const fetchOrders = useCallback(async () => {
    try {
      const q = query(
        collection(db, "orders"), 
        orderBy("created_at", "desc"),
        limit(100)
      );
      const snapshot = await getDocs(q);
      
      const fetchedOrders = await Promise.all(snapshot.docs.map(async (orderDoc) => {
        const orderData = orderDoc.data();
        
        // Fetch items from subcollection
        const itemsSnapshot = await getDocs(collection(db, "orders", orderDoc.id, "order_items"));
        const items = itemsSnapshot.docs.map(d => {
          const dData = d.data();
          return {
            productId: dData.product_id || '',
            name: dData.name || 'Unknown Product',
            image: dData.image || '',
            price: Number(dData.price_at_time || 0),
            adjustedPrice: Number(dData.adjusted_price || 0),
            qty: Number(dData.quantity || 0)
          };
        });

        // Map status
        let status: OrderStatus = "Pending";
        const dbStatus = String(orderData.status || "").toLowerCase();
        if (dbStatus === "ongoing" || dbStatus === "processing" || dbStatus === "shipped") status = "Ongoing";
        else if (dbStatus === "completed" || dbStatus === "delivered") status = "Completed";
        else if (dbStatus === "cancelled") status = "Cancelled";

        return {
          id: orderDoc.id,
          orderId: orderData.orderId || orderDoc.id,
          profileName: orderData.profileName || 'Unknown',
          resellerName: orderData.resellerName || 'Unknown',
          resellerId: orderData.resellerId || '',
          items,
          totalCost: Number(orderData.total_cost || orderData.total_amount || 0),
          serviceCost: Number(orderData.service_cost || 0),
          profit: Number(orderData.profits || 0),
          status,
          createdAt: orderData.created_at || '',
          shippingAddress: orderData.shippingAddress || '',
          referralId: orderData.referralId || '',
          referredBy: orderData.referredBy || '',
          memberOfAdminId: orderData.memberOfAdminId || '',
        } as VirtualOrder;
      }));

      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, []);

  const filteredOrders = useMemo(() => {
    let list = orders || [];

    const allowedResellerIds = new Set<string>();
    if (!canSeeAll) {
      const allowedResellers = resellers.filter(r => {
        const referredBy = r.referredBy;
        return (referredBy && (
          allowedReferralIds.includes(String(referredBy)) || 
          allowedStaffIds.includes(String(referredBy)) || 
          allowedStaffDocIds.includes(String(referredBy))
        ));
      });
      allowedResellers.forEach(r => {
        allowedResellerIds.add(String(r.id));
        allowedResellerIds.add(`1CR${r.resellerId}`);
      });
      
      list = list.filter((o) => allowedResellerIds.has(String(o.resellerId)));
    }
    return list;
  }, [orders, canSeeAll, resellers, allowedReferralIds, allowedStaffIds, allowedStaffDocIds]);

  useEffect(() => { fetchProfiles(); fetchResellerSessions(); fetchOrders(); }, [fetchProfiles, fetchResellerSessions, fetchOrders]);

  // Select profile
  const handleSelectProfile = async (profile: VirtualProfile) => {
    try {
      await updateDoc(doc(db, "virtual_customer_profiles", profile.id), { status: "Busy" });
    } catch (e) {
      console.warn("Could not update virtual profile status in DB", e);
    }
    setSelectedProfile({ ...profile, status: "Busy" });
    setTableOpen(false);
    fetchProfiles();
  };

  // Deselect profile
  const handleDeselectProfile = async () => {
    if (selectedProfile) {
      try {
        await updateDoc(doc(db, "virtual_customer_profiles", selectedProfile.id), { status: "Available" });
      } catch (e) {
        console.warn("Could not update virtual profile status in DB", e);
      }
    }
    setSelectedProfile(null);
    setActiveReseller(null);
    setCart([]);
    setTableOpen(true);
    fetchProfiles();
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      await deleteDoc(doc(db, "virtual_customer_profiles", id));
    } catch (e) {
      console.warn("Could not delete virtual profile from DB", e);
    }
    fetchProfiles();
  };

  const handleEditSave = async () => {
    if (!editProfile) return;
    try {
      await updateDoc(doc(db, "virtual_customer_profiles", editProfile.id), {
        name: editProfile.name,
        email: editProfile.email,
        shipping_address: editProfile.shipping_address,
        region: editProfile.region,
      });
    } catch (e) {
      console.warn("Could not update virtual profile in DB", e);
    }
    setEditDialogOpen(false);
    setEditProfile(null);
    fetchProfiles();
  };

  // Cart logic
  const addToCart = (product: { id: string; name: string; image: string; price: number }) => {
    const cleanImage = parseImageUrl(product.image);
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { productId: product.id, name: product.name, image: cleanImage, price: product.price, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => c.productId === productId ? { ...c, qty: c.qty + delta } : c)
        .filter((c) => c.qty > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  // Submit order
  const submitOrder = async () => {
    if (!selectedProfile || !activeReseller || cart.length === 0) {
      toast.error("Please select a customer, add products, and select an active reseller.");
      return;
    }
    
    setSubmitting(true);
    try {
      // 1. Fetch reseller data to get referral info and current balance
      const resellerDoc = await getDoc(doc(db, "reseller_profiles", activeReseller.id));
      const resellerData = resellerDoc.exists() ? resellerDoc.data() : null;

      // Generate a more unique Order ID
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const orderId = `VO-${timestamp}${random}`;
      
      // Calculate costs and profits based on reseller level
      const level = activeReseller.level || resellerData?.level || 'VIP-0';
      const profitMargin = LEVEL_PROFIT_MAP[level] || 0.15;
      
      const serviceCost = Number(cartTotal.toFixed(2));
      const totalCost = Number((cartTotal * (1 + profitMargin)).toFixed(2));
      const profit = Number((totalCost - serviceCost).toFixed(2));

      // 2. Save to Firestore
      const orderData = {
        orderId,
        user_id: selectedProfile.id, // For customer order tracking
        customerName: selectedProfile.name,
        profileName: selectedProfile.name,
        resellerName: activeReseller.reseller_name,
        resellerId: activeReseller.id, // Use UID for consistency with ResellerOrders.tsx query
        reseller_id: activeReseller.id, // Use UID for consistency with Firestore security rules
        resellerNumericId: activeReseller.resellerId || 0, // Keep numeric ID for display
        staffUsername: activeReseller.staffName || "System",
        adminName: activeReseller.adminMember || "System",
        total_amount: totalCost, // For customer page
        totalCost: totalCost, // For reseller page
        total_cost: totalCost,
        serviceCost: serviceCost, // For reseller page
        service_cost: serviceCost,
        profit: profit, // For reseller page
        profits: profit,
        status: "Pending", // Capitalized for consistency
        focused: false,
        created_at: new Date().toISOString(), // For customer page
        createdAt: new Date().toISOString(), // For reseller page
        shippingAddress: selectedProfile.shipping_address,
        referralId: resellerData?.referral_id || resellerData?.referral_code || "",
        referredBy: resellerData?.referred_by_staff_id || resellerData?.referredBy || session?.accountId || "",
        memberOfAdminId: resellerData?.member_of_admin_id || resellerData?.memberOfAdminId || session?.uid || "",
        items: cart.map(item => ({ // For reseller page (array in doc)
          productId: item.productId,
          name: item.name,
          image: item.image,
          price: item.price,
          qty: item.qty
        }))
      };

      console.log("[VIRTUAL_ORDER] Submitting order:", orderData);
      const orderRef = await addDoc(collection(db, "orders"), orderData);
      console.log("[VIRTUAL_ORDER] Order created with ID:", orderRef.id);

      // 3. Create order_items subcollection for customer view
      for (const item of cart) {
        await addDoc(collection(db, "orders", orderRef.id, "order_items"), {
          product_id: item.productId,
          name: item.name,
          image: item.image,
          price_at_time: item.price,
          adjusted_price: Number((item.price * (1 + profitMargin)).toFixed(2)),
          quantity: item.qty,
          created_at: new Date().toISOString()
        });
      }

      // 4. Update Reseller Balance and Stats
      if (activeReseller.id) {
        const resellerRef = doc(db, "reseller_profiles", activeReseller.id);
        const currentUnpicked = Number(resellerData?.unpicked_balance || 0);
        const currentTotalOrders = Number(resellerData?.total_orders || 0);

        await updateDoc(resellerRef, {
          unpicked_balance: currentUnpicked + totalCost,
          total_orders: currentTotalOrders + 1,
          updated_at: new Date().toISOString()
        });
      }

      toast.success(`Order ${orderId} created successfully!`);
      setCart([]);
      setTableOpen(true);
      fetchOrders();
    } catch (error) {
      console.error("[VIRTUAL_ORDER] Error submitting order:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, "orders");
      } catch (e) {
        toast.error("Failed to create order. Check console for details.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({ orderId, status: status as OrderStatus });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: status as OrderStatus } : o));
      toast.success(`Order status updated to ${status}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const filteredResellerSessions = useMemo(() => {
    const list = resellerSessions || [];
    
    // Enrich sessions with unified reseller data for better searching
    let enrichedList = list.map(session => {
      const profile = resellers.find(r => r.id === session.reseller_id);
      return {
        ...session,
        shop_name: profile?.shopName || "",
        numeric_id: profile?.resellerId?.toString() || "",
        full_name: profile ? `${profile.firstName} ${profile.lastName}` : session.reseller_name,
        referralId: profile?.referralId || "",
        referredBy: profile?.referredBy || "",
        memberOfAdminId: profile?.memberOfAdminId || ""
      };
    });

    if (!canSeeAll) {
      enrichedList = enrichedList.filter(s => 
        (s.referredBy && (allowedStaffIds.includes(String(s.referredBy)) || allowedStaffDocIds.includes(String(s.referredBy)))) ||
        (s.referralId && allowedReferralIds.includes(String(s.referralId)))
      );
    }

    if (resellerSearch.trim()) {
      const q = resellerSearch.toLowerCase();
      return enrichedList.filter(s => 
        s.reseller_name.toLowerCase().includes(q) || 
        s.reseller_id.toLowerCase().includes(q) ||
        s.shop_name.toLowerCase().includes(q) ||
        s.numeric_id.includes(q) ||
        s.full_name.toLowerCase().includes(q)
      );
    }
    return enrichedList;
  }, [resellerSessions, resellerSearch, resellers, canSeeAll, allowedReferralIds, allowedStaffIds, allowedStaffDocIds]);

  const filteredProfiles = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(
    (p) => p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">
            Standard Quality Control
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg mr-2">
            <Button
              variant={!useRealUsers ? "secondary" : "ghost"}
              size="sm"
              className="text-xs h-7 px-3"
              onClick={() => { setUseRealUsers(false); setSelectedProfile(null); }}
            >
              Virtual
            </Button>
            <Button
              variant={useRealUsers ? "secondary" : "ghost"}
              size="sm"
              className="text-xs h-7 px-3"
              onClick={() => { setUseRealUsers(true); setSelectedProfile(null); }}
            >
              Real
            </Button>
          </div>
          {selectedProfile && (
            <div className="flex items-center gap-2 mr-3">
              <Badge variant="secondary" className="text-xs">
                Active: {selectedProfile.name}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleDeselectProfile} className="text-xs h-7">
                Release
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => setOrderHistoryOpen(true)}
          >
            <Package className="h-3 w-3 mr-1" />
            Orders ({filteredOrders.length})
          </Button>
        </div>
      </div>

      {/* Foldable Table — same as VP for SQC */}
      <div className="border-b border-border">
        <button
          onClick={() => setTableOpen(!tableOpen)}
          className="w-full flex items-center justify-between px-4 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            {useRealUsers ? `Real Customer Users (${realUsers.length})` : `Virtual Customer Profiles (${profiles.length})`}
          </span>
          {tableOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {tableOpen && (
          <div className="max-h-[45vh] overflow-auto">
            <div className="px-4 py-2">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={useRealUsers ? "Search real users..." : "Search profiles..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Shipping Address</TableHead>
                  <TableHead className="hidden md:table-cell">Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(useRealUsers ? realUsers : profiles)
                  .filter(p => 
                    (p.name || `${p.first_name || ""} ${p.last_name || ""}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (p.email || "").toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((p, i) => (
                    <TableRow key={p.id} className={cn(selectedProfile?.id === p.id && "bg-primary/5")}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">
                        {p.name || `${p.first_name || ""} ${p.last_name || ""}`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.email}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                        {p.shipping_address || p.address || "N/A"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px]">{p.region || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={(p.status === "Available" || !p.status) ? "default" : "secondary"}
                          className={cn(
                            "text-[10px]",
                            (p.status === "Available" || !p.status)
                              ? "bg-green-500/10 text-green-600 border-green-500/30"
                              : "bg-orange-500/10 text-orange-600 border-orange-500/30"
                          )}
                        >
                          {p.status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-accent transition-colors">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setSelectedProfile({
                                id: p.id,
                                name: p.name || `${p.first_name || ""} ${p.last_name || ""}`,
                                email: p.email || "",
                                shipping_address: p.shipping_address || p.address || "N/A",
                                region: p.region || "N/A",
                                status: p.status || "active"
                              })}
                              disabled={p.status === "Busy"}
                            >
                              Select
                            </DropdownMenuItem>
                            {!useRealUsers && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => { setEditProfile({ ...p }); setEditDialogOpen(true); }}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteProfile(p.id)}
                                  className="text-destructive"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Main interface — reseller panel + cart + product panel */}
      {selectedProfile ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Reseller sessions */}
          <div className="w-60 border-r border-border overflow-hidden flex-shrink-0 bg-card flex flex-col">
            <div className="p-3 border-b space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Select Reseller Shop
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 h-9 text-sm"
                  value={resellerSearch}
                  onChange={(e) => setResellerSearch(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-0">
                {filteredResellerSessions.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No reseller sessions
                  </div>
                ) : (
                  filteredResellerSessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setActiveReseller(s); setCart([]); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                        activeReseller?.id === s.id && "bg-primary/10 border-r-2 border-primary"
                      )}
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                          {(s.reseller_name || "U").charAt(0).toUpperCase()}
                        </div>
                        {s.is_online && (
                          <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.reseller_name}</p>
                        <p className="text-[10px] text-muted-foreground">ID: {s.reseller_id}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Center: Virtual Cart */}
          <div className="flex-1 flex flex-col min-w-0">
            {!activeReseller ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a reseller shop to create a virtual order as <span className="font-semibold text-foreground">{selectedProfile.name}</span></p>
                </div>
              </div>
            ) : (
              <>
                {/* Cart header */}
                <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {(activeReseller.reseller_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{activeReseller.reseller_name}'s Shop</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Circle className="h-2 w-2 fill-green-500 text-green-500" /> Ordering as: {selectedProfile.name}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Ship to: {selectedProfile.region}
                  </Badge>
                </div>

                {/* Cart items */}
                <ScrollArea className="flex-1 p-4">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <ShoppingBag className="h-10 w-10 mb-3 opacity-30" />
                      <p className="text-sm">Cart is empty — add products from the panel</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                        >
                          <img
                            src={parseImageUrl(item.image) || "/placeholder.svg"}
                            alt={item.name}
                            className="w-14 h-14 rounded-md object-cover flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQty(item.productId, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQty(item.productId, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm font-semibold w-20 text-right">${(item.price * item.qty).toFixed(2)}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Cart footer / submit */}
                {cart.length > 0 && (
                  <div className="px-4 py-3 border-t border-border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{cartCount} item(s)</p>
                        <p className="text-xs text-muted-foreground">Shipping: {selectedProfile.shipping_address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold text-foreground">${cartTotal.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setCart([])}>
                        <Trash2 className="h-3 w-3 mr-1" /> Clear Cart
                      </Button>
                      <Button size="sm" className="flex-1" onClick={submitOrder}>
                        <Send className="h-3 w-3 mr-1" /> Submit Virtual Order
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Product catalog panel */}
          {activeReseller && (
            <div className="w-56 border-l border-border overflow-hidden flex-shrink-0 bg-card hidden lg:flex flex-col">
              <div className="p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">
                  Add Products
                </p>
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="px-2 space-y-1.5 pb-4">
                  {filteredProducts
                    .filter(p => selectedProductIds.includes(p.id))
                    .map((p) => {
                    const inCart = cart.find((c) => c.productId === p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => addToCart({ id: p.id, name: p.name, image: p.image, price: p.price })}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                      >
                        <img
                          src={parseImageUrl(p.image) || "/placeholder.svg"}
                          alt={p.name}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">${p.price.toFixed(2)}</p>
                        </div>
                        {inCart ? (
                          <Badge className="text-[9px] h-5 px-1.5">{inCart.qty}</Badge>
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      ) : (
        !tableOpen && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a virtual profile from the table above to begin SQC ordering</p>
            </div>
          </div>
        )
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogTitle>Edit Virtual Profile</DialogTitle>
          {editProfile && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={editProfile.name} onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editProfile.email} onChange={(e) => setEditProfile({ ...editProfile, email: e.target.value })} />
              </div>
              <div>
                <Label>Shipping Address</Label>
                <Input value={editProfile.shipping_address} onChange={(e) => setEditProfile({ ...editProfile, shipping_address: e.target.value })} />
              </div>
              <div>
                <Label>Region</Label>
                <Input value={editProfile.region} onChange={(e) => setEditProfile({ ...editProfile, region: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order History Dialog */}
      <Dialog open={orderHistoryOpen} onOpenChange={setOrderHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Virtual Order History ({filteredOrders.length})
          </DialogTitle>
          <ScrollArea className="max-h-[60vh]">
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No virtual orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="border border-border">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-sm font-mono">{order.orderId}</CardTitle>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              order.status === "Ongoing" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                              order.status === "Completed" && "bg-green-500/10 text-green-600 border-green-500/30",
                              order.status === "Cancelled" && "bg-red-500/10 text-red-600 border-red-500/30",
                              order.status === "Pending" && "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
                            )}
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-accent">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "Completed")}>
                              Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "Cancelled")} className="text-destructive">
                              Cancel Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
                        <span>Profile: <span className="text-foreground font-medium">{order.profileName}</span></span>
                        <span>Reseller: <span className="text-foreground font-medium">{order.resellerName}</span></span>
                        <span>ID: <span className="font-mono text-foreground">{order.resellerId}</span></span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Ship to: {order.shippingAddress}
                      </div>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.productId} className="flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={parseImageUrl(item.image) || "/placeholder.svg"}
                                alt={item.name}
                                className="w-8 h-8 rounded object-cover flex-shrink-0 border border-border"
                                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                              />
                              <span className="text-foreground truncate">{item.name} × {item.qty}</span>
                            </div>
                            <span className="text-muted-foreground flex-shrink-0">${(item.price * item.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span>${order.totalCost.toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
