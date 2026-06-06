import { useReseller } from "@/lib/reseller-context-hooks";
import { Package, ShoppingBag, Headphones, ChevronRight, DollarSign, Award, TrendingUp, Eye, Clock, Share2, Megaphone, ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { resellerPath } from "@/lib/subdomain";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useEmblaCarousel from "embla-carousel-react";
import AdBoostSheet from "@/components/reseller/AdBoostSheet";
import adBoostCardImg from "@/assets/ad-boost-card.png";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";

const adBoostCard = adBoostCardImg;

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

export default function ResellerDashboard() {
  const { reseller } = useReseller();
  const { t } = useTranslation();
  const location = useLocation();
  const sharedData = location.state?.sharedData;
  
  const [adBoostOpen, setAdBoostOpen] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });

  const { data: latestAnnouncement } = useQuery({
    queryKey: ["latest_broadcast_announcement"],
    queryFn: async () => {
      const q = query(
        collection(db, "broadcast_notifications"),
        where("is_archived", "==", false),
        orderBy("broadcast_date", "desc"),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const data = snapshot.docs[0].data();
      return {
        id: snapshot.docs[0].id,
        label: data.label || "System Announcement",
        message: data.message || "",
        department: data.department || "System",
        broadcast_date: data.broadcast_date || new Date().toISOString(),
      };
    },
  });

  const shortcuts = useMemo(() => [
    { icon: Package, label: t("reseller.pendingOrders"), href: resellerPath("/reseller/orders"), state: { tab: "Pending" }, color: "text-primary" },
    { icon: ShoppingBag, label: t("reseller.storeProducts"), href: resellerPath("/reseller/shop"), state: { tab: "my" }, color: "text-secondary" },
    { icon: Headphones, label: t("reseller.getAdvised"), href: resellerPath("/reseller/messages"), state: { tab: "support" }, color: "text-primary" },
  ], [t]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => { emblaApi.scrollNext(); }, 3000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  // Generate a pseudo-random weekly visit count (adjustable from admin)
  const weeklyVisits = useMemo(() => {
    const base = reseller ? (reseller.totalOrders * 3 + 120) : 200;
    const jitter = Math.floor(Math.random() * 80) - 40;
    return Math.max(50, base + jitter);
  }, [reseller]);

  // Derive verification status
  const verificationStatus = useMemo(() => {
    if (!reseller) return "unverified";
    if (reseller.verified) return "verified";
    const hasPhone = !!reseller.phone;
    const hasPayment = !!reseller.usdtAddress || !!reseller.bankInfo;
    const hasShop = !!reseller.shopName && !!reseller.shopLogo;
    if (hasPhone && hasPayment && hasShop) return "pending";
    return "unverified";
  }, [reseller]);

  if (!reseller) return null;

  const slidingCards = [
    { label: t("reseller.totalOrders"), value: reseller.totalOrders.toString(), subtitle: t("reseller.completed"), icon: Package },
    { label: t("reseller.totalDeposits"), value: `$${reseller.totalDeposits.toLocaleString()}`, subtitle: t("reseller.lifetime"), icon: DollarSign },
    { label: t("reseller.shopLevel"), value: reseller.level, subtitle: t("reseller.keepGrowing"), icon: Award },
  ];

  return (
    <div className="pb-24 max-w-lg mx-auto">
      {sharedData && (
        <div className="mx-4 mt-4 bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Share2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{t("reseller.contentShared")}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {sharedData.title || sharedData.text || sharedData.url}
            </p>
          </div>
          <button 
            onClick={() => window.history.replaceState({}, document.title)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clock className="w-4 h-4 rotate-45" />
          </button>
        </div>
      )}



      {/* Profile Avatar Card (same as ResellerProfile) */}
      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
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

      {/* Glass KPI Cards */}
      <div className="px-4 flex gap-3">
        {/* Total Turnover */}
        <div className="glass-kpi-card flex-1 relative overflow-hidden rounded-[20px] p-4 flex flex-col justify-between">
          <div className="relative z-10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{t("reseller.turnoverBalance")}</p>
            <p className="text-xl font-bold text-foreground mt-1">${reseller.balance.toLocaleString()}</p>
          </div>
          <Link
            to={resellerPath("/reseller/profile")}
            className="relative z-10 inline-flex items-center gap-1 mt-3 text-[10px] font-medium text-primary hover:underline"
          >
            {t("reseller.storeSettings")} <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {/* Total Profit */}
        <div className="glass-kpi-card flex-1 relative overflow-hidden rounded-[20px] p-4 flex flex-col justify-between">
          <div className="relative z-10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{t("reseller.totalProfit")}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <TrendingUp className="h-4 w-4 text-brand-gold" />
              <p className="text-xl font-bold text-foreground">${reseller.totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending & Unpicked Balances */}
      <div className="px-4 mt-3 flex gap-3">
        {/* Pending Balance Card */}
        <div className="glass-kpi-card flex-1 relative overflow-hidden rounded-[20px] p-4">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{t("reseller.pendingBalance")}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Clock className="h-4 w-4 text-warning" />
                <p className="text-xl font-bold text-foreground">${(reseller.pendingBalance || 0).toLocaleString()}</p>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {reseller.pendingBalance > 0 ? t("reseller.ongoingOrders") : t("reseller.noOngoing")}
              </p>
            </div>
          </div>
        </div>

        {/* Unpicked Balance Card */}
        <div className="glass-kpi-card flex-1 relative overflow-hidden rounded-[20px] p-4">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{t("reseller.unpickedBalance")}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Package className="h-4 w-4 text-info" />
                <p className="text-xl font-bold text-foreground">${(reseller.unpickedBalance || 0).toLocaleString()}</p>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {reseller.unpickedBalance > 0 ? t("reseller.newOrders") : t("reseller.noNewOrders")}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Quick Shortcuts */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-around py-3 rounded-2xl border border-primary/10 bg-primary/[0.03] backdrop-blur-sm shadow-sm">
          {shortcuts.map(({ icon: Icon, label, href, state, color }) => (
            <Link key={label} to={href} state={state} className="flex flex-col items-center gap-1.5 group">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight max-w-[70px]">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Premium Glass Sliding Stats Cards */}
      <div className="mt-5 overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slidingCards.map(({ label, value, subtitle, icon: Icon }, idx) => (
            <div key={label} className="flex-[0_0_75%] min-w-0 pl-3 first:pl-4">
              <div className="relative rounded-2xl overflow-hidden h-32 border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-transparent backdrop-blur-md shadow-md">
                {/* Decorative circles */}
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/[0.07]" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-primary/[0.05]" />
                <div className="relative z-10 h-full flex flex-col justify-between p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* AD Boosting Service Card */}
      <div className="px-4 mt-5">
        <button onClick={() => setAdBoostOpen(true)} className="block w-full text-left">
          <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-primary/[0.03] to-transparent backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow">
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-primary/[0.08]" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-primary/[0.06]" />
            <div className="relative z-10 flex items-center gap-4 p-4">
              <img src={adBoostCard} alt="AD Boosting Service" className="h-24 w-24 object-contain rounded-xl" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">{t("reseller.newService")}</p>
                <h3 className="text-sm font-bold text-foreground mt-1">{t("reseller.adBoost")}</h3>
                <p className="text-[11px] text-muted-foreground mt-1">{t("reseller.adBoostingDesc")}</p>
                <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-primary">
                  {t("reseller.explorePlans")} <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>

      <AdBoostSheet open={adBoostOpen} onOpenChange={setAdBoostOpen} />

      {/* Average Visits Card */}
      <div className="px-4 mt-4">
        <div className="glass-kpi-card relative overflow-hidden rounded-[20px] p-4">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{t("reseller.averageVisits")}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5">{weeklyVisits.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("reseller.basedOnReputation")}</p>
            </div>
            <div className="h-11 w-11 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center">
              <Eye className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Unverified banner */}
      {!reseller.verified && (
        <div className="px-4 mt-4">
          <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-4">
            <p className="text-sm font-medium text-secondary">⚠ {t("reseller.accountNotVerified")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("reseller.completeProfileDesc")}</p>
            <Link to={resellerPath("/reseller/profile")} className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
              {t("reseller.completeProfile")} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
