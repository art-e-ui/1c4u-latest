import { useState, useEffect } from "react";
import { useProducts } from "@/lib/products-context-hooks";
import { ProductCard } from "@/components/products/ProductCard";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { useTranslation } from "react-i18next";

export function RecentlyViewed() {
  const { t } = useTranslation();
  const { products } = useProducts();
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recently-viewed");
      if (stored) setViewedIds(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const viewedProducts = viewedIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, 10);

  // If nothing viewed yet, show some random products
  const display = viewedProducts.length > 0 ? viewedProducts : products.slice(0, 8);

  return (
    <section className="py-6 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="font-poppins text-lg font-bold text-foreground md:text-xl mb-4">
          {viewedProducts.length > 0 ? t('common.recentlyViewed') : t('common.recommended')}
        </h2>
        <Carousel opts={{ align: "start" }} className="relative">
          <CarouselContent className="-ml-3">
            {display.map((product) => (
              <CarouselItem key={product!.id} className="basis-1/2 pl-3 sm:basis-1/3 md:basis-1/5">
                <ProductCard product={product!} variant="compact" />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4" />
          <CarouselNext className="hidden md:flex -right-4" />
        </Carousel>
      </div>
    </section>
  );
}
