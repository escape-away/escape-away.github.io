import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { amenities } from '@/lib/amenities';
import { getDestination } from '@/lib/destinations';
import type { ExplorerPhoto } from '@/lib/explorer';
import { formatNumber } from '@/lib/format';
import { imageSlot } from '@/lib/images';
import { reviewsOf } from '@/lib/reviews';
import { pageMetadata, titleText } from '@/lib/seo';
import { site } from '@/lib/site';
import { jsonLd, listingStructuredData } from '@/lib/structured-data';
import { compoundName, getUnit, units, type Unit } from '@/lib/units';
import { AreaMap } from '@/components/listing/area-map';
import { Gallery } from '@/components/listing/gallery';
import { ListingReviews } from '@/components/listing/listing-reviews';
import { MoreStays } from '@/components/listing/more-stays';
import { RequestPanel } from '@/components/listing/request-panel';
import { SaveButton } from '@/components/save-button';
import { SectionTitle } from '@/components/section-title';
import { UnitCard, unitFacts } from '@/components/unit-card';

export const dynamicParams = false;

export function generateStaticParams() {
  return units.map((u) => ({ unit: u.slug }));
}

type Props = { params: Promise<{ locale: Locale; unit: string }> };

function photosOf(unit: Unit, locale: Locale): ExplorerPhoto[] {
  return unit.photos.flatMap((slot) => {
    const image = imageSlot(slot);
    return image ? [{ slot, alt: image.alt[locale], width: image.width, height: image.height, color: image.color }] : [];
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, unit: slug } = await params;
  const unit = getUnit(slug);
  if (!unit) return {};
  const lead = photosOf(unit, locale)[0];
  return pageMetadata({
    locale,
    path: `/stays/${unit.slug}`,
    title: titleText(unit.name[locale]),
    description: unit.description[locale],
    image: lead
      ? { url: `${site.url}/img/${lead.slot}/1440.webp`, width: 1440, height: Math.round((lead.height * 1440) / lead.width), alt: lead.alt }
      : undefined,
  });
}

/**
 * A listing page. Photographs lead; the facts, the home's own words, what is there, where it is (an
 * area, never an address), what to know before booking and real reviews follow. Request to book sits
 * beside it all from laptops up and in a bar along the bottom on phones.
 */
export default async function UnitPage({ params }: Props) {
  const { locale, unit: slug } = await params;
  setRequestLocale(locale);
  const unit = getUnit(slug);
  if (!unit) notFound();

  const t = await getTranslations({ locale, namespace: 'listing' });
  const tStays = await getTranslations({ locale, namespace: 'stays' });
  const tTrust = await getTranslations({ locale, namespace: 'trust' });
  const destination = getDestination(unit.destination)!;
  const { price } = await unitFacts(unit, locale);
  const compound = compoundName(unit, locale);
  const photos = photosOf(unit, locale);
  const n = (v: number) => formatNumber(locale, v);
  const { lat, lng } = unit.pinApprox;

  const facts = [
    t('guests', { count: unit.guests, countText: n(unit.guests) }),
    t('bedrooms', { count: unit.bedrooms, countText: n(unit.bedrooms) }),
    t('beds', { count: unit.beds, countText: n(unit.beds) }),
    t('baths', { count: unit.baths, countText: n(unit.baths) }),
  ];

  // More stays: the same destination first, then the rest. The page shows three that sleep the party.
  const others = units
    .filter((u) => u.slug !== unit.slug)
    .sort((a, b) => Number(b.destination === unit.destination) - Number(a.destination === unit.destination));

  const data = listingStructuredData({
    unit,
    locale,
    destination: destination.name[locale],
    compound,
    photoSlots: photos.map((p) => p.slot),
    reviews: reviewsOf(unit.code),
  });

  return (
    <>
      <article className="listing wrap" aria-labelledby="listing-title">
        <header className="listing__head">
          <nav aria-label={t('breadcrumb')} className="crumbs">
            <ol>
              <li>
                <Link href="/" className="link-underline">
                  {site.name}
                </Link>
              </li>
              <li>
                <Link href={`/destinations/${unit.destination}`} className="link-underline">
                  {destination.name[locale]}
                </Link>
              </li>
              <li aria-current="page">{unit.name[locale]}</li>
            </ol>
          </nav>
          <h1 id="listing-title" className="listing__title">
            {unit.name[locale]}
          </h1>
          <div className="listing__where">
            <span>
              {compound} · {destination.name[locale]}
            </span>
            {unit.sample ? <span className="tag">{tStays('sample')}</span> : null}
            <SaveButton slug={unit.slug} name={unit.name[locale]} variant="page" />
          </div>
        </header>

        <Gallery photos={photos} name={unit.name[locale]} />

        <div className="listing__body">
          <div className="listing__main">
            <div className="listing__intro">
              <ul className="listing__facts tabular">
                {facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
              {unit.sample ? (
                <p className="listing__sample">
                  <strong>{tStays('sample')}.</strong> {tStays('sampleNote')}
                </p>
              ) : null}
              <p className="listing__about">{unit.description[locale]}</p>
            </div>

            <section className="listing__section" aria-labelledby="amenities-title">
              <h2 id="amenities-title" className="listing__h2">
                {tStays('amenities')}
              </h2>
              <ul className="dots dots--two">
                {unit.amenities.map((a) => (
                  <li key={a}>{amenities[a][locale]}</li>
                ))}
              </ul>
            </section>

            <section className="listing__section" aria-labelledby="includes-title">
              <h2 id="includes-title" className="listing__h2">
                {t('includesTitle')}
              </h2>
              <ul className="dots dots--two">
                {(['promise1', 'promise2', 'promise3', 'promise4'] as const).map((key) => (
                  <li key={key}>{tTrust(key)}</li>
                ))}
              </ul>
            </section>

            <section className="listing__section" aria-labelledby="where-title">
              <h2 id="where-title" className="listing__h2">
                {t('whereTitle')}
              </h2>
              <p className="listing__text">{t('whereText', { area: `${compound}, ${destination.name[locale]}` })}</p>
              {lat != null && lng != null ? <AreaMap center={[lng, lat]} /> : null}
            </section>

            <section className="listing__section" aria-labelledby="know-title">
              <h2 id="know-title" className="listing__h2">
                {t('knowTitle')}
              </h2>
              <ul className="dots">
                <li>{t('know1')}</li>
                <li>{t('know2')}</li>
                <li>{t('know3')}</li>
                <li>
                  {t.rich('know4', {
                    link: (chunks) => (
                      <Link href="/cancellation" className="link-inline">
                        {chunks}
                      </Link>
                    ),
                  })}
                </li>
              </ul>
            </section>

            <section className="listing__section" aria-labelledby="reviews-title">
              <ListingReviews code={unit.code} locale={locale} titleId="reviews-title" />
            </section>
          </div>

          <aside className="listing__aside" aria-label={t('requestLabel')}>
            <RequestPanel code={unit.code} name={unit.name[locale]} price={price} capacity={unit.guests} />
          </aside>
        </div>
      </article>

      {others.length ? (
        <MoreStays
          title={<SectionTitle id="more-title" light={t('moreLight')} bold={t('moreBold')} />}
          cards={others.map((u) => ({
            slug: u.slug,
            guests: u.guests,
            card: <UnitCard unit={u} locale={locale} sizes="(max-width: 40rem) 100vw, (max-width: 64rem) 50vw, 400px" />,
          }))}
        />
      ) : null}

      {data ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} /> : null}
    </>
  );
}
