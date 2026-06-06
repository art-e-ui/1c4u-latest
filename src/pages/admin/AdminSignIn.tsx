import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import LogoFull from "@/components/brand/LogoFull";
import { useAdminAuth } from "@/lib/admin-auth-context-hooks";
import { adminPath } from "@/lib/subdomain";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail 
} from "@/lib/supabase-compat/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export default function AdminSignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [upgradeMessage, setUpgradeMessage] = useState<React.ReactNode>("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, session, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate(adminPath("/admin"));
    }
  }, [session, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setUpgradeMessage("");
    setSubmitting(true);
    try {
      console.log("Checking upgrade status for:", email);
      
      // Perform upgrade check on entering Email
      try {
        const checkRes = await fetch("/api/auth/check-upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, portal: "admin" })
        });
        
        if (checkRes.ok) {
          const { exists, systemUpgradedReset } = await checkRes.json();
          if (exists && !systemUpgradedReset) {
            console.log("[ADMIN_SIGNIN] Existing legacy staff/admin detected. Running transparent upgrade in background...");
            try {
              const upgradeRes = await fetch("/api/auth/upgrade-legacy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, portal: "admin" })
              });
              if (upgradeRes.ok) {
                console.log("[ADMIN_SIGNIN] Seamless legacy upgrade succeeded.");
              } else {
                const errData = await upgradeRes.json();
                console.warn("[ADMIN_SIGNIN] Legacy upgrade failed:", errData.error);
                setError(errData.error || "System upgrade failed. Please contact support.");
                setSubmitting(false);
                return;
              }
            } catch (upgradeErr) {
              console.error("[ADMIN_SIGNIN] Network error during legacy upgrade:", upgradeErr);
              setError("Network error during system upgrade. Please check your internet connection.");
              setSubmitting(false);
              return;
            }
          }
        }
      } catch (checkErr) {
        console.error("Failed to run check-upgrade, proceeding with normal sign-in:", checkErr);
      }

      console.log("Attempting sign-in for:", email);
      const result = await signIn(email, password);
      console.log("Sign-in result:", result);
      if (result.success) {
        navigate(adminPath("/admin"));
      } else {
        setError(result.message || "Invalid credentials or unauthorized account.");
      }
    } catch (err) {
      console.error("Sign-in error caught in component:", err);
      setError("Sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSubmitting(true);
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log("[ADMIN_SIGNIN] Google sign-in successful for:", result.user.email);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error("[ADMIN_SIGNIN] Google sign-in error:", error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, don't show as error
        setSubmitting(false);
        return;
      }

      if (error.message?.includes("QUOTA_EXCEEDED")) {
        setError("Firestore quota exceeded. Please wait for reset or check billing.");
      } else {
        setError(error.message || "Google sign-in failed.");
      }
      setSubmitting(false);
    }
  };

  const handleClearCache = () => {
    const win = window as Window & { clearFirebaseCache?: () => void };
    if (typeof win.clearFirebaseCache === 'function') {
      win.clearFirebaseCache();
    } else {
      setError("Cache clearing helper not found. Please refresh the page manually.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative p-4"
      style={{ backgroundImage: "url('/images/admin-login-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card/95 backdrop-blur-2xl rounded-2xl border border-border p-8 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
          <div className="mb-6 text-center flex flex-col items-center pt-0 pb-0">
            <LogoFull size="md" align="center" />
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground mt-4">Administrative Console</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex flex-col gap-2 rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-bold tracking-tight">{error.includes("QUOTA_EXCEEDED") ? "System Quota Exceeded" : "Authentication Error"}</span>
                </div>
                <p className="text-xs opacity-80 leading-relaxed">{error}</p>
                {error.includes("quota") && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 h-8 text-[10px] bg-background/50 border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                    onClick={handleClearCache}
                  >
                    Refresh Connection
                  </Button>
                )}
              </div>
            )}

            {upgradeMessage && (
              <div className="flex flex-col gap-2 rounded-xl bg-amber-500/10 border border-amber-550/30 px-4 py-3 text-sm text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="font-bold tracking-tight text-amber-300">System Upgrade Security Notice</span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed font-semibold">{upgradeMessage}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Admin Email</label>
              <div className="flex items-center gap-3 border border-border rounded-xl px-4 py-3 bg-muted/30 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@1-cartforu.com"
                  className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Password</label>
              <div className="flex items-center gap-3 border border-border rounded-xl px-4 py-3 bg-muted/30 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground/30"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pb-2">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer group">
                <input type="checkbox" className="rounded border-border text-primary focus:ring-primary/50" />
                <span className="group-hover:text-foreground transition-colors">Remember device</span>
              </label>
              <Link to={adminPath("/admin/auth/forgot-password")} className="text-xs text-primary hover:text-primary/80 font-bold transition-colors">
                Forgot password?
              </Link>
            </div>

            <button 
              type="submit" 
              disabled={submitting} 
              className="w-full rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              {submitting ? "Establishing Session…" : "Sign Into Portal"}
            </button>
            
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-card px-3 text-muted-foreground/40 leading-none">Identity Provider</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl font-bold text-sm bg-background hover:bg-muted transition-all border-border shadow-sm"
              onClick={handleGoogleSignIn}
              disabled={submitting}
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="mt-8 pt-6 border-t border-border flex flex-col gap-4">
              <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed px-4">
                Encountering issues? Refreshing the application connection can resolve data loading conflicts.
              </p>
              <div className="flex justify-center">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors"
                  onClick={handleClearCache}
                >
                  Clear Session Cache
                </Button>
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
