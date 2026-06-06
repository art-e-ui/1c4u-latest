import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [actionLink, setActionLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setLoading(true);
    setActionLink("");

    try {
      let manualLink = "";
      // Always fetch fallback link since sandbox emails are unreliable
      try {
        // Note: customers don't strictly need the `portal` parameter, it defaults to 'customer' if missing
        const genRes = await fetch("/api/auth/generate-reset-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, portal: "customer" })
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
          url: `${window.location.origin}/reset-password`,
          handleCodeInApp: false
        });
      } catch (smtpErr) {
        console.warn("[CUSTOMER_FORGOT_PASSWORD] SMTP failed", smtpErr);
      }

      if (manualLink) {
        setActionLink(manualLink);
      }

      setSuccess(true);
      toast.success("Password reset email sent successfully!");
    } catch (err) {
      console.error("[CUSTOMER_FORGOT_PASSWORD] Failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to trigger password reset. Please double check the email address.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 animate-fade-in">
      <Card className="w-full max-w-md border-none shadow-theme-lg overflow-hidden">
        <div className="h-2 bg-primary w-full" />
        
        {success ? (
          <CardContent className="pt-8 pb-8 px-6 text-center space-y-4">
            <div className="flex justify-center mb-2">
              <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="text-muted-foreground leading-relaxed text-sm">
              We have sent a secure password reset link to <span className="text-foreground font-medium">{email}</span>. 
              Please verify your inbox and follow the instructions to secure your account.
            </CardDescription>
            {actionLink && (
              <div className="p-3 mt-4 rounded-xl bg-orange-100 border border-orange-200 text-xs text-orange-800 text-left">
                <p className="mb-2 font-semibold">⚠️ Sandbox Fallback Link:</p>
                <a href={actionLink} className="underline text-orange-600 hover:text-orange-900 font-mono break-all text-[10px]">{actionLink}</a>
              </div>
            )}
            <div className="pt-4">
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Return to Login
              </Link>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pt-8">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <ShieldAlert className="h-6 w-6" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
              <CardDescription className="text-center text-muted-foreground text-sm">
                Enter your email address to receive instructions to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs text-red-500 text-center">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com" 
                    className="pl-10 h-11 bg-background border-border" 
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 font-bold">
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pb-8">
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground text-[10px] tracking-wider font-semibold">Or</span>
                </div>
              </div>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
