import { useState, useMemo } from "react";
import { useDbSlaStaff, dbStaffToLegacy, type LegacySlaStaff } from "@/hooks/use-db-sla";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { resellerPath } from "@/lib/subdomain";
import { Search, Mail, Phone, MoreVertical, X, Users, Copy, Link, Check, Trash2, ShieldAlert, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, updateDoc, query, where, getDocs, collection } from "firebase/firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label || "Text"} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-accent transition-colors" title={`Copy ${label || ""}`}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  );
}

export default function SLAUserPage() {
  const { data: dbStaff } = useDbSlaStaff();
  const { canSeeAll, allowedStaffIds } = useAdminAccess();

  const staffList = useMemo(() => {
    const all = (dbStaff ?? []).map(dbStaffToLegacy);
    if (canSeeAll) return all;
    return all.filter((s) => allowedStaffIds.includes(s.staffId));
  }, [dbStaff, canSeeAll, allowedStaffIds]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<LegacySlaStaff | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<LegacySlaStaff | null>(null);

  const filtered = staffList.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.staffId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const emptyState = staffList.length === 0;

  const queryClient = useQueryClient();

  const deleteStaffMutation = useMutation({
    mutationFn: async (staff: LegacySlaStaff) => {
      // 1. Delete from sla_staff
      await deleteDoc(doc(db, "sla_staff", staff.id));
      
      // 2. Try to delete from users table by email
      const q = query(collection(db, "users"), where("email", "==", staff.email.toLowerCase().trim()));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "users", d.id)));
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla_staff"] });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast.success("Staff account deleted");
      setSelectedStaff(null);
      setStaffToDelete(null);
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "An error occurred";
      toast.error(`Error deleting staff: ${message}`);
      setStaffToDelete(null);
    },
  });

  const toggleStaffStatusMutation = useMutation({
    mutationFn: async ({ staffId, currentStatus }: { staffId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
      await updateDoc(doc(db, "sla_staff", staffId), { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla_staff"] });
      toast.success("Status updated successfully");
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "An error occurred";
      toast.error(`Error updating status: ${message}`);
    },
  });

  const getReferralLink = (referralId: string) =>
    `https://reseller.1-cartforu.com/register?ref=${referralId}`;

  const { session } = useAdminAccess(); // Wait, useAdminAuth() provides session
  
  const filterStaff = (staff: LegacySlaStaff) => {
    // Owner/Admin/Staff can't delete/suspend themselves or those with higher roles
    // For now, only Owner/Admin should be able to perform these actions
    const canManageData = canSeeAll || allowedStaffIds.length > 0; // if they see them, they might be able to manage
    // Actually, following rules, ONLY Admin (SLA role) can write to sla_staff
    const isActuallyAdmin = canSeeAll || (session?.role === "Admin"); // Owners are canSeeAll
    const isSelf = staff.staffId === session?.accountId || staff.id === session?.uid;
    return isActuallyAdmin && !isSelf;
  };

  return (
    <div className="flex gap-6 animate-fade-in">
      <div className={`flex-1 min-w-0 transition-all duration-300 ${selectedStaff ? "lg:w-2/3" : "w-full"}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground">Staff Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {staffList.length} staff member{staffList.length !== 1 ? "s" : ""} · Role: User · ID format: OC##S##
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 flex-1 sm:flex-initial">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff..."
                className="bg-transparent border-none outline-none text-sm w-full"
              />
            </div>
          </div>
        </div>

        {emptyState ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No Staff Accounts Yet</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Staff accounts are created from the <span className="font-medium text-foreground">SLA → Administrator</span> page by Admin accounts.
            </p>
            <p className="text-xs text-muted-foreground">
              Each staff receives a unique ID linked to their creating admin, e.g. <span className="font-mono font-medium">OC01S01</span>, <span className="font-mono font-medium">OC01S02</span>.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-card border border-border shadow-theme-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["Staff Member", "Referral ID", "Referral Link", "Contact", "Department", "Created By", "Status", ""].map((h) => (
                      <th key={h} className="thead-label text-left p-3.5 first:pl-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((staff) => (
                    <tr
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff)}
                      className={`cursor-pointer transition-colors ${selectedStaff?.id === staff.id ? "bg-primary/5" : "hover:bg-accent/50"}`}
                    >
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                            {staff.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{staff.name}</p>
                            <span className="mono-badge mt-0.5 inline-block text-[10px]">{staff.staffId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-medium text-foreground">{staff.referralId}</span>
                          <CopyButton text={staff.referralId} label="Referral ID" />
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 max-w-[200px]">
                          <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{getReferralLink(staff.referralId)}</span>
                          <CopyButton text={getReferralLink(staff.referralId)} label="Referral Link" />
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> {staff.email}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> {staff.phone}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="text-xs text-muted-foreground">{staff.department}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="mono-badge text-[10px]">{staff.createdByAdminId}</span>
                      </td>
                      <td className="p-3.5">
                        <StatusBadge
                          label={staff.status}
                          variant={staff.status === "Active" ? "success" : staff.status === "Suspended" ? "danger" : "default"}
                          dot
                        />
                      </td>
                      <td className="p-3.5 pr-5">
                        <DropdownMenu>
                          <DropdownMenuTrigger 
                            className="p-1.5 rounded-md hover:bg-accent transition-colors" 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {filterStaff(staff) ? (
                              <>
                                <DropdownMenuItem 
                                  className="gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStaffStatusMutation.mutate({ staffId: staff.id, currentStatus: staff.status });
                                  }}
                                >
                                  {staff.status === "Active" ? (
                                    <>
                                      <ShieldAlert className="h-4 w-4 text-warning" />
                                      Suspend Account
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="h-4 w-4 text-success" />
                                      Activate Account
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStaffToDelete(staff);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Staff Member
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                                Administrative access only
                              </div>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedStaff && (
        <div className="hidden lg:block w-[340px] shrink-0 animate-slide-in-right">
          <div className="rounded-lg bg-card border border-border shadow-theme-sm overflow-hidden sticky top-20">
            <div className="relative h-20 bg-gradient-to-br from-primary to-primary/70">
              <button
                onClick={() => setSelectedStaff(null)}
                className="absolute top-3 right-3 p-1.5 rounded-md bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 -mt-7">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-primary font-bold text-lg border-4 border-card shadow-theme-md">
                {selectedStaff.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <h3 className="mt-2 text-lg font-bold text-foreground">{selectedStaff.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge label="User" variant="info" />
                <StatusBadge
                  label={selectedStaff.status}
                  variant={selectedStaff.status === "Active" ? "success" : selectedStaff.status === "Suspended" ? "danger" : "default"}
                  dot
                />
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{selectedStaff.department}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {selectedStaff.email}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {selectedStaff.phone}
                </div>
              </div>

              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Staff ID</span>
                  <span className="text-foreground font-mono font-medium">{selectedStaff.staffId}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Referral ID</span>
                  <div className="flex items-center gap-1">
                    <span className="text-foreground font-mono font-medium">{selectedStaff.referralId}</span>
                    <CopyButton text={selectedStaff.referralId} label="Referral ID" />
                  </div>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground block mb-1">Referral Link</span>
                  <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1.5">
                    <Link className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-foreground text-[10px] font-mono truncate flex-1">{getReferralLink(selectedStaff.referralId)}</span>
                    <CopyButton text={getReferralLink(selectedStaff.referralId)} label="Referral Link" />
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Created By</span>
                  <span className="text-foreground font-mono font-medium">{selectedStaff.createdByAdminId}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="text-foreground font-medium">{selectedStaff.joinedAt}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Last Active</span>
                  <span className="text-foreground font-medium">{selectedStaff.lastActive}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation */}
      <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !open && setStaffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the staff account for <strong>{staffToDelete?.name}</strong> and remove their access to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => staffToDelete && deleteStaffMutation.mutate(staffToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
