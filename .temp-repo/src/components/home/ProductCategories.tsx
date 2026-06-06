import { Link } from "react-router-dom";
import { useProducts } from "@/lib/products-context-hooks";
import { useTranslation } from "react-i18next";
import { CategorySkeleton } from "@/components/products/ProductCardSkeleton";

export function ProductCategories() {
  const { t } = useTranslation();
  const { categories, isLoading } = useProducts();
  return (
    <section className="py-6 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-poppins text-lg font-bold text-foreground md:text-xl">{t('nav.categories')}</h2>
          <Link to="/categories" className="text-xs font-semibold text-primary hover:underline">{t('common.viewAll')}</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
          {isLoading ? (
            <CategorySkeleton />
          ) : (
            categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/categories/${cat.slug}`}
                className="flex flex-col items-center gap-2 snap-start min-w-[72px] group"
              >
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-border bg-muted transition-all group-hover:border-primary group-hover:shadow-md md:h-20 md:w-20">
                  <img 
                    src={cat.image} 
                    alt={cat.name} 
                    className="h-full w-full object-cover" 
                    loading="lazy" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://picsum.photos/seed/${cat.slug}/200/200`;
                    }}
                  />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight line-clamp-2 max-w-[72px] group-hover:text-foreground transition-colors">{cat.name}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
