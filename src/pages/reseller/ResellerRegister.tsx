import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useReseller } from "@/lib/reseller-context-hooks";
import { Headset, User, Mail, Lock, Eye, EyeOff, Tag, Phone } from "lucide-react";
import { resellerPath } from "@/lib/subdomain";
import LogoFull from "@/components/brand/LogoFull";
import resellerBg from "@/assets/reseller_bg.png";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import { useTranslation } from "react-i18next";

export default function ResellerRegister() {
  const loginBg = resellerBg;
  const { register } = useReseller();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ firstName: "", lastName: "", emailOrPhone: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferralCode(ref);
  }, [searchParams]);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.emailOrPhone || !form.password) {
      setError(t("reseller.allFieldsRequired"));
      return;
    }
    if (form.password !== confirmPassword) {
      setError(t("reseller.passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    setError("");

    const isPhone = /^\+?[1-9]\d{1,14}$/.test(form.emailOrPhone);

    if (isPhone) {
      // Phone Auth Flow
      try {
        const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
        const confirmationResult = await signInWithPhoneNumber(auth, form.emailOrPhone, recaptchaVerifier);
        setVerificationId(confirmationResult.verificationId);
        setShowVerification(true);
        setLoading(false);
      } catch (err: unknown) {
        const error = err as Error;
        setError(t("reseller.phoneVerificationFailed") + ": " + error.message);
        setLoading(false);
      }
    } else {
      // Email Auth Flow
      const { success, error: registrationError } = await register({ ...form, referralCode });
      setLoading(false);
      if (success) navigate(resellerPath("/reseller/dashboard"));
      else setError(registrationError || t("reseller.registrationFailed"));
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const userCredential = await signInWithCredential(auth, credential);
      
      const { success, error: registrationError } = await register({ 
        ...form, 
        referralCode, 
        isPhone: true, 
        phoneCredential: userCredential 
      });
      
      setLoading(false);
      if (success) navigate(resellerPath("/reseller/dashboard"));
      else setError(registrationError || t("reseller.registrationFailed"));
    } catch (err: unknown) {
      const error = err as Error;
      setError(t("reseller.verificationFailed") + ": " + error.message);
      setLoading(false);
    }
  };

  const inputBoxClass = "flex items-center gap-3 border border-white/10 rounded-xl px-4 py-3 bg-white/5 focus-within:ring-2 focus-within:ring-[#00AAFF]/50 transition-all";
  const inputClass = "bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/20";
  const iconClass = "h-4 w-4 text-white/40 shrink-0";
  const labelClass = "text-xs font-semibold text-white/50 uppercase tracking-wider ml-1 mb-1.5 block";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative z-10 w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-8 shadow-2xl">
        <button type="button" className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors" title={t("common.support")}>
          <Headset className="h-5 w-5" />
        </button>
        <div className="text-center flex flex-col items-center pt-0 pb-0">
          <LogoFull size="md" variant="default" align="center" />
          <p className="text-sm text-white/70 mt-4 tracking-wide">{t("reseller.startResellingToday")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-[11px] text-red-200 text-center">{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("reseller.firstName")}</label>
              <div className={inputBoxClass}>
                <User className={iconClass} />
                <input value={form.firstName} onChange={e => set("firstName", e.target.value)} className={inputClass} placeholder="John" />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t("reseller.lastName")}</label>
              <div className={inputBoxClass}>
                <User className={iconClass} />
                <input value={form.lastName} onChange={e => set("lastName", e.target.value)} className={inputClass} placeholder="Doe" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("reseller.emailOrPhone")}</label>
            <div className={inputBoxClass}>
              <Mail className={iconClass} />
              <input type="text" value={form.emailOrPhone} onChange={e => set("emailOrPhone", e.target.value)} className={inputClass} placeholder="you@example.com or +1234567890" />
            </div>
          </div>

          {showVerification && (
            <div className="p-4 rounded-xl border border-[#00AAFF]/30 bg-[#00AAFF]/5 space-y-3">
              <label className={labelClass}>{t("reseller.verificationCode")}</label>
              <div className={inputBoxClass}>
                <Phone className={iconClass} />
                <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className={inputClass} placeholder="123456" />
              </div>
              <button 
                type="button" 
                onClick={handleVerify} 
                className="w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/20 transition-all border border-white/10"
              >
                {t("reseller.verifyCode")}
              </button>
            </div>
          )}
          
          <div id="recaptcha-container"></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("auth.password")}</label>
              <div className={inputBoxClass}>
                <Lock className={iconClass} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={form.password} 
                  onChange={e => set("password", e.target.value)} 
                  className={inputClass} 
                  placeholder="••••••••" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/40 hover:text-white/60">
                  {showPassword ? <EyeOff className={iconClass} /> : <Eye className={iconClass} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>{t("auth.confirmPassword")}</label>
              <div className={inputBoxClass}>
                <Lock className={iconClass} />
                <input 
                  type={showConfirm ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className={inputClass} 
                  placeholder="••••••••" 
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-white/40 hover:text-white/60">
                  {showConfirm ? <EyeOff className={iconClass} /> : <Eye className={iconClass} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("reseller.referralCode")}</label>
            <div className={inputBoxClass}>
              <Tag className={iconClass} />
              <input 
                value={referralCode} 
                onChange={e => setReferralCode(e.target.value)} 
                className={inputClass} 
                placeholder={t("reseller.enterReferralCode")} 
                readOnly={!!searchParams.get("ref")}
              />
            </div>
            {referralCode && (
              <p className="mt-1 text-[10px] text-[#00AAFF] font-medium tracking-tight ml-1">{t("reseller.referralCodeApplied")}</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full rounded-xl bg-[#ff5500] py-3 text-sm font-bold text-white hover:bg-[#ff5500]/90 transform active:scale-[0.98] transition-all shadow-lg shadow-[#ff5500]/20 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? t("reseller.creatingAccount") : t("reseller.createAccount")}
          </button>
        </form>

        <div className="pt-2">
          <p className="text-center text-[11px] text-white/40">
            {t("auth.hasAccount")}{" "}
            <Link to={resellerPath("/reseller/login")} className="text-white hover:text-[#00AAFF] transition-colors font-semibold">{t("auth.signIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
