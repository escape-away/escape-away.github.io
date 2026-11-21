import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { whereOptions } from '@/lib/search-options';
import { ArchArrival } from '../arch-arrival';
import { Photo } from '../photo';
import { SearchBar } from '../search/search-bar';

/** Act 1. What this is, where, and the working search, all in the first screen; the photo opens in the arch. */
export async function Hero({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home' });

  return (
    <section className="hero bg-cream" aria-labelledby="hero-title">
      <div className="wrap hero__grid">
        <div className="hero__text">
          <h1 id="hero-title" className="t-hero hero__title">
            {t('h1Light')} <strong>{t('h1Bold')}</strong>
          </h1>
          <p className="t-lead hero__lead">{t('lead')}</p>
          <SearchBar locale={locale} options={whereOptions()} />
        </div>
        <ArchArrival className="hero__arch">
          <Photo slot="hero-01" locale={locale} sizes="(max-width: 860px) 82vw, (max-width: 1440px) 61vw, 840px" eager />
        </ArchArrival>
      </div>
    </section>
  );
}
