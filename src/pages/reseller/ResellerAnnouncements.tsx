import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { ArrowLeft, Megaphone, Calendar, ShieldCheck, Mail, Siren, BadgeAlert, AlertCircle } from "lucide-react";
import { resellerPath } from "@/lib/subdomain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface BroadcastNotification {
  id: string;
  label: string;
  message: string;
  department: string;
  broadcast_date: string;
  is_archived: boolean;
}

export default function ResellerAnnouncements() {
  const navigate = useNavigate();

  const { data: announcements = [], isLoading } = useQuery<BroadcastNotification[]>({
    queryKey: ["active_broadcast_announcements"],
    queryFn: async () => {
      const q = query(
        collection(db, "broadcast_notifications"),
        where("is_archived", "==", false),
        orderBy("broadcast_date", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          label: data.label || "System Announcement",
          message: data.message || "",
          department: data.department || "System",
          broadcast_date: data.broadcast_date || new Date().toISOString(),
          is_archived: data.is_archived || false,
        };
      });
    },
  });

  const handleBack = () => {
    navigate(resellerPath("/reseller/dashboard"));
  };

  const getDepartmentIcon = (dept: string) => {
    const lowercase = dept.toLowerCase();
    if (lowercase.includes("technical") || lowercase.includes("support")) {
      return <Siren className="h-5 w-5 text-destructive" />;
    }
    if (lowercase.includes("finance") || lowercase.includes("payment")) {
      return <BadgeAlert className="h-5 w-5 text-warning" />;
    }
    return <Megaphone className="h-5 w-5 text-primary" />;
  };

  const formatAnnouncementDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="pb-24 max-w-lg mx-auto px-4 pt-4 min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Official Notices</h1>
          <p className="text-xs text-muted-foreground">Platform updates, announcements & bulletins</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl bg-card">
          <Megaphone className="h-10 w-10 text-muted-foreground opacity-40 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No Active System Notices</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs px-4">
            Everything is operating normally. When any system updates or platform news are released, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6 flex-1">
          {/* Latest/Primary Notice Highlight */}
          <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/[0.05] via-card to-card p-5 shadow-lg">
            {/* Background design */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.03] rounded-full blur-xl -translate-y-6 translate-x-6" />
            
            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-2 w-10 h-10 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0 animate-pulse">
                {getDepartmentIcon(announcements[0].department)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider bg-primary/10 border-primary/20 text-primary">
                    {announcements[0].department}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatAnnouncementDate(announcements[0].broadcast_date)}
                  </span>
                </div>
                <h2 className="text-base font-bold text-foreground mt-1.5 leading-tight">
                  {announcements[0].label}
                </h2>
              </div>
            </div>

            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-t border-border pt-4">
              {announcements[0].message}
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span>{announcements[0].department.toLowerCase()}@1-cartforu.com</span>
              </div>
              <div className="flex items-center gap-1 font-semibold text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Bulletin</span>
              </div>
            </div>
          </div>

          {/* Past Bulletins List if there's more than one */}
          {announcements.length > 1 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                Recent Announcements
              </h3>
              <div className="space-y-2.5">
                {announcements.slice(1).map((ann) => (
                  <Card key={ann.id} className="border border-border/80 bg-card hover:bg-zinc-800/10 transition-colors">
                    <CardHeader className="p-4 flex flex-row items-start justify-between gap-4 space-y-0">
                      <div className="space-y-1 bg-transparent max-w-[85%]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase font-mono bg-muted px-2 py-0.5 rounded">
                            {ann.department}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(ann.broadcast_date).toLocaleDateString()}
                          </span>
                        </div>
                        <CardTitle className="text-sm font-bold text-foreground mt-1 cursor-pointer">
                          {ann.label}
                        </CardTitle>
                      </div>
                      <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                        {getDepartmentIcon(ann.department)}
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap">
                        {ann.message}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer support notice */}
      <div className="mt-8 text-center p-4 border border-border/40 rounded-xl bg-muted/20">
        <p className="text-xs font-medium text-foreground">Need Technical Support?</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          If you have questions about any announcement, please contact client services via live support.
        </p>
      </div>
    </div>
  );
}
