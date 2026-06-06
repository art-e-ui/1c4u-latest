import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, ArrowLeft, ShieldAlert, CheckCircle2 } from "lucide-react";
import { resellerPath } from "@/lib/subdomain";
import LogoFull from "@/components/brand/LogoFull";
import { sendPasswordResetEmail } from "@/lib/supabase-compat/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

export default function ResellerForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [actionLink, setActionLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email) {
      setError(t("reseller.allFieldsRequired") || "Please enter your email.");
      return;
    }

    setError("");
    setLoading(true);
    setActionLink("");

    try {
      // 1. Trigger check-upgrade to auto-provision legacy resellers in Supabase Auth
      try {
        await fetch("/api/auth/check-upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, portal: "reseller" })
        });
      } catch (checkErr) {
        console.warn("[RESELLER_FORGOT_PASSWORD] Check-upgrade auto-provision skipped or failed:", checkErr);
      }

      // 2. Call Supabase Auth reset password triggered by sendPasswordResetEmail
      let manualLink = "";
      
      // Always fetch fallback link since sandbox emails are unreliable
      try {
        const genRes = await fetch("/api/auth/generate-reset-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, portal: "reseller" })
        });
        if (genRes.ok) {
          const genData = await genRes.json();
          manualLink = genData.action_link;
        }
      } catch (err) {
        console.warn("Failed to fetch fallback link", err);
      }

      try {
        await sendPasswordResetEmail(auth, email, {
          url: `${window.location.origin}/reset-password?portal=reseller&email=${encodeURIComponent(email)}`
        });
      } catch (smtpErr) {
        console.warn("[RESELLER_FORGOT_PASSWORD] SMTP failed", smtpErr);
      }

      // 3. Mark as upgraded if legacy
      try {
        await fetch("/api/auth/mark-upgraded", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, portal: "reseller" })
        });
      } catch (markErr) {
        console.warn("[RESELLER_FORGOT_PASSWORD] Mark upgraded skipped or failed:", markErr);
      }

      if (manualLink) {
        setActionLink(manualLink);
      }

      setSuccess(true);
      toast.success("Reseller password reset initialized successfully!");
    } catch (err) {
      console.error("[RESELLER_FORGOT_PASSWORD] Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to trigger password reset. Please verify your email domain or contact support.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090b11] p-4 font-sans text-white relative overflow-hidden">
      {/* Abstract premium ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00AAFF]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <LogoFull className="h-10 text-white mb-2" />
          <p className="text-[10px] tracking-[0.2em] text-[#00AAFF] uppercase font-bold">Reseller Network</p>
        </div>

        <div className="border border-white/10 bg-[#121620]/95 backdrop-blur-xl shadow-2xl overflow-hidden rounded-2xl">
          <div className="h-1.5 bg-gradient-to-r from-[#00AAFF] to-primary w-full" />
          
          {success ? (
            <div className="p-8 text-center space-y-4">
              <div className="flex justify-center mb-2">
                <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
              </div>
              <h3 className="text-xl font-bold">Check Your Email</h3>
              <p className="text-white/60 leading-relaxed text-xs">
                We have sent a secure password reset link to <span className="text-white font-medium">{email}</span>. 
                Please verify your inbox and follow the instructions to secure your reseller portal access.
              </p>
              {actionLink && (
                <div className="p-3 mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 text-left">
                  <p className="mb-2 font-semibold">⚠️ Sandbox Fallback Link:</p>
                  <a href={actionLink} className="underline text-amber-400 hover:text-amber-300 font-mono break-all text-[10px]">{actionLink}</a>
                </div>
              )}
              <div className="pt-4">
                <Link to={resellerPath("/reseller/login")} className="inline-flex items-center gap-2 text-sm text-[#00AAFF] hover:underline transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                    <ShieldAlert className="h-6 w-6 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white">Forgot Reseller Password?</h3>
                <p className="text-white/60 text-xs leading-relaxed max-w-sm mx-auto">
                  Provide your registered reseller email address and we will dispatch password recovery credentials.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs text-red-400 text-center">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-white/80">
                  {t("reseller.email") || "Email Address"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-white/40" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@example.com"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-xl focus:outline-none focus:border-[#00AAFF] text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#00AAFF] py-3 text-sm font-bold text-white hover:bg-[#00AAFF]/90 transform active:scale-[0.98] transition-all shadow-lg shadow-[#00AAFF]/20 disabled:opacity-50"
              >
                {loading ? "Requesting Link..." : "Send Reset Link"}
              </button>

              <div className="relative pt-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-[#121620] px-2 text-white/20 tracking-widest leading-none">Or</span>
                </div>
              </div>

              <div className="text-center">
                <Link to={resellerPath("/reseller/login")} className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
