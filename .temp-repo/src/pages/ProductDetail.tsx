import { useMemo, useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Star, Heart, Share2, ShoppingCart, Minus, Plus,
  ChevronRight, Truck, ShieldCheck, RotateCcw, ThumbsUp,
} from "lucide-react";
import { useProducts } from "@/lib/products-context-hooks";
import { useReseller, LEVEL_PROFIT_MAP } from "@/lib/reseller-context-hooks";
import { useDbReviews, useReviewMutations, type DbReview } from "@/hooks/use-db-products";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/cart-context-hooks";
import { useWishlist } from "@/lib/wishlist-context-hooks";
import { parseImageUrl } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useCustomerAuth } from "@/lib/customer-auth-context-hooks";

// Generate extra gallery images per product (unsplash variations)
function getGalleryImages(mainImage: string, productId: string): string[] {
  const parsedMain = parseImageUrl(mainImage);
  const bases = [
    parsedMain,
    parsedMain.replace("w=400", "w=600").replace("h=400", "h=600"),
    parsedMain.replace("fit=crop", "fit=crop&q=80"),
    `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&seed=${productId}`,
    `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&seed=${productId}`,
  ];
  return bases;
}

function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${cls} ${i < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: DbReview }) {
  const { t } = useTranslation();
  const authorName = review.users ? `${review.users.first_name} ${review.users.last_name}` : t("common.anonymous");
  const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${authorName}`;
  const dateStr = new Date(review.created_at).toLocaleDateString();

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <img src={avatar} alt={authorName} className="h-9 w-9 rounded-full bg-muted" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{authorName}</p>
            <span className="text-xs text-muted-foreground">{dateStr}</span>
          </div>
          <StarRating rating={review.rating} size="sm" />
          <p className="mt-2 text-sm font-medium text-foreground">{review.title}</p>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{review.content}</p>
          <button className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ThumbsUp className="h-3 w-3" /> {t('common.helpful')} ({review.helpful_count})
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const shopSlug = searchParams.get("shop");
  const { toast } = useToast();
  const { addItem } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { products } = useProducts();
  const { isAuthenticated } = useCustomerAuth();
  const { getResellerBySlug } = useReseller();
  
  const product = products.find((p) => p.id === id);
  const shop = shopSlug ? getResellerBySlug(shopSlug) : null;
  const profitMargin = shop?.level ? (LEVEL_PROFIT_MAP[shop.level] || 0.15) : 0;

  const adjustedProduct = useMemo(() => {
    if (!product) return null;
    if (!shop) return product;
    return {
      ...product,
      price: product.price * (1 + profitMargin),
      originalPrice: product.originalPrice ? product.originalPrice * (1 + profitMargin) : undefined
    };
  }, [product, shop, profitMargin]);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const { addReview } = useReviewMutations();

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    addReview.mutate(
      { product_id: product.id, rating: reviewRating, title: reviewTitle, content: reviewContent },
      {
        onSuccess: () => {
          setReviewTitle("");
          setReviewContent("");
          setReviewRating(5);
          toast({ title: t('common.reviewSubmitted'), description: t('common.thankYouFeedback') });
        },
        onError: (error) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
      }
    );
  };

  const gallery = useMemo(() => (adjustedProduct ? getGalleryImages(adjustedProduct.image, adjustedProduct.id) : []), [adjustedProduct]);
  
  const { data: dbReviews } = useDbReviews(adjustedProduct?.id || "");
  const reviews = useMemo(() => dbReviews || [], [dbReviews]);

  const relatedProducts = useMemo(
    () => (adjustedProduct ? products.filter((p) => p.category === adjustedProduct.category && p.id !== adjustedProduct.id).slice(0, 8) : []),
    [adjustedProduct, products]
  );

  const avgRating = useMemo(() => {
    if (!reviews.length) return adjustedProduct?.rating || 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews, adjustedProduct]);

  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { dist[r.rating - 1]++; });
    return dist;
  }, [reviews]);

  if (!adjustedProduct) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-foreground">{t('common.productNotFound')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('common.productNotExist')}</p>
        <Link to="/categories" className="mt-4 text-sm font-medium text-primary hover:underline">{t('common.browseProducts')}</Link>
      </div>
    );
  }

  const discount = adjustedProduct.originalPrice
    ? Math.round(((adjustedProduct.originalPrice - adjustedProduct.price) / adjustedProduct.originalPrice) * 100)
    : 0;

  const wishlisted = isInWishlist(adjustedProduct.id);

  const handleAddToCart = () => {
    addItem(adjustedProduct, quantity);
    toast({ title: t('common.addedToCart'), description: t('common.addedToCartDesc', { count: quantity, name: adjustedProduct.name }) });
  };

  const handleBuyNow = () => {
    addItem(adjustedProduct, quantity);
    toast({ title: t('common.proceedingToCheckout'), description: t('common.buyingQuantity', { count: quantity, name: adjustedProduct.name }) });
  };

  const handleWishlist = () => {
    if (wishlisted) {
      removeFromWishlist(adjustedProduct.id);
      toast({ title: t('common.removedFromWishlist'), description: t('common.removedFromWishlistDesc', { name: adjustedProduct.name }) });
    } else {
      addToWishlist(adjustedProduct);
      toast({ title: t('common.savedToWishlist'), description: t('common.savedToWishlistDesc', { name: adjustedProduct.name }) });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">{t('common.home')}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/categories" className="hover:text-foreground transition-colors">{t('common.categories')}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/categories?cat=${adjustedProduct.category}`} className="hover:text-foreground transition-colors capitalize">{adjustedProduct.category.replace("-", " ")}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium line-clamp-1">{adjustedProduct.name}</span>
        </nav>
      </div>

      {/* Product Hero */}
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Image Gallery */}
          <div>
            <div className="relative overflow-hidden rounded-xl bg-muted aspect-square">
              <img
                src={gallery[selectedImage]}
                alt={adjustedProduct.name}
                className="h-full w-full object-cover transition-transform duration-500"
              />
              {discount > 0 && (
                <span className="absolute left-3 top-3 rounded-lg bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">-{discount}%</span>
              )}
              {adjustedProduct.badge && (
                <span className="absolute right-3 top-3 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{adjustedProduct.badge}</span>
              )}
            </div>
            {/* Thumbnails */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    selectedImage === i ? "border-primary ring-1 ring-primary/30" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`View ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-foreground md:text-2xl leading-tight">{adjustedProduct.name}</h1>

            <div className="mt-2 flex items-center gap-3">
              <StarRating rating={adjustedProduct.rating} />
              <span className="text-sm text-muted-foreground">{adjustedProduct.rating} ({t('common.reviewsCount', { count: reviews.length })})</span>
            </div>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-black text-primary">${adjustedProduct.price.toFixed(2)}</span>
              {adjustedProduct.originalPrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through">${adjustedProduct.originalPrice.toFixed(2)}</span>
                  <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-sm font-bold text-destructive">Save {discount}%</span>
                </>
              )}
            </div>

            {adjustedProduct.seller && (
              <p className="mt-3 text-sm text-muted-foreground">{t('common.soldBy')} <span className="font-semibold text-foreground">{adjustedProduct.seller}</span></p>
            )}

            {adjustedProduct.description && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{adjustedProduct.description}</p>
            )}

            <Separator className="my-5" />

            {/* Quantity + Actions */}
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-lg border border-border">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold text-foreground">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">{adjustedProduct.inStock !== false ? `✓ ${t('common.inStock')}` : t('common.outOfStock')}</span>
            </div>

            <div className="mt-4 flex gap-3">
              <Button onClick={handleAddToCart} className="flex-1 gap-2" size="lg">
                <ShoppingCart className="h-4 w-4" /> {t('common.addToCart')}
              </Button>
              <Button onClick={handleBuyNow} variant="secondary" className="flex-1" size="lg">
                {t('common.buyNow')}
              </Button>
            </div>

            <div className="mt-4 flex gap-3">
              <Button variant={wishlisted ? "default" : "outline"} size="icon" className={`h-10 w-10 ${wishlisted ? "bg-destructive hover:bg-destructive/90" : ""}`} onClick={handleWishlist}>
                <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => toast({ title: t('common.linkCopied') })}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: Truck, label: t('common.freeShipping') },
                { icon: ShieldCheck, label: t('common.securePayment') },
                { icon: RotateCcw, label: t('common.easyReturns') },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Description, Specifications, Reviews */}
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start border-b border-border bg-transparent">
            <TabsTrigger value="description">{t('common.description')}</TabsTrigger>
            <TabsTrigger value="specifications">{t('common.specifications')}</TabsTrigger>
            <TabsTrigger value="reviews">{t('common.reviews')} ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>{adjustedProduct.description || t('common.noDescription')}</p>
              <p className="mt-4">{t('common.qualityChecked')}</p>
            </div>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            {adjustedProduct.specifications ? (
              <div className="overflow-hidden rounded-lg border border-border">
                {Object.entries(adjustedProduct.specifications).map(([key, value], i) => (
                  <div key={key} className={`flex items-center justify-between px-4 py-3 text-sm ${i % 2 === 0 ? "bg-muted/30" : "bg-background"}`}>
                    <span className="font-medium text-muted-foreground">{key}</span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('common.noSpecifications')}</p>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            {/* Rating summary */}
            <div className="mb-6 flex flex-col gap-6 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center">
              <div className="text-center">
                <p className="text-5xl font-black text-foreground">{avgRating.toFixed(1)}</p>
                <StarRating rating={avgRating} />
                <p className="mt-1 text-xs text-muted-foreground">{t('common.reviewsCount', { count: reviews.length })}</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDistribution[star - 1];
                  const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-8 text-right text-xs font-medium text-muted-foreground">{star}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-xs text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews list */}
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
              {reviews.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('common.noReviewsYet')}</p>
              )}
            </div>

            {/* Write a review */}
            <div className="mt-10 rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">{t('common.writeAReview')}</h3>
              {isAuthenticated ? (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t('common.rating')}</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none"
                        >
                          <Star className={`h-6 w-6 ${star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">{t('common.title')}</label>
                    <Input
                      id="title"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder={t('common.summarizeExperience')}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-foreground mb-1">{t('common.review')}</label>
                    <Textarea
                      id="content"
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      placeholder={t('common.whatDidYouLike')}
                      rows={4}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={addReview.isPending}>
                    {addReview.isPending ? t('common.submitting') : t('common.submitReview')}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">{t('common.mustBeLoggedIn')}</p>
                  <Button asChild>
                    <Link to="/login">{t('common.logInToReview')}</Link>
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
          <h2 className="mb-4 font-poppins text-lg font-bold text-foreground md:text-xl">{t('common.relatedProducts')}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* You May Also Like */}
      <div className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
        <h2 className="mb-4 font-poppins text-lg font-bold text-foreground md:text-xl">{t('common.youMayAlsoLike')}</h2>
        <Carousel opts={{ align: "start" }} className="relative">
          <CarouselContent className="-ml-3">
            {products.filter((p) => p.id !== product.id).slice(0, 10).map((p) => (
              <CarouselItem key={p.id} className="basis-1/2 pl-3 sm:basis-1/3 md:basis-1/5">
                <ProductCard product={p} variant="compact" />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4" />
          <CarouselNext className="hidden md:flex -right-4" />
        </Carousel>
      </div>
    </div>
  );
}
