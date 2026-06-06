import { Link } from "react-router-dom";
import { useProducts, getCategoryImage } from "@/lib/products-context-hooks";
import { useTranslation } from "react-i18next";
import { useState } from "react";

function CategoryImage({ src, alt, slug }: { src: string; alt: string; slug: string }) {
  const fallback = getCategoryImage(slug);
  const [imgSrc, setImgSrc] = useState(src || fallback);
  return (
    <img
      src={imgSrc}
      alt={alt}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
      loading="lazy"
      onError={() => setImgSrc(fallback)}
    />
  );
}

export function FeatureCategories() {
  const { t } = useTranslation();
  const { categories } = useProducts();

  const isWorkingImage = (url: string | undefined | null) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      url.startsWith("http") &&
      !lower.includes("placeholder") &&
      !lower.includes("picsum.photos") &&
      !lower.includes("placehold.co") &&
      !lower.includes("via.placeholder") &&
      !lower.includes("assets/")
    );
  };

  const featured = categories
    .filter((c) => isWorkingImage(c.image))
    .slice(0, 6);

  return (
    <section className="py-6 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-poppins text-lg font-bold text-foreground md:text-xl">{t('common.featuredCategories')}</h2>
          <Link to="/categories" className="text-xs font-semibold text-primary hover:underline">{t('common.viewAll')}</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {featured.map((cat) => (
            <Link
              key={cat.id}
              to={`/categories/${cat.slug}`}
              className="group relative overflow-hidden rounded-xl aspect-[4/3] bg-muted"
            >
              <CategoryImage src={cat.image} alt={cat.name} slug={cat.slug} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                <h3 className="font-poppins text-sm font-bold text-white md:text-base">
                  {t(`common.${cat.slug}`, { defaultValue: cat.name })}
                </h3>
                <span className="mt-1 inline-flex items-center text-[11px] font-semibold text-white/80 group-hover:text-primary transition-colors">
                  {t('common.shopNow')} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
