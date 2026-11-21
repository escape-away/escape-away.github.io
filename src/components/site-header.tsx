import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { whatsappLink } from '@/lib/site';
import { EaMark } from './ea-mark';
import { LanguageSwitch } from './language-switch';
import { MobileMenu } from './mobile-menu';

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'nav' });
  const items = [
    { key: 'stays', href: { pathname: '/', hash: 'stays' }, label: t('stays') },
    { key: 'destinations', href: { pathname: '/', hash: 'destinations' }, label: t('destinations') },
    { key: 'owners', href: '/owners', label: t('owners') },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-sand bg-cream">
      <a href="#main" className="skip-link">
        {t('skip')}
      </a>
      <div className="wrap flex min-h-16 items-center gap-5">
        <Link href="/" aria-label={t('home')} className="inline-flex min-h-11 items-center text-espresso">
          <EaMark />
        </Link>
        <div id="header-search" className="header-search" />

        <nav aria-label={t('primary')} className="hidden md:block">
          <ul className="flex items-center gap-7 text-[length:var(--text-small)]">
            {items.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="link-underline inline-flex min-h-11 items-center">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <LanguageSwitch
          text={t('switchTo')}
          className="link-underline inline-flex min-h-11 items-center text-[length:var(--text-small)]"
        />

        {/* Outlined, so each page's own main action stays the one filled button on screen. */}
        <a href={whatsappLink()} target="_blank" rel="noopener" className="btn btn--secondary hidden sm:inline-flex">
          {t('whatsapp')}
        </a>

        <div className="md:hidden">
          <MobileMenu
            items={items}
            whatsapp={whatsappLink()}
            strings={{
              menu: t('menu'),
              close: t('closeMenu'),
              home: t('home'),
              primary: t('primary'),
              whatsapp: t('whatsapp'),
              switchTo: t('switchTo'),
            }}
          />
        </div>
      </div>
    </header>
  );
}
