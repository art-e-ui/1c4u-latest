import { useState, useMemo } from "react";
import { useReseller, LEVEL_PROFIT_MAP } from "@/lib/reseller-context-hooks";
import { Palette, ChevronRight, Wallet, ArrowDownToLine, ArrowUpFromLine, Clock, LogOut, Package, Store } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

const getLevelNumber = (levelVal: any): number => {
  if (levelVal === undefined || levelVal === null) return 0;
  const str = String(levelVal).trim();
  if (str.startsWith("VIP-")) {
    const num = parseInt(str.replace("VIP-", ""), 10);
    return isNaN(num) ? 0 : num;
  }
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : num;
};
import { Link, useNavigate } from "react-router-dom";
import { resellerPath, getStorefrontUrl } from "@/lib/subdomain";
import { Button } from "@/components/ui/button";
import FaqTermsSheet from "@/components/reseller/FaqTermsSheet";
import ProfileSettingsSheet from "@/components/reseller/ProfileSettingsSheet";
import ShopReputationSheet from "@/components/reseller/ShopReputationSheet";
import ResellerDepositSheet from "@/components/reseller/ResellerDepositSheet";
import ResellerWithdrawalSheet from "@/components/reseller/ResellerWithdrawalSheet";
import FinancialStatementsSheet from "@/components/reseller/FinancialStatementsSheet";
import LanguageSettingsSheet from "@/components/reseller/LanguageSettingsSheet";

export default function ResellerProfile() {
  const { reseller, logout } = useReseller();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);

  // Derive verification status: unverified (missing info), pending (info filled, awaiting admin), verified
  const verificationStatus = useMemo(() => {
    if (!reseller) return "unverified";
    if (reseller.verified) return "verified";
    // Consider "pending" if key profile fields are filled
    const hasPhone = !!reseller.phone;
    const hasPayment = !!reseller.usdtAddress || !!reseller.bankInfo;
    const hasShop = !!reseller.shopName && !!reseller.shopLogo;
    if (hasPhone && hasPayment && hasShop) return "pending";
    return "unverified";
  }, [reseller]);

  if (!reseller) return null;

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-24">
      {/* Account status card */}
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full border-2 border-primary/20 overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
          {reseller.profilePicture ? (
            <img src={reseller.profilePicture} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">
              {reseller.firstName?.[0]}{reseller.lastName?.[0]}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-card-foreground truncate">
            {reseller.firstName} {reseller.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{reseller.email}</p>
          <p className="text-[11px] text-primary font-mono mt-0.5 truncate">
            1CR{reseller.resellerId}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
            verificationStatus === "verified"
              ? "bg-primary/15 text-primary"
              : verificationStatus === "pending"
              ? "bg-warning/15 text-warning"
              : "bg-destructive/15 text-destructive"
          }`}>
            {verificationStatus === "verified" ? t("reseller.verified") : verificationStatus === "pending" ? t("reseller.pending") : t("reseller.unverified")}
          </span>
          <img
            src={`/badges/level-${getLevelNumber(reseller.level)}.png`}
            alt={`${reseller.level} badge`}
            className="h-16 w-16"
          />
        </div>
      </div>

      {/* Balance Card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("reseller.balance")}</h2>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{t("reseller.availableBalance")}</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            ${reseller.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-warning" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-warning">{t("reseller.pendingBalance")}</span>
            <span className="text-sm font-semibold text-foreground">
              ${(reseller.pendingBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-info/10 border border-info/20 px-3 py-2">
          <div className="flex items-baseline gap-1.5">
            <Package className="h-3.5 w-3.5 text-info" />
            <span className="text-[11px] text-info">{t("reseller.unpickedBalance")}</span>
            <span className="text-sm font-semibold text-foreground">
              ${(reseller.unpickedBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>


        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button className="gap-2 rounded-xl" onClick={() => setShowDeposit(true)}>
            <ArrowDownToLine className="h-4 w-4" />
            {t("reseller.deposit")}
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl border-border" onClick={() => setShowWithdrawal(true)}>
            <ArrowUpFromLine className="h-4 w-4" />
            {t("reseller.withdrawal")}
          </Button>
        </div>
      </div>

      {/* Personal Settings Sheet */}
      <ProfileSettingsSheet />

      {/* Shop Reputation & Credibility */}
      <ShopReputationSheet />

      {/* Financial Statements */}
      <FinancialStatementsSheet />

      {/* Shop Customization Link */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to={resellerPath("/reseller/profile/customize")}
          className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors text-center"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-card-foreground">{t("reseller.shopDecoration")}</p>
          <p className="text-[10px] text-muted-foreground">{t("reseller.logoTheme")}</p>
        </Link>

        <a
          href={getStorefrontUrl(reseller.shopSlug || "")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-4 hover:border-secondary/30 transition-colors text-center"
        >
          <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center mb-2">
            <Store className="h-5 w-5 text-secondary" />
          </div>
          <p className="text-sm font-semibold text-card-foreground">{t("reseller.viewStorefront")}</p>
          <p className="text-[10px] text-muted-foreground">{t("reseller.publicShopLink")}</p>
        </a>
      </div>

      {/* Language Settings */}
      <LanguageSettingsSheet />

      {/* FAQ, Terms & Policies */}
      <FaqTermsSheet />

      {/* Log Out & Version */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-[10px] text-muted-foreground">{t("reseller.licensedUpdated")}</p>
          <p className="text-[10px] font-medium text-muted-foreground">VSH_v2.0.6.1</p>
        </div>
        <Button
          variant="destructive"
          className="gap-2 rounded-xl"
          onClick={() => {
            logout();
            navigate(resellerPath("/reseller/login"));
          }}
        >
          <LogOut className="h-4 w-4" />
          {t("nav.logout")}
        </Button>
      </div>

      {/* Deposit Bottom Sheet */}
      <ResellerDepositSheet open={showDeposit} onOpenChange={setShowDeposit} />

      {/* Withdrawal Bottom Sheet */}
      <ResellerWithdrawalSheet open={showWithdrawal} onOpenChange={setShowWithdrawal} />
    </div>
  );
}
