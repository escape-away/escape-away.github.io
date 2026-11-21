'use client';

import { useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';

/**
 * Links to the same page in the other language and remembers the choice for the root page. The
 * search in the address (dates, guests, filters) and the section come along, so switching language
 * mid-booking doesn't lose anything. The plain link still works without JavaScript.
 */
export function LanguageSwitch({ text, className = '' }: { text: string; className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const other = locale === 'en' ? 'ar' : 'en';

  return (
    <Link
      href={pathname}
      locale={other}
      lang={other}
      hrefLang={other}
      className={`lang-switch ${className}`.trim()}
      onClick={(e) => {
        try {
          localStorage.setItem('ea-locale', other);
        } catch {
          /* private mode: the choice simply isn't remembered */
        }
        // A new tab or window keeps the browser's own handling.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const { search, hash } = window.location;
        if (!search && !hash) return;
        e.preventDefault();
        router.push(`${pathname}${search}${hash}`, { locale: other });
      }}
    >
      {text}
    </Link>
  );
}
