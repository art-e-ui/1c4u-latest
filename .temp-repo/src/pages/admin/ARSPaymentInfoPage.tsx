import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc } from "firebase/firestore";
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine, Clock, Search,
  DollarSign, TrendingUp, TrendingDown, CreditCard, Eye,
  ChevronDown, Filter, BarChart3, Package, Trash2, Edit2, Save, X,
  Plus, Minus
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { LEVEL_PROFIT_MAP } from "@/lib/reseller-context-hooks";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { calculateVipLevel, getVipLabel, getVipMarginProfit, getVipProductLimit } from "@/lib/vip-utils";
import { useUnifiedResellers } from "@/lib/unified-hooks";

const VIP_LABELS = ["VIP-0", "VIP-1", "VIP-2", "VIP-3", "VIP-4", "VIP-5"];

interface ResellerFinancial {
  id: string;
  resellerId: number;
  name: string;
  level: number;
  vipLabel: string;
  availableBalance: number;
  pendingBalance: number;
  unpickedAmount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalEarnings: number;
  totalOrders: number;
  profitMargin: number;
  withdrawalInfo: {
    usdtAddress?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };
  lastActivity: string;
}

interface RawReseller {
  id: string;
  reseller_id?: number;
  level?: number;
  balance?: number;
  pending_balance?: number;
  total_deposits?: number;
  total_withdrawals?: number;
  total_earnings?: number;
  total_orders?: number;
  users?: {
    first_name?: string;
    last_name?: string;
  };
  updated_at?: string;
  created_at?: string;
  referral_code?: string;
  referral_id?: string;
  referred_by_staff_id?: string;
  member_of_admin_id?: string;
}

interface RawOrder {
  id: string;
  reseller_id?: string;
  status?: string;
  total_amount?: number;
}

