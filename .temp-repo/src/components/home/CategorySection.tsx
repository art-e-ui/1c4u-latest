import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useProducts } from "@/lib/products-context-hooks";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/products/ProductCard";
import { useTranslation } from "react-i18next";

interface CategorySectionProps {
  title: string;
  categorySlug: string;
  bgGradient?: string;
}

export function CategorySection({ title, categorySlug, bgGradient }: CategorySectionProps) {
  const { t } = useTranslation();
  const { products } = useProducts();
  const catProducts = products.filter((p) => p.category.toLowerCase().replace(/\s+/g, '-') === categorySlug);
  const hero = catProducts[0];
  const grid = catProducts.slice(1, 7); // 6 products to fill the 2x3 remaining slots

  if (!hero) return null;

  const discount = hero.originalPrice
    ? Math.round(((hero.originalPrice - hero.price) / hero.originalPrice) * 100)
    : 0;

  return (
    <section className="py-4 md:py-6">
      <div className="mx-auto max-w-6xl px-4">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-poppins text-lg font-bold text-foreground md:text-xl">{title}</h2>
          <Link
            to={`/categories?cat=${categorySlug}`}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {t('common.viewAll')} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-5 md:gap-4">
          {/* Hero card — spans 2 cols on desktop */}
          <Link
            to={`/products/${hero.id}`}
            className={`group relative col-span-2 row-span-2 hidden overflow-hidden rounded-2xl md:block ${bgGradient || "bg-gradient-to-br from-primary/5 to-secondary/5"}`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
            <img
              src={hero.image}
              alt={hero.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="relative z-20 flex h-full flex-col justify-end p-5">
              {discount > 0 && (
                <span className="mb-2 inline-block w-fit rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
                  -{discount}% {t('common.off')}
                </span>
              )}
              <h3 className="text-lg font-bold text-white">{hero.name}</h3>
              <p className="mt-1 text-2xl font-black text-white">${hero.price.toFixed(2)}</p>
              <span className="mt-2 inline-flex items-center text-xs font-semibold text-white/80 group-hover:text-primary transition-colors">
                {t('common.shopNow')} <ChevronRight className="ml-0.5 h-3 w-3" />
              </span>
            </div>
          </Link>

          {/* Mobile: show hero as regular card */}
          <div className="md:hidden">
            <ProductCard product={hero} />
          </div>

          {/* Product grid */}
          {grid.map((product) => (
            <div key={product.id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
