import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedResellers } from "@/lib/unified-hooks";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Search, MoreVertical, UserPlus, Store, MapPin, Eye, EyeOff, User, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useDbSlaAdmins, useDbSlaStaff } from "@/hooks/use-db-sla";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Reseller } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { auth, db, getFirebaseConfig } from "@/lib/firebase";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { initializeApp, getApp, getApps } from "firebase/app";
import { doc, setDoc, collection, query, orderBy, limit, getDocs, addDoc, updateDoc, where } from "firebase/firestore";
import { toast } from "sonner";
import { Star, TrendingUp, ShieldCheck, Package, Bell } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAuth } from "@/lib/admin-auth-context-hooks";
import { useTranslation } from "react-i18next";

const vipColors: Record<string, string> = {
  "VIP-0": "bg-muted text-muted-foreground",
  "VIP-1": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "VIP-2": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "VIP-3": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "VIP-4": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "VIP-5": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

const levelToProductLimit: Record<string, number> = {
  "VIP-0": 20,
  "VIP-1": 30,
  "VIP-2": 40,
  "VIP-3": 50,
  "VIP-4": 100,
  "VIP-5": 150,
};

const PREDEFINED_MESSAGE = "Dear Reseller, you have unpicked up orders pending in your shop. Please take action as necessary and fulfill the customer order. Unless your shop's reputation and credit score may have negative impact.";

export default function AdminResellersPage() {
  const { t } = useTranslation();
  const { session } = useAdminAuth();
  const resellers = useUnifiedResellers();
  const { data: dbAdmins } = useDbSlaAdmins();
  const { data: dbStaff } = useDbSlaStaff();
  const { canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds } = useAdminAccess();
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", shopName: "" });
  const [editForm, setEditForm] = useState({ 
    id: "", 
    shopName: "", 
    level: "VIP-0", 
    productLimit: 20, 
    starRating: 2.0, 
    creditScore: 100 
  });
  const [notificationForm, setNotificationForm] = useState({
    resellerId: "",
    resellerName: "",
    message: PREDEFINED_MESSAGE
  });

  const queryClient = useQueryClient();

  const filtered = useMemo(() => {
    let list = resellers || [];
    if (!canSeeAll) {
      list = list.filter((r) => 
        (r.referredBy && (
          allowedStaffIds.includes(r.referredBy) || 
          allowedReferralIds.includes(r.referredBy) ||
          allowedStaffDocIds.includes(r.referredBy)
        )) ||
        (r.memberOfAdminId && allowedAdminIds.includes(r.memberOfAdminId))
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.firstName.toLowerCase().includes(q) ||
          r.lastName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.shopName.toLowerCase().includes(q) ||
          r.resellerId?.toString().includes(q)
      );
    }
    return list;
  }, [resellers, canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds, search]);

  const handleResetUnpickedBalance = async (resellerId: string) => {
    if (!window.confirm("Are you sure you want to reset this reseller's Unpicked Balance to 0?")) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, "reseller_profiles", resellerId), {
        unpicked_balance: 0
      });
      toast.success("Unpicked balance reset to 0");
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
    } catch (error) {
      console.error("Error resetting unpicked balance:", error);
      toast.error("Failed to reset unpicked balance");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateReseller = async (resellerId: string) => {
    if (!window.confirm("Are you sure you want to deactivate this reseller? This will disable their shop and portal access.")) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "reseller_profiles", resellerId), { status: "Deactivated" });
      await updateDoc(doc(db, "users", resellerId), { status: "Deactivated" });
      toast.success("Reseller deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
    } catch (error) {
      console.error(error);
      toast.error("Failed to deactivate reseller");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReseller = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.shopName) {
      toast.error("All fields are required");
      return;
    }
    setLoading(true);
    
    // Create a secondary app instance to avoid signing out the current admin
    const secondaryAppName = `secondary-app-${Date.now()}`;
    const secondaryApp = initializeApp(getFirebaseConfig(), secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      const userId = userCredential.user.uid;

      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        email: form.email,
        first_name: form.firstName,
        last_name: form.lastName,
        role: 'reseller',
        system_upgraded_reset: true,
      });

      const shopSlug = form.shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const referralId = 'GC-' + userId.substring(0, 4).toUpperCase();
      
      const q = query(collection(db, 'reseller_profiles'), orderBy('reseller_id', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      let lastResellerId = 25030;
      if (!snapshot.empty) {
        lastResellerId = snapshot.docs[0].data().reseller_id || 25030;
      }
      const newResellerId = lastResellerId + 1;
      
      // Determine ownership based on current session
      const ownershipData: Record<string, string> = {};
      let adminName = 'System';
      let staffName = 'Direct';

      if (session) {
        if (session.role === "Admin" || session.role === "Owner") {
          ownershipData.member_of_admin_id = session.accountId || session.uid;
          // Look up admin name if possible
          const myAdmin = dbAdmins?.find(a => a.account_id === ownershipData.member_of_admin_id);
          if (myAdmin) adminName = myAdmin.name;
        } else if (session.role === "User") {
          ownershipData.referred_by_staff_id = session.accountId || session.uid;
          const me = dbStaff?.find(s => s.id === ownershipData.referred_by_staff_id);
          if (me) {
            staffName = me.name;
            if (me.created_by_admin_id) {
              ownershipData.member_of_admin_id = me.created_by_admin_id;
              const myAdmin = dbAdmins?.find(a => a.account_id === me.created_by_admin_id);
              if (myAdmin) adminName = myAdmin.name;
            }
          }
        }
      }

      await setDoc(doc(db, 'reseller_profiles', userId), {
        uid: userId,
        user_id: userId,
        shop_name: form.shopName,
        shop_slug: shopSlug + '-' + Math.random().toString(36).substring(2, 6),
        referral_id: referralId,
        balance: 0,
        total_earnings: 0,
        verified: false,
        reseller_id: newResellerId,
        registration_date: new Date().toISOString(),
        system_upgraded_reset: true,
        ...ownershipData
      });

      // Telegram Notification for Manual Registration
      try {
        const telegramMessage = `<b>New Reseller Added (by Admin)</b>\n\n` +
          `👤 Name: ${form.firstName} ${form.lastName}\n` +
          `📧 Email: ${form.email}\n` +
          `🆔 Reseller ID: ${newResellerId}\n` +
          `🏢 Admin: ${adminName}\n` +
          `👔 Staff: ${staffName}\n` +
          `📅 Date: ${new Date().toLocaleString()}`;
        
        await fetch('/api/telegram/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: telegramMessage, threadId: 1 }),
        });
      } catch (e) {
        console.error("Failed to send admin-initiated registration notification:", e);
      }

      // Simulation of auto-verify for manual add
      setTimeout(async () => {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          await updateDoc(doc(db, 'reseller_profiles', userId), { verified: true });
          console.log(`[AUTO-VERIFY] Manually added reseller ${userId} verified.`);
        } catch (e) {
          console.error("Auto-verify failed for manual add:", e);
        }
      }, 2 * 60 * 1000);

      await setDoc(doc(db, 'retail_shops', userId), {
        reseller_id: newResellerId,
        shop_name: form.shopName,
        level: 'VIP-0',
        product_limit: 20,
        star_rating: 2.0,
        credit_score: 100,
        created_at: new Date().toISOString(),
      });

      // Sign out from secondary app and clean up
      await signOut(secondaryAuth);
      
      toast.success("Reseller created successfully");
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-resellers-financial-data"] });
      setAddDialogOpen(false);
      setForm({ firstName: "", lastName: "", email: "", password: "", shopName: "" });
    } catch (e) {
      console.error("Error creating reseller:", e);
      toast.error("Failed to create reseller");
    } finally {
      setLoading(false);
    }
  };

  const handleEditReseller = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'retail_shops', editForm.id), {
        shop_name: editForm.shopName,
        level: editForm.level,
        product_limit: editForm.productLimit,
        star_rating: editForm.starRating,
        credit_score: editForm.creditScore,
        updated_at: new Date().toISOString()
      }, { merge: true });
      
      // Also update shop name in reseller_profiles if it changed
      await setDoc(doc(db, 'reseller_profiles', editForm.id), {
        shop_name: editForm.shopName,
        updated_at: new Date().toISOString()
      }, { merge: true });

      toast.success("Reseller updated successfully");
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      setEditDialogOpen(false);
    } catch (e) {
      console.error("Error updating reseller:", e);
      toast.error("Failed to update reseller");
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationForm.message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    setLoading(true);
    try {
      console.log(`[NOTIFICATION] Attempting to send notification to reseller: ${notificationForm.resellerId}`);
      console.log(`[NOTIFICATION] Message: ${notificationForm.message}`);
      
      const docRef = await addDoc(collection(db, 'reseller_notifications'), {
        reseller_id: notificationForm.resellerId,
        title: "System Alert",
        message: notificationForm.message,
        created_at: new Date().toISOString(),
        read: false
      });
      
      console.log(`[NOTIFICATION] Notification sent successfully, doc ID: ${docRef.id}`);
      toast.success(`Notification sent to ${notificationForm.resellerName}`);
      setNotificationDialogOpen(false);
    } catch (error) {
      console.error("[NOTIFICATION] Error sending notification:", error);
      toast.error("Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (reseller: Reseller) => {
    setEditForm({
      id: reseller.id,
      shopName: reseller.shopName,
      level: reseller.level,
      productLimit: reseller.productLimit,
      starRating: reseller.starRating,
      creditScore: reseller.creditScore
    });
    setEditDialogOpen(true);
  };
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Retail-shops</h1>
          <p className="text-sm text-muted-foreground">
            Manage your network of resellers and retail partners.
          </p>
          {session?.role === 'Owner' && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 text-[10px] font-mono text-blue-700 dark:text-blue-300">
              DEBUG: Total Resellers: {resellers.length} | Filtered: {filtered.length} | CanSeeAll: {canSeeAll ? 'YES' : 'NO'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 h-8" 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["resellers"] });
              toast.success("Refreshing data...");
            }}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 h-8" 
            onClick={async () => {
              if (!confirm("Are you sure you want to verify all unverified resellers?")) return;
              setLoading(true);
              try {
                const profilesRef = collection(db, 'reseller_profiles');
                const q = query(profilesRef, where('verified', '==', false));
                const snapshot = await getDocs(q);
                
                let count = 0;
                // We can't use batch easily because we also need to check retail_shops
                // But we can just update them one by one or use Promise.all
                const updatePromises = snapshot.docs.map(async (docSnapshot) => {
                  try {
                    await updateDoc(doc(db, 'reseller_profiles', docSnapshot.id), { verified: true });
                    
                    // Also ensure retail_shop exists
                    const shopRef = doc(db, 'retail_shops', docSnapshot.id);
                    const shopDoc = await getDocs(query(collection(db, 'retail_shops'), where('__name__', '==', docSnapshot.id)));
                    if (shopDoc.empty) {
                      const data = docSnapshot.data();
                      await setDoc(shopRef, {
                        reseller_id: data.reseller_id || 0,
                        shop_name: data.shop_name || 'My Store',
                        level: 'VIP-0',
                        product_limit: 20,
                        star_rating: 2.0,
                        credit_score: 100,
                        created_at: new Date().toISOString()
                      });
                    }
                    count++;
                  } catch (err) {
                    console.error("Failed to verify reseller", docSnapshot.id, err);
                  }
                });
                
                await Promise.all(updatePromises);
                
                toast.success(`Successfully verified ${count} resellers`);
                queryClient.invalidateQueries({ queryKey: ["resellers"] });
              } catch (e) {
                console.error(e);
                toast.error("An error occurred");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Verify All
          </Button>
          <Button size="sm" className="gap-1.5 h-8" onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" />
            Add Reseller
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 w-full sm:w-72">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search resellers..." 
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
                {["Reseller", "Shop Details", "Admin Member", "Referral ID", "Shop Level", "Product Limit", "Star Rating", "Credit Score", "Actions"].map((h) => (
                  <th key={h} className="text-left p-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">No resellers found.</td>
                </tr>
              ) : (
                filtered.map((reseller) => (
                  <tr key={reseller.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {reseller.firstName[0]}{reseller.lastName[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{reseller.firstName} {reseller.lastName}</span>
                          <span className="text-xs text-muted-foreground">{(String(reseller.resellerId || '').startsWith('1CR') || !/^\d+$/.test(String(reseller.resellerId || ''))) ? reseller.resellerId : '1CR' + reseller.resellerId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <Store className="h-3 w-3 text-muted-foreground" />
                          {reseller.shopName}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          Main Office
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {(() => {
                        const admin = dbAdmins?.find(a => a.account_id === reseller.memberOfAdminId);
                        const staff = dbStaff?.find(s => s.id === reseller.referredBy || s.staff_id === reseller.referredBy);
                        const name = admin?.name || staff?.name || reseller.memberOfAdminId || t("admin.directRegistration");
                        return (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{name}</span>
                            {reseller.memberOfAdminId && (
                              <span className="text-[10px] text-muted-foreground font-mono">{reseller.memberOfAdminId}</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                        {reseller.referralId}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${vipColors[reseller.level] || vipColors["VIP-0"]}`}>
                        {reseller.level}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        {reseller.productLimit}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        {reseller.starRating}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <ShieldCheck className="h-3 w-3 text-emerald-500" />
                        {reseller.creditScore}
                      </div>
                    </td>
                    <td className="p-3.5 pr-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-md hover:bg-accent transition-colors">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(reseller)}>
                            Edit Shop
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => {
                            setNotificationForm({
                              resellerId: reseller.id,
                              resellerName: `${reseller.firstName} ${reseller.lastName}`,
                              message: PREDEFINED_MESSAGE
                            });
                            setNotificationDialogOpen(true);
                          }}>
                            <Bell className="h-4 w-4" />
                            Send Notification
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            View Shop
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => handleResetUnpickedBalance(reseller.id)}>
                            <TrendingUp className="h-4 w-4" />
                            Reset Unpicked Balance
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => handleDeactivateReseller(reseller.id)}>
                            Deactivate
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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Retail Shop</DialogTitle>
            <DialogDescription>Adjust shop settings and limits.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Shop Name</label>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                <Store className="h-4 w-4 text-muted-foreground" />
                <Input className="border-none p-0 h-auto" value={editForm.shopName} onChange={e => setEditForm({...editForm, shopName: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Shop Level</label>
                <select 
                  className="w-full flex items-center gap-2 border rounded-lg px-3 py-2 bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={editForm.level}
                  onChange={(e) => {
                    const newLevel = e.target.value;
                    setEditForm({
                      ...editForm, 
                      level: newLevel,
                      productLimit: levelToProductLimit[newLevel] || editForm.productLimit
                    });
                  }}
                >
                  {Object.keys(vipColors).map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Product Limit</label>
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <Input type="number" className="border-none p-0 h-auto" value={editForm.productLimit} onChange={e => setEditForm({...editForm, productLimit: parseInt(e.target.value) || 0})} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Star Rating</label>
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                  <Star className="h-4 w-4 text-amber-500" />
                  <Input type="number" step="0.1" min="0" max="5" className="border-none p-0 h-auto" value={editForm.starRating} onChange={e => setEditForm({...editForm, starRating: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Credit Score</label>
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <Input type="number" className="border-none p-0 h-auto" value={editForm.creditScore} onChange={e => setEditForm({...editForm, creditScore: parseInt(e.target.value) || 0})} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditReseller} disabled={loading}>{loading ? "Updating..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Reseller</DialogTitle>
            <DialogDescription>Register a new reseller and their retail shop.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input className="border-none p-0 h-auto" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="John" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input className="border-none p-0 h-auto" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Doe" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input type="email" className="border-none p-0 h-auto" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Input type="password" className="border-none p-0 h-auto" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Shop Name</label>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                <Store className="h-4 w-4 text-muted-foreground" />
                <Input className="border-none p-0 h-auto" value={form.shopName} onChange={e => setForm({...form, shopName: e.target.value})} placeholder="My Awesome Store" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddReseller} disabled={loading}>{loading ? "Creating..." : "Create Reseller"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send a direct notification to {notificationForm.resellerName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea 
                className="mt-1.5 min-h-[120px]" 
                value={notificationForm.message} 
                onChange={e => setNotificationForm({...notificationForm, message: e.target.value})} 
                placeholder="Type your notification message here..."
              />
              <p className="text-xs text-muted-foreground mt-2">
                This will be sent directly to the reseller's notification center. They cannot reply to this message.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendNotification} disabled={loading}>
              {loading ? "Sending..." : "Send Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
