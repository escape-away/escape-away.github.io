import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { calendarFormat, fromISO } from '@/lib/dates';
import { formatNumber, intlLocale } from '@/lib/format';
import { companyReviews, ratingOf, reviewsOf, type Review } from '@/lib/reviews';

function Quote({ review, locale, by }: { review: Review; locale: Locale; by: string }) {
  const when = review.date
    ? calendarFormat(locale, { month: 'long', year: 'numeric' }).format(fromISO(review.date.length === 7 ? `${review.date}-01` : review.date))
    : null;
  return (
    <figure className="review">
      <blockquote lang={review.lang} dir={review.lang === 'ar' ? 'rtl' : 'ltr'} className="review__text">
        <p>&ldquo;{review.text}&rdquo;</p>
      </blockquote>
      <figcaption className="review__by">
        {by}
        {when ? <span className="tabular"> · {when}</span> : null}
        {review.rating ? <span className="tabular"> · {formatNumber(locale, review.rating)}/5</span> : null}
      </figcaption>
    </figure>
  );
}

/**
 * Reviews, only ever real ones (data/reviews.json). A home's own reviews show with their average once
 * there are any. Until then the page says so, and shows what guests have said about Escape Away,
 * labelled as that and never as a review of this home.
 */
export async function ListingReviews({ code, locale, titleId }: { code: string; locale: Locale; titleId: string }) {
  const t = await getTranslations({ locale, namespace: 'listing' });
  const tt = await getTranslations({ locale, namespace: 'trust' });
  const own = reviewsOf(code);

  if (own.length) {
    const rating = ratingOf(own);
    return (
      <>
        <h2 id={titleId} className="listing__h2">
          {t('reviewsTitle')}
        </h2>
        {rating ? (
          <p className="reviews__summary tabular">
            {t('ratingSummary', {
              value: new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating.value),
              count: rating.count,
              countText: formatNumber(locale, rating.count),
            })}
          </p>
        ) : null}
        <ul className="reviews">
          {own.map((r) => (
            <li key={r.id}>
              <Quote review={r} locale={locale} by={r.name[locale]} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  // A few of what guests say about Escape Away, never a wall of them.
  const company = companyReviews().slice(0, 4);
  return (
    <>
      <h2 id={titleId} className="listing__h2">
        {t('reviewsTitle')}
      </h2>
      <p className="reviews__none">{t('noReviewsYet')}</p>
      {company.length ? (
        <div className="reviews__company">
          <p className="reviews__company-title">{t('companyReviewsTitle')}</p>
          <ul className="reviews">
            {company.map((r) => (
              <li key={r.id}>
                <Quote review={r} locale={locale} by={tt('quoteBy', { name: r.name[locale] })} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
