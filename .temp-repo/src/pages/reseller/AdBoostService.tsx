import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Rocket, Zap, Target, BarChart, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function AdBoostService() {
  const { t } = useTranslation();

  const plans = [
    { 
      name: "Starter Boost", 
      price: "$29/mo", 
      features: ["1 Featured Product", "Basic Analytics", "Standard Support"],
      icon: Zap,
      color: "text-info"
    },
    { 
      name: "Growth Engine", 
      price: "$79/mo", 
      features: ["5 Featured Products", "Advanced Targeting", "Priority Support", "Weekly Reports"],
      icon: Rocket,
      color: "text-primary",
      popular: true
    },
    { 
      name: "Market Leader", 
      price: "$199/mo", 
      features: ["Unlimited Featured Products", "AI-Powered Targeting", "Dedicated Account Manager", "Real-time Analytics"],
      icon: Target,
      color: "text-warning"
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("reseller.adBoostService")}</h1>
        <p className="text-sm text-muted-foreground">{t("reseller.accelerateSalesDesc")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className={`border-none shadow-theme-lg flex flex-col relative ${plan.popular ? "ring-2 ring-primary" : ""}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {t("reseller.mostPopular")}
              </div>
            )}
            <CardHeader className="text-center pt-8">
              <div className={`h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 ${plan.color}`}>
                <plan.icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <div className="p-6 pt-0">
              <Button className="w-full font-bold h-11" variant={plan.popular ? "default" : "outline"}>
                {t("reseller.choose")} {plan.name}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-theme-sm bg-muted/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <BarChart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t("reseller.trackPerformance")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("reseller.analyticsDashboardDesc")}
                </p>
              </div>
            </div>
            <Button variant="outline" className="shrink-0">{t("reseller.viewSampleReport")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
