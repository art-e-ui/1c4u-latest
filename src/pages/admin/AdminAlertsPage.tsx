import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AlertTriangle, Bell, Info, CheckCircle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Alert {
  id: string;
  type: "danger" | "warning" | "info" | "default";
  icon: React.ElementType;
  title: string;
  time: string;
  message: string;
}

export default function AdminAlertsPage() {
  const alerts: Alert[] = [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Alerts</h1>
          <p className="text-sm text-muted-foreground">Stay informed about critical system events.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <CheckCircle className="h-3.5 w-3.5" />
          Mark All as Read
        </Button>
      </div>

      <div className="grid gap-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className="border-none shadow-theme-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                    alert.type === "danger" ? "bg-danger/10 text-danger" :
                    alert.type === "warning" ? "bg-warning/10 text-warning" :
                    alert.type === "info" ? "bg-info/10 text-info" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    <alert.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{alert.title}</h3>
                      <span className="text-[10px] text-muted-foreground">• {alert.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
