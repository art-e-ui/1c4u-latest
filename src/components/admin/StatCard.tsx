import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ label, value, icon: Icon, iconBg, trend }: StatCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-theme-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-foreground tracking-tight">
                {value}
              </h3>
              {trend && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  trend.isPositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                )}>
                  {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
                </span>
              )}
            </div>
          </div>
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm",
            iconBg || "bg-primary/10 text-primary"
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
