import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ label, variant = "default", className, dot }: StatusBadgeProps) {
  const variants = {
    default: "bg-muted text-muted-foreground border-muted-foreground/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    info: "bg-info/10 text-info border-info/20",
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
      variants[variant],
      className
    )}>
      {label}
    </span>
  );
}
