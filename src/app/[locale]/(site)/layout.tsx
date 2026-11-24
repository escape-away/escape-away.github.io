import type { ReactNode } from 'react';
import type { Locale } from '@/i18n/routing';
import { SiteFooter } from '@/components/site-footer';
import { MotionLoader } from '@/components/motion-loader';
import { SiteHeader } from '@/components/site-header';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

/** The guest website's frame: header, the page, footer. The system's screens don't carry it. */
export default async function SiteLayout({ children, params }: Props) {
  const { locale } = (await params) as { locale: Locale };

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter locale={locale} />
      <MotionLoader />
    </>
  );
}