interface RawUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export default function ARSPaymentInfoPage() {
  const { allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds, canSeeAll } = useAdminAccess();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedReseller, setSelectedReseller] = useState<ResellerFinancial | null>(null);
  const [resellerToDelete, setResellerToDelete] = useState<ResellerFinancial | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    level: 0,
    availableBalance: 0,
    pendingBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalEarnings: 0,
    usdtAddress: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
  });
  
  const [adjustmentMode, setAdjustmentMode] = useState<'none' | 'add' | 'sub'>('none');
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  
  const queryClient = useQueryClient();
  const unifiedResellers = useUnifiedResellers();

  // We no longer need to fetch all orders, users, and shops here.
  // unpickedBalance is now in useUnifiedResellers.
  const financialRaw = { orders: [], users: [], shops: [] }; 

  const deleteResellerMutation = useMutation({
    mutationFn: async (resellerId: string) => {
      await Promise.all([
        deleteDoc(doc(db, "reseller_profiles", resellerId)),
        deleteDoc(doc(db, "retail_shops", resellerId))
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-financial-extra-data"] });
      toast.success("Reseller profile deleted successfully");
      setResellerToDelete(null);
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "An error occurred";
      toast.error(`Error deleting reseller: ${message}`);
      setResellerToDelete(null);
    },
  });

  const updateResellerMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Record<string, unknown> }) => {
      const profileUpdates: Record<string, unknown> = {};
      const shopUpdates: Record<string, unknown> = {};

      if (data.updates.balance !== undefined) profileUpdates.balance = data.updates.balance;
      if (data.updates.pending_balance !== undefined) profileUpdates.pending_balance = data.updates.pending_balance;
      if (data.updates.total_deposits !== undefined) profileUpdates.total_deposits = data.updates.total_deposits;
      if (data.updates.total_withdrawals !== undefined) profileUpdates.total_withdrawals = data.updates.total_withdrawals;
      if (data.updates.total_earnings !== undefined) profileUpdates.total_earnings = data.updates.total_earnings;
      
      if (data.updates.usdtAddress !== undefined) profileUpdates.usdt_address = data.updates.usdtAddress;
      if (data.updates.bankInfo !== undefined) profileUpdates.bank_info = data.updates.bankInfo;

      if (data.updates.level !== undefined) {
        profileUpdates.level = data.updates.level;
        shopUpdates.level = `VIP-${data.updates.level}`;
        shopUpdates.product_limit = getVipProductLimit(data.updates.level as number);
      }

      const promises = [];
      if (Object.keys(profileUpdates).length > 0) {
        promises.push(setDoc(doc(db, "reseller_profiles", data.id), {
          ...profileUpdates,
          updated_at: new Date().toISOString()
        }, { merge: true }));
      }
      if (Object.keys(shopUpdates).length > 0) {
        promises.push(setDoc(doc(db, "retail_shops", data.id), {
          ...shopUpdates,
          updated_at: new Date().toISOString()
        }, { merge: true }));
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-financial-extra-data"] });
      toast.success("Reseller financial data updated");
      setIsEditing(false);
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "An error occurred";
      toast.error(`Error updating reseller: ${message}`);
    },
  });

  const orders = financialRaw.orders;
  const users = financialRaw.users;

  const filteredResellers = useMemo(() => {
    console.log("Filtering resellers. canSeeAll:", canSeeAll, "Total unified:", unifiedResellers.length);
    
    if (canSeeAll) return unifiedResellers;
    
    const filtered = unifiedResellers.filter((r) => {
      const referredBy = r.referredBy;
      const memberOfAdminId = r.memberOfAdminId;
      
      const isMatch = (referredBy && (allowedReferralIds.includes(String(referredBy)) || allowedStaffIds.includes(String(referredBy)) || allowedStaffDocIds.includes(String(referredBy)))) ||
             (memberOfAdminId && allowedAdminIds.includes(String(memberOfAdminId)));
      
      if (!isMatch) {
        console.log("Reseller filtered out:", r.id, "referredBy:", referredBy, "memberOfAdminId:", memberOfAdminId);
      }
      return isMatch;
    });
    
    console.log("Filtered resellers count:", filtered.length);
    return filtered;
  }, [unifiedResellers, canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds]);

  // Build financial data from filtered resellers
  const financialData: ResellerFinancial[] = useMemo(() => {
    return filteredResellers.map((r) => {
      const resellerId = r.id;
      
      const unpickedAmount = r.unpickedBalance || 0;
      const totalDeposits = r.totalDeposits || 0;
      const availableBalance = r.balance || 0;
      const pendingBalance = r.pendingBalance || 0;
      const totalWithdrawals = r.totalWithdrawals || 0;
      const totalEarnings = r.totalEarnings || 0;
      const totalOrders = r.totalOrders || 0;

      // Automatic VIP level calculation based on net deposits (deposits - withdrawals)
      const netDeposits = totalDeposits - totalWithdrawals;
      const storedLevel = typeof r.level === 'string' ? Number(r.level.replace('VIP-', '')) : Number(r.level || 0);
      const finalLevel = calculateVipLevel(netDeposits, storedLevel);

      return {
        id: resellerId,
        resellerId: r.resellerId || 0,
        name: r.name || 'Unknown',
        level: finalLevel,
        vipLabel: getVipLabel(finalLevel),
        availableBalance,
        pendingBalance,
        unpickedAmount,
        totalDeposits,
        totalWithdrawals,
        totalEarnings,
        totalOrders,
        profitMargin: getVipMarginProfit(finalLevel) * 100,
        withdrawalInfo: {
          usdtAddress: r.usdtAddress,
          bankName: r.bankInfo?.bankName,
          accountName: r.bankInfo?.accountName,
          accountNumber: r.bankInfo?.accountNumber,
        }, 
        lastActivity: r.registrationDate || new Date().toISOString()
      };
    });
  }, [filteredResellers]);

  // Aggregated totals
  const totals = useMemo(() => {
    return financialData.reduce(
      (acc, r) => ({
        totalAvailable: acc.totalAvailable + r.availableBalance,
        totalPending: acc.totalPending + r.pendingBalance,
        totalUnpicked: acc.totalUnpicked + r.unpickedAmount,
        totalDeposits: acc.totalDeposits + r.totalDeposits,
        totalWithdrawals: acc.totalWithdrawals + r.totalWithdrawals,
        totalEarnings: acc.totalEarnings + r.totalEarnings,
      }),
      { totalAvailable: 0, totalPending: 0, totalUnpicked: 0, totalDeposits: 0, totalWithdrawals: 0, totalEarnings: 0 }
    );
  }, [financialData]);

  // Filter
  const filtered = useMemo(() => {
    return financialData.filter((r) => {
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        String(r.resellerId).includes(search);
      const matchLevel = levelFilter === "all" || r.level === Number(levelFilter);
      return matchSearch && matchLevel;
    });
  }, [financialData, search, levelFilter]);

  const handleEdit = () => {
    if (!selectedReseller) return;
    setEditForm({
      level: selectedReseller.level,
      availableBalance: selectedReseller.availableBalance,
      pendingBalance: selectedReseller.pendingBalance,
      totalDeposits: selectedReseller.totalDeposits,
      totalWithdrawals: selectedReseller.totalWithdrawals,
      totalEarnings: selectedReseller.totalEarnings,
      usdtAddress: selectedReseller.withdrawalInfo.usdtAddress || "",
      bankName: selectedReseller.withdrawalInfo.bankName || "",
      accountName: selectedReseller.withdrawalInfo.accountName || "",
      accountNumber: selectedReseller.withdrawalInfo.accountNumber || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedReseller) return;
    updateResellerMutation.mutate({
      id: selectedReseller.id,
      updates: {
        level: editForm.level,
        balance: editForm.availableBalance,
        pending_balance: editForm.pendingBalance,
        total_deposits: editForm.totalDeposits,
        total_withdrawals: editForm.totalWithdrawals,
        total_earnings: editForm.totalEarnings,
        usdtAddress: editForm.usdtAddress,
        bankInfo: {
          bankName: editForm.bankName,
          accountName: editForm.accountName,
          accountNumber: editForm.accountNumber,
        }
      }
    });
  };

  const handleApplyAdjustment = () => {
    const amount = Number(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    const newBalance = adjustmentMode === 'add' 
      ? editForm.availableBalance + amount 
      : editForm.availableBalance - amount;
      
    setEditForm(prev => ({ ...prev, availableBalance: newBalance }));
    setAdjustmentMode('none');
    setAdjustmentAmount("");
    toast.success(`Balance ${adjustmentMode === 'add' ? 'increased' : 'decreased'} by ${fmt(amount)}`);
  };

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Info's & Balance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Financial overview for all registered resellers
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs gap-1 self-start">
            <BarChart3 className="h-3 w-3" />
            {financialData.length} Resellers
          </Badge>
        </div>
      </div>
...
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <SummaryCard
          icon={Wallet}
          label="Total Available Balance"
          value={fmt(totals.totalAvailable)}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <SummaryCard
          icon={Clock}
          label="Total Pending Balance"
          value={fmt(totals.totalPending)}
          color="text-warning"
          bgColor="bg-warning/10"
        />
        <SummaryCard
          icon={Package}
          label="Total Unpicked"
          value={fmt(totals.totalUnpicked)}
          color="text-orange-500"
          bgColor="bg-orange-500/10"
        />
        <SummaryCard
          icon={ArrowDownToLine}
          label="Total Deposits"
          value={fmt(totals.totalDeposits)}
          color="text-success"
          bgColor="bg-success/10"
        />
        <SummaryCard
          icon={ArrowUpFromLine}
          label="Total Withdrawal"
          value={fmt(totals.totalWithdrawals)}
          color="text-destructive"
          bgColor="bg-destructive/10"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Total Earnings"
          value={fmt(totals.totalEarnings)}
          color="text-primary"
          bgColor="bg-primary/10"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or Reseller ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="VIP Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {VIP_LABELS.map((label, i) => (
              <SelectItem key={i} value={String(i)}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Reseller ID</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">VIP</TableHead>
                <TableHead className="text-xs text-right">Available</TableHead>
                <TableHead className="text-xs text-right">Pending</TableHead>
                <TableHead className="text-xs text-right">Unpicked</TableHead>
                <TableHead className="text-xs text-right">Deposits</TableHead>
                <TableHead className="text-xs text-right">Withdrawal</TableHead>
                <TableHead className="text-xs text-right">Earnings</TableHead>
                <TableHead className="text-xs text-right">Margin</TableHead>
                <TableHead className="text-xs text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    {financialData.length === 0
                      ? "No resellers registered yet"
                      : "No results match your filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-xs text-primary">GRS{r.resellerId}</TableCell>
                    <TableCell className="font-medium text-sm">{r.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{r.vipLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-foreground">
                      {fmt(r.availableBalance)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-warning">
                      {fmt(r.pendingBalance)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-orange-500 font-medium">
                      {fmt(r.unpickedAmount)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-success">
                      {fmt(r.totalDeposits)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-destructive">
                      {fmt(r.totalWithdrawals)}
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmt(r.totalEarnings)}</TableCell>
                    <TableCell className="text-right text-sm">{r.profitMargin.toFixed(0)}%</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setSelectedReseller(r)}
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => setResellerToDelete(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReseller} onOpenChange={(open) => {
        if (!open) {
          setSelectedReseller(null);
          setIsEditing(false);
          setAdjustmentMode('none');
          setAdjustmentAmount("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Details — {selectedReseller?.name}
            </DialogTitle>
            {!isEditing ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleEdit}>
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setIsEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button size="sm" className="h-8 gap-1.5" onClick={handleSave} disabled={updateResellerMutation.isPending}>
                  <Save className="h-3.5 w-3.5" />
                  {updateResellerMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </DialogHeader>
          {selectedReseller && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <InfoBlock label="Reseller ID" value={`GRS${selectedReseller.resellerId}`} />
                
                {isEditing ? (
                  <div className="rounded-lg bg-muted/20 border border-border p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">VIP Level</p>
                    <Select 
                      value={String(editForm.level)} 
                      onValueChange={(val) => setEditForm(prev => ({ ...prev, level: Number(val) }))}
                    >
                      <SelectTrigger className="h-7 text-sm mt-1 px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIP_LABELS.map((label, i) => (
                          <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <InfoBlock label="VIP Level" value={selectedReseller.vipLabel} />
                )}

                <EditableInfoBlock 
                  label="Available Balance" 
                  value={fmt(selectedReseller.availableBalance)} 
                  accent 
                  isEditing={isEditing}
                  inputValue={editForm.availableBalance}
                  onChange={(val) => setEditForm(prev => ({ ...prev, availableBalance: Number(val) }))}
                >
                  <div className="mt-2 flex flex-col gap-1.5">
                    {adjustmentMode === 'none' ? (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 flex-1 gap-1 text-[9px] uppercase font-bold border-primary/20 hover:bg-primary/5 text-primary"
                          onClick={() => setAdjustmentMode('add')}
                        >
                          <Plus className="h-2.5 w-2.5" /> Add
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 flex-1 gap-1 text-[9px] uppercase font-bold border-destructive/20 hover:bg-destructive/5 text-destructive"
                          onClick={() => setAdjustmentMode('sub')}
                        >
                          <Minus className="h-2.5 w-2.5" /> Sub
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 items-center bg-background/50 p-1 rounded-md border border-border">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={adjustmentAmount}
                          onChange={(e) => setAdjustmentAmount(e.target.value)}
                          className="h-6 text-[10px] flex-1 bg-background"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          className="h-6 px-2 text-[9px] uppercase font-bold"
                          onClick={handleApplyAdjustment}
                        >
                          Save
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setAdjustmentMode('none');
                            setAdjustmentAmount("");
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </EditableInfoBlock>
                <EditableInfoBlock 
                  label="Pending Balance" 
                  value={fmt(selectedReseller.pendingBalance)} 
                  isEditing={isEditing}
                  inputValue={editForm.pendingBalance}
                  onChange={(val) => setEditForm(prev => ({ ...prev, pendingBalance: Number(val) }))}
                />
                <InfoBlock label="Unpicked Amount" value={fmt(selectedReseller.unpickedAmount)} />
                <EditableInfoBlock 
                  label="Total Deposits" 
                  value={fmt(selectedReseller.totalDeposits)} 
                  isEditing={isEditing}
                  inputValue={editForm.totalDeposits}
                  onChange={(val) => setEditForm(prev => ({ ...prev, totalDeposits: Number(val) }))}
                />
                <EditableInfoBlock 
                  label="Total Withdrawals" 
                  value={fmt(selectedReseller.totalWithdrawals)} 
                  isEditing={isEditing}
                  inputValue={editForm.totalWithdrawals}
                  onChange={(val) => setEditForm(prev => ({ ...prev, totalWithdrawals: Number(val) }))}
                />
                <EditableInfoBlock 
                  label="Total Earnings" 
                  value={fmt(selectedReseller.totalEarnings)} 
                  isEditing={isEditing}
                  inputValue={editForm.totalEarnings}
                  onChange={(val) => setEditForm(prev => ({ ...prev, totalEarnings: Number(val) }))}
                />
                <InfoBlock label="Profit Margin" value={`${selectedReseller.profitMargin.toFixed(0)}%`} />
              </div>

              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Withdrawal Information
                </h4>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1.5">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">USDT Address (TRC20)</label>
                      <Input 
                        value={editForm.usdtAddress} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, usdtAddress: e.target.value }))}
                        className="h-8 text-xs"
                        placeholder="TRC20 Address"
                      />
                    </div>
                    <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-2">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Bank Details</label>
                      <div className="space-y-1.5">
                        <Input 
                          value={editForm.bankName} 
                          onChange={(e) => setEditForm(prev => ({ ...prev, bankName: e.target.value }))}
                          className="h-8 text-xs"
                          placeholder="Bank Name"
                        />
                        <Input 
                          value={editForm.accountName} 
                          onChange={(e) => setEditForm(prev => ({ ...prev, accountName: e.target.value }))}
                          className="h-8 text-xs"
                          placeholder="Account Name"
                        />
                        <Input 
                          value={editForm.accountNumber} 
                          onChange={(e) => setEditForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                          className="h-8 text-xs"
                          placeholder="Account Number"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {selectedReseller.withdrawalInfo.usdtAddress ? (
                      <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1.5 mb-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs text-muted-foreground">USDT (TRC20)</span>
                        </div>
                        <p className="text-xs font-mono break-all text-foreground">
                          {selectedReseller.withdrawalInfo.usdtAddress}
                        </p>
                      </div>
                    ) : null}
                    
                    {selectedReseller.withdrawalInfo.bankName ? (
                      <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1">
                        <p className="text-xs"><span className="text-muted-foreground">Bank:</span> {selectedReseller.withdrawalInfo.bankName}</p>
                        <p className="text-xs"><span className="text-muted-foreground">Account Name:</span> {selectedReseller.withdrawalInfo.accountName}</p>
                        <p className="text-xs"><span className="text-muted-foreground">Account #:</span> {selectedReseller.withdrawalInfo.accountNumber}</p>
                      </div>
                    ) : (
                      !selectedReseller.withdrawalInfo.usdtAddress && (
                        <p className="text-xs text-muted-foreground italic">
                          No withdrawal method configured
                        </p>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!resellerToDelete} onOpenChange={() => setResellerToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Reseller</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{resellerToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResellerToDelete(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => resellerToDelete && deleteResellerMutation.mutate(resellerToDelete.id)}
              disabled={deleteResellerMutation.isPending}
            >
              {deleteResellerMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground tracking-tight">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/20 border border-border p-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function EditableInfoBlock({ 
  label, 
  value, 
  accent, 
  isEditing, 
  inputValue,
  onChange,
  children
}: { 
  label: string; 
  value: string; 
  accent?: boolean;
  isEditing?: boolean;
  inputValue?: number;
  onChange?: (val: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/20 border border-border p-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      {isEditing ? (
        <Input
          type="number"
          step="0.01"
          value={inputValue}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-7 text-sm mt-1 px-2"
        />
      ) : (
        <p className={`text-sm font-semibold mt-0.5 ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      )}
      {isEditing && children}
    </div>
  );
}
