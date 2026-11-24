import raw from '@data/partners.json';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import type { Localized } from '@/lib/destinations';
import { SectionTitle } from '../section-title';

type Partner = { slug: string; name: Localized; logo: string; width: number; height: number };
const partners = (raw as { partners: Partner[] }).partners;

/**
 * Partners in success: the developers and communities whose homes Escape Away has prepared and run,
 * as one quiet row of their logos. Shown in one ink so no single brand shouts; each logo comes back
 * to its own colours on hover.
 */
export async function Partners({ locale }: { locale: Locale }) {
  if (!partners.length) return null;
  const t = await getTranslations({ locale, namespace: 'partners' });

  return (
    <section className="section partners" aria-labelledby="partners-title">
      <div className="wrap">
        <div className="partners__head">
          <SectionTitle id="partners-title" light={t('titleLight')} bold={t('titleBold')} />
          <p className="partners__lead">{t('lead')}</p>
        </div>
        <ul className="partners__list" aria-label={t('list')}>
          {partners.map((p) => (
            <li key={p.slug} className="partners__item">
              {/* eslint-disable-next-line @next/next/no-img-element -- small pre-sized logos, no resizing needed */}
              <img src={p.logo} alt={p.name[locale]} width={p.width} height={p.height} loading="lazy" decoding="async" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
