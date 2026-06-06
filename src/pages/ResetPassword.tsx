import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, CheckCircle2, ShieldEllipsis, AlertCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { detectPortal, resellerPath, adminPath } from "@/lib/subdomain";
import { toast } from "sonner";
import { updatePassword, CompatUser } from "@/lib/supabase-compat/auth";
import { supabase } from "@/lib/supabase-compat/app";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // We determine if this is Firebase oobCode or Supabase access token or PKCE token_hash
  const searchParams = new URLSearchParams(location.search);
  const portalParam = searchParams.get("portal");
  const [portal, setPortal] = useState<string>(portalParam || detectPortal());
  
  const oobCode = searchParams.get("oobCode");
  const tokenHash = searchParams.get("token_hash");
  const tokenType = searchParams.get("type");
  const authCode = searchParams.get("code");
  const checkStateRef = React.useRef(false);
  const emailParam = searchParams.get("email");

  const [userEmail, setUserEmail] = useState<string>("");
  const [supabaseUid, setSupabaseUid] = useState<string>("");

  const clearUrlHash = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let sessionTimeout: NodeJS.Timeout;

    const initAuthCheck = async () => {
      // Prevent double execution in strict mode or rapid re-renders
      if (checkStateRef.current) return;
      checkStateRef.current = true;
      
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          console.log("[RESET_PASSWORD] Session already active.");
          clearUrlHash();
          if (existingSession.user?.email) setUserEmail(existingSession.user.email);
          if (existingSession.user?.id) setSupabaseUid(existingSession.user.id);
          if (!portalParam) {
            const role = existingSession.user?.app_metadata?.role || existingSession.user?.user_metadata?.role;
            if (role === "admin" || role === "owner" || role === "staff") {
              setPortal("admin");
            } else if (role === "reseller") {
              setPortal("reseller");
            }
          }
          setHasSession(true);
          setIsCheckingSession(false);
          return;
        }

        if (oobCode) {
          // Firebase Auth flow
          console.log("[RESET_PASSWORD] Found Firebase oobCode, verifying...");
          try {
            const { verifyPasswordResetCode } = await import("firebase/auth");
            await verifyPasswordResetCode(auth, oobCode);
            setHasSession(true);
            setIsCheckingSession(false);
          } catch (err) {
            console.error("[RESET_PASSWORD] Invalid/expired oobCode:", err);
            setHasSession(false);
            setIsCheckingSession(false);
          }
        } else if (tokenHash && tokenType) {
          // Supabase PKCE flow with token_hash
          console.log("[RESET_PASSWORD] Found Supabase PKCE token_hash, manually verifying...");
          const { error: otpError } = await supabase.auth.verifyOtp({ 
            token_hash: tokenHash, 
            type: tokenType as "recovery"
          });
          
          if (!otpError) {
            console.log("[RESET_PASSWORD] Successfully verified PKCE token_hash");
            setHasSession(true);
            setIsCheckingSession(false);
          } else {
            // It might have failed because Supabase auto-processing JUST beat us to it.
            // Check session one more time.
            const { data: { session: checkSession } } = await supabase.auth.getSession();
            if (checkSession) {
              console.log("[RESET_PASSWORD] fallback session check succeeded");
              setHasSession(true);
              setIsCheckingSession(false);
            } else {
              console.error("[RESET_PASSWORD] Invalid/expired token_hash:", otpError);
              setHasSession(false);
              setIsCheckingSession(false);
            }
          }
        } else if (authCode) {
          // Supabase PKCE flow with code
          console.log("[RESET_PASSWORD] Found Supabase PKCE code, exchanging...");
          const { error: codeErr } = await supabase.auth.exchangeCodeForSession(authCode);
          if (!codeErr) {
            setHasSession(true);
            setIsCheckingSession(false);
          } else {
            // It might have failed because Supabase auto-processing JUST beat us to it.
            const { data: { session: checkSession } } = await supabase.auth.getSession();
            if (checkSession) {
              console.log("[RESET_PASSWORD] fallback session check succeeded");
              setHasSession(true);
              setIsCheckingSession(false);
            } else {
              console.error("[RESET_PASSWORD] Invalid/expired code:", codeErr);
              setHasSession(false);
              setIsCheckingSession(false);
            }
          }
        } else {
          console.log("[RESET_PASSWORD] Checking Supabase session...");
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            setHasSession(true);
            setIsCheckingSession(false);
          } else if (
            window.location.hash.includes('type=recovery') || 
            window.location.hash.includes('access_token=') ||
            (tokenHash && tokenType === 'recovery')
          ) {
            // Wait for Supabase to process the hash or token in the background
            console.log("[RESET_PASSWORD] Recovery credentials detected, waiting for Supabase PKCE to process...");
            
            // Poll for session up to 10 seconds since supabase-js does it automatically
            let attempts = 0;
            const pollInterval = setInterval(async () => {
              attempts++;
              const { data: { session: pollSession } } = await supabase.auth.getSession();
              if (pollSession) {
                console.log("[RESET_PASSWORD] Session found during polling!");
                if (pollSession.user?.email) setUserEmail(pollSession.user.email);
                if (pollSession.user?.id) setSupabaseUid(pollSession.user.id);
                clearInterval(pollInterval);
                if (sessionTimeout) clearTimeout(sessionTimeout);
                setHasSession(true);
                setIsCheckingSession(false);
              } else if (attempts >= 15) { // 15 * 500ms = 7.5 seconds
                clearInterval(pollInterval);
              }
            }, 500);

            sessionTimeout = setTimeout(() => {
                console.log("[RESET_PASSWORD] Auth processing timed out or failed.");
                clearInterval(pollInterval);
                setHasSession(false);
                setIsCheckingSession(false);
            }, 8000);
          } else {
            console.log("[RESET_PASSWORD] No session and no tokens found.");
            setHasSession(false);
            setIsCheckingSession(false);
          }
        }
      } catch (err) {
        console.error("[RESET_PASSWORD] Error checking session:", err);
        setHasSession(false);
        setIsCheckingSession(false);
      }
    };

    initAuthCheck();
    
    // Listen to auth changes (when Supabase parses the hash, it triggers PASSWORD_RECOVERY or SIGNED_IN)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[RESET_PASSWORD] Auth state changed:", _event, !!session);
      if (session) {
        if (session.user?.email) setUserEmail(session.user.email);
        if (session.user?.id) setSupabaseUid(session.user.id);
        if (!portalParam) {
          const role = session.user?.app_metadata?.role || session.user?.user_metadata?.role;
          if (role === "admin" || role === "owner" || role === "staff") {
            setPortal("admin");
          } else if (role === "reseller") {
            setPortal("reseller");
          }
        }
        setHasSession(true);
        setIsCheckingSession(false);
        if (sessionTimeout) clearTimeout(sessionTimeout);
      } else if (_event === 'SIGNED_OUT') {
        // Explicitly signed out or failed
      }
    });
    
    return () => {
      subscription.unsubscribe();
      if (sessionTimeout) clearTimeout(sessionTimeout);
    };
  }, [oobCode, tokenHash, tokenType, authCode, portalParam, clearUrlHash]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 6) {
      setError("Your password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (oobCode) {
        await confirmPasswordReset(auth, oobCode, password);
      } else {
        await updatePassword(password);
      }
      
      let resolvedEmail = emailParam || userEmail || "";
      let resolvedUid = supabaseUid || "";
      
      if (!resolvedEmail || !resolvedUid) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email && !resolvedEmail) resolvedEmail = user.email;
          if (user?.id && !resolvedUid) resolvedUid = user.id;
        } catch (e) {
          console.warn("[RESET_PASSWORD] Could not resolve user from session:", e);
        }
      }

      // 1. Mark user as system upgraded in database
      if (resolvedEmail) {
        try {
          await fetch("/api/auth/mark-upgraded", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              userId: resolvedUid,
              email: resolvedEmail, 
              portal 
            })
          });
          console.log("[RESET_PASSWORD] Successfully marked as upgraded for:", resolvedEmail);
        } catch (dbErr) {
          console.warn("[RESET_PASSWORD] Failed to mark as upgraded in backend:", dbErr);
        }
      }

      // 2. Establish Firebase Auth session so they can fetch page data
      // Based on provided instructions, we sign in explicitly to ensure the session is fully established
      if (resolvedEmail && password) {
        try {
          // Note: firebase/auth is aliased to our supabase compat layer
          const { signInWithEmailAndPassword } = await import("firebase/auth");
          await signInWithEmailAndPassword(auth, resolvedEmail, password);
          console.log("[RESET_PASSWORD] Explicitly established session for:", resolvedEmail);
        } catch (fbLoginErr) {
          console.warn("[RESET_PASSWORD] Explicit login failed, proceeding anyway:", fbLoginErr);
        }
      }

      // 3. Clear Supabase local storage recovery flags by signing out then in again (handled by step 2)
      // or just sign out of recovery state session if needed.
      // But step 2 should have overridden it.

      setSuccess(true);
      toast.success("Password updated successfully!");
      
      // Clean up URL hash to prevent auth logic from re-detecting recovery mode
      if (typeof window !== 'undefined' && window.history.replaceState) {
        const cleanUrl = window.location.pathname + window.location.search.replace(/type=recovery&?|token_hash=[^&]*&?|portal=[^&]*&?|email=[^&]*&?/g, "").replace(/\?$/, "");
        window.history.replaceState(null, "", cleanUrl);
        // Also clear the hash explicitly
        window.location.hash = "";
      }
      
      setTimeout(() => {
        const hasFbUser = !!auth.currentUser;
        if (portal === "admin") {
          navigate(hasFbUser ? adminPath("/admin/dashboard") : adminPath("/admin/signin"));
        } else if (portal === "reseller") {
          navigate(hasFbUser ? resellerPath("/reseller/dashboard") : resellerPath("/reseller/login"));
        } else {
          navigate("/login");
        }
      }, 3000);
    } catch (err) {
      console.error("[RESET_PASSWORD] Failed to update password:", err);
      const message = err instanceof Error ? err.message : "Failed to update your password. Please try requesting a new reset link.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#090b11] text-white p-4 font-sans relative overflow-hidden">
      {/* Abstract premium ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00AAFF]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <Card className="border border-white/10 bg-[#121620]/90 backdrop-blur-xl shadow-2xl overflow-hidden rounded-2xl">
          <div className="h-2 bg-gradient-to-r from-[#00AAFF] to-primary w-full" />
          
          <CardHeader className="space-y-2 pt-8 pb-5 text-center">
            <div className="flex justify-center mb-2">
              <div className="h-12 w-12 rounded-2xl bg-[#00AAFF]/20 border border-[#00AAFF]/30 flex items-center justify-center text-[#00AAFF] animate-pulse">
                <ShieldEllipsis className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">Reset Your Password</CardTitle>
            <CardDescription className="text-white/60 text-sm">
              Enter your secure new password credentials to finalize system upgrades.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 py-4">
            {isCheckingSession ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                 <div className="h-8 w-8 rounded-full border-2 border-[#00AAFF] border-t-transparent animate-spin" />
                 <p className="text-white/60 text-sm">Validating connection...</p>
              </div>
            ) : success ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-emerald-400">Security Update Complete!</h4>
                  <p className="text-xs text-white/60 max-w-xs leading-relaxed">
                    Your upgraded system access credentials are saved. Redirecting to your dashboard...
                  </p>
                </div>
              </div>
            ) : hasSession === false ? (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive-foreground text-center space-y-3">
                <div className="flex justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive animate-bounce" />
                </div>
                <h4 className="font-bold text-sm text-red-400">Authentication Link Expired</h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  This reset link is either invalid or expired. Please return to the login page and enter your email again to receive a fresh secure password reset link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2 items-start text-red-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <p className="text-xs leading-relaxed">{error}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="font-semibold text-white/70">New Password</Label>
                  <div className="relative flex items-center border border-white/10 rounded-xl px-4 py-3 bg-white/5 focus-within:ring-2 focus-within:ring-[#00AAFF]/50 transition-all">
                    <Lock className="h-4 w-4 text-white/40 shrink-0 mr-3" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder-white/20 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-white/40 hover:text-white/70 transition-colors shrink-0 ml-2"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="font-semibold text-white/70">Confirm Password</Label>
                  <div className="relative flex items-center border border-white/10 rounded-xl px-4 py-3 bg-white/5 focus-within:ring-2 focus-within:ring-[#00AAFF]/50 transition-all">
                    <Lock className="h-4 w-4 text-white/40 shrink-0 mr-3" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder-white/20 text-sm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 h-11 bg-gradient-to-r from-[#00AAFF] to-primary text-white font-bold rounded-xl hover:opacity-90 active:scale-[98%] transition-all"
                >
                  {loading ? "Updating Credentials..." : "Save Password & Log In"}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="py-4 border-t border-white/5 bg-white/[0.01] flex justify-center">
            <p className="text-[10px] text-white/30 font-mono">
              Secure Auth Node • Domain SSL Protected
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
