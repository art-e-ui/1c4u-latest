import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db, getFirebaseConfig } from "@/lib/firebase";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { useDbSlaAdmins, useDbSlaStaff, dbAdminToLegacy, dbStaffToLegacy, getNextStaffId, generateReferralId, type LegacySlaAdmin, type LegacySlaStaff } from "@/hooks/use-db-sla";
import { useAdminAuth } from "@/lib/admin-auth-context-hooks";
import {
  Mail, Phone, MoreVertical, X, Search, Plus, Fingerprint,
  User, Lock, Eye, EyeOff, ScrollText, Archive, KeyRound, Lightbulb, Users,
  Trash2, ShieldAlert, ShieldCheck
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { deleteDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
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

export default function SLAAdministratorPage() {
  const { data: dbAdmins } = useDbSlaAdmins();
  const { data: dbStaff } = useDbSlaStaff();
  const { session } = useAdminAuth();

  const adminList = useMemo(() => {
    const all = (dbAdmins ?? []).map(dbAdminToLegacy);
    if (!session || session.role === "Owner") return all;
    if (session.role === "Admin") {
      return all.filter((a) => a.accountId === session.accountId);
    }
    return [];
  }, [dbAdmins, session]);

  const staffList = useMemo(() => (dbStaff ?? []).map(dbStaffToLegacy), [dbStaff]);

  const [selectedAdmin, setSelectedAdmin] = useState<LegacySlaAdmin | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingForAdmin, setCreatingForAdmin] = useState<LegacySlaAdmin | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<LegacySlaAdmin | null>(null);
  const { toast } = useToast();

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formDepartment, setFormDepartment] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormPassword("");
    setFormDepartment("");
    setShowPassword(false);
  };

  const filtered = adminList.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.accountId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const emptyState = adminList.length === 0;

  const queryClient = useQueryClient();

  const createStaffMutation = useMutation({
    mutationFn: async () => {
      if (!creatingForAdmin) throw new Error("No admin selected");
      const newStaffId = getNextStaffId(creatingForAdmin.accountId, staffList);
      const referralId = generateReferralId(newStaffId, formName.trim());

      // Create a secondary client to avoid logging out the current admin
      const secondaryApp = initializeApp(getFirebaseConfig(), `SecondaryApp-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);

      // 1. Create the user in Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formEmail.trim(), formPassword);
      await firebaseSignOut(secondaryAuth); // Sign out of the secondary app

      // 2. Ensure user is in the users table with correct role
      if (userCredential.user) {
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: formEmail.trim(),
          first_name: formName.trim().split(" ")[0],
          last_name: formName.trim().split(" ").slice(1).join(" "),
          role: "staff"
        });
      }

      // 3. Insert into sla_staff
      await addDoc(collection(db, "sla_staff"), {
        staff_id: newStaffId,
        referral_id: referralId,
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || null,
        department: formDepartment || "Unassigned",
        created_by_admin_id: creatingForAdmin.accountId,
        status: "Active",
      });
      return newStaffId;
    },
    onSuccess: (staffId) => {
      queryClient.invalidateQueries({ queryKey: ["sla_staff"] });
      toast({ title: "Staff account created", description: `${formName.trim()} (${staffId}) has been created successfully.` });
      resetForm();
      setShowModal(false);
      setCreatingForAdmin(null);
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "An error occurred";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const handleCreateStaff = () => {
    if (!creatingForAdmin) return;
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      toast({ title: "Missing fields", description: "Please fill in name, email and password.", variant: "destructive" });
      return;
    }
    createStaffMutation.mutate();
  };

  const deleteAdminMutation = useMutation({
    mutationFn: async (admin: LegacySlaAdmin) => {
      // 1. Delete from sla_admins
      await deleteDoc(doc(db, "sla_admins", admin.id));
      
      // 2. Try to delete from users table by email
      const q = query(collection(db, "users"), where("email", "==", admin.email.toLowerCase().trim()));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "users", d.id)));
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla_admins"] });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast({ title: "Administrator deleted", description: "The administrator account has been removed." });
      setSelectedAdmin(null);
      setAdminToDelete(null);
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "An error occurred";
      toast({ title: "Error deleting administrator", description: message, variant: "destructive" });
      setAdminToDelete(null);
    },
  });

  const toggleAdminStatusMutation = useMutation({
    mutationFn: async ({ adminId, currentStatus }: { adminId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
      await updateDoc(doc(db, "sla_admins", adminId), { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla_admins"] });
      toast({ title: "Status updated", description: "The administrator's status has been updated." });
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "An error occurred";
      toast({ title: "Error updating status", description: message, variant: "destructive" });
    },
  });

  return (
    <div className="flex gap-6 animate-fade-in">
      {/* Table */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${selectedAdmin ? "lg:w-2/3" : "w-full"}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground">Administrator Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {adminList.length} admin account{adminList.length !== 1 ? "s" : ""} · Role: Admin · ID format: GA##
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 flex-1 sm:flex-initial">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search admins..."
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
            <h3 className="text-lg font-semibold text-foreground mb-1">No Administrators Yet</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Administrator accounts are created from the <span className="font-medium text-foreground">SLA → Ownership</span> page by the Owner account.
            </p>
            <p className="text-xs text-muted-foreground">
              Each administrator receives a unique ID in the format <span className="font-mono font-medium">GA01</span>, <span className="font-mono font-medium">GA02</span>, etc.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-card border border-border shadow-theme-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["Admin Profile", "Contact Info", "Status", "Last Login", "Staff Count", ""].map((h) => (
                      <th key={h} className="thead-label text-left p-3.5 first:pl-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((admin) => {
                    const staffCount = staffList.filter((s) => s.createdByAdminId === admin.accountId).length;
                    return (
                      <tr
                        key={admin.id}
                        onClick={() => setSelectedAdmin(admin)}
                        className={`cursor-pointer transition-colors ${selectedAdmin?.id === admin.id ? "bg-primary/5" : "hover:bg-accent/50"}`}
                      >
                        <td className="p-3.5 pl-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                              {admin.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{admin.name}</p>
                              <span className="mono-badge mt-0.5 inline-block text-[10px]">{admin.accountId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" /> {admin.email}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {admin.phone}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <StatusBadge
                            label={admin.status}
                            variant={admin.status === "Active" ? "success" : admin.status === "Suspended" ? "danger" : "default"}
                            dot
                          />
                        </td>
                        <td className="p-3.5">
                          <span className="text-xs text-muted-foreground font-mono">{admin.lastLogin}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="text-xs text-muted-foreground">{staffCount} staff</span>
                        </td>
                        <td className="p-3.5 pr-5">
                          <div className="flex items-center gap-1">
                            <button
                              className="p-1.5 rounded-md hover:bg-accent transition-colors"
                              title="Create Staff under this admin"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCreatingForAdmin(admin);
                                setShowModal(true);
                              }}
                            >
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger 
                                className="p-1.5 rounded-md hover:bg-accent transition-colors" 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem 
                                  className="gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAdminStatusMutation.mutate({ adminId: admin.id, currentStatus: admin.status });
                                  }}
                                >
                                  {admin.status === "Active" ? (
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
                                    setAdminToDelete(admin);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Administrator
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedAdmin && (
        <div className="hidden lg:block w-[360px] shrink-0 animate-slide-in-right">
          <div className="rounded-lg bg-card border border-border shadow-theme-sm overflow-hidden sticky top-20">
            <div className="relative h-24 bg-gradient-to-br from-primary to-primary/70">
              <button onClick={() => setSelectedAdmin(null)} className="absolute top-3 right-3 p-1.5 rounded-md bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 -mt-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card text-primary font-bold text-xl border-4 border-card shadow-theme-md">
                {selectedAdmin.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <h3 className="mt-2 text-lg font-bold text-foreground">{selectedAdmin.name}</h3>
              <p className="text-sm text-muted-foreground">Role: Admin</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedAdmin.permissions.map((p) => (
                  <span key={p} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">{p}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-5">
              {[
                { label: "Email", value: selectedAdmin.email.split("@")[0], icon: Mail },
                { label: "Phone", value: selectedAdmin.phone.slice(-4), icon: Phone },
                { label: "Joined", value: new Date(selectedAdmin.joinedAt).toLocaleDateString("en", { month: "short", year: "2-digit" }), icon: User },
              ].map((c) => (
                <div key={c.label} className="rounded-lg bg-muted p-2.5 text-center">
                  <div className="flex h-7 w-7 mx-auto items-center justify-center rounded-md bg-card text-primary">
                    <c.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{c.label}</p>
                  <p className="text-xs font-medium text-foreground mt-0.5 truncate">{c.value}</p>
                </div>
              ))}
            </div>

            <div className="px-5 space-y-2">
              <button
                onClick={() => {
                  setCreatingForAdmin(selectedAdmin);
                  setShowModal(true);
                }}
                className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-opacity"
              >
                <Plus className="h-4 w-4" /> Create Staff Account
              </button>
              <button className="w-full rounded-lg bg-foreground text-card py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <ScrollText className="h-4 w-4" /> Activity Logs
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-lg border border-border py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent transition-colors">
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
                <button className="rounded-lg border border-border py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent transition-colors">
                  <KeyRound className="h-3.5 w-3.5" /> Access
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-lg bg-primary p-4 text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">Staff Management</p>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  Each admin can create staff accounts. Staff IDs follow the format {selectedAdmin.accountId}S01, {selectedAdmin.accountId}S02, etc.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!adminToDelete} onOpenChange={(open) => !open && setAdminToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the administrator account for <strong>{adminToDelete?.name}</strong> and remove their access to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => adminToDelete && deleteAdminMutation.mutate(adminToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Staff Modal */}
      {showModal && creatingForAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm animate-fade-in" onClick={() => { setShowModal(false); setCreatingForAdmin(null); resetForm(); }}>
          <div className="w-full max-w-xl rounded-lg bg-card shadow-theme-xl overflow-hidden flex animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="hidden sm:flex w-[180px] bg-primary flex-col items-center justify-center p-6 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full border-[20px] border-white/10" />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full border-[16px] border-white/10" />
              <div className="relative z-10 text-center">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm mb-3">
                  <User className="h-7 w-7 text-white" />
                </div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-white/80 uppercase">New Staff</p>
              </div>
            </div>

            <div className="flex-1 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Create Staff Account</h3>
                <button onClick={() => { setShowModal(false); setCreatingForAdmin(null); resetForm(); }} className="p-1.5 rounded-md hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Staff Identifier</p>
                <div className="flex items-center gap-3 bg-foreground text-card rounded-lg px-4 py-2.5">
                  <Fingerprint className="h-5 w-5 opacity-60" />
                  <span className="font-mono font-semibold tracking-wider">{getNextStaffId(creatingForAdmin.accountId, staffList)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Created by: <span className="font-mono font-medium">{creatingForAdmin.accountId}</span> ({creatingForAdmin.name}) · Role: User · Account Type: Staff
                </p>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Full Name</p>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-ring transition-all">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Enter full name" className="bg-transparent border-none outline-none text-sm w-full" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Phone</p>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-ring transition-all">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="bg-transparent border-none outline-none text-sm w-full" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Email</p>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-ring transition-all">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@vanillahub.com" className="bg-transparent border-none outline-none text-sm w-full" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Department</p>
                  <select value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select department</option>
                    <option value="Customer Relations">Customer Relations</option>
                    <option value="Help Desk">Help Desk</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Fulfillment">Fulfillment</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Security Key</p>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-ring transition-all">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <input type={showPassword ? "text" : "password"} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Enter password" className="bg-transparent border-none outline-none text-sm w-full" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => { setShowModal(false); setCreatingForAdmin(null); resetForm(); }} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
                <button onClick={handleCreateStaff} className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium hover:bg-primary/90 transition-colors">Create Staff</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
