import { useState, useMemo, useEffect } from "react";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useAdminAuth } from "@/lib/admin-auth-context-hooks";
import { useUnifiedResellers } from "@/lib/unified-hooks";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal, Search, Eye, CheckCircle, XCircle,
  Filter, ChevronLeft, ChevronRight, Download, Landmark, Bitcoin, Settings, QrCode
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";

import { useDepositRequests, useFinancialMutations, DepositRequest } from "@/hooks/use-financial-requests";

const PAGE_SIZE = 10;

export default function ARSDepositPage() {
  const { session } = useAdminAuth();
  const { toast } = useToast();
  const resellers = useUnifiedResellers();
  const { canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds } = useAdminAccess();
  const { data: requests = [], isLoading, isError, error, refetch } = useDepositRequests();
  const { updateDepositStatus } = useFinancialMutations();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewRequest, setViewRequest] = useState<DepositRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<DepositRequest | null>(null);
  const [rejectRemark, setRejectRemark] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [usdtAddress, setUsdtAddress] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch Deposit Settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!session) return;
      try {
        const configDocId = session.role === "Owner" ? "deposit_config" : `deposit_config_${session.accountId || session.uid}`;
        const docRef = doc(db, "system_settings", configDocId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUsdtAddress(data.usdtAddress || "");
          setQrCodeUrl(data.qrCodeUrl || "");
        } else if (session.role !== "Owner") {
          // Fallback to global config if no specific config exists yet
          const globalRef = doc(db, "system_settings", "deposit_config");
          const globalSnap = await getDoc(globalRef);
          if (globalSnap.exists()) {
            const data = globalSnap.data();
            setUsdtAddress(data.usdtAddress || "");
            setQrCodeUrl(data.qrCodeUrl || "");
          }
        }
      } catch (error) {
        console.error("Error fetching deposit settings:", error);
      }
    };
    fetchSettings();
  }, [session]);

  const handleSaveSettings = async () => {
    if (!session) return;
    setSavingSettings(true);
    try {
      const configDocId = session.role === "Owner" ? "deposit_config" : `deposit_config_${session.accountId || session.uid}`;
      const docRef = doc(db, "system_settings", configDocId);
      await setDoc(docRef, {
        usdtAddress,
        qrCodeUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: session.role
      }, { merge: true });
      toast({ title: "Settings Saved", description: "Deposit configuration updated successfully." });
      setShowSettings(false);
    } catch (error) {
      console.error("Error saving deposit settings:", error);
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  /* ─── Filtering ─── */
  const filtered = useMemo(() => {
    let list = requests.filter((r) => {
      if (canSeeAll) return true;
      
      const reseller = resellers.find(res => res.id === r.resellerDocId);
      
      // Request might have the staff ID or referral ID, or we fetch from unifiedResellers
      const referralId = r.referralId || reseller?.referralId;
      const memberOfAdminId = r.memberOfAdminId || reseller?.memberOfAdminId;
      const referredBy = reseller?.referredBy;

      if ((referralId && allowedReferralIds.includes(referralId)) ||
          (memberOfAdminId && allowedAdminIds.includes(memberOfAdminId)) ||
          (referredBy && (allowedStaffIds.includes(String(referredBy)) || allowedStaffDocIds.includes(String(referredBy))))) {
        return true;
      }
      
      return false;
    });

    const enriched = list.map((r) => {
      const reseller = resellers.find(res => res.id === r.resellerDocId);
      return {
        ...r,
        resellerName: reseller ? reseller.name : r.resellerName || 'N/A',
        resellerId: reseller ? `1CR${reseller.resellerId}` : r.resellerId || 'N/A',
      };
    });
    list = enriched;

    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => {
          const reseller = resellers.find(res => res.id === r.resellerDocId);
          return (r.resellerId || '').toLowerCase().includes(q) ||
                 (r.resellerName || '').toLowerCase().includes(q) ||
                 (r.referralId || '').toLowerCase().includes(q) ||
                 (r.staffId || '').toLowerCase().includes(q) ||
                 (reseller && (
                   (reseller.shopName || '').toLowerCase().includes(q) ||
                   reseller.resellerId?.toString().includes(q)
                 ));
        }
      );
    }
    return list;
  }, [requests, search, statusFilter, canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds, resellers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="text-destructive font-semibold">Error loading deposit requests</div>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          {error instanceof Error ? error.message : "You might not have sufficient permissions to view this data."}
        </p>
        <Button onClick={() => refetch()}>Retry Loading</Button>
      </div>
    );
  }

  /* ─── Actions ─── */

  const handleApprove = async (req: DepositRequest) => {
    if (!req.resellerDocId) {
      toast({ title: "Error", description: "Missing reseller document ID.", variant: "destructive" });
      return;
    }
    setProcessingId(req.id);
    try {
      // 1. Update the deposit request status in Firestore
      await updateDepositStatus.mutateAsync({ id: req.id, status: "Approved" });
      
      // 2. Update the reseller's profile in Firestore to increment total_deposits
      // and increment balance
      const resellerRef = doc(db, "reseller_profiles", req.resellerDocId);
      const retailShopRef = doc(db, "retail_shops", req.resellerDocId);
      
      const currentReseller = resellers.find(r => r.id === req.resellerDocId);
      const newTotalDeposits = (currentReseller?.totalDeposits || 0) + req.amount;
      const newBalance = (currentReseller?.balance || 0) + req.amount;

      // Update reseller_profiles
      await setDoc(resellerRef, {
        total_deposits: newTotalDeposits,
        balance: newBalance,
        updated_at: new Date().toISOString()
      }, { merge: true });

      // 3. Calculate and update VIP level and product limit in retail_shops
      const { calculateVipLevel, getVipLabel, getVipProductLimit } = await import("@/lib/vip-utils");
      
      const totalWithdrawals = currentReseller?.totalWithdrawals || 0;
      const netDeposits = newTotalDeposits - totalWithdrawals;
      const currentLevel = typeof currentReseller?.level === 'string' 
        ? Number(currentReseller.level.replace('VIP-', '')) 
        : Number(currentReseller?.level || 0);

      const newLevel = calculateVipLevel(netDeposits, currentLevel);
      const newLimit = getVipProductLimit(newLevel);
      const levelLabel = getVipLabel(newLevel);

      await setDoc(retailShopRef, {
        level: levelLabel,
        product_limit: newLimit,
        updated_at: new Date().toISOString()
      }, { merge: true });

      toast({ 
        title: "Deposit Approved", 
        description: `The amount of $${req.amount.toLocaleString()} has been added. Reseller is now ${levelLabel} with a ${newLimit} product limit.` 
      });
    } catch (e) {
      console.error("Error approving deposit:", e);
      toast({ title: "Error", description: "Failed to process deposit approval.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectRequest) return;
    setProcessingId(rejectRequest.id);
    try {
      await updateDepositStatus.mutateAsync({ 
        id: rejectRequest.id, 
        status: "Rejected", 
        remark: rejectRemark 
      });
      toast({ title: "Deposit Rejected", description: "The request has been marked as rejected." });
      setRejectRequest(null);
      setRejectRemark("");
    } catch (e) {
      console.error("Error rejecting deposit:", e);
      toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">ARS Management &gt; Deposit Requests</p>
          <h1 className="text-2xl font-bold text-foreground">Deposit Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and process reseller deposit requests. Verify payment proofs before approval.
          </p>
        </div>
        {session?.role === "Owner" && (
          <Button 
            variant="outline" 
            className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
            Payment Settings
          </Button>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Reseller ID, Name, Referral or Staff..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[170px] bg-background">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Reseller ID</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Reseller Name</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Method</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Deposit Amount</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
              <TableHead className="w-10 text-xs font-bold uppercase tracking-wider">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No deposit requests found.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((req) => (
                <TableRow key={req.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {req.createdAt ? format(new Date(req.createdAt), "MMM dd, yyyy HH:mm") : "N/A"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#009000]">
                    {req.resellerId}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {req.resellerName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs">
                      {req.method === "Bank Transfer" ? <Landmark className="h-3 w-3" /> : <Bitcoin className="h-3 w-3" />}
                      {req.method}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    ${req.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={req.status === "Approved" ? "default" : req.status === "Rejected" ? "destructive" : "outline"}
                      className={req.status === "Approved" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                    >
                      {req.status}
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
                        <DropdownMenuItem onClick={() => setViewRequest(req)}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        {req.status === "Pending" && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(req)} className="text-emerald-600">
                              <CheckCircle className="h-4 w-4 mr-2" /> Accept Deposit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRejectRequest(req)} className="text-destructive">
                              <XCircle className="h-4 w-4 mr-2" /> Request Rejected
                            </DropdownMenuItem>
                          </>
                        )}
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
        <span>{filtered.length} requests total</span>
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
      <Dialog open={!!viewRequest} onOpenChange={(o) => !o && setViewRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deposit Details — {viewRequest?.resellerName}</DialogTitle>
            <DialogDescription>Review the payment screenshot and transaction details.</DialogDescription>
          </DialogHeader>
          {viewRequest && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
                  <h3 className="font-semibold text-sm border-b border-border pb-2">Request Summary</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-lg text-primary">${viewRequest.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Method:</span>
                    <span className="font-medium">{viewRequest.method}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Payment Information</h3>
                  {viewRequest.method === "Bank Transfer" && viewRequest.bankInfo && (
                    <div className="space-y-2 text-sm p-4 rounded-lg border border-border bg-card">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank Name:</span>
                        <span className="font-medium">{viewRequest.bankInfo.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name:</span>
                        <span className="font-medium">{viewRequest.bankInfo.accountName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Number:</span>
                        <span className="font-mono">{viewRequest.bankInfo.accountNumber}</span>
                      </div>
                    </div>
                  )}
                  {viewRequest.method === "USDT (TRC20)" && (
                    <div className="space-y-2 text-sm p-4 rounded-lg border border-border bg-card">
                      <div className="text-muted-foreground mb-1">USDT TRC20 Address:</div>
                      <div className="font-mono text-xs bg-muted p-2 rounded break-all select-all">
                        {viewRequest.usdtAddress}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Reseller ID:</span>
                    <span className="font-mono">{viewRequest.resellerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Staff Name:</span>
                    <span className="font-medium">{viewRequest.staffId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Admin ID:</span>
                    <span className="font-mono">{viewRequest.adminId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date Requested:</span>
                    <span>{viewRequest.createdAt ? format(new Date(viewRequest.createdAt), "yyyy-MM-dd HH:mm") : "N/A"}</span>
                  </div>
                </div>
                
                {viewRequest.status === "Pending" && (
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleApprove(viewRequest); setViewRequest(null); }}>
                      Accept Deposit
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => { setRejectRequest(viewRequest); setViewRequest(null); }}>
                      Request Rejected
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Payment Proof Screenshot</h3>
                <div className="aspect-[3/4] rounded-lg border border-border overflow-hidden bg-black flex items-center justify-center">
                  <img 
                    src={viewRequest.proofImage} 
                    alt="Payment Proof" 
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectRequest} onOpenChange={(o) => !o && setRejectRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Deposit Request</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this deposit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Remark</label>
              <Textarea 
                placeholder="e.g., Screenshot is blurry, Transaction ID mismatch..." 
                value={rejectRemark}
                onChange={(e) => setRejectRemark(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRequest(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectRemark.trim()}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Deposit Payment Settings
            </DialogTitle>
            <DialogDescription>
              Configure the USDT address and QR code shown to resellers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="usdt-address">USDT TRC20 Address</Label>
              <div className="relative">
                <Bitcoin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="usdt-address"
                  placeholder="Enter USDT TRC20 Wallet Address"
                  className="pl-9"
                  value={usdtAddress}
                  onChange={(e) => setUsdtAddress(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">This address will be visible to all resellers in their deposit section.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qr-url">Custom QR Code URL (Optional)</Label>
              <div className="relative">
                <QrCode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="qr-url"
                  placeholder="https://example.com/qr-code.png"
                  className="pl-9"
                  value={qrCodeUrl}
                  onChange={(e) => setQrCodeUrl(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">If left empty, a QR code will be auto-generated from the USDT address.</p>
            </div>

            {usdtAddress && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Preview QR Code</span>
                <div className="bg-white p-2 rounded-lg border border-border">
                  <img 
                    src={qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${usdtAddress}`}
                    alt="QR Preview"
                    className="h-32 w-32 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveSettings} 
              disabled={savingSettings || !usdtAddress.trim()}
              className="gap-2"
            >
              {savingSettings ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
