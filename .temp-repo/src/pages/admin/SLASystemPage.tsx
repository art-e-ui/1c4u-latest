import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Activity, Clock, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";

interface Metric {
  name: string;
  target: string;
  current: string;
  status: "success" | "warning" | "danger" | "info" | "default";
}

export default function SLASystemPage() {
  const metrics: Metric[] = [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SLA Management</h1>
        <p className="text-sm text-muted-foreground">Monitor and manage Service Level Agreements across the system.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Overall Uptime" value="0%" icon={Activity} trend={{ value: 0, isPositive: true }} />
        <StatCard label="Avg. Response" value="0s" icon={Clock} trend={{ value: 0, isPositive: true }} />
        <StatCard label="Success Rate" value="0%" icon={CheckCircle} trend={{ value: 0, isPositive: true }} />
        <StatCard label="Incident Count" value="0" icon={AlertCircle} trend={{ value: 0, isPositive: false }} />
      </div>

      <Card className="border-none shadow-theme-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            SLA Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No SLA metrics available.
            </div>
          ) : (
            <div className="space-y-6">
              {metrics.map((metric) => (
                <div key={metric.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{metric.name}</span>
                      <span className="text-xs text-muted-foreground">Target: {metric.target}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{metric.current}</span>
                      <StatusBadge label={metric.status === "success" ? "On Track" : "At Risk"} variant={metric.status as "success" | "warning" | "danger" | "info" | "default"} />
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${metric.status === "success" ? "bg-success" : "bg-warning"}`} 
                      style={{ width: metric.status === "success" ? "85%" : "95%" }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
