import { useState, useMemo, useEffect } from "react";
import { Crown, ShieldCheck, Database, Lock, Info, Plus, X, User, Mail, Phone, Fingerprint, Eye, EyeOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db, getFirebaseConfig } from "@/lib/firebase";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { useDbSlaAdmins, dbAdminToLegacy, getNextAdminId, type LegacySlaAdmin } from "@/hooks/use-db-sla";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/lib/admin-auth-context-hooks";
import { useNavigate } from "react-router-dom";
import { adminPath } from "@/lib/subdomain";

export default function SLAOwnershipPage() {
  const { session } = useAdminAuth();
  const navigate = useNavigate();
  const { data: dbAdmins, isLoading } = useDbSlaAdmins();
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (session && session.role !== "Owner") {
      navigate(adminPath("/admin"));
    }
  }, [session, navigate]);

  const adminList = useMemo(() => (dbAdmins ?? []).map(dbAdminToLegacy), [dbAdmins]);
  const nextAdminId = getNextAdminId(adminList);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormPassword("");
    setShowPassword(false);
  };

  const queryClient = useQueryClient();

  const createAdminMutation = useMutation({
    mutationFn: async () => {
      // Create a secondary client to avoid logging out the current owner
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
          role: "admin"
        });
      }

      // 3. Insert into sla_admins
      await addDoc(collection(db, "sla_admins"), {
        account_id: nextAdminId,
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || null,
        status: "Active",
        permissions: ["Dashboard", "Inventory", "Orders", "Customers"],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla_admins"] });
      toast({ title: "Administrator created", description: `${formName.trim()} (${nextAdminId}) has been created successfully.` });
      resetForm();
      setShowModal(false);
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "An error occurred";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      toast({ title: "Missing fields", description: "Please fill in name, email and password.", variant: "destructive" });
      return;
    }
    createAdminMutation.mutate();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Ownership</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Owner account governance & system-level access
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Administrator</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Owner Account (Role: Owner)</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              The Owner Account holds full system authority and is provisioned directly in the
              database during the production deployment phase. This account operates as a ghost —
              it is automatically hidden from active user state upon login. No unique ID is assigned;
              the account cannot be created, modified, or deleted through the admin panel.
            </p>
          </div>
        </div>
      </div>

      {/* Privileges Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Full System Access",
            description: "Unrestricted access to all system modules, configurations, and data management tools.",
          },
          {
            icon: Database,
            title: "Database Provisioned",
            description: "Account credentials and permissions are set directly at the database level for maximum security. No unique ID is assigned.",
          },
          {
            icon: Lock,
            title: "Ghost Account",
            description: "Invisible to all other accounts. Automatically hidden from active user state upon login. Cannot be edited via the admin panel.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-border bg-card p-5 shadow-theme-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground mb-3">
              <item.icon className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {/* Role Hierarchy */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-theme-sm">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Role Hierarchy</h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { role: "Owner", type: "Ownership", id: "None (Ghost)", description: "Database-provisioned, full authority" },
            { role: "Admin", type: "Administrator", id: "GA##", description: "Manages staff, created by Owner" },
            { role: "User", type: "Staff", id: "GA##S##", description: "Operational staff, created by Admin" },
          ].map((item) => (
            <div key={item.role} className="rounded-lg bg-muted p-3">
              <p className="text-xs font-semibold text-foreground">{item.role}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Account Type: {item.type}</p>
              <p className="text-[11px] text-muted-foreground">ID Format: <span className="font-mono">{item.id}</span></p>
              <p className="text-[10px] text-muted-foreground/80 mt-1">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status Card */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-theme-sm">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Production Status</h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Account Status", value: "Pending Setup", variant: "warning" as const },
            { label: "Environment", value: "Development", variant: "info" as const },
            { label: "Provisioning", value: "Database-Level", variant: "default" as const },
            { label: "Visibility", value: "Ghost (Hidden)", variant: "default" as const },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-muted p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Create Administrator Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm animate-fade-in" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="w-full max-w-xl rounded-lg bg-card shadow-theme-xl overflow-hidden flex animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="hidden sm:flex w-[180px] bg-primary flex-col items-center justify-center p-6 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full border-[20px] border-white/10" />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full border-[16px] border-white/10" />
              <div className="relative z-10 text-center">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm mb-3">
                   <span className="text-xl font-bold text-white">GC</span>
                </div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-white/80 uppercase">GlobalCart</p>
              </div>
            </div>

            <div className="flex-1 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Create Administrator</h3>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1.5 rounded-md hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">System Identifier</p>
                <div className="flex items-center gap-3 bg-foreground text-card rounded-lg px-4 py-2.5">
                  <Fingerprint className="h-5 w-5 opacity-60" />
                  <span className="font-mono font-semibold tracking-wider">{nextAdminId}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Role: Admin · Account Type: Administrator</p>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Username</p>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-ring transition-all">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Enter username" className="bg-transparent border-none outline-none text-sm w-full" />
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
                    <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@globalcart.com" className="bg-transparent border-none outline-none text-sm w-full" />
                  </div>
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
                <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
                <button onClick={handleCreate} className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium hover:bg-primary/90 transition-colors">Create Admin</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
