import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useReseller } from "@/lib/reseller-context-hooks";
import { Headset, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { resellerPath } from "@/lib/subdomain";
import LogoFull from "@/components/brand/LogoFull";
import resellerBg from "@/assets/reseller_bg.png";
import { useTranslation } from "react-i18next";
import { sendPasswordResetEmail } from "@/lib/supabase-compat/auth";
import { auth } from "@/lib/firebase";

export default function ResellerLogin() {
  const loginBgImg = resellerBg;
  const { login } = useReseller();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [upgradeMessage, setUpgradeMessage] = useState<React.ReactNode>("");

  const referralCode = searchParams.get('ref') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email || !password) { setError(t("reseller.allFieldsRequired")); return; }
    setLoading(true);
    setError("");
    setUpgradeMessage("");
    try {
      console.log("Checking reseller upgrade status for:", email);
      const checkRes = await fetch("/api/auth/check-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, portal: "reseller" })
      });
      
      if (checkRes.ok) {
        const { exists, systemUpgradedReset } = await checkRes.json();
        if (exists && !systemUpgradedReset) {
          console.log("[RESELLER_LOGIN] Existing legacy reseller detected. Running transparent upgrade in background...");
          try {
            const upgradeRes = await fetch("/api/auth/upgrade-legacy", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password, portal: "reseller" })
            });
            if (upgradeRes.ok) {
              console.log("[RESELLER_LOGIN] Seamless legacy upgrade succeeded.");
            } else {
              const errData = await upgradeRes.json();
              console.warn("[RESELLER_LOGIN] Legacy upgrade failed:", errData.error);
              setError(errData.error || "System upgrade failed. Please contact support.");
              setLoading(false);
              return;
            }
          } catch (upgradeErr) {
            console.error("[RESELLER_LOGIN] Network error during legacy upgrade:", upgradeErr);
            setError("Network error during system upgrade. Please check your internet connection.");
            setLoading(false);
            return;
          }
        }
      }
    } catch (checkErr) {
      console.error("Failed to run reseller check-upgrade, proceeding with normal sign-in:", checkErr);
    }

    const success = await login(email, password);
    setLoading(false);
    if (success) navigate(resellerPath("/reseller/dashboard"));
    else {
      setError(t("reseller.invalidCredentials"));
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${loginBgImg})` }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative z-10 w-full max-w-sm space-y-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-8 shadow-2xl">
        <button type="button" className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors" title={t("common.support")}>
          <Headset className="h-5 w-5" />
        </button>
        <div className="text-center flex flex-col items-center pt-0 pb-0">
          <LogoFull size="md" variant="default" align="center" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-[11px] text-red-200 text-center">{error}</p>
            </div>
          )}
          {upgradeMessage && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2 items-start animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <p className="text-[11px] text-amber-200 leading-relaxed font-semibold">{upgradeMessage}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">{t("auth.email")}</label>
            <div className="flex items-center gap-3 border border-white/10 rounded-xl px-4 py-3 bg-white/5 focus-within:ring-2 focus-within:ring-[#00AAFF]/50 transition-all">
              <Mail className="h-4 w-4 text-white/40" />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/20" 
                placeholder="you@example.com" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">{t("auth.password")}</label>
            <div className="flex items-center gap-3 border border-white/10 rounded-xl px-4 py-3 bg-white/5 focus-within:ring-2 focus-within:ring-[#00AAFF]/50 transition-all">
              <Lock className="h-4 w-4 text-white/40" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/20" 
                placeholder="••••••••" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/40 hover:text-white/60 transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full rounded-xl bg-[#00AAFF] py-3 text-sm font-bold text-white hover:bg-[#00AAFF]/90 transform active:scale-[0.98] transition-all shadow-lg shadow-[#00AAFF]/20 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? t("reseller.signingIn") : t("auth.signIn")}
          </button>
        </form>

        <div className="pt-2 space-y-4">
          <p className="text-center text-[11px] text-white/40">
            {t("auth.forgotPassword")}{" "}
            <Link to={resellerPath("/reseller/auth/forgot-password")} className="text-white hover:text-[#00AAFF] transition-colors font-semibold">{t("common.clickHere")}</Link>
          </p>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-transparent px-2 text-white/20 tracking-widest leading-none">New Here?</span>
            </div>
          </div>
          <p className="text-center text-[11px] text-white/40">
            {t("auth.noAccount")}{" "}
            <Link 
              to={resellerPath(`/reseller/register${referralCode ? `?ref=${referralCode}` : ''}`)}
              className="text-[#ff5500] hover:text-[#ff5500]/80 transition-colors font-bold"
            >
              {t("reseller.joinAsReseller")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
