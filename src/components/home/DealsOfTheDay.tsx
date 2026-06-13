import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, Truck, ShieldCheck, RotateCcw, Star } from "lucide-react";
import { useProducts } from "@/lib/products-context-hooks";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  return timeLeft;
}

function getTimeLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function DealsOfTheDay() {
  const { t } = useTranslation();
  const { products } = useProducts();
  // Deterministically select a deal product based on the calendar date (rotates once every 24 hours)
  const deal = (() => {
    if (products.length === 0) return null;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    const hotPool = products.filter((p) => p.badge === "Hot" || p.status === "Hot");
    const basePool = hotPool.length > 0 ? hotPool : products;

    // Stable selection pool: exclude products synced/created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const selectionPool = basePool.filter(p => {
      if (!p.createdAt) return true;
      const createdDate = new Date(p.createdAt);
      return createdDate < todayStart;
    });

    const finalPool = selectionPool.length > 0 ? selectionPool : basePool;
    const sortedPool = [...finalPool].sort((a, b) => a.id.localeCompare(b.id));

    const index = Math.abs(hash) % sortedPool.length;
    return sortedPool[index];
  })();

  // Set target to end of today
  const [target] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const { hours, minutes, seconds } = useCountdown(target);

  if (!deal) return null;

  const discount = deal.originalPrice
    ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100)
    : 0;

  const features = [
    { icon: Truck, label: t('common.freeShipping') },
    { icon: ShieldCheck, label: t('common.oneYearWarranty') },
    { icon: RotateCcw, label: t('common.thirtyDayReturns') },
  ];

  return (
    <section className="py-6 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-poppins text-lg font-bold text-foreground md:text-xl">
            {t('common.dealsOfTheDay')}
          </h2>
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-4 w-4 text-destructive" />
            <span className="font-mono font-bold text-destructive">
              {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Featured deal card */}
          <Link
            to={`/products/${deal.id}`}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-secondary/10 border border-border p-5 md:p-8 transition-shadow hover:shadow-xl"
          >
            {discount > 0 && (
              <span className="absolute right-4 top-4 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
                -{discount}%
              </span>
            )}
            <div className="flex flex-col items-center text-center">
              <img
                src={deal.image}
                alt={deal.name}
                className="h-40 w-40 rounded-xl object-cover transition-transform duration-500 group-hover:scale-110 md:h-52 md:w-52"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
              />
              <h3 className="mt-4 text-base font-bold text-foreground md:text-lg">{deal.name}</h3>
              <div className="mt-1 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground">{deal.rating}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-primary">${deal.price.toFixed(2)}</span>
                {deal.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">${deal.originalPrice.toFixed(2)}</span>
                )}
              </div>
              <Button className="mt-4" size="sm">{t('product.buyNow')}</Button>
            </div>
          </Link>

          {/* Feature icons grid */}
          <div className="flex flex-col justify-center gap-4">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{t('common.onAllOrders')}</p>
                </div>
              </div>
            ))}
            {/* Countdown boxes */}
            <div className="flex gap-3">
              {[
                { label: t('common.hours'), value: hours },
                { label: t('common.minutes'), value: minutes },
                { label: t('common.seconds'), value: seconds },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-2xl font-black text-primary font-mono">{String(value).padStart(2, "0")}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
