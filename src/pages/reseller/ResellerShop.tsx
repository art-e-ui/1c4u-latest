import React, { useState } from "react";
import { Search, Check, Plus, Filter, Square, LayoutGrid, Grid3x3 } from "lucide-react";
import { useReseller, LEVEL_PROFIT_MAP } from "@/lib/reseller-context-hooks";
import { useProducts } from "@/lib/products-context-hooks";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ResellerShop() {
  const { reseller, toggleProduct } = useReseller();
  const { toast } = useToast();
  const { t } = useTranslation();
  const location = useLocation();
  const { products, categories, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [tab, setTab] = useState<"catalog" | "my">(location.state?.tab || "catalog");
  const [viewMode, setViewMode] = useState<1 | 2 | 3>(2);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Drag to scroll logic for desktop
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    if (Math.abs(walk) > 5) {
      setHasMoved(true);
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  if (!reseller) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{t("common.loading")}...</p>
      </div>
    );
  }

  const profitMargin = reseller.level ? (LEVEL_PROFIT_MAP[reseller.level] || 0.15) : 0.15;
  const selectedIds = new Set(reseller.selectedProductIds);
  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                         p.category.toLowerCase().includes(search.toLowerCase());
    const productCategorySlug = p.category.toLowerCase().replace(/\s+/g, '-');
    const matchesCategory = selectedCategory === "all" || productCategorySlug === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const displayed = tab === "my" ? filtered.filter(p => selectedIds.has(p.id)) : filtered;
  
  const myProductsInInventory = products.filter(p => selectedIds.has(p.id));
  const missingFromInventory = selectedIds.size - myProductsInInventory.length;

  const handleToggle = async (productId: string) => {
    const result = await toggleProduct(productId);
    if (!result.success) {
      if (result.errorType === 'limit') {
        toast({
          title: t("reseller.productLimitReached"),
          description: t("reseller.productLimitDesc", { level: reseller.level, limit: reseller.productLimit }),
          variant: "destructive",
        });
      } else if (result.errorType === 'permission') {
        toast({
          title: t("reseller.permissionDenied"),
          description: t("reseller.permissionDeniedDesc"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("common.error"),
          description: t("common.errorOccurred"),
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("reseller.productShop")}</h1>
          <p className="text-xs text-muted-foreground">{selectedIds.size} {t("reseller.productsInYourStore")}</p>
        </div>
        <button 
          onClick={() => setViewMode(v => v === 3 ? 1 : (v + 1) as 1 | 2 | 3)}
          className="p-2 bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle view mode"
        >
          {viewMode === 1 && <Square className="h-5 w-5" />}
          {viewMode === 2 && <LayoutGrid className="h-5 w-5" />}
          {viewMode === 3 && <Grid3x3 className="h-5 w-5" />}
        </button>
      </div>

      {/* Sticky Tabs Area */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pt-2 pb-3">
        <div className="flex gap-1 bg-muted rounded-xl p-0.5">
          {(["catalog", "my"] as const).map(t_key => (
            <button
              key={t_key}
              onClick={() => {
                setTab(t_key);
                setSelectedCategory("all");
                setSearch("");
              }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t_key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t_key === "catalog" ? t("reseller.allProducts") : t("reseller.myProducts")}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("reseller.searchProducts")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Categories */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`flex gap-2 overflow-x-auto pb-2 no-scrollbar select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`}
      >
        <button
          onClick={() => {
            if (hasMoved) return;
            setSelectedCategory("all");
          }}
          className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {t("common.all")}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              if (hasMoved) return;
              setSelectedCategory(cat.slug);
            }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedCategory === cat.slug
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {tab === "my" && missingFromInventory > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-[11px] text-warning-foreground flex items-center gap-2">
          <Filter className="h-3.5 w-3.5" />
          <p>
            {missingFromInventory} {t("reseller.productsNoLongerAvailable")}
          </p>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {tab === "my" ? t("reseller.noProductsYet") : t("reseller.noProductsFound")}
        </div>
      ) : (
        <div className={`grid gap-3 ${
          viewMode === 1 ? "grid-cols-1" : 
          viewMode === 2 ? "grid-cols-2" : 
          "grid-cols-3"
        }`}>
          {displayed.map(product => {
            const selected = selectedIds.has(product.id);
            return (
              <div key={product.id} className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col min-w-0">
                <div className="relative aspect-square bg-muted">
                  <img src={product.image || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" loading="lazy" onError={(e) => { const img = e.target as HTMLImageElement; if (!img.dataset.fallback) { img.dataset.fallback = "1"; img.src = "/placeholder.svg"; } }} />
                  {selected && (
                    <div className={`absolute top-2 right-2 rounded-full bg-primary flex items-center justify-center ${viewMode === 3 ? "h-5 w-5" : "h-6 w-6"}`}>
                      <Check className={`${viewMode === 3 ? "h-3 w-3" : "h-3.5 w-3.5"} text-primary-foreground`} />
                    </div>
                  )}
                </div>
                <div className={`flex flex-col flex-1 min-w-0 ${viewMode === 3 ? "p-2" : "p-3"}`}>
                  <p className={`font-medium text-card-foreground line-clamp-2 leading-tight break-words ${viewMode === 3 ? "text-xs" : "text-sm"}`}>{product.name}</p>
                  <div className="flex items-baseline justify-between mt-1 flex-wrap gap-x-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                      <span className={`font-bold text-primary ${viewMode === 3 ? "text-xs" : "text-sm"}`}>${product.price}</span>
                      {product.originalPrice && (
                        <span className={`text-muted-foreground line-through ${viewMode === 3 ? "text-[9px]" : "text-xs"}`}>${product.originalPrice}</span>
                      )}
                    </div>
                    <span className={`font-bold text-secondary ${viewMode === 3 ? "text-[9px]" : "text-[10px]"}`}>
                      +${(product.price * profitMargin).toFixed(2)} {t("reseller.profit")}
                    </span>
                  </div>
                  <div className="mt-auto pt-2">
                    <button
                      onClick={() => handleToggle(product.id)}
                      className={`w-full flex items-center justify-center gap-1.5 font-medium transition-colors ${
                        viewMode === 3 ? "py-1.5 rounded-lg text-[10px]" : "py-2 rounded-xl text-xs"
                      } ${
                        selected
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      {selected ? t("reseller.remove") : <><Plus className="h-3 w-3" /> {t("reseller.add")}</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

