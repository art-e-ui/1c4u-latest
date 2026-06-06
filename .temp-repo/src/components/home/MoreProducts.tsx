import { useState, useMemo } from "react";
import { useProducts } from "@/lib/products-context-hooks";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ProductGridSkeleton } from "@/components/products/ProductCardSkeleton";
import type { Product } from "@/lib/types";

const INITIAL = 10;
const STEP = 5;

export function MoreProducts() {
  const { t } = useTranslation();
  const { products, isLoading } = useProducts();
  const [visible, setVisible] = useState(INITIAL);

  const interleavedProducts = useMemo(() => {
    if (!products.length) return [];
    
    // Group products by category
    const byCategory: Record<string, Product[]> = {};
    products.forEach(p => {
      const cat = p.category || 'uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(p);
    });

    const result: Product[] = [];
    const categories = Object.keys(byCategory);
    let i = 0;
    let added = true;
    
    // Interleave one product from each category until all are added
    while (added) {
      added = false;
      for (const cat of categories) {
        if (byCategory[cat][i]) {
          result.push(byCategory[cat][i]);
          added = true;
        }
      }
      i++;
    }
    
    return result;
  }, [products]);

  const display = interleavedProducts.slice(0, visible);

  return (
    <section className="py-6 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="font-poppins text-lg font-bold text-foreground md:text-xl mb-4">{t('common.moreProducts')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : (
            display.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
        {visible < products.length && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => setVisible((v) => Math.min(v + STEP, products.length))}>
              {t('common.loadMore')}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
