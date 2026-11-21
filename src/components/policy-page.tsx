import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { site, whatsappLink } from '@/lib/site';
import { EmailText } from './email-text';

/**
 * A policy page waiting for Escape Away's own text. It says so plainly and offers the two ways
 * to ask meanwhile; no policy wording is invented here.
 */
export async function PolicyPage({ locale, kind }: { locale: Locale; kind: 'terms' | 'privacy' | 'cancellation' }) {
  const t = await getTranslations({ locale, namespace: 'legal' });
  const nav = await getTranslations({ locale, namespace: 'nav' });

  return (
    <section className="wrap section-y grid gap-6">
      <h1 className="t-title title-rule">{t(`${kind}.title`)}</h1>
      <p className="t-lead max-w-[var(--measure)]">{t('pending')}</p>
      <p className="flex flex-wrap gap-4">
        <a href={whatsappLink()} target="_blank" rel="noopener" className="btn btn--primary">
          {nav('whatsapp')}
        </a>
        <a href={`mailto:${site.email}`} dir="ltr" className="btn btn--secondary break-words">
          <EmailText email={site.email} />
        </a>
      </p>
    </section>
  );
}
