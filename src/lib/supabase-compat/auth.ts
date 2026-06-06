/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./app";

export interface CompatUser {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous?: boolean;
  tenantId?: string | null;
  providerData?: any[];
  getIdTokenResult?: () => Promise<{ claims: any; token: string }>;
  getIdToken?: (forceRefresh?: boolean) => Promise<string>;
}

export interface UserCredential {
  user: CompatUser;
}

class CompatAuth {
  private _currentUser: CompatUser | null = null;
  private listeners: ((user: CompatUser | null) => void)[] = [];
  private _initialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    // Check if URL has a recovery token and we are NOT on the reset password page
    if (typeof window !== 'undefined' && (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery'))) {
      const hash = window.location.hash;
      const search = window.location.search;
      const cleanPath = window.location.pathname.replace(/\/$/, "").toLowerCase();
      if (cleanPath !== '/reset-password') {
        console.log("[SUPABASE_AUTH] Redirecting to reset password page...");
        // Redirect to reset password page holding the hash and search
        window.location.href = '/reset-password' + search + hash;
      }
    }

    // Fetch initial session
    const { data: { session } } = await supabase.auth.getSession();
    this._initialized = true;
    this.updateUser(session?.user || null);

    // Subscribe to auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      console.log("[SUPABASE_AUTH] onAuthStateChange event:", event);
      if (event === 'PASSWORD_RECOVERY') {
        const urlArgs = window.location.search + window.location.hash;
        if (urlArgs.includes("type=recovery") || urlArgs.includes("token_hash") || urlArgs.includes("access_token")) {
          setTimeout(() => {
            const cleanPath = window.location.pathname.replace(/\/$/, "").toLowerCase();
            // Re-check just in case state changed
            if (cleanPath !== '/reset-password') {
              console.log("[SUPABASE_AUTH] PASSWORD_RECOVERY event received! Redirecting...");
              window.location.href = '/reset-password' + window.location.search + window.location.hash;
            }
          }, 100);
        }
      }
      this.updateUser(session?.user || null);
    });
  }

  private updateUser(supabaseUser: any | null) {
    if (!supabaseUser) {
      this._currentUser = null;
    } else {
      this._currentUser = {
        uid: supabaseUser.id,
        email: supabaseUser.email || null,
        phoneNumber: supabaseUser.phone || null,
        displayName: supabaseUser.user_metadata?.first_name 
          ? `${supabaseUser.user_metadata.first_name} ${supabaseUser.user_metadata.last_name || ""}`.trim()
          : null,
        photoURL: supabaseUser.user_metadata?.avatar_url || null,
        emailVerified: !!supabaseUser.email_confirmed_at,
        isAnonymous: false,
        tenantId: null,
        providerData: [],
        getIdTokenResult: async () => {
          const role = supabaseUser.app_metadata?.role || "customer";
          return {
            token: "mock_id_token",
            claims: {
              sub: supabaseUser.id,
              email: supabaseUser.email,
              role: role,
              admin: role === "admin" || role === "owner",
            }
          };
        },
        getIdToken: async () => {
          return "mock_id_token";
        }
      };
    }
    if (this._initialized) {
      this.listeners.forEach((listener) => listener(this._currentUser));
    }
  }

  get currentUser(): CompatUser | null {
    return this._currentUser;
  }

  onAuthStateChanged(callback: (user: CompatUser | null) => void) {
    this.listeners.push(callback);
    // Call immediately with current value if known
    if (this._initialized) {
      callback(this._currentUser);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }
}

// Global singleton auth instance
const globalAuth = new CompatAuth();

export const getAuth = () => {
  return globalAuth;
};

export const onAuthStateChanged = (auth: any, callback: (user: CompatUser | null) => void) => {
  return globalAuth.onAuthStateChanged(callback);
};

