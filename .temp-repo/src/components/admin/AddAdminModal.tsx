import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, getFirebaseConfig } from "@/lib/firebase";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AddAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAdminModal({ open, onOpenChange }: AddAdminModalProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "staff"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let secondaryApp;
    try {
      // Create a secondary client to avoid logging out the current admin
      secondaryApp = initializeApp(getFirebaseConfig(), `SecondaryApp-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);

      // 1. Create user in auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        formData.email.toLowerCase().trim(), 
        formData.password
      );
      await firebaseSignOut(secondaryAuth); // Sign out of the secondary app

      if (!userCredential.user) throw new Error("Failed to create user");

      // 2. Add to users table
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: formData.email.toLowerCase().trim(),
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        role: formData.role.toLowerCase()
      });

      toast.success(`${formData.role === 'admin' ? 'Admin' : 'Staff'} account created successfully`);
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      onOpenChange(false);
      setFormData({ firstName: "", lastName: "", email: "", password: "", role: "staff" });
    } catch (error: unknown) {
      console.error("Error creating admin:", error);
      const err = error as { code?: string; message?: string };
      let message = "Failed to create account";
      
      if (err.code === 'auth/email-already-in-use') {
        message = "This email is already in use by another account.";
      } else if (err.code === 'auth/weak-password') {
        message = "The password is too weak.";
      } else if (err.code === 'auth/invalid-email') {
        message = "The email address is invalid.";
      } else if (err.message) {
        message = err.message;
      }
      
      toast.error(message);
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          console.error("Error deleting secondary app:", e);
        }
      }
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Administrator / Staff</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input 
                id="firstName" 
                required 
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input 
                id="lastName" 
                required 
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              required 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password</Label>
            <Input 
              id="password" 
              type="password" 
              required 
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => setFormData({...formData, role: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="staff">Staff Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
