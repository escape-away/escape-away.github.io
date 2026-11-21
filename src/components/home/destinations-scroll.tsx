import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { destinations } from '@/lib/destinations';
import { formatNumber } from '@/lib/format';
import { unitsIn } from '@/lib/units';
import { Photo } from '../photo';
import { SectionTitle } from '../section-title';

/**
 * Act 2 opens with the five places. On wider screens the section holds still (CSS sticky) while
 * scrolling moves the row sideways (GSAP scrubs the transform); on phones, with reduced motion, or
 * without JavaScript it is a plain swipe row.
 */
export async function DestinationsScroll({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'destinationsSection' });
  const td = await getTranslations({ locale, namespace: 'destinations' });

  return (
    <section
      id="destinations"
      data-dest
      className="dest bg-cream"
      aria-labelledby="dest-title"
      style={{ '--dest-count': destinations.length } as CSSProperties}
    >
      <div className="dest__sticky">
        <div className="wrap dest__head">
          <SectionTitle id="dest-title" light={t('titleLight')} bold={t('titleBold')} />
          <p className="t-lead text-fg-muted">{t('lead')}</p>
        </div>
        <div className="dest__viewport" data-dest-viewport>
          <ul className="dest__track" data-dest-track>
            {destinations.map((d) => {
              const count = unitsIn(d.slug).length;
              return (
                <li key={d.slug} className="dest__card">
                  <Link href={`/destinations/${d.slug}`} className="dest__link">
                    <span className="arch dest__photo">
                      <Photo slot={d.photo} locale={locale} sizes="(max-width: 768px) 110vw, 41vw" />
                    </span>
                    <span className="dest__name">{d.name[locale]}</span>
                    <span className="dest__count tabular">{td('count', { count, countText: formatNumber(locale, count) })}</span>
                    <span className="dest__intro">{d.intro[locale]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
