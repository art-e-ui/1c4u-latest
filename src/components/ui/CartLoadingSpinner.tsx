import { cn } from "@/lib/utils";
import cartSvgUri from "@/assets/cart-spinner-uri.txt?raw";

interface CartLoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function CartLoadingSpinner({ className, size = "md", text }: CartLoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative">
        {/* Track line */}
        <div className="absolute bottom-1 left-0 right-0 h-0.5 bg-muted rounded-full" />
        
        {/* Animated cart */}
        <div className={cn("animate-cart-move", sizeClasses[size])}>
          <img
            src={cartSvgUri}
            alt="Loading cart"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
      
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
}
