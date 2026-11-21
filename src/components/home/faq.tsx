import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { SectionTitle } from '../section-title';

const guests = [1, 2, 3, 4, 5] as const;
const owners = [6, 7] as const;

/**
 * Answers for guests and owners, all open (no accordion), each from the brief or the company profile.
 * The first says what Escape Away is in one paragraph that stands on its own, the same words the
 * company's structured data uses.
 */
export async function Faq({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'faq' });
  const tMeta = await getTranslations({ locale, namespace: 'meta' });

  return (
    <section className="turn ground-navy section faq" aria-labelledby="faq-title">
      <div className="wrap">
        <SectionTitle id="faq-title" light={t('titleLight')} bold={t('titleBold')} />
        <div className="faq__cols">
          <div>
            <h3 className="faq__group">{t('guests')}</h3>
            <dl className="faq__list">
              <div>
                <dt>{t('q0')}</dt>
                <dd className="text-fg-muted">{tMeta('about')}</dd>
              </div>
              {guests.map((n) => (
                <div key={n}>
                  <dt>{t(`q${n}`)}</dt>
                  <dd className="text-fg-muted">{t(`a${n}`)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="faq__group">{t('owners')}</h3>
            <dl className="faq__list">
              {owners.map((n) => (
                <div key={n}>
                  <dt>{t(`q${n}`)}</dt>
                  <dd className="text-fg-muted">{t(`a${n}`)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
