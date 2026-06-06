import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, RotateCcw, Settings, ShieldAlert, Mail, MapPin } from 'lucide-react';
import LogoWordmark from '@/components/brand/LogoWordmark';
import LogoFull from '@/components/brand/LogoFull';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { resellerPath } from '@/lib/subdomain';

interface ContentLink {
  label: string;
  url: string;
}

export default function Footer() {
  const { t } = useTranslation();
  const [contentLinks, setContentLinks] = useState<ContentLink[]>([]);
  const [searchParams] = useSearchParams();

  const referralCode = searchParams.get('ref') || '';

  const isDev = typeof window !== 'undefined' && (
    window.location.hostname.includes('ais-dev-') || 
    window.location.hostname.includes('ais-pre-') || 
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  const accountLinks = [
    { label: t('nav.home'), href: '/' },
    { label: 'About Us', href: '/about' },
    { label: t('nav.categories'), href: '/categories' },
    { label: 'Contact Us', href: '/contact' },
    ...(isDev ? [
      { label: 'Admin Portal', href: '/admin' },
      { label: 'Reseller Portal', href: '/reseller' }
    ] : [])
  ];

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(
          collection(db, 'system_settings'),
          where('category', '==', 'Content'),
          orderBy('created_at', 'asc')
        );
        const snapshot = await getDocs(q);
        const links = snapshot.docs.map(doc => ({
          label: doc.data().label,
          url: doc.data().value
        }));
        setContentLinks(links);
      } catch (error) {
        console.error("Error fetching footer links:", error);
      }
    };
    fetch();
  }, []);

  // Pick first 4 for the icon strip
  const iconMap = [FileText, RotateCcw, Settings, ShieldAlert];
  const policyIcons = contentLinks.slice(0, 4);

  return (
    <footer className="pb-20 md:pb-0">
      {/* Policy icons */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
          {policyIcons.map((item, i) => {
            const Icon = iconMap[i] || FileText;
            return (
              <a
                key={item.label}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 text-center border-r border-border last:border-0"
              >
                <Icon className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </a>
            );
          })}
        </div>
      </section>

      {/* Main dark footer */}
      <section style={{ backgroundColor: 'hsl(var(--footer-bg))' }}>
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            {/* Brand + newsletter */}
            <div className="md:col-span-1">
              <div className="mb-6">
                <Link to="/" className="inline-block py-1">
                  <LogoFull size="md" align="start" />
                </Link>
              </div>
              <p className="mb-6 text-sm leading-relaxed" style={{ color: 'hsl(var(--footer-text))' }}>
                {t('common.straightToDoor')}
              </p>
              <form className="mb-6 flex gap-0">
                <input
                  type="email"
                  placeholder={t('auth.email')}
                  className="h-10 flex-1 rounded-l-md bg-white/10 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
                <button
                  type="button"
                  className="rounded-r-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                >
                  {t('common.submit')}
                </button>
              </form>
              <div className="flex flex-col gap-3">
                <Link to="#" className="flex items-center gap-3 rounded-md bg-white/5 px-4 py-2 border border-white/10 hover:bg-white/10 transition-colors">
                  <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="#4285F4"/>
                    <path d="M17.556 8.235l-3.764 3.764 3.764 3.765 4.244-2.39a1 1 0 000-1.748l-4.244-2.39z" fill="#FBBC04"/>
                    <path d="M3.609 1.814L13.792 12l3.764-3.765L5.99.447a1.003 1.003 0 00-2.381 1.367z" fill="#34A853"/>
                    <path d="M13.792 12L3.61 22.186A1.003 1.003 0 005.99 23.553l11.566-7.788L13.792 12z" fill="#EA4335"/>
                  </svg>
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] uppercase" style={{ color: 'hsl(var(--footer-text))' }}>{t('footer.getItOn')}</span>
                    <span className="text-sm font-bold text-white">Google Play</span>
                  </div>
                </Link>
                <Link to="#" className="flex items-center gap-3 rounded-md bg-white/5 px-4 py-2 border border-white/10 hover:bg-white/10 transition-colors">
                  <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="white"/>
                  </svg>
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] uppercase" style={{ color: 'hsl(var(--footer-text))' }}>{t('footer.downloadOnThe')}</span>
                    <span className="text-sm font-bold text-white">App Store</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* My Account */}
            <div>
              <h4 className="mb-6 text-sm font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--footer-heading))' }}>{t('nav.account')}</h4>
              <ul className="space-y-3">
                {accountLinks.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm hover:text-white transition-colors" style={{ color: 'hsl(var(--footer-text))' }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="mb-6 text-sm font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--footer-heading))' }}>{t('footer.contactUs')}</h4>
              <div className="space-y-4 text-sm" style={{ color: 'hsl(var(--footer-text))' }}>
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-xs uppercase" style={{ color: 'hsl(var(--footer-text))' }}>{t('footer.address')}:</p>
                    <p>30 Cecil Street #21-05 Singapore 048716</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Mail className="h-5 w-5 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-xs uppercase" style={{ color: 'hsl(var(--footer-text))' }}>{t('footer.email')}:</p>
                    <p>support@1-cartforu.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links — dynamically from DB */}
            <div>
              <h4 className="mb-6 text-sm font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--footer-heading))' }}>{t('footer.quickLinks')}</h4>
              <ul className="space-y-3">
                {contentLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:text-white transition-colors"
                      style={{ color: 'hsl(var(--footer-text))' }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--footer-heading))' }}>{t('reseller.partnership')}</h4>
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: 'hsl(var(--footer-text))' }}>
                    {t('common.becomeReseller')}{' '}
                    <Link 
                      to={resellerPath(`/reseller/register${referralCode ? `?ref=${referralCode}` : ''}`)}
                      className="font-bold text-secondary hover:underline"
                    >
                      {t('common.learnMore')}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 border-t border-white/10 pt-8">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <p className="text-xs" style={{ color: 'hsl(var(--footer-text))' }}>
                {t('footer.copyright')} {t('footer.allRightsReserved')}.
              </p>
              <p className="text-xs" style={{ color: 'hsl(var(--footer-text))' }}>
                {t('footer.agreeToTerms')}{' '}
                <Link to="/terms" className="hover:underline">{t('footer.termsOfService')}</Link>
                {' '}and{' '}
                <Link to="/privacy" className="hover:underline">{t('footer.privacyPolicy')}</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
}
