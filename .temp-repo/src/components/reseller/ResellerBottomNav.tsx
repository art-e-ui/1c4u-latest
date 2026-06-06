import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, Package, MessageSquare, UserCog } from "lucide-react";
import { useTranslation } from "react-i18next";
import { resellerPath } from "@/lib/subdomain";

const items = [
  { icon: LayoutDashboard, labelKey: "reseller.dashboard", href: "/reseller/dashboard" },
  { icon: ShoppingBag, labelKey: "reseller.myShop", href: "/reseller/shop" },
  { icon: Package, labelKey: "reseller.orders", href: "/reseller/orders" },
  { icon: MessageSquare, labelKey: "reseller.messages", href: "/reseller/messages" },
  { icon: UserCog, labelKey: "reseller.profile", href: "/reseller/profile" },
].map(item => ({ ...item, href: resellerPath(item.href) }));

export default function ResellerBottomNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)] pt-1">
        {items.map(({ icon: Icon, labelKey, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              to={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
