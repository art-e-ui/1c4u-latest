import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useReseller, type StoreTheme, type ResellerProfile, LEVEL_PROFIT_MAP } from "@/lib/reseller-context-hooks";
import { useProducts } from "@/lib/products-context-hooks";
import { ShoppingCart, Star, Store } from "lucide-react";
import { useCart } from "@/lib/cart-context-hooks";
import { useToast } from "@/hooks/use-toast";
import { parseImageUrl } from "@/lib/utils";

const themeStyles: Record<StoreTheme, {
  wrapper: string;
  heroOverlay: string;
  heroText: string;
  card: string;
  cardTitle: string;
  badge: string;
  price: string;
  button: string;
  sectionTitle: string;
}> = {
  minimal: {
    wrapper: "bg-background",
    heroOverlay: "bg-foreground/40",
    heroText: "text-background font-light tracking-wide",
    card: "rounded-xl border border-border bg-card hover:shadow-md transition-shadow",
    cardTitle: "text-sm font-medium text-card-foreground",
    badge: "bg-muted text-muted-foreground",
    price: "text-foreground font-semibold",
    button: "bg-foreground text-background hover:bg-foreground/90",
    sectionTitle: "text-lg font-light tracking-wide text-foreground",
  },
  bold: {
    wrapper: "bg-foreground",
    heroOverlay: "bg-primary/60",
    heroText: "text-primary-foreground font-black uppercase tracking-widest",
    card: "rounded-2xl border-2 border-primary/30 bg-card hover:border-primary transition-colors",
    cardTitle: "text-sm font-bold text-card-foreground uppercase",
    badge: "bg-primary text-primary-foreground font-bold",
    price: "text-primary font-black text-lg",
    button: "bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase",
    sectionTitle: "text-xl font-black uppercase tracking-wider text-background",
  },
  elegant: {
    wrapper: "bg-background",
    heroOverlay: "bg-gradient-to-r from-primary/50 to-secondary/50",
    heroText: "text-primary-foreground font-serif italic tracking-wide",
    card: "rounded-xl border border-primary/20 bg-card hover:shadow-lg transition-shadow",
    cardTitle: "text-sm font-medium text-card-foreground font-serif",
    badge: "bg-primary/10 text-primary border border-primary/20",
    price: "text-primary font-semibold",
    button: "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90",
    sectionTitle: "text-xl font-serif italic text-foreground",
  },
  vibrant: {
    wrapper: "bg-background",
    heroOverlay: "bg-gradient-to-br from-primary/70 via-secondary/60 to-accent/50",
    heroText: "text-primary-foreground font-extrabold",
    card: "rounded-2xl border-2 border-secondary/30 bg-card hover:scale-[1.02] transition-transform",
    cardTitle: "text-sm font-bold text-card-foreground",
    badge: "bg-secondary text-secondary-foreground",
    price: "text-secondary font-bold",
    button: "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 font-bold",
    sectionTitle: "text-xl font-extrabold text-foreground",
  },
};

export default function ResellerStorefront() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { getResellerBySlug, fetchResellerBySlug } = useReseller();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { products } = useProducts();

  const [shop, setShop] = useState<ResellerProfile | null>(slug ? getResellerBySlug(slug) : null);
  const [isFetching, setIsFetching] = useState(!shop && !!slug);

  useEffect(() => {
    async function loadShop() {
      if (!slug) return;
      
      // Try local first
      const localShop = getResellerBySlug(slug);
      if (localShop) {
        setShop(localShop);
        setIsFetching(false);
        return;
      }

      // Fetch from Firestore
      setIsFetching(true);
      const fetchedShop = await fetchResellerBySlug(slug);
      setShop(fetchedShop);
      setIsFetching(false);
    }

    loadShop();
  }, [slug, getResellerBySlug, fetchResellerBySlug]);

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <Store className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold text-foreground">{t("common.shopNotFound")}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t("common.shopNotFoundDesc")}</p>
        <Link to="/" className="mt-4 text-sm text-primary hover:underline">{t("common.backToHome")}</Link>
      </div>
    );
  }

  const theme = themeStyles[shop.storeTheme || "minimal"];
  const profitMargin = shop.level ? (LEVEL_PROFIT_MAP[shop.level] || 0.15) : 0.15;
  const shopProducts = products.filter(p => shop.selectedProductIds.includes(p.id));

  const handleAddToCart = (product: typeof products[number]) => {
    const adjustedProduct = {
      ...product,
      price: product.price * (1 + profitMargin)
    };
    addItem(adjustedProduct, 1, shop.id);
    toast({ title: t("common.addedToCart"), description: product.name });
  };

  return (
    <div className={theme.wrapper}>
      {/* Hero Banner */}
      <div className="relative w-full aspect-[21/9] md:aspect-[21/7] overflow-hidden">
        {shop.shopHeroBanner ? (
          <img 
            src={parseImageUrl(shop.shopHeroBanner) || "/placeholder.svg"} 
            alt="Banner" 
            className="w-full h-full object-cover" 
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className={`absolute inset-0 ${theme.heroOverlay}`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center gap-3">
          {shop.shopLogo && (
            <img 
              src={parseImageUrl(shop.shopLogo) || "/placeholder.svg"} 
              alt={shop.shopName} 
              className="h-16 w-16 md:h-20 md:w-20 rounded-full border-2 border-background/50 object-cover" 
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
            />
          )}
          <h1 className={`text-2xl md:text-4xl ${theme.heroText}`}>{shop.shopName}</h1>
          <div className="flex items-center gap-1 bg-background/20 backdrop-blur-sm px-3 py-1 rounded-full">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`h-4 w-4 ${star <= Math.round(shop.starRating ?? 2.0) ? 'fill-yellow-400 text-yellow-400' : 'fill-muted/50 text-muted/50'}`} 
                />
              ))}
            </div>
            <span className={`text-sm font-medium ${theme.heroText} ml-1`}>{shop.starRating?.toFixed(1) || "2.0"}</span>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="px-4 py-6 md:py-10 max-w-5xl mx-auto">
        <h2 className={`mb-5 ${theme.sectionTitle}`}>{t("common.ourProducts")}</h2>

        {shopProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.noProductsAvailable")}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {shopProducts.map(product => {
              const adjustedPrice = product.price * (1 + profitMargin);
              const adjustedOriginalPrice = product.originalPrice ? product.originalPrice * (1 + profitMargin) : null;
              
              return (
                <div key={product.id} className={`flex flex-col overflow-hidden ${theme.card}`}>
                  <Link to={`/products/${product.id}?shop=${slug}`} className="relative">
                    <img 
                      src={parseImageUrl(product.image) || "/placeholder.svg"} 
                      alt={product.name} 
                      className="w-full aspect-square object-cover" 
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                    />
                    {product.badge && (
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${theme.badge}`}>
                        {product.badge}
                      </span>
                    )}
                  </Link>
                  <div className="flex flex-col flex-1 p-3">
                    <Link to={`/products/${product.id}?shop=${slug}`}>
                      <h3 className={`line-clamp-2 ${theme.cardTitle}`}>{product.name}</h3>
                    </Link>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`h-3 w-3 ${star <= Math.round(product.rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'fill-muted text-muted'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground ml-1">{product.rating || "5.0"}</span>
                    </div>
                    <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                      <div>
                        <span className={theme.price}>${adjustedPrice.toFixed(2)}</span>
                        {adjustedOriginalPrice && (
                          <span className="text-xs text-muted-foreground line-through ml-1">${adjustedOriginalPrice.toFixed(2)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`p-2 rounded-lg text-xs ${theme.button} transition-colors`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
