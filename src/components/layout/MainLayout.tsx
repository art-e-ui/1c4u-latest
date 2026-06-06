import { useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import { detectPortal } from '@/lib/subdomain';
import { SeasonalDecorations } from '@/components/home/SeasonalDecorations';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { pathname } = useLocation();
  const portal = detectPortal();

  // Admin & reseller portals have their own layouts
  const isPortal = portal !== 'customer' || pathname.startsWith('/admin') || pathname.startsWith('/reseller');

  if (isPortal) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <SeasonalDecorations />
      <Header />
      <main className="min-h-screen pb-16 md:pb-0">{children}</main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileNav />
    </>
  );
}
