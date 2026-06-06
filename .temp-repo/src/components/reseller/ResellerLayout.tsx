import { useState, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Bell, Headset } from "lucide-react";
import { useReseller } from "@/lib/reseller-context-hooks";
import ResellerSidebar from "./ResellerSidebar";
import ResellerBottomNav from "./ResellerBottomNav";
import LogoIcon from "@/components/brand/LogoIcon";
import LogoWordmark from "@/components/brand/LogoWordmark";
import NotificationDialog from "@/components/messaging/NotificationDialog";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useUnreadSupport } from "@/hooks/use-support";
import { resellerPath, isResellerSubdomain, resellerPrefix } from "@/lib/subdomain";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";

const PUBLIC_PATHS_CANONICAL = ["/reseller/login", "/reseller/register"];
const PUBLIC_PATHS = (() => {
  const mapped = PUBLIC_PATHS_CANONICAL.map(p => resellerPath(p));
  return mapped;
})();

export default function ResellerLayout({ children }: { children: React.ReactNode }) {
  const { reseller, loading } = useReseller();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadNotifs = useUnreadCount();
  const unreadSupport = useUnreadSupport();

  const isPublic = PUBLIC_PATHS.includes(pathname);

  const handleSupportClick = () => {
    navigate(resellerPath("/reseller/messages"), { state: { tab: "support" } });
  };

  // Online status heartbeat
  useEffect(() => {
    if (!reseller?.id || isPublic) return;

    const setOnline = async (online: boolean) => {
      try {
        const q = query(collection(db, "reseller_chat_sessions"), where("reseller_id", "==", reseller.id));
        const snap = await getDocs(q);
        if (!snap.empty) {
          // Update ALL sessions for this reseller
          const promises = snap.docs.map(d => updateDoc(doc(db, "reseller_chat_sessions", d.id), {
            is_online: online,
            last_message_at: new Date().toISOString()
          }));
          await Promise.all(promises);
        } else if (online) {
          await addDoc(collection(db, "reseller_chat_sessions"), {
            reseller_id: reseller.id,
            reseller_name: `${reseller.firstName} ${reseller.lastName}`,
            is_online: true,
            last_message_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Error updating reseller online status:", err);
      }
    };

    setOnline(true);
    
    // Set offline on unmount
    return () => {
      setOnline(false);
    };
  }, [reseller?.id, reseller?.firstName, reseller?.lastName, isPublic]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!reseller && !isPublic) {
    return <Navigate to={resellerPath("/reseller/login")} replace />;
  }

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      <NotificationDialog open={showNotifications} onClose={() => setShowNotifications(false)} />
      <ResellerSidebar />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-end px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowNotifications(true)} className="relative p-2 rounded-full hover:bg-accent transition-colors group">
              <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground border-2 border-background">{unreadNotifs}</span>
              )}
            </button>
            <button onClick={handleSupportClick} className="relative p-2 rounded-full hover:bg-accent transition-colors group">
              <Headset className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
              {unreadSupport > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground border-2 border-background">{unreadSupport}</span>
              )}
            </button>
          </div>
        </header>

        {/* Mobile header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border md:hidden">
          <div className="flex items-center gap-2">
            <LogoIcon size={24} />
            <LogoWordmark size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNotifications(true)} className="relative p-1">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{unreadNotifs}</span>
              )}
            </button>
            <button onClick={handleSupportClick} className="relative p-1">
              <Headset className="h-5 w-5 text-muted-foreground" />
              {unreadSupport > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{unreadSupport}</span>
              )}
            </button>
          </div>
        </header>
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <ResellerBottomNav />
      </div>
    </div>
  );
}
