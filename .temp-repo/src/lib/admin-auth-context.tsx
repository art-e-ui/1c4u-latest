import { useState, useEffect, type ReactNode } from "react";
import { AdminAuthContext, type AdminSession } from "./admin-auth-context-hooks";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchAdminProfile(user.uid, user.email || '');
      } else {
        setSession(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchAdminProfile = async (userId: string, email: string): Promise<boolean> => {
    console.log(`[ADMIN_AUTH] Fetching profile for UID: ${userId}, Email: ${email}`);
    try {
      const userDocRef = doc(db, 'users', userId);
      let userDocSnap;
      
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (getErr: unknown) {
        const err = getErr as { message?: string };
        console.error("[ADMIN_AUTH] Failed to get user document:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          throw new Error("QUOTA_EXCEEDED: Your Firestore daily free limit has been reached. Please wait for reset or enable billing.");
        }
        throw getErr;
      }

      console.log("[ADMIN_AUTH] Profile exists:", userDocSnap.exists());
      let userData = userDocSnap.exists() ? userDocSnap.data() : null;
      
      const normalizedEmail = email.toLowerCase().trim();
      console.log("[ADMIN_AUTH] Normalized email:", normalizedEmail);

      // Force owner role for this specific email
      if (normalizedEmail === 'arkarnaung009@gmail.com') {
        console.log("[ADMIN_AUTH] Owner email detected, ensuring role...");
        if (userData && userData.role !== 'owner') {
          console.log("[ADMIN_AUTH] Updating existing user to owner role");
          await updateDoc(userDocRef, { role: 'owner' });
          userData.role = 'owner';
        } else if (!userData) {
          console.log("[ADMIN_AUTH] Creating new owner document in Firestore");
          const newOwner = {
            uid: userId,
            email: normalizedEmail,
            first_name: 'System',
            last_name: 'Owner',
            role: 'owner',
            created_at: new Date().toISOString()
          };
          await setDoc(userDocRef, newOwner);
          userData = newOwner;
        }
      }

      if (!userData) {
        console.error("[ADMIN_AUTH] No user data found for UID:", userId);
        setSession(null);
        return false;
      }

      console.log("[ADMIN_AUTH] User data found with role:", userData.role);

      // Only allow owner, admin, or staff
      if (!['owner', 'admin', 'staff'].includes(userData.role)) {
        console.error("[ADMIN_AUTH] Unauthorized role:", userData.role);
        setSession(null);
        return false;
      }

      const roleMapping: Record<string, "Owner" | "Admin" | "User"> = {
        owner: "Owner",
        admin: "Admin",
        staff: "User"
      };

      let accountId = null;
      if (userData.role === 'admin') {
        const adminQuery = query(collection(db, 'sla_admins'), where('email', '==', email));
        const adminSnap = await getDocs(adminQuery);
        if (!adminSnap.empty) accountId = adminSnap.docs[0].data().account_id;
      } else if (userData.role === 'staff') {
        const staffQuery = query(collection(db, 'sla_staff'), where('email', '==', email));
        const staffSnap = await getDocs(staffQuery);
        if (!staffSnap.empty) accountId = staffSnap.docs[0].data().staff_id;
      }

      setSession({
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Admin User',
        email: email,
        role: roleMapping[userData.role] as "Owner" | "Admin" | "User",
        accountId: accountId,
        uid: userId
      });
      return true;
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Error fetching admin profile:", err);
      setSession(null);
      if (err.message?.includes("QUOTA_EXCEEDED")) {
        throw error;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<{success: boolean, message?: string}> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log("Admin sign-in starting for:", normalizedEmail);
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        console.log("Firebase Auth sign-in successful for UID:", userCredential.user.uid);
        
        try {
          const profileSuccess = await fetchAdminProfile(userCredential.user.uid, userCredential.user.email || normalizedEmail);
          console.log("Admin profile fetch success:", profileSuccess);
          if (!profileSuccess) {
            await firebaseSignOut(auth);
            return { success: false, message: "Unauthorized: You do not have admin access." };
          }
          return { success: true };
        } catch (profileError: unknown) {
          const err = profileError as { message?: string };
          await firebaseSignOut(auth);
          if (err.message?.includes("QUOTA_EXCEEDED")) {
            return { success: false, message: err.message };
          }
          return { success: false, message: "Failed to load admin profile. Please try again." };
        }
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        console.error("Firebase Auth sign-in error:", err.code, err.message);
        
        // Map common Firebase auth errors to user-friendly messages
        let userMessage = "Invalid login credentials. Please check your email and password.";
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          userMessage = "Invalid email or password. Please try again.";
        } else if (err.code === 'auth/too-many-requests') {
          userMessage = "Too many failed login attempts. Please try again later.";
        } else if (err.code === 'auth/user-disabled') {
          userMessage = "This account has been disabled.";
        }

        // Special handling for the owner account to auto-provision if they don't exist yet
        if (normalizedEmail === 'arkarnaung009@gmail.com' && 
            (err.code === 'auth/user-not-found' || 
             err.code === 'auth/invalid-credential' || 
             err.code === 'auth/wrong-password' ||
             (err.message && err.message.toLowerCase().includes("invalid")))) {
          console.log("Attempting to auto-provision owner account...");
          try {
            const signUpCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
            console.log("Firebase Auth sign-up successful for owner UID:", signUpCredential.user.uid);
            const profileSuccess = await fetchAdminProfile(signUpCredential.user.uid, signUpCredential.user.email || normalizedEmail);
            console.log("Admin profile fetch success after sign-up:", profileSuccess);
            if (!profileSuccess) {
              await firebaseSignOut(auth);
              return { success: false, message: "Unauthorized: You do not have admin access." };
            }
            return { success: true };
          } catch (signUpError: unknown) {
            const sErr = signUpError as { code?: string; message?: string };
            console.error("Firebase Auth sign-up error for owner:", sErr.code, sErr.message);
            if (sErr.code === 'auth/email-already-in-use') {
              return { success: false, message: "Incorrect password. Please try again." };
            }
            return { success: false, message: `Signup failed: ${sErr.message || "Unknown error"}` };
          }
        }
        return { success: false, message: userMessage };
      }
    } catch (e) {
      console.error("Admin sign in error:", e);
      return { success: false, message: e instanceof Error ? e.message : "An unexpected error occurred" };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setSession(null);
  };

  return (
    <AdminAuthContext.Provider value={{ session, signIn, signOut, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
