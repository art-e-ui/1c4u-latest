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
  electronics: "https://picsum.photos/seed/electronics/200/200",
  accessories: "https://picsum.photos/seed/accessories/200/200",
  "automotive-parts-&-accessories": "https://picsum.photos/seed/car/200/200",
  fragrances: "https://picsum.photos/seed/perfume/200/200",
  "bags-&-backpacks": "https://picsum.photos/seed/bag/200/200",
  fashion: "https://picsum.photos/seed/fashion/200/200",
  "home-living": "https://picsum.photos/seed/home/200/200",
  "beauty-health": "https://picsum.photos/seed/beauty/200/200",
  "sports-outdoors": "https://picsum.photos/seed/sports/200/200",
  "books-stationery": "https://picsum.photos/seed/books/200/200",
  clothing: "https://picsum.photos/seed/clothing/200/200",
  shoes: "https://picsum.photos/seed/shoes/200/200",
  watches: "https://picsum.photos/seed/watch/200/200",
  jewelry: "https://picsum.photos/seed/jewelry/200/200",
};

export function getCategoryImage(slug: string, providedImage?: string, products?: Product[], categoryName?: string): string {
  if (providedImage && providedImage.trim() !== "" && !providedImage.includes("placeholder.svg")) {
    return providedImage;
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

  return CATEGORY_DEFAULT_IMAGES[slug] || `https://picsum.photos/seed/${slug}/200/200`;
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

  const products = dbProducts ?? [];
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
