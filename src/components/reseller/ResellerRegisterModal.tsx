import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReseller } from "@/lib/reseller-context-hooks";
import { User, Mail, Lock, Eye, EyeOff, Tag, X } from "lucide-react";
import LogoFull from "@/components/brand/LogoFull";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAppModeDriven, PortalType, resellerPath } from "@/lib/subdomain";
import { useTranslation } from "react-i18next";
import resellerBg from "@/assets/reseller_bg.png";

interface ResellerRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReferralCode?: string;
}

export default function ResellerRegisterModal({ open, onOpenChange, initialReferralCode = "" }: ResellerRegisterModalProps) {
  const { t } = useTranslation();
  const { register } = useReseller();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", emailOrPhone: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode);
    }
  }, [initialReferralCode]);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const switchPortal = (p: PortalType) => {
    if (isAppModeDriven()) {
      localStorage.setItem("dev_portal_override", p);
      window.location.href = "/reseller/dashboard";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.emailOrPhone || !form.password) {
      setError(t('auth.allFieldsRequired'));
      return;
    }
    if (form.password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    setError("");
    const result = await register({ ...form, shopName: `${form.firstName}'s Store`, referralCode });
    setLoading(false);
    if (result.success) {
      onOpenChange(false);
      if (isAppModeDriven()) {
        switchPortal("reseller");
      } else {
        navigate(resellerPath("/reseller/dashboard"));
      }
    } else {
      setError(result.error || t('auth.registrationFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[450px] p-0 overflow-hidden bg-[#0A0A0A] border-white/10 text-white relative max-h-[90vh] flex flex-col">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 pointer-events-none"
          style={{ backgroundImage: `url(${resellerBg})` }}
        />
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        
        <div className="relative z-10 p-8 pt-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          <VisuallyHidden>
            <DialogTitle>{t('reseller.becomeReseller')}</DialogTitle>
            <DialogDescription>{t('reseller.startPartnership')}</DialogDescription>
          </VisuallyHidden>
          <div className="text-center flex flex-col items-center pt-0 pb-0">
            <LogoFull size="md" variant="light" align="center" />
            <p className="text-sm text-white/70 mt-3 tracking-wide">{t("reseller.startPartnership")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-[11px] text-red-200 text-center">{error}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 focus-within:z-20">
                <Label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">{t('reseller.firstName')}</Label>
                <div className="relative flex items-center gap-3 border border-white/10 rounded-xl px-4 py-3 bg-white/5 focus-within:ring-2 focus-within:ring-[#00AAFF]/50 transition-all">
                  <User className="h-4 w-4 text-white/40 shrink-0" />
                  <input 
                    value={form.firstName} 
                    onChange={e => set("firstName", e.target.value)} 
                    className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/20" 
                    placeholder="John" 
                  />
                </div>
              </div>
              <div className="space-y-1.5 focus-within:z-20">
                <Label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">{t('reseller.lastName')}</Label>
                <div className="relative flex items-center gap-3 border border-white/10 rounded-xl px-4 py-3 bg-white/5 focus-within:ring-2 focus-within:ring-[#00AAFF]/50 transition-all">
                  <User className="h-4 w-4 text-white/40 shrink-0" />
                  <input 
                    value={form.lastName} 
                    onChange={e => set("lastName", e.target.value)} 
                    className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/20" 
                    placeholder="Doe" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">{t('auth.email')}</Label>
              <div className="relative flex items-center gap-3 border border-white/10 rounded-xl px-4 py-3 bg-white/5 focus-within:ring-2 focus-within:ring-[#00AAFF]/50 transition-all">
                <Mail className="h-4 w-4 text-white/40 shrink-0" />
                <input 
                  type="text" 
                  value={form.emailOrPhone} 
                  onChange={e => set("emailOrPhone", e.target.value)} 
                  className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/20" 
                  placeholder="you@example.com" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">{t('auth.password')}</Label>
                <div className="relative flex items-center gap-3 border border-white/10 rounded-xl px-4 py-3 bg-white/5 focus-within:ring-2 focus-within:ring-[#00AAFF]/50 transition-all">
                  <Lock className="h-4 w-4 text-white/40 shrink-0" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={form.password} 
                    onChange={e => set("password", e.target.value)} 
                    className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/20" 
                    placeholder="••••••••" 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/40 hover:text-white/60 shrink-0">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">{t('auth.confirmPassword')}</Label>
                <div className="relative flex items-center gap-3 border border-white/10 rounded-xl px-4 py-3 bg-white/5 focus-within:ring-2 focus-within:ring-[#00AAFF]/50 transition-all">
                  <Lock className="h-4 w-4 text-white/40 shrink-0" />
                  <input 
                    type={showConfirm ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/20" 
                    placeholder="••••••••" 
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-white/40 hover:text-white/60 shrink-0">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {referralCode && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">{t('reseller.referralCode')}</Label>
                <div className="flex items-center gap-3 border border-[#00AAFF]/30 rounded-xl px-4 py-3 bg-[#00AAFF]/5 border-dashed">
                  <Tag className="h-4 w-4 text-[#00AAFF] shrink-0" />
                  <span className="text-sm font-bold text-[#00AAFF] tracking-widest">{referralCode}</span>
                </div>
                <p className="mt-1 text-[10px] text-[#00AAFF] font-medium ml-1">{t('reseller.referralApplied')}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full rounded-xl bg-[#ff5500] py-4 text-sm font-bold text-white hover:bg-[#ff5500]/90 transform active:scale-[0.98] transition-all shadow-lg shadow-[#ff5500]/20 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? t('reseller.creatingAccount') : t('reseller.createAccount')}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-[11px] text-white/40">
              {t('auth.hasAccount')}{" "}
              <button 
                onClick={() => {
                  onOpenChange(false);
                  if (isAppModeDriven()) {
                    switchPortal("reseller");
                  } else {
                    navigate(resellerPath("/reseller/login"));
                  }
                }} 
                className="text-white hover:text-[#00AAFF] transition-colors font-semibold"
              >
                {t('reseller.signIn')}
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
