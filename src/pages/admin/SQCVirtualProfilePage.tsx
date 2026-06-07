import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, getDocs, doc, updateDoc, addDoc, where, deleteDoc, getDoc } from "firebase/firestore";
import { useProducts } from "@/lib/products-context-hooks";
import { useUnifiedResellers } from "@/lib/unified-hooks";
import { STATIC_VIRTUAL_PROFILES } from "@/data/virtualProfiles";
import { LEVEL_PROFIT_MAP } from "@/lib/reseller-context-hooks";
import {
  Send, ChevronDown, ChevronUp, MoreHorizontal, UserCheck,
  Circle, Volume2, VolumeX, Search, Shield, Pin, PinOff,
  Users, ShoppingBag, MessageSquare, ClipboardList, Plus, Minus, Check, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface OrderProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface UnifiedOrder {
  id: string;
  resellerId: string;
  customerName: string;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  products: OrderProduct[];
}

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
  is_pinned: boolean;
  last_message_at: string;
  lastMessage?: string;
  unreadCount?: number;
  shop_name?: string;
  numeric_id?: string;
  full_name?: string;
  referralId?: string;
  referredBy?: string;
  memberOfAdminId?: string;
  staffName?: string;
  adminMember?: string;
}

interface ChatMessage {
  id: string;
  session_id: string;
  sender: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function playNotificationSound() {
  try {
    const AudioContextClass = (window.AudioContext || (window as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.error("Audio playback failed", err);
  }
}

let flashInterval: ReturnType<typeof setInterval> | null = null;
function startTabFlash() {
  if (flashInterval) return;
  const original = document.title;
  let on = false;
  flashInterval = setInterval(() => {
    document.title = on ? "🔍 SQC Message!" : original;
    on = !on;
  }, 800);
  const stopFlash = () => {
    if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
    document.title = original;
    window.removeEventListener("focus", stopFlash);
  };
  window.addEventListener("focus", stopFlash);
}

function ProductAttachmentCard({ product }: { product: { id: string; name: string; price: number; image: string } }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 mt-1 max-w-[260px]">
      <img
        src={product.image || "/placeholder.svg"}
        alt={product.name}
        className="w-12 h-12 rounded-md object-cover flex-shrink-0 bg-muted"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
        <p className="text-[10px] text-muted-foreground">ID: {product.id.slice(0, 8)}</p>
        <p className="text-xs font-bold text-primary">${product.price.toFixed(2)}</p>
      </div>
    </div>
  );
}

function parseAttachment(message: string): { text: string; product: { id: string; name: string; price: number; image: string } | null } {
  const tag = "[PRODUCT_ATTACH:";
  const idx = message.indexOf(tag);
  if (idx === -1) return { text: message, product: null };
  try {
    const jsonStart = idx + tag.length;
    const jsonEnd = message.indexOf("]", jsonStart);
    const json = message.substring(jsonStart, jsonEnd);
    const product = JSON.parse(json);
    const text = message.substring(0, idx).trim();
    return { text, product };
  } catch {
    return { text: message, product: null };
  }
}

export default function SQCVirtualProfilePage() {
  const [profiles, setProfiles] = useState<VirtualProfile[]>(STATIC_VIRTUAL_PROFILES);
  const [tableOpen, setTableOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<VirtualProfile | null>(null);
  const [editProfile, setEditProfile] = useState<VirtualProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Chat state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [resellerSearch, setResellerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [leftSheetOpen, setLeftSheetOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);
  const { products } = useProducts();
  const scrollRef = useRef<HTMLDivElement>(null);
  const allResellers = useUnifiedResellers();

  const enrichedSessions = useMemo(() => {
    return sessions.map(s => {
      const reseller = allResellers.find(r => r.id === s.reseller_id);
      return {
        ...s,
        shop_name: reseller?.shopName || "",
        numeric_id: reseller?.resellerId?.toString() || "",
        full_name: reseller ? `${reseller.firstName} ${reseller.lastName}` : "",
        staffName: reseller?.staffName || "",
        adminMember: reseller?.adminMember || ""
      };
    });
  }, [sessions, allResellers]);

  // Generate Order state
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [orderProductSearch, setOrderProductSearch] = useState("");
  const [orderCart, setOrderCart] = useState<{ product: OrderProduct; qty: number }[]>([]);

  const addToOrderCart = (p: { id: string; name: string; price: number; image: string | null }) => {
    setOrderCart((prev) => {
      const existing = prev.find((c) => c.product.id === p.id);
      if (existing) return prev.map((c) => c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { product: { id: p.id, name: p.name, price: p.price, image: p.image || "/placeholder.svg", quantity: 1 }, qty: 1 }];
    });
  };

  const removeFromOrderCart = (productId: string) => {
    setOrderCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const updateCartQty = (productId: string, delta: number) => {
    setOrderCart((prev) =>
      prev.map((c) => c.product.id === productId ? { ...c, qty: Math.max(1, c.qty + delta) } : c)
    );
  };

  const orderTotal = orderCart.reduce((s, c) => s + c.product.price * c.qty, 0);
  const orderItems = orderCart.reduce((s, c) => s + c.qty, 0);

  const submitOrder = async () => {
    if (!activeSession || !selectedProfile || orderCart.length === 0) return;
    const orderId = `ORD-${10430 + Math.floor(Math.random() * 1000)}`;
    
    try {
      // 1. Fetch reseller profile to calculate profit and update balance
      const resellerRef = doc(db, "reseller_profiles", activeSession.reseller_id);
      const resellerSnap = await getDoc(resellerRef);
      const resellerData = resellerSnap.exists() ? resellerSnap.data() : null;
      
      const level = resellerData?.level || "VIP-0";
      const profitMargin = LEVEL_PROFIT_MAP[level] || 0.15;
      
      const serviceCost = orderTotal;
      const totalCost = orderTotal * (1 + profitMargin);
      const profit = totalCost - serviceCost;

      // 2. Insert order into Firebase
      const orderRef = await addDoc(collection(db, "orders"), {
        orderId,
        reseller_id: activeSession.reseller_id,
        resellerId: activeSession.reseller_id,
        resellerName: activeSession.full_name || activeSession.reseller_name,
        resellerNumericId: activeSession.numeric_id || activeSession.resellerId || "0",
        staffUsername: activeSession.staffName || "System",
        adminName: activeSession.adminMember || "System",
        user_id: selectedProfile.id,
        profileName: selectedProfile.name,
        total_amount: totalCost,
        total_cost: totalCost,
        totalCost: totalCost,
        service_cost: serviceCost,
        serviceCost: serviceCost,
        profits: profit,
        profit: profit,
        status: 'Pending',
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        items: orderCart.map(c => ({
          productId: c.product.id,
          name: c.product.name,
          image: c.product.image,
          price: c.product.price,
          adjustedPrice: c.product.price * (1 + profitMargin),
          qty: c.qty
        }))
      });

      // 3. Update Reseller Balance
      const currentUnpicked = Number(resellerData?.unpicked_balance || 0);
      const currentTotalOrders = Number(resellerData?.total_orders || 0);

      await updateDoc(resellerRef, {
        unpicked_balance: currentUnpicked + totalCost,
        total_orders: currentTotalOrders + 1,
        updated_at: new Date().toISOString()
      });

      // 4. Insert order items as subcollection
      const orderItemsPromises = orderCart.map(c => 
        addDoc(collection(db, "orders", orderRef.id, "order_items"), {
          product_id: c.product.id,
          name: c.product.name,
          quantity: c.qty,
          price_at_time: c.product.price,
          adjusted_price: c.product.price * (1 + profitMargin),
          image: c.product.image
        })
      );
      
      await Promise.all(orderItemsPromises);

      toast.success(`Order ${orderId} generated for ${activeSession.reseller_name}'s shop`);
      // Send notification in chat
      handleSend(`📦 New order placed! Order ID: ${orderId} | ${orderItems} item(s) | Total: $${totalCost.toFixed(2)}`);
      setOrderCart([]);
      setOrderSheetOpen(false);
    } catch (error) {
      console.error("Failed to create order:", error);
      toast.error(`Failed to create order: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const orderFilteredProducts = products.filter((p) => {
    if (!orderProductSearch) return true;
    const q = orderProductSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  // Reseller profiles from sessions
  const resellerProfiles = enrichedSessions.map((s) => ({
    id: s.id,
    reseller_id: s.reseller_id,
    reseller_name: s.full_name || s.reseller_name,
    reseller_avatar: s.reseller_avatar,
    is_online: s.is_online,
    numeric_id: s.numeric_id,
    shop_name: s.shop_name
  }));

  const filteredResellers = resellerProfiles.filter((r) => {
    if (r.reseller_name === "Ahmad Fauzi" || r.reseller_name === "Maria Santos") return false;
    if (!resellerSearch) return true;
    const q = resellerSearch.toLowerCase();
    return r.reseller_name.toLowerCase().includes(q) || r.reseller_id.toLowerCase().includes(q);
  });

  const filteredProducts = products.filter((p) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    // Using static profiles as primary source to avoid "table not found" errors
    setProfiles(STATIC_VIRTUAL_PROFILES);
  }, []);

  // Fetch sessions with enrichment
  const fetchSessions = useCallback(async () => {
    const q = query(
      collection(db, "reseller_chat_sessions"), 
      orderBy("last_message_at", "desc"),
      limit(50)
    );
    const snapshot = await getDocs(q);
    
    const enriched: ChatSession[] = snapshot.docs.map((docSnap) => {
      const s = { id: docSnap.id, ...docSnap.data() } as ChatSession;
      return {
        ...s,
        is_pinned: s.is_pinned ?? false,
        lastMessage: s.last_message || "",
        unreadCount: s.unread_count || 0,
      };
    });
    setSessions(enriched);
  }, []);

  useEffect(() => { fetchProfiles(); fetchSessions(); }, [fetchProfiles, fetchSessions]);

  // Realtime sessions and messages
  useEffect(() => {
    const sessionsQ = query(collection(db, "reseller_chat_sessions"), orderBy("last_message_at", "desc"), limit(50));
    const unsubscribeSessions = onSnapshot(sessionsQ, (snapshot) => {
      const enriched: ChatSession[] = snapshot.docs.map((docSnap) => {
        const s = { id: docSnap.id, ...docSnap.data() } as ChatSession;
        return {
          ...s,
          is_pinned: s.is_pinned ?? false,
          lastMessage: s.last_message || "",
          unreadCount: s.unread_count || 0,
        };
      });
      setSessions(enriched);
    });

    return () => unsubscribeSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "reseller_chat_messages"),
      where("session_id", "==", activeSessionId)
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatMessage));
      
      // Sort in memory to avoid composite index
      const newMessages = [...allMessages].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      setMessages(prev => {
        if (!isInitialLoad) {
          const prevIds = new Set(prev.map(m => m.id));
          const newResellerMsgs = newMessages.filter(m => !prevIds.has(m.id) && (m.sender || m.sender_role) === "reseller");
          
          if (newResellerMsgs.length > 0) {
            if (soundEnabled) playNotificationSound();
            if (document.hidden) startTabFlash();
          }
        }
        
        return newMessages;
      });

      // Mark as read
      const unread = newMessages.filter(m => (m.sender || m.sender_role) === "reseller" && !m.is_read);
      if (unread.length > 0) {
        unread.forEach(msg => {
          updateDoc(doc(db, "reseller_chat_messages", msg.id), { is_read: true }).catch(console.error);
        });
        
        // Update local session state to reflect read status immediately
        setSessions(prevSessions => 
          prevSessions.map(s => 
            s.id === activeSessionId 
              ? { ...s, unreadCount: Math.max(0, (s.unreadCount || 0) - unread.length) } 
              : s
          )
        );
      }
      isInitialLoad = false;
    });

    return () => unsubscribe();
  }, [activeSessionId, soundEnabled]);

  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  // Profile selection
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

  const handleDeselectProfile = async () => {
    if (selectedProfile) {
      try {
        await updateDoc(doc(db, "virtual_customer_profiles", selectedProfile.id), { status: "Available" });
      } catch (e) {
        console.warn("Could not update virtual profile status in DB", e);
      }
    }
    setSelectedProfile(null);
    setActiveSessionId(null);
    setMessages([]);
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

  useEffect(() => {
    if (activeSessionId) {
      updateDoc(doc(db, "reseller_chat_sessions", activeSessionId), {
        unread_count: 0
      }).catch(console.error);
    }
  }, [activeSessionId]);

  const handleSend = async (extraText?: string) => {
    const text = extraText ?? input.trim();
    if (!text || !activeSessionId || !selectedProfile) return;
    if (!extraText) setInput("");
    
    try {
      await addDoc(collection(db, "reseller_chat_messages"), {
        session_id: activeSessionId,
        sender: "admin",
        message: `[${selectedProfile.name}]: ${text}`,
        is_read: false,
        created_at: new Date().toISOString()
      });
      
      await updateDoc(doc(db, "reseller_chat_sessions", activeSessionId), {
        last_message_at: new Date().toISOString(),
        last_message: text
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const attachProduct = (product: { id: string; name: string; price: number; image: string | null }) => {
    const payload = JSON.stringify({ id: product.id, name: product.name, price: product.price, image: product.image || "/placeholder.svg" });
    handleSend(`[PRODUCT_ATTACH:${payload}]`);
    setRightSheetOpen(false);
  };

  const togglePin = async (sessionId: string, currentPinned: boolean) => {
    try {
      await updateDoc(doc(db, "reseller_chat_sessions", sessionId), {
        is_pinned: !currentPinned
      });
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSessions = enrichedSessions
    .filter((s) => {
      if (!sessionSearch) return true;
      const q = sessionSearch.toLowerCase();
      return s.reseller_name.toLowerCase().includes(q) || 
             s.reseller_id.toLowerCase().includes(q) ||
             s.shop_name.toLowerCase().includes(q) ||
             s.numeric_id.toLowerCase().includes(q) ||
             s.full_name.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">
            Virtual Profile for Standard Quality Control
          </h1>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Foldable Table */}
      <div className="border-b border-border">
        <button
          onClick={() => setTableOpen(!tableOpen)}
          className="w-full flex items-center justify-between px-4 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Virtual Customer Profiles ({profiles.length})
          </span>
          {tableOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {tableOpen && (
          <div className="max-h-[45vh] overflow-auto">
            <div className="px-4 py-2">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search profiles..."
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
                {filteredProfiles.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                      {p.shipping_address}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px]">{p.region}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.status === "Available" ? "default" : "secondary"}
                        className={cn(
                          "text-[10px]",
                          p.status === "Available"
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : "bg-orange-500/10 text-orange-600 border-orange-500/30"
                        )}
                      >
                        {p.status}
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
                            onClick={() => handleSelectProfile(p)}
                            disabled={p.status === "Busy"}
                          >
                            Select
                          </DropdownMenuItem>
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

      {/* Chat Interface (visible when profile selected) */}
      {selectedProfile ? (
        <div className="flex flex-1 overflow-hidden relative">
          {/* TOP-LEFT – Generate Order */}
          <Sheet open={orderSheetOpen} onOpenChange={setOrderSheetOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "absolute left-0 top-3 z-30 bg-accent text-foreground rounded-r-lg px-2 py-2 shadow-lg hover:bg-accent/80 transition-colors flex items-center gap-1.5 text-xs font-semibold",
                  !activeSessionId && "opacity-40 pointer-events-none"
                )}
                title="Generate Order"
                disabled={!activeSessionId}
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Generate Order</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-96 sm:max-w-md p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Generate Order — {activeSession?.reseller_name}
                </SheetTitle>
              </SheetHeader>

              {/* Product search */}
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={orderProductSearch}
                    onChange={(e) => setOrderProductSearch(e.target.value)}
                    placeholder="Search products to add..."
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Product list */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 space-y-1.5">
                  {orderFilteredProducts.map((p) => {
                    const inCart = orderCart.find((c) => c.product.id === p.id);
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg border transition-colors",
                          inCart ? "border-primary/40 bg-primary/5" : "border-border hover:bg-accent/50"
                        )}
                      >
                        <img
                          src={p.image || "/placeholder.svg"}
                          alt={p.name}
                          className="w-10 h-10 rounded-md object-cover bg-muted flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                          <p className="text-xs font-bold text-primary">${p.price.toFixed(2)}</p>
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateCartQty(p.id, -1)} className="p-1 rounded bg-muted hover:bg-muted/80">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold w-5 text-center">{inCart.qty}</span>
                            <button onClick={() => updateCartQty(p.id, 1)} className="p-1 rounded bg-muted hover:bg-muted/80">
                              <Plus className="h-3 w-3" />
                            </button>
                            <button onClick={() => removeFromOrderCart(p.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive ml-1">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToOrderCart(p)}
                            className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Order summary + submit */}
              <div className="border-t border-border p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-semibold text-foreground">{orderItems}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground text-lg">${orderTotal.toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Customer: {selectedProfile?.name} · Shop: {activeSession?.reseller_name}
                </div>
                <Button
                  onClick={submitOrder}
                  disabled={orderCart.length === 0}
                  className="w-full"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Submit Order ({orderItems} items)
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* LEFT edge button – Reseller Profiles */}
          <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
            <SheetTrigger asChild>
              <button
                className="absolute left-0 top-[calc(50%+20px)] -translate-y-1/2 z-30 bg-primary text-primary-foreground rounded-r-lg px-1.5 py-3 shadow-lg hover:bg-primary/90 transition-colors"
                title="Reseller Profiles"
              >
                <Users className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 sm:max-w-sm p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="text-base">Reseller Profiles</SheetTitle>
              </SheetHeader>
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={resellerSearch}
                    onChange={(e) => setResellerSearch(e.target.value)}
                    placeholder="Search resellers..."
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                {filteredResellers.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-12">No resellers found</p>
                )}
                {filteredResellers.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => { selectSession(r.id); setLeftSheetOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border/50 hover:bg-accent/50 transition-colors",
                      r.id === activeSessionId && "bg-accent"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {(r.reseller_name || "U").charAt(0)}
                      </div>
                      {r.is_online && (
                        <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{r.reseller_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.numeric_id ? `ID: 1CR${r.numeric_id}` : `ID: ${r.reseller_id}`}
                      </p>
                      {r.shop_name && <p className="text-[10px] text-muted-foreground italic truncate">Shop: {r.shop_name}</p>}
                      <span className={cn(
                        "text-[10px] font-medium",
                        r.is_online ? "text-emerald-600" : "text-muted-foreground"
                      )}>
                        {r.is_online ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* RIGHT edge button – Products */}
          <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-primary text-primary-foreground rounded-l-lg px-1.5 py-3 shadow-lg hover:bg-primary/90 transition-colors",
                  !activeSessionId && "opacity-40 pointer-events-none"
                )}
                title="Product Catalog"
                disabled={!activeSessionId}
              >
                <ShoppingBag className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:max-w-sm p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="text-base">Attach Product</SheetTitle>
              </SheetHeader>
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                {filteredProducts.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-12">No products found</p>
                )}
                <div className="grid grid-cols-2 gap-2 p-3">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => attachProduct(p)}
                      className="flex flex-col items-center rounded-lg border border-border bg-card p-2 hover:bg-accent/50 hover:border-primary/40 transition-colors text-left group"
                    >
                      <img
                        src={p.image || "/placeholder.svg"}
                        alt={p.name}
                        className="w-full aspect-square rounded-md object-cover bg-muted mb-1.5"
                      />
                      <p className="text-[11px] font-semibold text-foreground w-full truncate">{p.name}</p>
                      <p className="text-[9px] text-muted-foreground w-full truncate">ID: {p.id.slice(0, 8)}</p>
                      <p className="text-xs font-bold text-primary w-full">${p.price.toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Sessions list */}
          <div className={cn(
            "w-full md:w-72 lg:w-80 border-r border-border flex flex-col flex-shrink-0",
            activeSessionId && "hidden md:flex"
          )}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Search sessions..."
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredSessions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-12">No conversations yet</p>
              )}
              {filteredSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border/50 hover:bg-accent/50 transition-colors",
                    s.id === activeSessionId && "bg-accent",
                    s.is_pinned && "bg-primary/5"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {(s.reseller_name || "U").charAt(0)}
                    </div>
                    {s.is_online && (
                      <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground truncate">{s.reseller_name}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(s.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{s.lastMessage || "No messages yet"}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {s.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                        {(s.unreadCount ?? 0) > 0 && (
                          <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {s.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat panel */}
          <div className={cn(
            "flex-1 flex flex-col",
            !activeSessionId && "hidden md:flex"
          )}>
            {!activeSessionId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Shield className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select a reseller conversation</p>
                  <p className="text-sm mt-1">Chatting as <span className="font-semibold text-foreground">{selectedProfile.name}</span></p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveSessionId(null)}
                      className="md:hidden p-1 rounded hover:bg-accent mr-1 text-sm"
                    >
                      ←
                    </button>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {(activeSession?.full_name || activeSession?.reseller_name || "R").charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{activeSession?.full_name || activeSession?.reseller_name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                        {activeSession?.numeric_id ? `ID: 1CR${activeSession.numeric_id}` : `ID: ${activeSession?.reseller_id}`}
                        {activeSession?.shop_name && <span className="text-muted-foreground/60">· {activeSession.shop_name}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      As: {selectedProfile.name}
                    </Badge>
                    <button
                      onClick={() => activeSession && togglePin(activeSession.id, activeSession.is_pinned)}
                      className={cn(
                        "p-2 rounded-lg hover:bg-accent transition-colors",
                        activeSession?.is_pinned && "text-primary"
                      )}
                      title={activeSession?.is_pinned ? "Unpin" : "Pin"}
                    >
                      {activeSession?.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-12">
                      <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Start a conversation</p>
                    </div>
                  )}
                  {messages.map((m) => {
                    const { text, product } = parseAttachment(m.message);
                    return (
                      <div key={m.id} className={`flex ${(m.sender || m.sender_role) === "admin" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                            (m.sender || m.sender_role) === "admin"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          )}
                        >
                          {(m.sender || m.sender_role) !== "admin" && (
                            <p className="text-[10px] font-semibold mb-0.5 opacity-70">{activeSession?.reseller_name}</p>
                          )}
                          {text && <p className="leading-relaxed">{text}</p>}
                          {product && <ProductAttachmentCard product={product} />}
                          <p className={cn(
                            "text-[9px] mt-1",
                            (m.sender || m.sender_role) === "admin" ? "text-primary-foreground/60" : "text-muted-foreground/60"
                          )}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input */}
                <div className="px-3 py-3 border-t border-border">
                  <div className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder={`Message as ${selectedProfile.name}...`}
                      className="flex-1 bg-transparent text-sm py-1.5 focus:outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim()}
                      className="p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        !tableOpen && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a virtual profile from the table above to begin SQC</p>
            </div>
          </div>
        )
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogTitle>Edit Virtual Profile</DialogTitle>
          {editProfile && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editProfile.name}
                  onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={editProfile.email}
                  onChange={(e) => setEditProfile({ ...editProfile, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Shipping Address</Label>
                <Input
                  value={editProfile.shipping_address}
                  onChange={(e) => setEditProfile({ ...editProfile, shipping_address: e.target.value })}
                />
              </div>
              <div>
                <Label>Region</Label>
                <Input
                  value={editProfile.region}
                  onChange={(e) => setEditProfile({ ...editProfile, region: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
