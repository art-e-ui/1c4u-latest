import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingCart, Package, User } from 'lucide-react';
import { useCart } from '@/lib/cart-context-hooks';
import { useTranslation } from 'react-i18next';

const navItems = [
  { labelKey: 'nav.home', href: '/', icon: Home },
  { labelKey: 'nav.categories', href: '/categories', icon: LayoutGrid },
  { labelKey: 'nav.cart', href: '/cart', icon: ShoppingCart },
  { labelKey: 'nav.orders', href: '/orders', icon: Package },
  { labelKey: 'nav.account', href: '/account', icon: User },
];

const MobileNav = React.forwardRef<HTMLElement, object>(function MobileNav(_props, ref) {
  const { pathname } = useLocation();
  const { totalItems } = useCart();
  const { t } = useTranslation();

  return (
    <nav ref={ref} className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)] pt-1">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const isCart = item.labelKey === 'nav.cart';
          const Icon = item.icon;

          return (
            <Link
              key={item.labelKey}
              to={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {isCart && totalItems > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {totalItems}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

export default MobileNav;
