import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import LogoIcon from "@/components/brand/LogoIcon";
import { useAdminAuth } from "@/lib/admin-auth-context-hooks";
import { adminPath } from "@/lib/subdomain";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Button } from "@/components/ui/button";

export default function AdminSignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
    setError("");
    setSubmitting(true);
    try {
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
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/images/admin-login-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <LogoIcon variant="header" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Welcome back!</h1>
            <p className="text-xs text-muted-foreground mt-1">Admin & Owner Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex flex-col gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{error.includes("QUOTA_EXCEEDED") ? "Quota Exceeded" : "Error"}</span>
                </div>
                <p className="text-xs opacity-90">{error}</p>
                {error.includes("quota") && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-1 h-7 text-[10px] bg-background/50"
                    onClick={handleClearCache}
                  >
                    Clear Cache & Reload
                  </Button>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email Address</label>
              <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 bg-background/50 focus-within:ring-2 focus-within:ring-ring transition-all">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@vanillahub.com"
                  className="bg-transparent border-none outline-none text-sm w-full text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 bg-background/50 focus-within:ring-2 focus-within:ring-ring transition-all">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-transparent border-none outline-none text-sm w-full text-foreground"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-border" />
                <span className="text-muted-foreground">Keep me logged in</span>
              </label>
              <Link to={adminPath("/admin/auth/forgot-password")} className="text-sm text-primary hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {submitting ? "Signing in…" : "Sign In"}
            </button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={submitting}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
              Google
            </Button>

            <div className="mt-6 pt-4 border-t border-border flex flex-col gap-2">
              <p className="text-[10px] text-muted-foreground text-center">
                Having trouble? Try clearing your browser's local database cache.
              </p>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                className="w-full h-8 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={handleClearCache}
              >
                Reset App Cache
              </Button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
