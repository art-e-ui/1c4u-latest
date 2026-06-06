import { useShopifyProducts } from "@/hooks/use-shopify-products";
import { ShopifyProductCard } from "./ShopifyProductCard";
import { ProductGridSkeleton } from "@/components/products/ProductCardSkeleton";
import { PackageOpen } from "lucide-react";

interface ShopifyProductGridProps {
  title?: string;
  count?: number;
  searchQuery?: string;
}

export function ShopifyProductGrid({ title, count = 20, searchQuery }: ShopifyProductGridProps) {
  const { data: products, isLoading, error } = useShopifyProducts(count, searchQuery);

  return (
    <section className="py-6 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        {title && <h2 className="font-poppins text-lg font-bold text-foreground md:text-xl mb-4">{title}</h2>}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <ProductGridSkeleton count={count > 8 ? 8 : count} />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load products from Shopify.</p>
        ) : !products || products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No products found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tell the chat what products you'd like to add to your store.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {products.map((product) => (
              <ShopifyProductCard key={product.node.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
