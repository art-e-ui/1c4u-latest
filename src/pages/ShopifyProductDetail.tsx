import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useShopifyProductByHandle } from "@/hooks/use-shopify-products";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Minus, Plus, ChevronRight, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

export default function ShopifyProductDetail() {
  const { handle } = useParams<{ handle: string }>();
  const { data: product, isLoading } = useShopifyProductByHandle(handle);
  const addItem = useShopifyCartStore(state => state.addItem);
  const cartLoading = useShopifyCartStore(state => state.isLoading);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-foreground">Product not found</h2>
        <Link to="/" className="mt-4 text-sm font-medium text-primary hover:underline">Back to Home</Link>
      </div>
    );
  }

  const images = product.images.edges;
  const variants = product.variants.edges;
  const selectedVariant = variants[selectedVariantIdx]?.node;
  const price = selectedVariant ? parseFloat(selectedVariant.price.amount) : 0;
  const currency = '$';

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    await addItem({
      product: { node: product },
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity,
      selectedOptions: selectedVariant.selectedOptions || [],
    });
    toast.success(`${product.title} added to cart`);
  };

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium line-clamp-1">{product.title}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Image Gallery */}
          <div>
            <div className="relative overflow-hidden rounded-xl bg-muted aspect-square">
              {images[selectedImage]?.node ? (
                <img
                  src={images[selectedImage].node.url}
                  alt={images[selectedImage].node.altText || product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">No Image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImage === i ? "border-primary ring-1 ring-primary/30" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img.node.url} alt={`View ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-foreground md:text-2xl leading-tight">{product.title}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-black text-primary">{currency} {price.toFixed(2)}</span>
            </div>

            {product.description && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Variant selection */}
            {product.options.map((option) => (
              option.name !== "Title" && (
                <div key={option.name} className="mt-4">
                  <p className="text-sm font-medium text-foreground mb-2">{option.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v, idx) => {
                      const optValue = v.node.selectedOptions.find(o => o.name === option.name)?.value;
                      return (
                        <button
                          key={v.node.id}
                          onClick={() => setSelectedVariantIdx(idx)}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                            selectedVariantIdx === idx
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          } ${!v.node.availableForSale ? "opacity-40 line-through" : ""}`}
                          disabled={!v.node.availableForSale}
                        >
                          {optValue || v.node.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            ))}

            {/* Quantity */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center rounded-lg border border-border">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold text-foreground">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedVariant?.availableForSale ? "✓ In Stock" : "Out of Stock"}
              </span>
            </div>

            <div className="mt-4">
              <Button
                onClick={handleAddToCart}
                className="w-full gap-2"
                size="lg"
                disabled={cartLoading || !selectedVariant?.availableForSale}
              >
                {cartLoading ? <LoadingSpinner size={16} /> : <ShoppingCart className="h-4 w-4" />}
                Add to Cart
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: Truck, label: "Free Shipping" },
                { icon: ShieldCheck, label: "Secure Payment" },
                { icon: RotateCcw, label: "Easy Returns" },
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
    </div>
  );
}
