import React from "react";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ProductCategories } from "@/components/home/ProductCategories";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { DealsOfTheDay } from "@/components/home/DealsOfTheDay";
import { BestSelling } from "@/components/home/BestSelling";
import { CategorySection } from "@/components/home/CategorySection";
import { FeatureCategories } from "@/components/home/FeatureCategories";
import { FeaturedBrands } from "@/components/home/FeaturedBrands";
import { PreOrderBanner } from "@/components/home/PreOrderBanner";
import { AppDownloadBanner } from "@/components/home/AppDownloadBanner";
import { RecentlyViewed } from "@/components/home/RecentlyViewed";
import { MoreProducts } from "@/components/home/MoreProducts";
import { SeasonalDecorations } from "@/components/home/SeasonalDecorations";
import { TrustSection } from "@/components/home/TrustSection";
import { useTranslation } from "react-i18next";
import { useProducts } from "@/lib/products-context-hooks";

export default function Index() {
  const { t } = useTranslation();
  const { categories } = useProducts();
  
  const targetCategoryNames = [
    "electronics",
    "accessories",
    "automotive parts & accessories",
    "fragrances",
    "bags & backpacks"
  ];

  // Filter categories that match the target names (case-insensitive)
  const matchedCategories = categories.filter(cat => 
    targetCategoryNames.some(target => cat.name.toLowerCase().includes(target))
  );

  // If we still didn't find enough matches, pad with other categories
  const topCategories = matchedCategories.length >= 5 
    ? matchedCategories.slice(0, 5) 
    : [...matchedCategories, ...categories.filter(c => !matchedCategories.some(mc => mc.id === c.id))].slice(0, 5);


  const gradients = [
    "bg-gradient-to-br from-blue-500/10 to-purple-500/10",
    "bg-gradient-to-br from-pink-500/10 to-rose-500/10",
    "bg-gradient-to-br from-emerald-500/10 to-teal-500/10",
    "bg-gradient-to-br from-amber-500/10 to-orange-500/10",
    "bg-gradient-to-br from-indigo-500/10 to-cyan-500/10"
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <SeasonalDecorations />
      <HeroBanner />
      <TrustSection />
      <ProductCategories />
      <FeaturedProducts />
      <DealsOfTheDay />
      <BestSelling />
      {topCategories.map((cat, index) => (
        <CategorySection 
          key={cat.id} 
          title={t(`common.${cat.slug}`, { defaultValue: cat.name })} 
          categorySlug={cat.slug} 
          bgGradient={gradients[index % gradients.length]} 
        />
      ))}
      <FeatureCategories />
      <FeaturedBrands />
      <PreOrderBanner />
      <FeaturedProducts />
      <AppDownloadBanner />
      <RecentlyViewed />
      <MoreProducts />
    </div>
  );
}
