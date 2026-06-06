import { useState } from "react";
import { useReseller } from "@/lib/reseller-context-hooks";
import { Shield, ChevronRight, Star, Package, CreditCard, Landmark, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

import { TFunction } from "i18next";

const LEVELS = [
  { level: 0, maxProducts: 20, maxProfit: 15, recharge: 1000, next: 1 },
  { level: 1, maxProducts: 30, maxProfit: 20, recharge: 5000, next: 2 },
  { level: 2, maxProducts: 40, maxProfit: 25, recharge: 10000, next: 3 },
  { level: 3, maxProducts: 50, maxProfit: 30, recharge: 50000, next: 4 },
  { level: 4, maxProducts: 100, maxProfit: 35, recharge: 100000, next: 5 },
  { level: 5, maxProducts: 150, maxProfit: 40, recharge: null, next: null },
];

const LEVEL_COLORS = [
  "border-l-muted-foreground",
  "border-l-primary",
  "border-l-secondary",
  "border-l-[hsl(var(--warning))]",
  "border-l-destructive",
  "border-l-[hsl(280,80%,50%)]",
];

function getVerificationStatus(reseller: { verified?: boolean; usdtAddress?: string; bankInfo?: unknown; firstName?: string; lastName?: string; email?: string; shopName?: string }, t: TFunction): { label: string; color: string } {
  if (reseller.verified) return { label: t("reseller.verified"), color: "text-primary" };
  const hasPayment = reseller.usdtAddress || reseller.bankInfo;
  const hasBasic = reseller.firstName && reseller.lastName && reseller.email && reseller.shopName;
  if (hasBasic && hasPayment) return { label: t("reseller.pending"), color: "text-[hsl(var(--warning))]" };
  return { label: t("reseller.unverified"), color: "text-destructive" };
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

function AllLevelsSheet({ currentLevel, open, onOpenChange }: { currentLevel: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-t border-border bg-background p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="text-base font-bold text-foreground">{t("reseller.shopLevelDetails")}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(85vh-70px)] px-5 pb-6">
          <div className="space-y-3 pb-6">
            {LEVELS.map((l) => {
              const isCurrent = l.level === currentLevel;
              return (
                <div
                  key={l.level}
                  className={`rounded-xl border-l-4 ${LEVEL_COLORS[l.level]} border border-border p-4 space-y-2 ${
                    isCurrent ? "bg-primary/5 ring-1 ring-primary/30" : "bg-card/60 backdrop-blur-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">
                      {t("reseller.level")} {l.level}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] uppercase font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {t("reseller.current")}
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide">{t("reseller.maxProducts")}</span>
                      <span className="text-sm font-semibold text-foreground">{l.maxProducts}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide">{t("reseller.maxProfit")}</span>
                      <span className="text-sm font-semibold text-foreground">{l.maxProfit}%</span>
                    </div>
                  </div>
                  {l.recharge !== null && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("reseller.accumulatedRecharge")} <span className="font-semibold text-secondary">${l.recharge.toLocaleString()}</span> {t("reseller.promoteToLevel")} {l.next}
                    </p>
                  )}
                  {l.recharge === null && (
                    <p className="text-[11px] font-medium text-primary">{t("reseller.topTierMaximumLevel")}</p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default function ShopReputationSheet() {
  const { reseller } = useReseller();
  const { t } = useTranslation();
  const [levelsOpen, setLevelsOpen] = useState(false);

  if (!reseller) return null;

  const status = getVerificationStatus(reseller, t);
  const shopLevel = typeof reseller.level === 'string' 
    ? parseInt(reseller.level.replace('VIP-', '')) || 0 
    : (reseller.level ?? 0);

  const metrics = [
    { label: t("reseller.shopProducts"), value: reseller.selectedProductIds?.length ?? 0, icon: Package },
    { label: t("reseller.storeRating"), value: `${reseller.starRating ?? 2.0} / 5`, icon: Star },
    { label: t("reseller.creditLimit"), value: (reseller.productLimit ?? 20).toLocaleString(), icon: CreditCard },
    { label: t("reseller.creditScore"), value: reseller.creditScore ?? 100, icon: TrendingUp },
  ];

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <button className="w-full flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">{t("reseller.shopReputation")}</p>
                <p className="text-xs text-muted-foreground">{t("reseller.levelStatusCredibility")}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-t border-border bg-background p-0">
          <SheetHeader className="px-5 pt-5 pb-3">
            <SheetTitle className="text-base font-bold text-foreground">{t("reseller.shopLevel")}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(85vh-70px)] px-5 pb-6">
            <div className="space-y-3 pb-6">
              {/* Shop Level */}
              <GlassCard>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {t("reseller.shopLevel")} : {t("reseller.level")}-{shopLevel}
                  </p>
                  <button
                    onClick={() => setLevelsOpen(true)}
                    className="text-xs text-primary underline underline-offset-2 font-medium hover:text-primary/80 transition-colors"
                  >
                    {t("reseller.checkAllLevel")}
                  </button>
                </div>
              </GlassCard>

              {/* Shop Status */}
              <GlassCard>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{t("reseller.shopStatus")}</p>
                  <p className={`text-sm font-bold ${status.color}`}>{status.label}</p>
                </div>
              </GlassCard>

              {/* Metrics */}
              {metrics.map((m) => (
                <GlassCard key={m.label}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <m.icon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{m.value}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AllLevelsSheet currentLevel={shopLevel} open={levelsOpen} onOpenChange={setLevelsOpen} />
    </>
  );
}
