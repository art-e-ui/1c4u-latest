import React, { type ReactNode } from "react";
import { useDbProducts, useDbCategories } from "@/hooks/use-db-products";
import type { Product, Category } from "@/lib/types";
import { ProductsContext, mapCategories, getCategoryImage } from "./products-context-hooks";


export function ProductsProvider({ children }: { children: ReactNode }) {
  const { data: dbProducts, isLoading: loadingP } = useDbProducts();
  const { data: dbCategories, isLoading: loadingC } = useDbCategories();

  const products: Product[] = (dbProducts ?? []).filter(p => (!p.status || ["active", "in stock", "low stock"].includes(p.status.toLowerCase())) && p.isShopify);
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

  const combined = [...mappedCategories, ...derivedCategories];

  // Map products to categories and filter
  const categories = combined
    .map(cat => {
      const categoryProducts = products.filter(p => {
        const pCat = p.category.toLowerCase();
        const cSlug = cat.slug.toLowerCase();
        const cName = cat.name.toLowerCase();
        return pCat === cSlug || 
               pCat === cName || 
               pCat.replace(/\s+/g, '-') === cSlug ||
               cSlug.replace(/\s+/g, '-') === pCat;
      });
      
      return {
        ...cat,
        count: categoryProducts.length,
        categoryProducts, // Temporarily attach to filter
      };
    })
    .filter(cat => {
      // 1. Keep only categories with at least 1 product
      if (cat.count === 0) {
        return false;
      }

      // 2. Must have a valid category image or a product with an image
      const hasValidCategoryImage = cat.image && 
        cat.image.trim() !== "" && 
        !cat.image.includes("placeholder.svg") && 
        !cat.image.includes("picsum.photos");

      const hasProductWithImage = cat.categoryProducts.some(p => 
        p.image && 
        p.image.trim() !== "" && 
        !p.image.includes("placeholder.svg")
      );

      return hasValidCategoryImage || hasProductWithImage;
    })
    .map(({ categoryProducts, ...rest }) => rest); // Remove temporary field

  return (
    <ProductsContext.Provider value={{ products, categories, isLoading: loadingP || loadingC }}>
      {children}
    </ProductsContext.Provider>
  );
}
