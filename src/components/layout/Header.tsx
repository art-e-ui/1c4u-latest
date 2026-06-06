import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Menu, X, ShoppingCart, User, LogOut, Bell, Headset, Globe } from 'lucide-react';
import { useCart } from '@/lib/cart-context-hooks';
import { useCustomerAuth } from '@/lib/customer-auth-context-hooks';
import NotificationDialog from '@/components/messaging/NotificationDialog';
import { useUnreadCount } from '@/hooks/use-notifications';
import SupportChatDialog from '@/components/messaging/SupportChatDialog';
import { useUnreadSupport } from '@/hooks/use-support';
import LogoWordmark from '@/components/brand/LogoWordmark';
import TaglineSVG from '@/components/brand/TaglineSVG';
import { ShopifyCartDrawer } from '@/components/shopify/ShopifyCartDrawer';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { resellerPath } from '@/lib/subdomain';
import { useReseller } from '@/lib/reseller-context-hooks';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export default function Header() {
  const { t, i18n } = useTranslation();
  const { totalItems } = useCart();
  const { user, isAuthenticated, logout } = useCustomerAuth();
  const { getResellerBySlug } = useReseller();
  const location = useLocation();
  
  const shopSlug = location.pathname.startsWith('/store/') ? location.pathname.split('/')[2] : null;
  const currentShop = shopSlug ? getResellerBySlug(shopSlug) : null;
  const resellerId = currentShop?.id;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'Products' | 'Shops'>('Products');
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [searchParams] = useSearchParams();
  const unreadNotifs = useUnreadCount();
  const unreadSupport = useUnreadSupport();

  const referralCode = searchParams.get('ref') || '';
  const navigate = useNavigate();
  const { fetchResellerByName } = useReseller();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    if (searchType === 'Products') {
      navigate(`/categories?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      setIsSearching(true);
      try {
        // Search for exact shop name
        const shop = await fetchResellerByName(searchQuery.trim());
        if (shop && shop.shopSlug) {
          navigate(`/store/${shop.shopSlug}`);
        } else {
          // No exact match found
          toast.error(t('common.shopNotFound'), {
            description: t('common.shopNotFoundDesc', { name: searchQuery.trim() })
          });
        }
      } catch (error) {
        console.error("Search error:", error);
        toast.error(t('common.error'), { description: t('common.searchFailed') });
      } finally {
        setIsSearching(false);
      }
    }
  };

  const navLinks = [
    { label: t('nav.home'), href: '/' },
    { label: t('nav.categories'), href: '/categories' },
    { label: t('nav.account'), href: '/account' }
  ];

  const categories = [
    { label: t('common.electronics'), slug: 'electronics' },
    { label: t('common.fashion'), slug: 'fashion' },
    { label: t('common.home-garden'), slug: 'home-garden' },
    { label: t('common.kids-toys'), slug: 'kids-toys' },
    { label: t('common.sports'), slug: 'sports' }
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setShowLangDropdown(false);
  };

  const searchTypeLabels = {
    Products: t('common.products'),
    Shops: t('common.shops')
  };

  return (
    <>
    <NotificationDialog open={showNotifications} onClose={() => setShowNotifications(false)} />
    <SupportChatDialog 
      open={showSupport} 
      onClose={() => setShowSupport(false)} 
      userName={user?.name} 
      resellerId={resellerId}
    />
    <header className="w-full">
      {/* Main header bar */}
      <div className="bg-background py-2.5 shadow-sm">
        <div className="flex max-w-full items-center justify-between gap-3 px-3 md:px-8 md:gap-px">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-1 md:hidden flex-shrink-0">
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/" className="flex items-center min-w-0 pl-1">
              <LogoWordmark size="md" showTagline className="sm:hidden" />
              <LogoWordmark size="lg" showTagline className="hidden sm:block" />
            </Link>
          </div>

          {/* Mobile icons */}
          <div className="flex items-center gap-2 md:hidden">
            <Link to="/categories?q=" className="p-1">
              <Search className="h-5 w-5 text-muted-foreground" />
            </Link>
            <button onClick={() => setShowNotifications(true)} className="relative p-1">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{unreadNotifs}</span>
              )}
            </button>
            <button onClick={() => setShowSupport(true)} className="relative p-1">
              <Headset className="h-5 w-5 text-muted-foreground" />
              {unreadSupport > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{unreadSupport}</span>
              )}
            </button>
            <Link to="/cart" className="relative p-1">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{totalItems}</span>
              )}
            </Link>
          </div>

          {/* Center: search (desktop) */}
          <div className="hidden flex-1 items-center gap-0 md:mx-8 md:flex">
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex min-w-[110px] items-center justify-between gap-1 rounded-l-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
                
                {searchTypeLabels[searchType]}
                <ChevronDown className={`h-3 w-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showDropdown &&
              <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-md border border-border bg-background shadow-lg">
                  {(['Products', 'Shops'] as const).map((t) =>
                <button
                  key={t}
                  onClick={() => {setSearchType(t);setShowDropdown(false);}}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-accent">
                  
                      {searchTypeLabels[t]}
                    </button>
                )}
                </div>
              }
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchType === 'Products' ? t('nav.search') : t('common.searchShops')}
              className="h-10 w-full border border-border bg-background px-4 text-sm placeholder:text-muted-foreground focus:outline-none" />
            
            <button 
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="flex h-10 items-center justify-center rounded-r-md bg-primary px-4 text-primary-foreground hover:bg-primary/90 disabled:opacity-70">
              {isSearching ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Right: auth + icons + cart (desktop) */}
          <div className="hidden items-center gap-4 md:flex">
            {/* Language Switcher */}
            <div className="relative">
              <button onClick={() => setShowLangDropdown(!showLangDropdown)} className="p-1 text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <Globe className="h-5 w-5" />
                <span className="text-xs font-bold uppercase">{i18n.language}</span>
              </button>
              {showLangDropdown && (
                <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-md border border-border bg-background shadow-lg">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => changeLanguage(lang.value)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isAuthenticated ? (
              <>
                <Link to="/account" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  <User className="h-4 w-4" />
                  {user?.name?.split(' ')[0]}
                </Link>
                <button onClick={logout} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link to="/cart/login" className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <User className="h-4 w-4" />
                {t('nav.login')}
              </Link>
            )}
            <button onClick={() => setShowNotifications(true)} className="relative p-1 hover:text-primary transition-colors">
              <Bell className="h-5 w-5" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{unreadNotifs}</span>
              )}
            </button>
            <button onClick={() => setShowSupport(true)} className="relative p-1 hover:text-primary transition-colors">
              <Headset className="h-5 w-5" />
              {unreadSupport > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{unreadSupport}</span>
              )}
            </button>
            <Link to="/cart" className="relative p-1 hover:text-primary transition-colors">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{totalItems}</span>
              )}
            </Link>
            <ShopifyCartDrawer />
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="bg-background px-3 pb-2.5 md:hidden">
        <form onSubmit={handleSearch} className="flex items-center gap-0 rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setSearchType(searchType === 'Products' ? 'Shops' : 'Products')}
            className="flex h-9 items-center justify-center bg-muted px-3 text-[10px] font-bold uppercase text-muted-foreground border-r border-border min-w-[70px]"
          >
            {searchType === 'Products' ? t('common.products') : t('common.shops')}
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchType === 'Products' ? t('nav.search') : t('common.searchShops')}
            className="h-9 flex-1 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none" />
          
          <button 
            type="submit" 
            disabled={isSearching}
            className="flex h-9 items-center justify-center bg-primary px-3 text-primary-foreground disabled:opacity-70">
            {isSearching ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>

      {/* Desktop nav bar */}
      <div className="hidden border-y border-border bg-background md:block">
        <div className="flex max-w-full items-center px-4 md:px-8">
          <div className="relative">
            <button
              onClick={() => setShowAllCats(!showAllCats)}
              className="flex w-56 items-center justify-between bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">
              
              <div className="flex items-center gap-2">
                <Menu className="h-4 w-4" />
                {t('common.all')} {t('nav.categories')}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAllCats ? 'rotate-180' : ''}`} />
            </button>
            {showAllCats &&
            <div className="absolute left-0 top-full z-50 w-56 border border-border bg-background shadow-lg">
                {categories.map((cat) =>
              <Link
                key={cat.slug}
                to={`/categories/${cat.slug}`}
                className="block px-4 py-2.5 text-sm font-medium hover:bg-accent"
                onClick={() => setShowAllCats(false)}>
                
                    {cat.label}
                  </Link>
              )}
              </div>
            }
          </div>
          <nav className="ml-8 flex flex-1 items-center gap-8 text-sm font-bold text-muted-foreground">
            {navLinks.map((item) =>
            <Link key={item.label} to={item.href} className="hover:text-primary transition-colors">
                {item.label}
              </Link>
            )}
            <Link 
              to={resellerPath(`/reseller/register${referralCode ? `?ref=${referralCode}` : ''}`)}
              className="ml-auto rounded-md bg-accent px-3 py-1.5 text-sm font-bold text-brand-green hover:bg-accent/80 transition-colors"
            >
              {t('common.becomeReseller')}
            </Link>
          </nav>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {showMobileMenu &&
      <div className="fixed inset-0 top-[108px] z-40 overflow-y-auto bg-background md:hidden">
          <div className="flex flex-col p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('nav.categories')}</h3>
            {categories.map((cat) =>
          <Link
            key={cat.slug}
            to={`/categories/${cat.slug}`}
            className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            onClick={() => setShowMobileMenu(false)}>
            
                {cat.label}
              </Link>
          )}
            <div className="mt-4 border-t border-border pt-4">
              {navLinks.map((item) =>
            <Link
              key={item.label}
              to={item.href}
              className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              onClick={() => setShowMobileMenu(false)}>
              
                  {item.label}
                </Link>
            )}
              {isAuthenticated ? (
                <button
                  onClick={() => { logout(); setShowMobileMenu(false); }}
                  className="block w-full text-left rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-accent transition-colors"
                >
                  {t('nav.logout')}
                </button>
              ) : (
                <Link
                  to="/cart/login"
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  {t('nav.login')} / {t('nav.register')}
                </Link>
              )}
              <Link
                to={resellerPath(`/reseller/register${referralCode ? `?ref=${referralCode}` : ''}`)}
                onClick={() => setShowMobileMenu(false)}
                className="block w-full text-left rounded-md px-3 py-2.5 text-sm font-bold text-accent-foreground bg-accent hover:bg-accent/80 transition-colors mt-2"
              >
                {t('common.becomeReseller')}
              </Link>
            </div>
          </div>
        </div>
      }
    </header>
    </>);

}