export const signInWithEmailAndPassword = async (auth: any, email: string, psw: string): Promise<UserCredential> => {
  console.log("[SUPABASE_AUTH] signInWithEmailAndPassword for:", email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: psw,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("No user found");
  }

  const cpUser: CompatUser = {
    uid: data.user.id,
    email: data.user.email || null,
    phoneNumber: data.user.phone || null,
    displayName: data.user.user_metadata?.first_name || null,
    photoURL: data.user.user_metadata?.avatar_url || null,
    emailVerified: !!data.user.email_confirmed_at,
    getIdTokenResult: async () => {
      const role = data.user?.app_metadata?.role || "customer";
      return {
        token: "mock_id_token",
        claims: {
          sub: data.user?.id,
          email: data.user?.email,
          role: role,
          admin: role === "admin" || role === "owner",
        }
      };
    },
    getIdToken: async () => {
      return "mock_id_token";
    }
  };

  return { user: cpUser };
};

export const createUserWithEmailAndPassword = async (auth: any, email: string, psw: string): Promise<UserCredential> => {
  console.log("[SUPABASE_AUTH] createUserWithEmailAndPassword for:", email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: psw,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("No user created");
  }

  const cpUser: CompatUser = {
    uid: data.user.id,
    email: data.user.email || null,
    phoneNumber: data.user.phone || null,
    displayName: data.user.user_metadata?.first_name || null,
    photoURL: data.user.user_metadata?.avatar_url || null,
    emailVerified: !!data.user.email_confirmed_at,
    getIdTokenResult: async () => {
      const role = data.user?.app_metadata?.role || "customer";
      return {
        token: "mock_id_token",
        claims: {
          sub: data.user?.id,
          email: data.user?.email,
          role: role,
          admin: role === "admin" || role === "owner",
        }
      };
    },
    getIdToken: async () => {
      return "mock_id_token";
    }
  };

  return { user: cpUser };
};

export const signOut = async (auth: any): Promise<void> => {
  console.log("[SUPABASE_AUTH] Signing out");
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

// Map provider/popups and others so checking doesn't fail
export class GoogleAuthProvider {
  static PROVIDER_ID = "google.com";
}

export const signInWithPopup = async (auth: any, provider: any) => {
  console.log("[SUPABASE_AUTH] signInWithPopup");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
  });
  if (error) {
    throw new Error(error.message);
  }
  return { user: globalAuth.currentUser };
};

// Implement mock phone provider so compilation / registration doesn't break
export class RecaptchaVerifier {
  constructor(auth: any, containerId: string, options: any) {
    console.log("[SUPABASE_AUTH] RecaptchaVerifier initialized for", containerId);
  }
}

export const signInWithPhoneNumber = async (auth: any, phoneNumber: string, verifier: any) => {
  console.log("[SUPABASE_AUTH] signInWithPhoneNumber for:", phoneNumber);
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneNumber,
  });
  if (error) {
    throw new Error(error.message);
  }
  return {
    verificationId: "mock_verification_id_for_" + phoneNumber,
    confirm: async (code: string) => {
      const { data, error: vError } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: code,
        type: "sms",
      });
      if (vError) {
        throw new Error(vError.message);
      }
      return { user: { uid: data.user?.id } };
    }
  };
};

export class PhoneAuthProvider {
  static credential(verificationId: string, code: string) {
    return { verificationId, code };
  }
}

export const signInWithCredential = async (auth: any, credential: any) => {
  console.log("[SUPABASE_AUTH] signInWithCredential", credential);
  return { user: globalAuth.currentUser };
};

export const sendPasswordResetEmail = async (
  auth: any, 
  email: string, 
  actionCodeSettings?: { url?: string }
): Promise<void> => {
  console.log("[SUPABASE_AUTH] sendPasswordResetEmail for:", email);
  const redirectTo = actionCodeSettings?.url || `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) {
    throw new Error(error.message);
  }
};

export const verifyPasswordResetCode = async (auth: any, oobCode: string): Promise<string> => {
  return "mock_email@example.com";
};

export const confirmPasswordReset = async (auth: any, oobCode: string, newPassword: string): Promise<void> => {
  // If we're somehow hitting this in compat context, just try standard updatePassword
  return updatePassword(newPassword);
};

export const updatePassword = async (password: string): Promise<void> => {
  console.log("[SUPABASE_AUTH] updatePassword");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new Error(error.message);
  }
};

