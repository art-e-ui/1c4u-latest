import { useState } from "react";
import { User, Mail, Lock, Store, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useReseller } from "@/lib/reseller-context-hooks";
import { toast } from "sonner";

export function AddResellerModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { register } = useReseller();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", referralCode: "", phoneNumber: "" });

  const handleAddReseller = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      const { success, error: registrationError } = await register({ 
        firstName: form.firstName,
        lastName: form.lastName,
        emailOrPhone: form.email || form.phoneNumber,
        password: form.password,
        referralCode: form.referralCode,
      });
      if (success) {
        toast.success("Reseller created successfully");
        onOpenChange(false);
        setForm({ firstName: "", lastName: "", email: "", password: "", referralCode: "", phoneNumber: "" });
      } else {
        toast.error(registrationError || "Failed to create reseller");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Reseller</DialogTitle>
          <DialogDescription>Register a new reseller.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <label className="text-sm font-medium">Phone Number</label>
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <Input className="border-none p-0 h-auto" value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value})} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Referral Code</label>
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
              <Store className="h-4 w-4 text-muted-foreground" />
              <Input className="border-none p-0 h-auto" value={form.referralCode} onChange={e => setForm({...form, referralCode: e.target.value})} placeholder="Optional" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAddReseller} disabled={loading}>{loading ? "Creating..." : "Create Reseller"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
