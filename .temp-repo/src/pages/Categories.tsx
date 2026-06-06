import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, SlidersHorizontal, Grid3X3, List, Star, X, ChevronDown } from "lucide-react";
import { useProducts } from "@/lib/products-context-hooks";
import { useTranslation } from "react-i18next";
import { parseImageUrl } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/products/ProductCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";

type SortOption = "newest" | "price-low" | "price-high" | "rating";

function FilterPanel({
  selectedCategory,
  onCategoryChange,
  minRating,
  onMinRatingChange,
  priceRange,
  onPriceRangeChange,
  categories,
}: {
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  minRating: number;
  onMinRatingChange: (r: number) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  categories: { id: string; name: string; slug: string; image: string; count?: number }[];
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">{t('common.categories')}</h3>
        <div className="space-y-1">
          <button
            onClick={() => onCategoryChange("all")}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t('common.allCategories')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => onCategoryChange(cat.slug)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                selectedCategory === cat.slug
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t(`common.${cat.slug}`, { defaultValue: cat.name })}
              {cat.count && (
                <span className={`text-xs ${selectedCategory === cat.slug ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Rating filter */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">{t('common.minRating')}</h3>
        <div className="space-y-1">
          {[4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => onMinRatingChange(minRating === r ? 0 : r)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                minRating === r ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < r ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <span>{t('common.andUp')}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price range */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">{t('common.priceRange')}</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={t('common.min')}
            value={priceRange[0] || ""}
            onChange={(e) => onPriceRangeChange([Number(e.target.value) || 0, priceRange[1]])}
            className="h-9 text-sm"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            placeholder={t('common.max')}
            value={priceRange[1] || ""}
            onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value) || 0])}
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function CategorySlideshow({ categories }: { categories: { id: string; name: string; slug: string; image: string; count?: number }[] }) {
  const { t } = useTranslation();
  const slideshowCategories = categories.slice(0, 5);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const timer = setInterval(() => api.scrollNext(), 5000);
    return () => clearInterval(timer);
  }, [api]);

  return (
    <Carousel setApi={setApi} opts={{ loop: true }} className="relative w-full">
      <CarouselContent>
        {slideshowCategories.map((cat, idx) => (
          <CarouselItem key={cat.id}>
            <div className="relative h-48 sm:h-64 md:h-80 lg:h-[420px] xl:h-[500px] 2xl:h-[560px] overflow-hidden rounded-xl md:rounded-2xl">
              <img
                src={parseImageUrl(cat.image) || "/placeholder.svg"}
                alt={cat.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700"
                style={current === idx ? { transform: "scale(1.05)" } : {}}
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
              <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-10 md:px-16 lg:px-20 max-w-3xl">
                <div className={`transition-all duration-700 ${current === idx ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
                  <span className="mb-2 md:mb-3 inline-block rounded-full bg-primary/90 px-3 py-1 md:px-4 md:py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider text-primary-foreground">
                    {t('common.featured')}
                  </span>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black uppercase tracking-tight text-white leading-tight">
                    {t(`common.${cat.slug}`, { defaultValue: cat.name })}
                  </h1>
                  <p className="mt-1 md:mt-2 text-sm md:text-base lg:text-lg text-white/80">
                    {cat.count ? t('common.productsFound', { count: cat.count }) : t('common.exploreCollection')}
                  </p>
                  <Link
                    to={`/categories?cat=${cat.slug}`}
                    className="mt-3 md:mt-5 inline-flex items-center rounded-lg bg-primary px-4 py-2 md:px-6 md:py-3 text-xs md:text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {t('common.shopNow')}
                  </Link>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="absolute bottom-3 md:bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 md:gap-2">
        {slideshowCategories.map((_, i) => (
          <button
            key={i}
            onClick={() => api?.scrollTo(i)}
            className={`h-2 md:h-2.5 rounded-full transition-all duration-300 ${current === i ? "w-6 md:w-8 bg-primary" : "w-2 md:w-2.5 bg-white/50 hover:bg-white/80"}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
      <CarouselPrevious className="hidden md:inline-flex left-4 h-10 w-10 lg:h-12 lg:w-12" />
      <CarouselNext className="hidden md:inline-flex right-4 h-10 w-10 lg:h-12 lg:w-12" />
    </Carousel>
  );
}

export default function Categories() {
  const { t } = useTranslation();
  const { products, categories } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") || "all";
  const initialQ = searchParams.get("q") || "";

  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [itemsToShow, setItemsToShow] = useState(12);
  const [minRating, setMinRating] = useState(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);

  const activeFilterCount = (selectedCategory !== "all" ? 1 : 0) + (minRating > 0 ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] > 0 ? 1 : 0);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setItemsToShow(12);
    const params = new URLSearchParams(searchParams);
    if (cat === "all") params.delete("cat");
    else params.set("cat", cat);
    setSearchParams(params, { replace: true });
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setItemsToShow(12);
    const params = new URLSearchParams(searchParams);
    if (!q) params.delete("q");
    else params.set("q", q);
    setSearchParams(params, { replace: true });
  };

  const filtered = useMemo(() => {
    let result = [...products];

    // Category
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category.toLowerCase().replace(/\s+/g, '-') === selectedCategory);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Rating
    if (minRating > 0) {
      result = result.filter((p) => p.rating >= minRating);
    }

    // Price
    if (priceRange[0] > 0) {
      result = result.filter((p) => p.price >= priceRange[0]);
    }
    if (priceRange[1] > 0) {
      result = result.filter((p) => p.price <= priceRange[1]);
    }

    // Sort
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }

    return result;
  }, [selectedCategory, searchQuery, sortBy, minRating, priceRange, products]);

  const visible = filtered.slice(0, itemsToShow);
  const hasMore = filtered.length > itemsToShow;

  return (
    <div className="min-h-[70vh]">
      {/* Category Slideshow Banner */}
      <CategorySlideshow categories={categories} />

      {/* Search + Filter toggle */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 md:px-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('common.searchProducts')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-10 pl-10 text-sm"
            />
            {searchQuery && (
              <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mobile filter trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative h-10 w-10 shrink-0 lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t('common.filters')}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FilterPanel
                  selectedCategory={selectedCategory}
                  onCategoryChange={handleCategoryChange}
                  minRating={minRating}
                  onMinRatingChange={setMinRating}
                  priceRange={priceRange}
                  onPriceRangeChange={setPriceRange}
                  categories={categories}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Category chips - horizontal scroll */}
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 pb-3 md:px-8">
          <div className="flex gap-2">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground scale-105 shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t('common.all')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  selectedCategory === cat.slug
                    ? "bg-primary text-primary-foreground scale-105 shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t(`common.${cat.slug}`, { defaultValue: cat.name })}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden w-56 shrink-0 lg:block rounded-xl border border-border bg-card p-4">
            <FilterPanel
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              minRating={minRating}
              onMinRatingChange={setMinRating}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              categories={categories}
            />
          </aside>

          {/* Product area */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('common.productsFound', { count: filtered.length })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  aria-label={t('common.gridView')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  aria-label={t('common.listView')}
                >
                  <List className="h-4 w-4" />
                </button>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t('common.newest')}</SelectItem>
                    <SelectItem value="price-low">{t('common.priceLowHigh')}</SelectItem>
                    <SelectItem value="price-high">{t('common.priceHighLow')}</SelectItem>
                    <SelectItem value="rating">{t('common.topRated')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product grid */}
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold text-foreground">{t('common.noProductsFound')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('common.tryAdjustingSearch')}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    handleSearch("");
                    handleCategoryChange("all");
                    setMinRating(0);
                    setPriceRange([0, 0]);
                  }}
                >
                  {t('common.clearAllFilters')}
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
                {visible.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="flex gap-4 rounded-xl border border-border bg-card p-3 transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
                  >
                    <img 
                      src={parseImageUrl(product.image) || "/placeholder.svg"} 
                      alt={product.name} 
                      className="h-24 w-24 rounded-lg object-cover" 
                      loading="lazy" 
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                    />
                    <div className="flex flex-1 flex-col justify-center">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">{product.name}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">{product.rating}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-base font-bold text-primary">${product.price.toFixed(2)}</span>
                        {product.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through">${product.originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setItemsToShow((prev) => prev + 12)}
                  className="px-8"
                >
                  {t('common.loadMore')}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
