import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { resellerPath } from "@/lib/subdomain";

type AnimType = "fade-up" | "slide-left" | "scale-in" | "slide-right" | "blur-in";

interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  ctaSecondary?: string;
  href: string;
  hrefSecondary?: string;
  image: string;
  tag: string;
  animation: AnimType;
}

const WATERMARK_URL =
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1920&auto=format&fit=crop";

const animClass: Record<AnimType, string> = {
  "fade-up": "hero-anim-fade-up",
  "slide-left": "hero-anim-slide-left",
  "scale-in": "hero-anim-scale-in",
  "slide-right": "hero-anim-slide-right",
  "blur-in": "hero-anim-blur-in",
};

export function HeroBanner() {
  const { t } = useTranslation();
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  const slides: SlideData[] = [
    {
      id: 1,
      title: t('common.shopTheWorld'),
      subtitle: t('common.deliveredToYou'),
      description: t('common.straightToDoor'),
      cta: t('common.startShopping'),
      ctaSecondary: t('common.becomeReseller'),
      href: "/categories",
      hrefSecondary: resellerPath("/register"),
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1920&auto=format&fit=crop",
      tag: t('common.globalMarketplace'),
      animation: "fade-up",
    },
    {
      id: 2,
      title: t('common.premiumFashion'),
      subtitle: t('common.upToOff'),
      description: t('common.discoverTrends'),
      cta: t('product.buyNow'),
      href: "/categories/womens-dresses",
      image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1920&auto=format&fit=crop",
      tag: t('common.fashion'),
      animation: "slide-left",
    },
    {
      id: 3,
      title: t('common.smartGadgets'),
      subtitle: t('common.latestTech'),
      description: t('common.upgradeLifestyle'),
      cta: t('common.exploreTech'),
      href: "/categories/smartphones",
      image: "https://images.unsplash.com/photo-1491933382434-500287f9b54b?q=80&w=1920&auto=format&fit=crop",
      tag: t('common.gadgets'),
      animation: "scale-in",
    },
    {
      id: 4,
      title: t('common.modernHome'),
      subtitle: t('common.elevateSpace'),
      description: t('common.transformEnvironment'),
      cta: t('common.viewCollection'),
      href: "/categories/home-decoration",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1920&auto=format&fit=crop",
      tag: t('common.homeDecor'),
      animation: "slide-right",
    },
    {
      id: 5,
      title: t('common.officeSetup'),
      subtitle: t('common.workInComfort'),
      description: t('common.ergonomicFurniture'),
      cta: t('common.shopOffice'),
      href: "/categories/furniture",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop",
      tag: t('common.officeAccessories'),
      animation: "blur-in",
    },
    {
      id: 6,
      title: t('common.resellerProgram'),
      subtitle: t('common.earnMargins'),
      description: t('common.joinNetwork'),
      cta: t('common.becomeReseller'),
      ctaSecondary: t('common.learnMore'),
      href: resellerPath("/register"),
      hrefSecondary: resellerPath("/login"),
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1920&auto=format&fit=crop",
      tag: t('common.partnership'),
      animation: "fade-up",
    },
  ];

  React.useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  // Auto-play
  React.useEffect(() => {
    if (!api) return;
    const interval = setInterval(() => api.scrollNext(), 5000);
    return () => clearInterval(interval);
  }, [api]);

  const getHref = (href: string) => {
    if (referralCode && href.includes('/reseller/')) {
      const separator = href.includes('?') ? '&' : '?';
      return `${href}${separator}ref=${referralCode}`;
    }
    return href;
  };

  return (
    <section className="relative group">
      <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
        <CarouselContent>
          {slides.map((slide, idx) => (
            <CarouselItem key={slide.id}>
              <div className="relative flex min-h-[260px] items-center sm:min-h-[340px] md:min-h-[420px] lg:min-h-[500px] xl:min-h-[560px] 2xl:min-h-[620px] overflow-hidden">
                {/* Background image */}
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
                {/* Wholesale mart watermark */}
                <img
                  src={WATERMARK_URL}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.06] mix-blend-luminosity pointer-events-none"
                />
                {/* Content with unique animation per slide */}
                {current === idx && (
                  <div key={`content-${slide.id}-${current}`} className="relative z-20 max-w-lg px-6 py-8 md:px-16 lg:max-w-xl xl:max-w-2xl">
                    <span className={`mb-3 inline-block rounded-sm bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground ${animClass[slide.animation]} hero-delay-1`}>
                      {slide.tag}
                    </span>
                    <h2 className={`text-2xl font-black uppercase leading-tight text-white md:text-5xl font-poppins ${animClass[slide.animation]} hero-delay-2`}>
                      {slide.title}
                    </h2>
                    <p className={`mt-2 text-2xl font-black text-primary md:text-5xl ${animClass[slide.animation]} hero-delay-3`}>
                      {slide.subtitle}
                    </p>
                    <p className={`mt-4 line-clamp-2 text-sm font-medium text-white/90 md:text-lg ${animClass[slide.animation]} hero-delay-4`}>
                      {slide.description}
                    </p>
                    <div className={`mt-6 flex flex-wrap items-center gap-3 z-30 relative ${animClass[slide.animation]} hero-delay-5`}>
                      {slide.href.startsWith('http') ? (
                        <a
                          href={slide.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                        >
                          {slide.cta}
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      ) : (
                        <Link
                          to={getHref(slide.href)}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                        >
                          {slide.cta}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                      {slide.ctaSecondary && slide.hrefSecondary && (
                        slide.hrefSecondary.startsWith('http') ? (
                          <a
                            href={slide.hrefSecondary}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm px-6 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors"
                          >
                            {slide.ctaSecondary}
                          </a>
                        ) : (
                          <Link
                            to={getHref(slide.hrefSecondary)}
                            className="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm px-6 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors"
                          >
                            {slide.ctaSecondary}
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-3 h-10 w-10 border-none bg-white/20 text-white opacity-0 backdrop-blur-md transition-all hover:bg-primary hover:text-primary-foreground group-hover:opacity-100" />
        <CarouselNext className="right-3 h-10 w-10 border-none bg-white/20 text-white opacity-0 backdrop-blur-md transition-all hover:bg-primary hover:text-primary-foreground group-hover:opacity-100" />
      </Carousel>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 z-20">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              current === i ? "w-6 bg-primary" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
            onClick={() => api?.scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Bottom gradient blend */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
    </section>
  );
}
