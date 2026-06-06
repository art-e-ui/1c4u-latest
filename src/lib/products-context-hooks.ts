import { createContext, useContext } from "react";
import type { Product, Category } from "@/lib/types";
import { useDbProducts, useDbCategories } from "@/hooks/use-db-products";

export interface ProductsContextType {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
}

export const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  // Electronics & Gadgets
  electronics: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80",
  gadgets: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",

  // Accessories
  accessories: "https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfc?auto=format&fit=crop&w=600&q=80",

  // Automotive parts & accessories
  "automotive": "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80",
  "automotive-parts": "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80",
  "automotive-parts-accessories": "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80",
  "automotive-parts-&-accessories": "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80",

  // Fragrances & Perfumes
  fragrances: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80",
  perfume: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80",
  perfumes: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80",

  // Bags & Backpacks
  "bags-backpacks": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
  "bags-&-backpacks": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
  bags: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
  backpacks: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",

  // Fashion & Apparel
  fashion: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80",
  apparel: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80",

  // Home & Living
  "home-living": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
  "home": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
  "home-kitchen": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",

  // Beauty & Health
  "beauty-health": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80",
  "beauty-&-health": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80",
  beauty: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80",
  health: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80",

  // Sports & Outdoors
  "sports-outdoors": "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80",
  "sports-&-outdoors": "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80",
  sports: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80",
  outdoors: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80",

  // Books & Stationery
  "books-stationery": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
  "books-&-stationery": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
  books: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
  stationery: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",

  // Clothing & Apparel
  clothing: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=600&q=80",
  clothes: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=600&q=80",

  // Shoes & Footwear
  shoes: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80",
  footwear: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80",

  // Watches & Smartwatches
  watches: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
  watch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",

  // Jewelry & Ornaments
  jewelry: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80",

  // Ultimate fallback
  fallback: "https://images.unsplash.com/photo-1472851294608-062f824d296e?auto=format&fit=crop&w=600&q=80"
};

export function getCategoryImage(slug: string, providedImage?: string, products?: Product[], categoryName?: string): string {
  let finalImage = providedImage;

  // If the provided image appears to be a dynamic product/upload URL,
  // check if it exists in the active product catalog. If the product was deleted and its image is no longer in any active product,
  // we discard it so that it gracefully falls back to another active product of this category or a default static icon.
  if (finalImage && products && products.length > 0) {
    const isDynamicProductImage = finalImage.includes("/storage/") || 
                                  finalImage.includes("supabase") || 
                                  finalImage.includes("firebasestorage") || 
                                  finalImage.includes("/products/") ||
                                  finalImage.includes("picsum") ||
                                  (finalImage.includes("unsplash.com") && !Object.values(CATEGORY_DEFAULT_IMAGES).includes(finalImage));

    if (isDynamicProductImage) {
      const existsInActiveProducts = products.some(p => 
        p.image === finalImage || (p.images && p.images.includes(finalImage))
      );
      if (!existsInActiveProducts) {
        finalImage = undefined;
      }
    }
  }

  if (finalImage && finalImage.trim() !== "" && !finalImage.includes("placeholder.svg") && !finalImage.includes("picsum.photos")) {
    return finalImage;
  }

  // Try to find a product image from the inventory for this category
  if (products && categoryName) {
    const productWithImage = products.find(p => 
      p.category.toLowerCase() === categoryName.toLowerCase() && p.image
    );
    if (productWithImage) {
      return productWithImage.image;
    }
  }

  const normalized = slug.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // Find a matching key or a key that contains/is contained by the normalized slug
  const matchedKey = Object.keys(CATEGORY_DEFAULT_IMAGES).find(k => 
    normalized === k || 
    normalized.replace(/-/g, '') === k.replace(/-/g, '') || 
    normalized.includes(k) || 
    k.includes(normalized)
  );

  return matchedKey ? CATEGORY_DEFAULT_IMAGES[matchedKey] : CATEGORY_DEFAULT_IMAGES.fallback;
}

export function mapCategories(dbCategories: Record<string, unknown>[], products?: Product[]): Category[] {
  return dbCategories.map((c) => {
    const name = String(c.name || "");
    const slug = c.slug ? String(c.slug) : name.toLowerCase().replace(/\s+/g, '-');
    return {
      id: String(c.id),
      name,
      slug,
      image: getCategoryImage(slug, String(c.image ?? ""), products, name),
      count: Number(c.product_count ?? 0),
    };
  });
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  const { data: dbProducts, isLoading: loadingP } = useDbProducts();
  const { data: dbCategories, isLoading: loadingC } = useDbCategories();

  if (ctx) return ctx;

  const products = (dbProducts ?? []).filter(p => !p.status || ["active", "in stock", "low stock"].includes(p.status.toLowerCase()));
  const mappedCategories = mapCategories((dbCategories ?? []) as Record<string, unknown>[], products);

  // Derive any categories that exist in products but not in dbCategories
  const uniqueCategorySlugs = new Set(mappedCategories.map(c => c.slug));
  const derivedCategoriesMap = new Map<string, Category>();
  
  products.forEach(p => {
    const slug = p.category.toLowerCase().replace(/\s+/g, '-');
    if (!uniqueCategorySlugs.has(slug)) {
      const existing = derivedCategoriesMap.get(slug);
      if (!existing) {
        derivedCategoriesMap.set(slug, {
          id: slug,
          name: p.category, // Use the first encountered case variant
          slug: slug,
          image: getCategoryImage(slug, "", products, p.category),
          count: 1
        });
      } else {
        existing.count = (existing.count || 0) + 1;
      }
    }
  });
  
  const derivedCategories = Array.from(derivedCategoriesMap.values());

  const categories = [...mappedCategories, ...derivedCategories];

  return {
    products,
    categories,
    isLoading: loadingP || loadingC,
  } satisfies ProductsContextType;
}
