import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReseller } from "@/lib/reseller-context-hooks";
import { User, Mail, Lock, Eye, EyeOff, Tag, X } from "lucide-react";
import LogoIcon from "@/components/brand/LogoIcon";
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
        
        <div className="relative z-10 p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          <VisuallyHidden>
            <DialogTitle>{t('reseller.becomeReseller')}</DialogTitle>
            <DialogDescription>{t('reseller.startPartnership')}</DialogDescription>
          </VisuallyHidden>
          <div className="text-center space-y-2">
            <LogoIcon size={40} className="mx-auto" />
            <h2 className="text-xl font-bold text-white">{t('reseller.becomeReseller')}</h2>
            <p className="text-sm text-white/60">{t('reseller.startPartnership')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-xs text-red-400 text-center bg-red-400/10 py-2 rounded border border-red-400/20">{error}</p>}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/70">{t('reseller.firstName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input 
                    value={form.firstName} 
                    onChange={e => set("firstName", e.target.value)} 
                    className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 text-white" 
                    placeholder="John" 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/70">{t('reseller.lastName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input 
                    value={form.lastName} 
                    onChange={e => set("lastName", e.target.value)} 
                    className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 text-white" 
                    placeholder="Doe" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/70">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input 
                  type="text" 
                  value={form.emailOrPhone} 
                  onChange={e => set("emailOrPhone", e.target.value)} 
                  className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 text-white" 
                  placeholder="you@example.com" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/70">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  value={form.password} 
                  onChange={e => set("password", e.target.value)} 
                  className="pl-10 pr-10 bg-white/5 border-white/10 focus:border-primary/50 text-white" 
                  placeholder="••••••••" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff className="h-4 w-4 text-white/30" /> : <Eye className="h-4 w-4 text-white/30" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/70">{t('auth.confirmPassword')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input 
                  type={showConfirm ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className="pl-10 pr-10 bg-white/5 border-white/10 focus:border-primary/50 text-white" 
                  placeholder="••••••••" 
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showConfirm ? <EyeOff className="h-4 w-4 text-white/30" /> : <Eye className="h-4 w-4 text-white/30" />}
                </button>
              </div>
            </div>

            {referralCode && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/70">{t('reseller.referralCode')}</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <div className="pl-10 h-10 flex items-center bg-white/5 border border-white/10 rounded-md text-primary font-bold cursor-not-allowed select-all">
                    {referralCode}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-primary">{t('reseller.referralApplied')}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6">
              {loading ? t('reseller.creatingAccount') : t('reseller.createAccount')}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-xs text-white/40">
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
                className="text-white hover:underline font-medium"
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
