import { useState, useMemo } from "react";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useUnifiedResellers } from "@/lib/unified-hooks";
import { db } from "@/lib/firebase";
import { doc, setDoc, runTransaction } from "firebase/firestore";
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
  Filter, ChevronLeft, ChevronRight, Download, CreditCard, Landmark, Bitcoin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

import { useWithdrawalRequests, useFinancialMutations, WithdrawalRequest } from "@/hooks/use-financial-requests";

const PAGE_SIZE = 10;

export default function ARSWithdrawalPage() {
  const { toast } = useToast();
  const resellers = useUnifiedResellers();
  const { canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds } = useAdminAccess();
  const { data: requests = [], isLoading } = useWithdrawalRequests();
  const { updateWithdrawalStatus } = useFinancialMutations();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewRequest, setViewRequest] = useState<WithdrawalRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<WithdrawalRequest | null>(null);
  const [rejectRemark, setRejectRemark] = useState("");

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

    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => {
          const reseller = resellers.find(res => res.id === r.resellerDocId);
          return r.resellerId.toLowerCase().includes(q) ||
                 r.resellerName.toLowerCase().includes(q) ||
                 r.referralId.toLowerCase().includes(q) ||
                 r.staffId.toLowerCase().includes(q) ||
                 (reseller && (
                   reseller.shopName.toLowerCase().includes(q) ||
                   reseller.resellerId?.toString().includes(q)
                 ));
        }
      );
    }
    return list;
  }, [requests, search, statusFilter, canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds, resellers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ─── Actions ─── */
  const handleApprove = async (req: WithdrawalRequest) => {
    if (!req.resellerDocId) {
      toast({ title: "Error", description: "Missing reseller document ID.", variant: "destructive" });
      return;
    }
    setProcessingId(req.id);
    try {
      // 1. Update the withdrawal request status in Firestore
      await updateWithdrawalStatus.mutateAsync({ id: req.id, status: "Approved" });
      
      // 2. Update the reseller's profile in Firestore to increment total_withdrawals
      // (Balance was already deducted on submission)
      const resellerRef = doc(db, "reseller_profiles", req.resellerDocId);
      
      await runTransaction(db, async (transaction) => {
        const resellerSnap = await transaction.get(resellerRef);
        if (!resellerSnap.exists()) {
          throw new Error("Reseller profile not found.");
        }
        
        const currentTotalWithdrawals = resellerSnap.data().total_withdrawals || 0;
        
        transaction.update(resellerRef, {
          total_withdrawals: currentTotalWithdrawals + req.amount,
          updated_at: new Date().toISOString()
        });
      });

      toast({ title: "Withdrawal Approved", description: `The amount of $${req.amount.toLocaleString()} has been processed.` });
    } catch (e) {
      console.error("Error approving withdrawal:", e);
      toast({ title: "Error", description: "Failed to process withdrawal approval.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectRequest) return;
    setProcessingId(rejectRequest.id);
    try {
      // 1. Update the withdrawal request status in Firestore
      await updateWithdrawalStatus.mutateAsync({ 
        id: rejectRequest.id, 
        status: "Rejected", 
        remark: rejectRemark 
      });

      // 2. Refund the balance to the reseller (since it was deducted on submission)
      const resellerRef = doc(db, "reseller_profiles", rejectRequest.resellerDocId);
      
      await runTransaction(db, async (transaction) => {
        const resellerSnap = await transaction.get(resellerRef);
        if (!resellerSnap.exists()) {
          throw new Error("Reseller profile not found.");
        }
        
        const currentBalance = resellerSnap.data().balance || 0;
        
        transaction.update(resellerRef, {
          balance: currentBalance + rejectRequest.amount,
          updated_at: new Date().toISOString()
        });
      });

      toast({ title: "Withdrawal Rejected", description: "The request has been marked as rejected and balance refunded." });
      setRejectRequest(null);
      setRejectRemark("");
    } catch (e) {
      console.error("Error rejecting withdrawal:", e);
      toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">ARS Management &gt; Withdrawal Requests</p>
        <h1 className="text-2xl font-bold text-foreground">Withdrawal Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and process reseller withdrawal requests. Verify payment details before approval.
        </p>
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
              <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Requested Amount</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
              <TableHead className="w-10 text-xs font-bold uppercase tracking-wider">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No withdrawal requests found.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((req) => (
                <TableRow key={req.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(req.createdAt), "MMM dd, yyyy HH:mm")}
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
                              <CheckCircle className="h-4 w-4 mr-2" /> Accept Withdrawal
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdrawal Details — {viewRequest?.resellerName}</DialogTitle>
            <DialogDescription>Verify the payment destination information.</DialogDescription>
          </DialogHeader>
          {viewRequest && (
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
                  <span>{format(new Date(viewRequest.createdAt), "yyyy-MM-dd HH:mm")}</span>
                </div>
              </div>
              
              {viewRequest.status === "Pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleApprove(viewRequest); setViewRequest(null); }}>
                    Accept Withdrawal
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => { setRejectRequest(viewRequest); setViewRequest(null); }}>
                    Request Rejected
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectRequest} onOpenChange={(o) => !o && setRejectRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this withdrawal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Remark</label>
              <Textarea 
                placeholder="e.g., Incorrect bank details, Insufficient balance..." 
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
    </div>
  );
}
