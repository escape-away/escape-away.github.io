import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { companyReviews } from '@/lib/reviews';
import { SectionTitle } from '../section-title';

/**
 * Proof, told plainly: the company profile's three real figures in one sentence (never a stat strip),
 * its guest promises, the one guest quote on hand, and where else the homes are listed.
 */
export async function Trust({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'trust' });
  // The one real guest quote on hand, from the company profile (data/reviews.json).
  const quote = companyReviews()[0];

  return (
    <section className="section bg-sand trust" aria-labelledby="trust-title">
      <div className="wrap trust__grid">
        <div className="trust__main">
          <SectionTitle id="trust-title" light={t('titleLight')} bold={t('titleBold')} />
          <p className="trust__numbers">{t.rich('numbers', { b: (chunks) => <strong>{chunks}</strong> })}</p>
          <ul className="trust__promises">
            {(['promise1', 'promise2', 'promise3', 'promise4'] as const).map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
        {quote ? (
          <figure className="trust__quote">
            <blockquote lang={quote.lang} dir={quote.lang === 'ar' ? 'rtl' : 'ltr'}>
              <p>&ldquo;{quote.text}&rdquo;</p>
            </blockquote>
            <figcaption>{t('quoteBy', { name: quote.name[locale] })}</figcaption>
          </figure>
        ) : null}
        <div className="trust__listed">
          <p>{t('platforms')}</p>
          <p>{t('communities')}</p>
        </div>
      </div>
    </section>
  );
}
