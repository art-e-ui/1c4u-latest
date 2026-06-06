import React, { type ReactNode } from "react";
import { useDbProducts, useDbCategories } from "@/hooks/use-db-products";
import type { Product, Category } from "@/lib/types";
import { ProductsContext, mapCategories, getCategoryImage } from "./products-context-hooks";


export function ProductsProvider({ children }: { children: ReactNode }) {
  const { data: dbProducts, isLoading: loadingP } = useDbProducts();
  const { data: dbCategories, isLoading: loadingC } = useDbCategories();

  const products: Product[] = dbProducts ?? [];
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

  return (
    <ProductsContext.Provider value={{ products, categories, isLoading: loadingP || loadingC }}>
      {children}
    </ProductsContext.Provider>
  );
}
