import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Search, Filter, Download, User, Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Log {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  ip: string;
}

export default function AdminAuditLogsPage() {
  const logs: Log[] = [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Track all administrative actions across the system.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 w-full sm:w-72">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search logs..." className="bg-transparent border-none outline-none text-sm w-full h-6 focus-visible:ring-0 p-0" />
      </div>

      <Card className="border-none shadow-theme-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {["User", "Action", "Target", "Timestamp", "IP Address"].map((h) => (
                  <th key={h} className="text-left p-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-accent/50 transition-colors">
                  <td className="p-3.5 pl-5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                        {log.user.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </div>
                      <span className="font-medium">{log.user}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium border border-border">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 text-muted-foreground">{log.target}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {log.time}
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-xs text-muted-foreground">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
