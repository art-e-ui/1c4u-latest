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
                className="col-span-2 md:col-span-1 rounded-2xl border border-border p-5 flex flex-col justify-end min-h-[200px] md:min-h-[240px] h-full transition-all hover:shadow-lg relative overflow-hidden group"
              >
                {promoCards[0].product?.image ? (
                  <>
                    <img 
                      src={parseImageUrl(promoCards[0].product.image)} 
                      alt="Fashion" 
                      className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10 pointer-events-none" />
                  </>
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${promoCards[0].color} z-0`} />
                )}
                <div className="relative z-20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-300">{promoCards[0].subtitle}</p>
                  <h3 className="mt-1 text-base font-black text-white leading-tight">{promoCards[0].title}</h3>
                  <span className="mt-2 block text-xs font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">{t('common.shopNow')} →</span>
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
                className="col-span-2 md:col-span-1 rounded-2xl border border-border p-5 flex flex-col justify-end min-h-[200px] md:min-h-[240px] h-full transition-all hover:shadow-lg relative overflow-hidden group"
              >
                {promoCards[1].product?.image ? (
                  <>
                    <img 
                      src={parseImageUrl(promoCards[1].product.image)} 
                      alt="Tech" 
                      className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10 pointer-events-none" />
                  </>
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${promoCards[1].color} z-0`} />
                )}
                <div className="relative z-20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-300">{promoCards[1].subtitle}</p>
                  <h3 className="mt-1 text-base font-black text-white leading-tight">{promoCards[1].title}</h3>
                  <span className="mt-2 block text-xs font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">{t('common.shopNow')} →</span>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
