import { useTranslation } from "react-i18next";

const brands = [
  { name: "Samsung", logo: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=120&h=60&fit=crop" },
  { name: "Apple", logo: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=120&h=60&fit=crop" },
  { name: "Nike", logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=60&fit=crop" },
  { name: "Sony", logo: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=120&h=60&fit=crop" },
  { name: "Adidas", logo: "https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=120&h=60&fit=crop" },
  { name: "LG", logo: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=120&h=60&fit=crop" },
];

export function FeaturedBrands() {
  const { t } = useTranslation();

  return (
    <section className="border-y border-border bg-muted/30 py-4 md:py-6">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('common.featuredBrands')}</span>
          <div className="flex items-center gap-8">
            {brands.map((brand) => (
              <div
                key={brand.name}
                className="group flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-background"
              >
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="h-8 w-12 rounded object-cover opacity-60 grayscale transition-all group-hover:opacity-100 group-hover:grayscale-0"
                />
                <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  {brand.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
