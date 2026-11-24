import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { destinations, getDestination } from '@/lib/destinations';
import { formatDate, formatNumber } from '@/lib/format';
import { localePath, ogImage, pageMetadata } from '@/lib/seo';
import { site, whatsappLink } from '@/lib/site';
import { destinationStructuredData, jsonLd } from '@/lib/structured-data';
import { compoundName, unitsIn } from '@/lib/units';
import { DestinationMap } from '@/components/destination/destination-map';
import { explorerItems } from '@/components/explorer/explorer-items';
import { Photo } from '@/components/photo';
import { SectionTitle } from '@/components/section-title';
import { UnitCard } from '@/components/unit-card';

export const dynamicParams = false;

export function generateStaticParams() {
  return destinations.map((d) => ({ area: d.slug }));
}

type Props = { params: Promise<{ locale: Locale; area: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, area } = await params;
  const destination = getDestination(area);
  if (!destination) return {};
  const { guide } = destination;
  return pageMetadata({
    locale,
    path: `/destinations/${destination.slug}`,
    title: guide.title[locale],
    description: guide.description[locale],
    image: ogImage(destination.photo, locale),
  });
}

/**
 * A destination page: what the place is and who it suits, answered up top in words that stand on
 * their own; the facts at a glance; the area's stays on the map and as cards; what to know before
 * going and the questions people ask about this place. Each guide is written for its own place, in
 * each language, so no two of these pages read alike. Owners get one band at the end.
 */
