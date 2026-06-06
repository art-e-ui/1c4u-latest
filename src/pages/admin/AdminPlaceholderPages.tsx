import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Shield, Lock, Activity, Users, Key, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Role {
  name: string;
  users: number;
  description: string;
}

export function RolesPage() {
  const roles: Role[] = [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">Define and manage access levels for your team.</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8">
          <Users className="h-3.5 w-3.5" />
          Create Role
        </Button>
      </div>

      <div className="grid gap-4">
        {roles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No roles available.
          </div>
        ) : (
          roles.map((role) => (
            <Card key={role.name} className="border-none shadow-theme-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    {role.name}
                  </CardTitle>
                  <StatusBadge label={`${role.users} Users`} variant="info" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8">Edit Permissions</Button>
                  <Button variant="ghost" size="sm" className="h-8">View Users</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

interface SecuritySetting {
  name: string;
  description: string;
  icon: React.ElementType;
  status: string;
}

export function SecurityPage() {
  const settings: SecuritySetting[] = [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-sm text-muted-foreground">Configure system-wide security protocols.</p>
      </div>

      <div className="grid gap-4">
        {settings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No security settings available.
          </div>
        ) : (
          settings.map((setting) => (
            <Card key={setting.name} className="border-none shadow-theme-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <setting.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{setting.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{setting.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge 
                      label={setting.status} 
                      variant={setting.status === "Enabled" ? "success" : setting.status === "Disabled" ? "danger" : "info"} 
                    />
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs">Configure</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

interface SystemLog {
  timestamp: string;
  level: "ERROR" | "WARN" | "INFO";
  source: string;
  message: string;
}

export function SystemLogsPage() {
  const logs: SystemLog[] = [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Logs</h1>
          <p className="text-sm text-muted-foreground">Monitor system events and technical logs.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Download className="h-3.5 w-3.5" />
          Export Logs
        </Button>
      </div>

      <Card className="border-none shadow-theme-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Timestamp", "Level", "Source", "Message"].map((h) => (
                  <th key={h} className="text-left p-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-[11px]">
              {logs.map((log, i) => (
                <tr key={i} className="hover:bg-accent/50 transition-colors">
                  <td className="p-3.5 pl-5 text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                  <td className="p-3.5">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold",
                      log.level === "ERROR" ? "bg-danger/10 text-danger" :
                      log.level === "WARN" ? "bg-warning/10 text-warning" :
                      "bg-info/10 text-info"
                    )}>
                      {log.level}
                    </span>
                  </td>
                  <td className="p-3.5 text-foreground">{log.source}</td>
                  <td className="p-3.5 text-foreground max-w-md truncate">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

import { Globe, Download } from "lucide-react";
import { cn } from "@/lib/utils";
