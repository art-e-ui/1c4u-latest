import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, ShoppingCart, Star, GitCompare, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/cart-context-hooks";
import { useWishlist } from "@/lib/wishlist-context-hooks";
import { useProducts } from "@/lib/products-context-hooks";
import type { Product } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseImageUrl } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  variant?: "default" | "compact";
  compareProduct?: Product | null;
}

export function ProductCard({ product, variant = "default", compareProduct }: ProductCardProps) {
  const { t } = useTranslation();
  const { products } = useProducts();
  const { toast } = useToast();
  const { addItem, items: cartItems } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareTarget, setCompareTarget] = useState<Product | null>(compareProduct || null);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const wishlisted = isInWishlist(product.id);
  const inCart = cartItems.some((item) => item.product.id === product.id);
  const isInteracted = wishlisted || inCart;

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    toast({ 
      title: t("common.addedToCart"), 
      description: t("common.addedToCartDesc", { count: 1, name: product.name }) 
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlisted) {
      removeFromWishlist(product.id);
      toast({ 
        title: t("common.removedFromWishlist"), 
        description: t("common.removedFromWishlistDesc", { name: product.name }) 
      });
    } else {
      addToWishlist(product);
      toast({ 
        title: t("common.savedToWishlist"), 
        description: t("common.savedToWishlistDesc", { name: product.name }) 
      });
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCompareOpen(true);
  };

  const handleSelectCompare = () => {
    setShowProductPicker(true);
  };

  const handlePickProduct = (p: Product) => {
    setCompareTarget(p);
    setShowProductPicker(false);
  };

  const otherProducts = products.filter((p) => p.id !== product.id);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    if (!img.dataset.fallback) {
      img.dataset.fallback = "1";
      img.src = "/placeholder.svg";
    }
  };

  if (variant === "compact") {
    return (
      <Link to={`/products/${product.id}`} className="group block min-w-[140px] snap-start transition-all duration-300 hover:-translate-y-1">
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-zinc-900 border border-border/50 aspect-square transition-all duration-300 group-hover:shadow-lg group-hover:border-primary/30">
          <img src={parseImageUrl(product.image) || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" onError={handleImgError} />
          {product.badge && (
            <span className="absolute left-1.5 top-1.5 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-sm">{product.badge}</span>
          )}
          <div className={`absolute inset-x-0 bottom-0 flex justify-center gap-1.5 p-2 transition-all duration-300 ${isInteracted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0"}`}>
            <button onClick={handleWishlist} className={`flex h-8 w-8 items-center justify-center rounded-full shadow-md backdrop-blur-md transition-all hover:scale-110 ${wishlisted ? "bg-destructive text-destructive-foreground" : "bg-white/90 dark:bg-black/90 text-foreground hover:bg-destructive hover:text-destructive-foreground"}`} aria-label={t("common.addToWishlist")}>
              <Heart className={`h-3.5 w-3.5 ${wishlisted ? "fill-current" : ""}`} />
            </button>
            <button onClick={handleAddToCart} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md backdrop-blur-md transition-all hover:scale-110 hover:bg-primary/90" aria-label={t("common.addToCart")}>
              <ShoppingCart className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-3 px-1">
          <p className="line-clamp-1 text-xs font-medium text-foreground/80 group-hover:text-primary transition-colors">{product.name}</p>
          <p className="mt-1 text-sm font-black text-foreground">${product.price.toFixed(2)}</p>
        </div>
      </Link>
    );
  }

  return (
    <>
      <Link to={`/products/${product.id}`} className="group block transition-all duration-300 hover:-translate-y-1">
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-border/50 aspect-[4/5] shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:border-primary/30">
          <img src={parseImageUrl(product.image) || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" onError={handleImgError} />
          {discount > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-black tracking-wide text-destructive-foreground shadow-sm">-{discount}%</span>
          )}
          {product.badge && (
            <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-black tracking-wide text-primary-foreground shadow-sm">{product.badge}</span>
          )}
          <div className={`absolute bottom-3 right-3 flex flex-col gap-2 transition-all duration-300 ${isInteracted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0"}`}>
            <button onClick={handleWishlist} className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur-md transition-all hover:scale-110 ${wishlisted ? "bg-destructive text-destructive-foreground" : "bg-white/90 dark:bg-black/90 text-foreground hover:bg-destructive hover:text-destructive-foreground"}`} aria-label={t("common.addToWishlist")}>
              <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
            </button>
            <button onClick={handleCompare} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-black/90 text-foreground shadow-md backdrop-blur-md transition-all hover:scale-110 hover:bg-secondary hover:text-secondary-foreground" aria-label={t("common.compare")}>
              <GitCompare className="h-4 w-4" />
            </button>
            <button onClick={handleAddToCart} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md backdrop-blur-md transition-all hover:scale-110 hover:bg-primary/90" aria-label={t("common.addToCart")}>
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-3 px-1">
          <p className="line-clamp-2 text-sm font-semibold text-foreground/90 leading-snug group-hover:text-primary transition-colors">{product.name}</p>
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-foreground">${product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <span className="text-xs font-medium text-muted-foreground line-through">${product.originalPrice.toFixed(2)}</span>
              )}
            </div>
            <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-md">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-[11px] font-bold text-muted-foreground">{product.rating}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Compare Modal */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{t("common.compareProduct")}</DialogTitle>
          <div className="grid grid-cols-2 gap-4">
            {/* Current product */}
            <div className="rounded-lg border border-border p-3 text-center">
              <img src={parseImageUrl(product.image)} alt={product.name} className="mx-auto mb-2 h-28 w-28 rounded-lg object-cover" />
              <p className="text-sm font-semibold text-foreground line-clamp-2">{product.name}</p>
              <p className="mt-1 text-lg font-bold text-primary">${product.price.toFixed(2)}</p>
              <div className="mt-1 flex items-center justify-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                ))}
                <span className="ml-1 text-xs text-muted-foreground">{product.rating}</span>
              </div>
              {product.specifications && (
                <div className="mt-3 space-y-1 text-left">
                  {Object.entries(product.specifications).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Second product / placeholder */}
            {compareTarget ? (
              <div className="rounded-lg border border-border p-3 text-center">
                <img src={parseImageUrl(compareTarget.image)} alt={compareTarget.name} className="mx-auto mb-2 h-28 w-28 rounded-lg object-cover" />
                <p className="text-sm font-semibold text-foreground line-clamp-2">{compareTarget.name}</p>
                <p className="mt-1 text-lg font-bold text-primary">${compareTarget.price.toFixed(2)}</p>
                <div className="mt-1 flex items-center justify-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(compareTarget.rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                  ))}
                  <span className="ml-1 text-xs text-muted-foreground">{compareTarget.rating}</span>
                </div>
                {compareTarget.specifications && (
                  <div className="mt-3 space-y-1 text-left">
                    {Object.entries(compareTarget.specifications).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setCompareTarget(null); setShowProductPicker(false); }}>
                  {t("common.change")}
                </Button>
              </div>
            ) : showProductPicker ? (
              <div className="rounded-lg border border-border p-2 max-h-[320px] overflow-y-auto space-y-1">
                {otherProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePickProduct(p)}
                    className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-muted transition-colors"
                  >
                    <img src={parseImageUrl(p.image)} alt={p.name} className="h-10 w-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground line-clamp-1">{p.name}</p>
                      <p className="text-xs font-bold text-primary">${p.price.toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-3 text-center">
                <ImageIcon className="mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mb-3">{t("common.selectProductToCompare")}</p>
                <Button variant="outline" size="sm" onClick={handleSelectCompare}>
                  {t("common.select")}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
