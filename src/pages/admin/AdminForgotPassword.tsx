import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { adminPath } from "@/lib/subdomain";
import { sendPasswordResetEmail } from "@/lib/supabase-compat/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

export default function AdminForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [actionLink, setActionLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setLoading(true);
    setActionLink("");

    try {
      // 1. Trigger check-upgrade to auto-provision user in Supabase Auth if they are a legacy admin
      try {
        await fetch("/api/auth/check-upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, portal: "admin" })
        });
      } catch (checkErr) {
        console.warn("[ADMIN_FORGOT_PASSWORD] Check-upgrade auto-provision skipped or failed:", checkErr);
      }

      // 2. Call Supabase Auth reset password triggered by sendPasswordResetEmail
      let manualLink = "";
      
      // Always fetch fallback link since sandbox emails are unreliable
      try {
        const genRes = await fetch("/api/auth/generate-reset-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, portal: "admin" })
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
          url: `${window.location.origin}/reset-password?portal=admin&email=${encodeURIComponent(email)}`
        });
      } catch (smtpErr) {
        console.warn("[ADMIN_FORGOT_PASSWORD] SMTP failed", smtpErr);
      }
      
      // 3. Mark as upgraded if legacy
      try {
        await fetch("/api/auth/mark-upgraded", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, portal: "admin" })
        });
      } catch (markErr) {
        console.warn("[ADMIN_FORGOT_PASSWORD] Mark upgraded skipped or failed:", markErr);
      }

      if (manualLink) {
        setActionLink(manualLink);
      }
      
      setSuccess(true);
      toast.success("Security password reset initialized successfully!");
    } catch (err) {
      console.error("[ADMIN_FORGOT_PASSWORD] Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to trigger password reset. Please double check your email or contact support.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090b11] text-white p-4 animate-fade-in relative overflow-hidden">
      {/* Abstract premium ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00AAFF]/15 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border border-white/10 bg-[#121620]/90 backdrop-blur-xl shadow-2xl overflow-hidden rounded-2xl relative z-10">
        <div className="h-2 bg-gradient-to-r from-[#00AAFF] to-primary w-full" />
        
        {success ? (
          <CardContent className="pt-8 pb-8 px-6 text-center space-y-4">
            <div className="flex justify-center mb-2">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="text-white/60 leading-relaxed text-sm">
              We have sent a secure password reset link to <span className="text-white font-medium">{email}</span>. 
              Please verify your inbox and follow the instructions to secure your account.
            </CardDescription>
            {actionLink && (
              <div className="p-3 mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                <p className="mb-2">⚠️ Sandbox Environment Fallback Link:</p>
                <a href={actionLink} className="underline text-amber-400 hover:text-amber-300 font-mono break-all">{actionLink}</a>
              </div>
            )}
            <div className="pt-4">
              <Link to={adminPath("/admin/auth/sign-in")} className="inline-flex items-center gap-2 text-sm text-[#00AAFF] hover:underline transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Return to Login
              </Link>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pt-8">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                  <ShieldAlert className="h-6 w-6 animate-pulse" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center text-white">Forgot Password</CardTitle>
              <CardDescription className="text-center text-white/60 text-sm">
                Enter your email address to receive instructions to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs text-red-400 text-center">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com" 
                    className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-sm" 
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 font-bold bg-[#00AAFF] hover:bg-[#00AAFF]/90 text-white rounded-xl shadow-lg shadow-[#00AAFF]/20 transform active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? "Sending link..." : "Send Reset Link"}
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pb-8">
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#121620] px-3 text-white/40 text-[10px] tracking-wider font-semibold">Or</span>
                </div>
              </div>
              <Link to={adminPath("/admin/auth/sign-in")} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
