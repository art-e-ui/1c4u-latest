import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PreOrderBanner() {
  const { t } = useTranslation();

  return (
    <section className="py-4 md:py-6">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 px-6 py-8 md:px-12 md:py-10">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.3' fill-rule='evenodd'%3E%3Ccircle cx='20' cy='20' r='3'/%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="relative z-10 flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70">{t('common.limitedTimeOffer')}</p>
              <h3 className="mt-1 text-xl font-black text-primary-foreground md:text-2xl">
                {t('common.preOrderNowSave')}
              </h3>
              <p className="mt-1 text-sm text-primary-foreground/80">
                {t('common.getEarlyAccess')}
              </p>
            </div>
            <Link
              to="/categories"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-background px-6 py-3 text-sm font-bold text-primary transition-transform hover:scale-105"
            >
              {t('common.shopPreOrders')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
