import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  label?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({ 
  className, 
  size = 24, 
  label, 
  fullPage = false 
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex items-center justify-center"
      >
        <Loader2 size={size} className="text-primary" />
      </motion.div>
      {label && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-muted-foreground"
        >
          {label}
        </motion.p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}
