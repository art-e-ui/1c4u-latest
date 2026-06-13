import { Link } from "react-router-dom";
import { useProducts } from "@/lib/products-context-hooks";
import { ProductCard } from "@/components/products/ProductCard";
import { useTranslation } from "react-i18next";
import { ProductGridSkeleton } from "@/components/products/ProductCardSkeleton";
import { parseImageUrl } from "@/lib/utils";

export function FeaturedProducts() {
  const { t } = useTranslation();
  const { products, isLoading } = useProducts();
  const newProducts = products.slice(0, 3);
  const dealProducts = products
    .filter((p) => p.originalPrice && !newProducts.find(np => np.id === p.id))
    .slice(0, 3);

  const fashionProduct = products.find((p) => 
    p.category?.toLowerCase() === "clothing" || 
    p.category?.toLowerCase().includes("fashion") ||
    p.category?.toLowerCase().includes("clothing")
  );

  const techProduct = products.find((p) => 
    p.category?.toLowerCase() === "gadgets" || 
    p.category?.toLowerCase() === "electronics" ||
    p.category?.toLowerCase().includes("gadget")
  );

  const promoCards = [
    { title: t('common.newSeason'), subtitle: t('common.fashionCollection'), color: "from-secondary/20 to-secondary/5", link: "/categories?cat=womens-fashion", product: fashionProduct },
    { title: t('common.techDeals'), subtitle: t('common.upTo50Off'), color: "from-primary/20 to-primary/5", link: "/categories?cat=electronics", product: techProduct },
  ];

  return (
    <section className="py-6 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="font-poppins text-lg font-bold text-foreground md:text-xl mb-4">{t('common.browseNewForYou')}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : (
            <>
              {/* Promo card 1 */}
              <Link
                to={promoCards[0].link}
                className={`col-span-2 md:col-span-1 rounded-2xl bg-gradient-to-br ${promoCards[0].color} border border-border p-5 flex flex-col justify-end min-h-[160px] transition-shadow hover:shadow-lg relative overflow-hidden group`}
              >
                {promoCards[0].product?.image && (
                  <div className="absolute right-[-10px] bottom-[-10px] w-24 h-24 md:w-28 md:h-28 flex items-center justify-center pointer-events-none opacity-90">
                    <img 
                      src={parseImageUrl(promoCards[0].product.image)} 
                      alt="Fashion" 
                      className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="relative z-10 max-w-[65%]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{promoCards[0].subtitle}</p>
                  <h3 className="mt-1 text-base font-black text-foreground leading-tight">{promoCards[0].title}</h3>
                  <span className="mt-2 block text-xs font-semibold text-primary">{t('common.shopNow')} →</span>
                </div>
              </Link>

              {newProducts.slice(0, 3).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}

              {dealProducts.slice(0, 3).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}

              {/* Promo card 2 */}
              <Link
                to={promoCards[1].link}
                className={`col-span-2 md:col-span-1 rounded-2xl bg-gradient-to-br ${promoCards[1].color} border border-border p-5 flex flex-col justify-end min-h-[160px] transition-shadow hover:shadow-lg relative overflow-hidden group`}
              >
                {promoCards[1].product?.image && (
                  <div className="absolute right-[-10px] bottom-[-10px] w-24 h-24 md:w-28 md:h-28 flex items-center justify-center pointer-events-none opacity-90">
                    <img 
                      src={parseImageUrl(promoCards[1].product.image)} 
                      alt="Tech" 
                      className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="relative z-10 max-w-[65%]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{promoCards[1].subtitle}</p>
                  <h3 className="mt-1 text-base font-black text-foreground leading-tight">{promoCards[1].title}</h3>
                  <span className="mt-2 block text-xs font-semibold text-primary">{t('common.shopNow')} →</span>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
