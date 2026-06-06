import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardSkeletonProps {
  variant?: "default" | "compact";
}

export function ProductCardSkeleton({ variant = "default" }: ProductCardSkeletonProps) {
  if (variant === "compact") {
    return (
      <div className="min-w-[140px]">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <Skeleton className="mt-2 h-3 w-3/4" />
        <Skeleton className="mt-1.5 h-4 w-1/2" />
      </div>
    );
  }

  return (
    <div>
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="mt-2.5 px-0.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1.5 h-3 w-2/3" />
        <div className="mt-1.5 flex items-center gap-1">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-8" />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, variant = "default" }: { count?: number; variant?: "default" | "compact" }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} variant={variant} />
      ))}
    </>
  );
}

export function CategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 min-w-[72px]">
          <Skeleton className="h-16 w-16 rounded-full md:h-20 md:w-20" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </>
  );
}