export default async function DestinationPage({ params }: Props) {
  const { locale, area } = await params;
  setRequestLocale(locale);
  const destination = getDestination(area);
  if (!destination) notFound();

  const { guide } = destination;
  const t = await getTranslations({ locale, namespace: 'destinations' });
  const tListing = await getTranslations({ locale, namespace: 'listing' });
  const tOwners = await getTranslations({ locale, namespace: 'owners' });

  const list = unitsIn(destination.slug);
  const count = list.length;
  const items = await explorerItems(list, locale);
  const listedIn = [...new Set(list.map((u) => compoundName(u, locale)))];
  const others = destinations.filter((d) => d.slug !== destination.slug);
  const comma = locale === 'ar' ? '، ' : ', ';
  const [light, bold] = guide.heading[locale];

  const data = destinationStructuredData({
    destination,
    locale,
    title: `${guide.title[locale]} · ${site.name}`,
    stays: list,
  });

  return (
    <>
      <article className="area" aria-labelledby="area-title">
        <header className="wrap area-hero">
          <div className="area-hero__text">
            <nav aria-label={tListing('breadcrumb')} className="crumbs">
              <ol>
                <li>
                  <Link href="/" className="link-underline">
                    {site.name}
                  </Link>
                </li>
                <li aria-current="page">{destination.name[locale]}</li>
              </ol>
            </nav>
            <SectionTitle as="h1" id="area-title" light={light} bold={bold} />
            <p className="t-lead area-hero__answer">{guide.answer[locale]}</p>
            <p className="area-hero__meta tabular">
              {count > 0 ? (
                <a href="#stays" className="link-underline">
                  {t('count', { count, countText: formatNumber(locale, count) })}
                </a>
              ) : (
                <span>{t('count', { count, countText: formatNumber(locale, count) })}</span>
              )}
              <span>
                {t.rich('updated', {
                  when: formatDate(locale, guide.updated, { day: 'numeric', month: 'long', year: 'numeric' }),
                  date: (chunks) => <time dateTime={guide.updated}>{chunks}</time>,
                })}
              </span>
            </p>
          </div>
          <span className="arch area-hero__photo">
            <Photo slot={destination.photo} locale={locale} sizes="(max-width: 768px) 100vw, 60vw" eager />
          </span>
        </header>

        <section className="wrap area-glance" aria-labelledby="glance-title">
          <h2 id="glance-title" className="area-h2 title-rule">
            {t('glanceTitle')}
          </h2>
          <dl className="glance">
            {guide.glance.map((row) => (
              <div key={row.key}>
                <dt>{t(`glance.${row.key}`)}</dt>
                <dd>{row[locale]}</dd>
              </div>
            ))}
            {listedIn.length > 0 ? (
              <div>
                <dt>{t('glance.listed')}</dt>
                <dd>{listedIn.join(comma)}</dd>
              </div>
            ) : null}
          </dl>
          <p className="area-note">{t('timesNote')}</p>
        </section>

        <section id="stays" className="wrap area-stays" aria-labelledby="stays-title">
          <SectionTitle id="stays-title" light={t('staysLight')} bold={t('staysBold')} />
          {count > 0 ? (
            <>
              <DestinationMap
                items={items}
                center={[destination.center.lng, destination.center.lat]}
                zoom={destination.zoom}
              />
              <div className="area-cards" data-count={list.length}>
                {list.map((unit) => (
                  <UnitCard
                    key={unit.slug}
                    unit={unit}
                    locale={locale}
                    sizes="(max-width: 40rem) 100vw, (max-width: 64rem) 50vw, (max-width: 80rem) 30vw, 400px"
                  />
                ))}
                {/* Fewer stays than a row holds: the rest of the row says more are coming, and who to ask. */}
                {list.length < 3 ? (
                  <aside className="area-ask" aria-labelledby="area-ask-title">
                    <h3 id="area-ask-title" className="t-subtitle">
                      {t('askTitle', { area: destination.name[locale] })}
                    </h3>
                    <p className="text-fg-muted">{t('askText')}</p>
                    <a
                      href={whatsappLink(t('askWhatsapp', { area: destination.name[locale] }))}
                      target="_blank"
                      rel="noopener"
                      className="btn btn--secondary"
                    >
                      {t('askCta')}
                    </a>
                  </aside>
                ) : null}
              </div>
              <p className="area-stays__more">
                <a href={`${localePath(locale, '/')}?where=${destination.slug}#stays`} className="link-underline">
                  {t('explore')}
                </a>
              </p>
            </>
          ) : (
            <p className="area-stays__more">
              <a href={whatsappLink()} target="_blank" rel="noopener" className="link-underline">
                {t('empty')}
              </a>
            </p>
          )}
        </section>

        <div className="wrap area-guide">
          <section aria-labelledby="know-title">
            <SectionTitle id="know-title" light={t('knowLight')} bold={t('knowBold')} />
            <ul className="dots area-know">
              {guide.know[locale].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="questions-title">
            <SectionTitle id="questions-title" light={t('faqLight')} bold={t('faqBold')} />
            <dl className="area-faq">
              {guide.faq.map((item) => (
                <div key={item.q.en}>
                  <dt>{item.q[locale]}</dt>
                  <dd>{item.a[locale]}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <nav className="wrap area-more" aria-labelledby="more-title">
          <SectionTitle id="more-title" light={t('moreLight')} bold={t('moreBold')} />
          <ul className="area-more__list">
            {others.map((d) => {
              const n = unitsIn(d.slug).length;
              return (
                <li key={d.slug}>
                  <Link href={`/destinations/${d.slug}`} className="area-more__link">
                    <span className="arch area-more__photo">
                      <Photo slot={d.photo} locale={locale} sizes="(max-width: 48rem) 75vw, 34vw" />
                    </span>
                    <span className="area-more__name">{d.name[locale]}</span>
                    <span className="area-more__count tabular">{t('count', { count: n, countText: formatNumber(locale, n) })}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </article>

      <section className="ground-navy area-owners" aria-labelledby="owners-title">
        <div className="wrap area-owners__inner">
          <div className="area-owners__text">
            <h2 id="owners-title" className="t-subtitle">
              {guide.owners[locale]}
            </h2>
            <p className="t-lead">{t('ownersText')}</p>
          </div>
          <a href={`${localePath(locale, '/owners')}#list-your-unit`} className="btn btn--on-navy">
            {tOwners('ctaEstimate')}
          </a>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
    </>
  );
}
