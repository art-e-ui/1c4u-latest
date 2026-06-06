import { Smartphone, Apple, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AppDownloadBanner() {
  const { t } = useTranslation();

  return (
    <section className="py-4 md:py-6">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-foreground to-foreground/90 px-6 py-8 md:px-12 md:py-10">
          <div className="absolute right-0 top-0 h-full w-1/3 opacity-5">
            <Smartphone className="h-full w-full" />
          </div>
          <div className="relative z-10 flex flex-col items-center justify-between gap-4 md:flex-row">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{t('common.downloadOurApp')}</p>
              <h3 className="mt-1 text-xl font-black text-background md:text-2xl">
                {t('common.shopAnytimeAnywhere')}
              </h3>
              <p className="mt-1 text-sm text-background/70">
                {t('common.getExclusiveAppDeals')}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-background/20 bg-background/10 px-5 py-3 text-center">
                <Apple className="h-5 w-5 text-background" />
                <div>
                  <p className="text-[10px] font-medium uppercase text-background/60">App Store</p>
                  <p className="text-sm font-bold text-background">iOS</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-background/20 bg-background/10 px-5 py-3 text-center">
                <Play className="h-5 w-5 text-background" />
                <div>
                  <p className="text-[10px] font-medium uppercase text-background/60">Google Play</p>
                  <p className="text-sm font-bold text-background">Android</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
