import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import launchpadImg from "@/assets/ad-boost-launchpad.png";
import momentumImg from "@/assets/ad-boost-momentum.png";
import primeImg from "@/assets/ad-boost-prime.png";

interface AdBoostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdBoostSheet({ open, onOpenChange }: AdBoostSheetProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const { t } = useTranslation();

  const plans = [
    {
      name: t("reseller.launchPad"),
      visitors: "10-50",
      description: t("reseller.tenBillionFlow"),
      price: "$100",
      duration: `7 ${t("reseller.days")}`,
      image: launchpadImg,
      accent: "from-primary/[0.10] to-primary/[0.03]",
    },
    {
      name: t("reseller.momentumBoost"),
      visitors: "50-100",
      description: t("reseller.tenBillionFlow"),
      price: "$200",
      duration: `15 ${t("reseller.days")}`,
      image: momentumImg,
      accent: "from-primary/[0.14] to-primary/[0.05]",
    },
    {
      name: t("reseller.primeVisibility"),
      visitors: "100-1000",
      description: t("reseller.tenBillionFlow"),
      price: "$500",
      duration: `30 ${t("reseller.days")}`,
      image: primeImg,
      accent: "from-primary/[0.18] to-primary/[0.06]",
    },
  ] as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto px-4 pb-8">
        <SheetHeader className="px-0 pt-2 pb-4">
          <SheetTitle className="text-base font-bold text-foreground">{t("reseller.adBoostingPlans")}</SheetTitle>
          <p className="text-xs text-muted-foreground">{t("reseller.choosePlanBoostVisibility")}</p>
        </SheetHeader>

        <div className="space-y-3">
          {plans.map((plan) => {
            const isSelected = selected === plan.name;
            return (
              <button
                key={plan.name}
                onClick={() => setSelected(plan.name)}
                className={`w-full text-left relative rounded-2xl overflow-hidden border transition-all duration-200 ${
                  isSelected
                    ? "border-primary shadow-[0_0_20px_rgba(0,144,0,0.15)]"
                    : "border-primary/15 hover:border-primary/30"
                }`}
              >
                {/* Glass background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${plan.accent} backdrop-blur-sm`} />
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-primary/[0.06]" />
                <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-primary/[0.04]" />

                <div className="relative z-10 flex items-center gap-3 p-4">
                  <img src={plan.image} alt={plan.name} className="h-16 w-16 object-contain rounded-xl flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-primary font-semibold mt-0.5">
                      {t("reseller.dailyVisitorVolume")}: {plan.visitors}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{plan.description}</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-base font-bold text-foreground">{plan.price}</span>
                      <span className="text-[10px] text-muted-foreground">/ {plan.duration}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Button
          className="w-full mt-5 rounded-xl h-11 text-sm font-semibold"
          disabled={!selected}
        >
          {t("reseller.subscribeTo")} {selected || t("reseller.aPlan")}
        </Button>

        {/* Custom plan card */}
        <div className="mt-4 relative rounded-2xl overflow-hidden border border-primary/15 p-5 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] backdrop-blur-sm" />
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-primary/[0.06]" />
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-foreground">{t("reseller.flexiblePlan")}</h3>
            <p className="text-xs font-semibold text-primary mt-1">{t("reseller.reliableProductJustForYou")}</p>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              {t("reseller.comeWithDesirePlan")}
            </p>
            <Button variant="outline" className="mt-3 rounded-xl h-9 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10">
              {t("reseller.talkWithMarketingExperts")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
