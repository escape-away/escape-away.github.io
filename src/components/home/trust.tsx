import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { formatNumber, intlLocale } from '@/lib/format';
import { companyReviews } from '@/lib/reviews';
import { site } from '@/lib/site';
import { SectionTitle } from '../section-title';

/**
 * Proof, told plainly: the company profile's three real figures in one sentence (never a stat strip),
 * its guest promises, one short quote from a guest (in the page's language when a guest wrote in it), the
 * Airbnb rating with a link to read every review there, and where else the homes are listed.
 */
export async function Trust({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'trust' });
  const company = companyReviews();
  // The quote is set large, so it is a short one: the first in the page's language that fits.
  const fits = (r: (typeof company)[number]) => r.text.length <= 160;
  const quote = company.find((r) => r.lang === locale && fits(r)) ?? company.find(fits) ?? company[0];
  const { airbnb } = site;

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
        <div className="trust__side">
          {quote ? (
            <figure className="trust__quote">
              <blockquote lang={quote.lang} dir={quote.lang === 'ar' ? 'rtl' : 'ltr'}>
                <p>&ldquo;{quote.text}&rdquo;</p>
              </blockquote>
              <figcaption>{t('quoteBy', { name: quote.name[locale] })}</figcaption>
            </figure>
          ) : null}
          <p className="trust__rating">
            {t.rich('airbnb', {
              value: new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(airbnb.rating),
              count: airbnb.reviews,
              countText: formatNumber(locale, airbnb.reviews),
              b: (chunks) => <strong>{chunks}</strong>,
            })}{' '}
            <a href={airbnb.profileUrl} target="_blank" rel="noopener" className="trust__rating-link">
              {t('airbnbLink')}
            </a>
          </p>
        </div>
        <div className="trust__listed">
          <p>{t('platforms')}</p>
        </div>
      </div>
    </section>
  );
}
