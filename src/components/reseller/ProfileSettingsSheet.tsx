import { useState, useRef, useEffect } from "react";
import { useReseller } from "@/lib/reseller-context-hooks";
import { useToast } from "@/hooks/use-toast";
import { compressImageToBase64 } from "@/lib/storage-utils";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Camera, User, Lock, Mail, Phone, Eye, EyeOff, ChevronRight, CreditCard, Save } from "lucide-react";

export default function ProfileSettingsSheet() {
  const { reseller, updateProfile } = useReseller();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(reseller?.firstName || "");
  const [lastName, setLastName] = useState(reseller?.lastName || "");
  const [email, setEmail] = useState(reseller?.email || "");
  const [phone, setPhone] = useState(reseller?.phone || "");
  const [previewUrl, setPreviewUrl] = useState(reseller?.profilePicture || "");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Payment info fields
  const [usdtAddress, setUsdtAddress] = useState(reseller?.usdtAddress || "");
  const [bankName, setBankName] = useState(reseller?.bankInfo?.bankName || "");
  const [accountName, setAccountName] = useState(reseller?.bankInfo?.accountName || "");
  const [accountNumber, setAccountNumber] = useState(reseller?.bankInfo?.accountNumber || "");
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync state when reseller changes
  useEffect(() => {
    if (reseller) {
      setFirstName(reseller.firstName || "");
      setLastName(reseller.lastName || "");
      setEmail(reseller.email || "");
      setPhone(reseller.phone || "");
      setPreviewUrl(reseller.profilePicture || "");
      setUsdtAddress(reseller.usdtAddress || "");
      setBankName(reseller.bankInfo?.bankName || "");
      setAccountName(reseller.bankInfo?.accountName || "");
      setAccountNumber(reseller.bankInfo?.accountNumber || "");
    }
  }, [reseller]);

  if (!reseller) return null;

  const initials = `${reseller.firstName?.[0] || ""}${reseller.lastName?.[0] || ""}`.toUpperCase();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("reseller.fileTooLarge"), description: t("reseller.selectImageUnder5MB"), variant: "destructive" });
      return;
    }
    
    const compressed = await compressImageToBase64(file);
    if (compressed) {
      setPreviewUrl(compressed);
    } else {
      toast({ title: "Error", description: "Failed to process image.", variant: "destructive" });
    }
  };

  const handleSaveInfo = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ title: t("reseller.missingFields"), description: t("reseller.nameEmailRequired"), variant: "destructive" });
      return;
    }
    setIsUpdating(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        profilePicture: previewUrl,
      });
      toast({ title: t("reseller.profileUpdated"), description: t("reseller.personalInfoSaved") });
    } catch (e) {
      console.error("Profile update error:", e);
      toast({ title: t("reseller.updateFailed"), description: t("reseller.couldNotSaveProfile"), variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = () => {
    setPasswordError("");
    if (!currentPassword) { setPasswordError(t("auth.password") + " is required"); return; }
    if (newPassword.length < 6) { setPasswordError(t("reseller.newPassword") + " must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setPasswordError(t("auth.confirmPassword") + " do not match"); return; }
    // Mock password change
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: t("reseller.passwordChanged"), description: t("reseller.passwordUpdatedSuccessfully") });
  };

  const handleSavePaymentInfo = async () => {
    setIsUpdating(true);
    try {
      await updateProfile({
        usdtAddress,
        bankInfo: { bankName, accountName, accountNumber },
      });
      toast({ title: t("reseller.paymentInfoUpdated"), description: t("reseller.paymentDetailsSaved") });
    } catch (e) {
      toast({ title: t("reseller.updateFailed"), description: t("reseller.couldNotSaveProfile"), variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const inputClass =
    "mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  const passwordInputClass =
    "w-full rounded-xl border border-input bg-background pl-4 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center justify-between w-full rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-card-foreground">{t("reseller.personalSettings")}</p>
              <p className="text-xs text-muted-foreground">{t("reseller.photoNameEmailPassword")}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl overflow-y-auto px-5 pb-10">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-lg font-bold text-foreground">{t("reseller.personalSettings")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-2">
          {/* Profile Picture Section */}
          <section className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full border-2 border-primary/20 overflow-hidden bg-muted flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">{initials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-4 w-4 text-primary-foreground" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("reseller.tapCameraToUpload")}</p>
          </section>

          {/* Personal Information */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> {t("reseller.personalInformation")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">{t("reseller.firstName")}</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} placeholder={t("reseller.firstName")} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t("reseller.lastName")}</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} placeholder={t("reseller.lastName")} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> {t("reseller.email")}
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {t("reseller.phoneNumber")}
              </label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+1 234 567 890" />
            </div>
            <button
              onClick={handleSaveInfo}
              disabled={isUpdating}
              className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isUpdating ? t("reseller.saving") : t("reseller.saveInformation")}
            </button>
          </section>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Change Password */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> {t("reseller.changePassword")}
            </h3>
            {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            <div>
              <label className="text-xs text-muted-foreground">{t("reseller.currentPassword")}</label>
              <div className="relative mt-1">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className={passwordInputClass}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("reseller.newPassword")}</label>
              <div className="relative mt-1">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={passwordInputClass}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("reseller.confirmNewPassword")}</label>
              <div className="relative mt-1">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={passwordInputClass}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              onClick={handleChangePassword}
              className="w-full rounded-xl border border-primary bg-transparent py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              {t("reseller.updatePassword")}
            </button>
          </section>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Payment Information (Withdrawal Settings) */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> {t("reseller.paymentInformation")}
            </h3>
            <p className="text-xs text-muted-foreground">{t("reseller.setWithdrawalDetails")}</p>
            <div>
              <label className="text-xs text-muted-foreground">{t("reseller.usdtAddress")}</label>
              <input value={usdtAddress} onChange={e => setUsdtAddress(e.target.value)} className={inputClass} placeholder="TRC20 address" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("reseller.bankName")}</label>
              <input value={bankName} onChange={e => setBankName(e.target.value)} className={inputClass} placeholder={t("reseller.bankName")} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("reseller.accountName")}</label>
              <input value={accountName} onChange={e => setAccountName(e.target.value)} className={inputClass} placeholder={t("reseller.accountName")} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("reseller.accountNumber")}</label>
              <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className={inputClass} placeholder={t("reseller.accountNumber")} />
            </div>
            <button
              onClick={handleSavePaymentInfo}
              disabled={isUpdating}
              className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isUpdating ? t("reseller.saving") : t("reseller.savePaymentInfo")}
            </button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
