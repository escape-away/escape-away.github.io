import type { CSSProperties } from 'react';
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

/**
 * The company profile's three collections, each an arch that filters the stays below. A row of
 * three on wider screens. On phones the section holds still while scrolling slides the row
 * sideways (the `pin` scene in home.css and motion-loader.tsx); with reduced motion or without
 * JavaScript it is a plain swipe row.
 */
export async function Collections({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'collections' });
  const td = await getTranslations({ locale, namespace: 'destinations' });

  return (
    <section
      id="collections"
      data-pin
      className="section pin bg-cream"
      aria-labelledby="collections-title"
      style={{ '--pin-count': collections.length } as CSSProperties}
    >
      <div className="pin__sticky">
        <div className="wrap pin__head">
          <SectionTitle id="collections-title" light={t('titleLight')} bold={t('titleBold')} />
        </div>
        <div className="pin__viewport" data-pin-viewport>
          <ul className="tiles pin__track" data-pin-track>
            {collections.map((c) => {
              const count = units.filter((u) => u.collections.includes(c.key)).length;
              return (
                <li key={c.key} className="pin__card">
                  <SearchLink params={{ collection: c.key }} className="tile pin__link">
                    <span className="arch tile__photo pin__photo">
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
      </div>
    </section>
  );
}
