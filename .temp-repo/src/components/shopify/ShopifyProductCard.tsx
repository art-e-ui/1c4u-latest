import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import type { ShopifyProduct } from "@/lib/shopify/types";
import { toast } from "sonner";

interface ShopifyProductCardProps {
  product: ShopifyProduct;
}

export function ShopifyProductCard({ product }: ShopifyProductCardProps) {
  const addItem = useShopifyCartStore(state => state.addItem);
  const isLoading = useShopifyCartStore(state => state.isLoading);
  const { node } = product;
  const firstVariant = node.variants.edges[0]?.node;
  const firstImage = node.images.edges[0]?.node;
  const price = parseFloat(node.priceRange.minVariantPrice.amount);
  const currency = node.priceRange.minVariantPrice.currencyCode;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!firstVariant) return;
    await addItem({
      product,
      variantId: firstVariant.id,
      variantTitle: firstVariant.title,
      price: firstVariant.price,
      quantity: 1,
      selectedOptions: firstVariant.selectedOptions || [],
    });
    toast.success(`${node.title} added to cart`);
  };

  return (
    <Link to={`/product/${node.handle}`} className="group block transition-all duration-200 hover:scale-[1.03]">
      <div className="relative overflow-hidden rounded-xl bg-muted aspect-square shadow-sm transition-shadow duration-200 group-hover:shadow-lg">
        {firstImage ? (
          <img
            src={firstImage.url}
            alt={firstImage.altText || node.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            No Image
          </div>
        )}
        <div className="absolute bottom-2 right-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
          <button
            onClick={handleAddToCart}
            disabled={isLoading || !firstVariant?.availableForSale}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            aria-label="Add to cart"
          >
            {isLoading ? <LoadingSpinner size={16} /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="mt-2.5 px-0.5">
        <p className="line-clamp-2 text-sm font-medium text-foreground leading-snug">{node.title}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-base font-bold text-primary">${price.toFixed(2)}</span>
        </div>
      </div>
    </Link>
  );
}
