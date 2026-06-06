import React, { useState, useCallback, useEffect, type ReactNode } from "react";
import { CustomerAuthContext, type CustomerUser } from "./customer-auth-context-hooks";
import { auth, db } from "./firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";


export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        await fetchCustomerProfile(authUser.uid, authUser.email || '');
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchCustomerProfile = async (userId: string, email: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        console.error("Customer profile fetch failed: Document not found");
        setUser(null);
        return;
      }
      
      const userData = { ...userDoc.data() };
      
      if (!userData.role) {
        console.log("Customer profile fetch - role missing, defaulting to customer");
        await updateDoc(doc(db, 'users', userId), { role: 'customer' });
        userData.role = 'customer';
      }

      // Only allow customer role (or owner/admin for testing purposes)
      if (!['customer', 'reseller', 'owner', 'admin'].includes(userData.role)) {
        console.error("Unauthorized role for customer portal:", userData.role);
        // We don't necessarily sign out here because they might be an admin trying to view the storefront,
        // but we might want to handle this differently based on requirements.
      }

      setUser({
        id: userId,
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Customer',
        email: email,
        customerId: `GCID-${userId.substring(0, 6).toUpperCase()}`
      });
    } catch (err) {
      console.error("Error fetching customer profile:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (emailOrPhone: string, password: string) => {
    try {
      const email = emailOrPhone.toLowerCase().trim();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        await fetchCustomerProfile(userCredential.user.uid, userCredential.user.email || email);
        return { success: true };
      }
      return { success: false, message: "Login failed" };
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      console.error("Login exception:", err);
      let message = "Invalid email or password.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = "Invalid email or password. Please try again.";
      } else if (err.code === 'auth/too-many-requests') {
        message = "Too many failed attempts. Please try again later.";
      }
      return { success: false, message };
    }
  }, []);

  const register = useCallback(async (name: string, emailOrPhone: string, password: string) => {
    try {
      const email = emailOrPhone.toLowerCase().trim();
      
      // Split name into first and last
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      if (userCredential.user) {
        const userId = userCredential.user.uid;
        
        await setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: 'customer'
        });

        await fetchCustomerProfile(userId, userCredential.user.email || email);

        // Send Telegram Notification via server API
        try {
          const telegramMessage = `<b>New Customer Registration</b>\n\n` +
            `👤 Name: ${name}\n` +
            `📧 Email: ${email}\n` +
            `🆔 Customer ID: GCID-${userId.substring(0, 6).toUpperCase()}\n` +
            `📅 Date: ${new Date().toLocaleString()}`;
          
          await fetch('/api/telegram/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: telegramMessage, threadId: 1 }),
          }).catch(err => console.error("Telegram notification failed:", err));
        } catch (e) {
          console.error("Error triggering telegram notification:", e);
        }

        return { success: true };
      }
      return { success: false, message: "Registration failed" };
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      console.error("Registration exception:", err);
      let message = "Registration failed. Please try again.";
      if (err.code === 'auth/email-already-in-use') {
        message = "This email is already registered. Please login instead.";
      } else if (err.code === 'auth/invalid-email') {
        message = "Invalid email address.";
      } else if (err.code === 'auth/weak-password') {
        message = "Password is too weak.";
      }
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
  }, []);

  return (
    <CustomerAuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}
