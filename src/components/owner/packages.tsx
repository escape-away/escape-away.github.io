import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import type { ReactNode } from 'react';

/** The two ways to work with Escape Away, from the company profile. On the homepage and on /owners. */
export async function Packages({ locale, children }: { locale: Locale; children?: ReactNode }) {
  const t = await getTranslations({ locale, namespace: 'ownerAct' });
  return (
    <div className="packages">
      <h3 className="t-subtitle">{t('packagesTitle')}</h3>
      <dl className="packages__list">
        <div>
          <dt>{t('full')}</dt>
          <dd className="text-fg-muted">{t('fullText')}</dd>
        </div>
        <div>
          <dt>{t('manageOnly')}</dt>
          <dd className="text-fg-muted">{t('manageOnlyText')}</dd>
        </div>
      </dl>
      {children}
    </div>
  );
}
