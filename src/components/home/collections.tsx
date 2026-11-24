import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import { units } from '@/lib/units';
import { Photo } from '../photo';
import { SearchLink } from '../search-link';
import { SectionTitle } from '../section-title';

const collections = [
  { key: 'city', photo: 'coll-city' },
  { key: 'seaside', photo: 'coll-seaside' },
  { key: 'family', photo: 'coll-family' },
] as const;

/** The company profile's three collections, each an arch that filters the stays below. */
export async function Collections({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'collections' });
  const td = await getTranslations({ locale, namespace: 'destinations' });

  return (
    <section id="collections" className="section bg-cream" aria-labelledby="collections-title">
      <div className="wrap">
        <SectionTitle id="collections-title" light={t('titleLight')} bold={t('titleBold')} />
        <ul className="tiles">
          {collections.map((c) => {
            const count = units.filter((u) => u.collections.includes(c.key)).length;
            return (
              <li key={c.key}>
                <SearchLink params={{ collection: c.key }} className="tile">
                  <span className="arch tile__photo">
                    <Photo slot={c.photo} locale={locale} sizes="(max-width: 768px) 78vw, 30vw" />
                  </span>
                  <span className="tile__name">{t(c.key)}</span>
                  <span className="tile__line">{t(`${c.key}Line`)}</span>
                  <span className="tile__count tabular">{td('count', { count, countText: formatNumber(locale, count) })}</span>
                </SearchLink>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
