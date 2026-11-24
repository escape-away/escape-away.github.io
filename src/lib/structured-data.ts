import type { Locale } from '@/i18n/routing';
import { routing } from '@/i18n/routing';
import { amenities } from './amenities';
import { destinations, type Destination } from './destinations';
import { formatMoney, usd } from './pricing';
import { ratingOf, type Review } from './reviews';
import { localePath } from './seo';
import { site } from './site';
import type { Unit } from './units';

const absolute = (locale: Locale, path: string) => `${site.url}${localePath(locale, path)}`;

const ORG_ID = `${site.url}/#organization`;
const OFFICE_ID = `${site.url}/#office`;
const WEBSITE_ID = `${site.url}/#website`;
const LOGO = `${site.url}/brand/ea-mark.png`;

/** How other nodes point to the company; the full node is on the home and contact pages. */
const organizationRef = { '@type': 'Organization', '@id': ORG_ID, name: site.legalName, url: `${site.url}/` };

/** A published listing: real units always, sample ones only while the site is a noindex demo. */
const publishable = (unit: Unit) => !unit.sample || site.noindex;

function postalAddress(locale: Locale) {
  const a = site.office.address[locale];
  return {
    '@type': 'PostalAddress',
    streetAddress: a.street,
    addressLocality: a.locality,
    addressRegion: a.region,
    addressCountry: site.office.country,
  };
}

/**
 * The company and its Katameya office, as the company profile and the Google Business Profile give
 * them: the same name, address and phone as the footer and the contact page. Support runs around
 * the clock (the profile's 24/7); the office's own hours and map pin go in only once Escape Away
 * confirms them, so nothing here is guessed.
 */
export function organizationNodes(locale: Locale, about: string) {
  const areaServed = destinations.map((d) => ({
    '@type': 'Place',
    name: d.name[locale],
    url: absolute(locale, `/destinations/${d.slug}`),
  }));
  const languages = ['ar', 'en'];

  const organization = {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.legalName,
    alternateName: site.name,
    url: `${site.url}/`,
    logo: { '@type': 'ImageObject', url: LOGO },
    image: LOGO,
    description: about,
    email: site.email,
    telephone: site.phoneE164,
    address: postalAddress(locale),
    location: { '@id': OFFICE_ID },
    areaServed,
    knowsLanguage: languages,
    sameAs: [site.instagram],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      telephone: site.phoneE164,
      email: site.email,
      availableLanguage: languages,
      // Open around the clock: 00:00 to 23:59 every day.
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '23:59',
      },
    },
  };

  const { geo, hours, profileUrl } = site.office;
  const office: Record<string, unknown> = {
    '@type': 'LocalBusiness',
    '@id': OFFICE_ID,
    name: site.legalName,
    parentOrganization: { '@id': ORG_ID },
    url: absolute(locale, '/contact'),
    image: LOGO,
    telephone: site.phoneE164,
    email: site.email,
    address: postalAddress(locale),
    areaServed,
  };
  if (geo) office.geo = { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng };
  if (hours) {
    office.openingHoursSpecification = hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    }));
  }
  if (profileUrl) {
    office.hasMap = profileUrl;
    office.sameAs = [profileUrl];
  }

  return [organization, office];
}

/** The home page: the site, the company and its office. */
export function homeStructuredData(locale: Locale, about: string) {
  const website = {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${site.url}/`,
    name: site.name,
    alternateName: site.legalName,
    inLanguage: [...routing.locales],
    publisher: { '@id': ORG_ID },
  };
  return { '@context': 'https://schema.org', '@graph': [website, ...organizationNodes(locale, about)] };
}

/** The contact page: a ContactPage about the Katameya office. */
export function contactStructuredData(locale: Locale, page: { title: string; description: string; about: string }) {
  const url = absolute(locale, '/contact');
  const contactPage = {
    '@type': 'ContactPage',
    '@id': `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    inLanguage: locale,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': OFFICE_ID },
    mainEntity: { '@id': OFFICE_ID },
  };
  return { '@context': 'https://schema.org', '@graph': [contactPage, ...organizationNodes(locale, page.about)] };
}

/**
 * A destination page: the page and its date, the place it is about, the trail, and the stays it
 * lists (sample stays only while the site is a noindex demo, as on the listing pages).
 */
export function destinationStructuredData({
  destination,
  locale,
  title,
  stays,
}: {
  destination: Destination;
  locale: Locale;
  title: string;
  stays: Unit[];
}) {
  const url = absolute(locale, `/destinations/${destination.slug}`);
  const listed = stays.filter(publishable);

  const page: Record<string, unknown> = {
    '@type': 'CollectionPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description: destination.guide.description[locale],
    inLanguage: locale,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': `${url}#place` },
    publisher: organizationRef,
    dateModified: destination.guide.updated,
    primaryImageOfPage: `${site.url}/img/${destination.photo}/1440.webp`,
    breadcrumb: { '@id': `${url}#breadcrumb` },
  };
  if (listed.length) page.mainEntity = { '@id': `${url}#stays` };

  const place = {
    '@type': 'TouristDestination',
    '@id': `${url}#place`,
    name: destination.name[locale],
    description: destination.guide.answer[locale],
    geo: { '@type': 'GeoCoordinates', latitude: destination.center.lat, longitude: destination.center.lng },
    containedInPlace: { '@type': 'Country', name: locale === 'ar' ? 'مصر' : 'Egypt' },
  };

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: site.name, item: absolute(locale, '/') },
      { '@type': 'ListItem', position: 2, name: destination.name[locale], item: url },
    ],
  };

  const graph: Record<string, unknown>[] = [page, place, breadcrumb];
  if (listed.length) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${url}#stays`,
      numberOfItems: listed.length,
      itemListElement: listed.map((u, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: absolute(locale, `/stays/${u.slug}`),
        name: u.name[locale],
      })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

/**
 * A listing page's JSON-LD: the home as a VacationRental holding one Accommodation, and the
 * breadcrumb trail. Only what the page itself shows goes in: the approximate pin (never an address),
 * a price range only once there is a starting price, and ratings only from real reviews of this home.
 * A sample listing gets none on an indexable site, so a stand-in never reaches search results.
 */
export function listingStructuredData({
  unit,
  locale,
  destination,
  compound,
  photoSlots,
  reviews,
}: {
  unit: Unit;
  locale: Locale;
  destination: string;
  compound: string;
  photoSlots: string[];
  reviews: Review[];
}) {
  if (!publishable(unit)) return null;

  const url = absolute(locale, `/stays/${unit.slug}`);
  const rating = ratingOf(reviews);
  const { lat, lng } = unit.pinApprox;

  const listing: Record<string, unknown> = {
    '@type': 'VacationRental',
    '@id': `${url}#listing`,
    name: unit.name[locale],
    description: unit.description[locale],
    url,
    identifier: unit.code,
    image: photoSlots.map((slot) => `${site.url}/img/${slot}/1440.webp`),
    brand: organizationRef,
    address: { '@type': 'PostalAddress', addressLocality: compound, addressRegion: destination, addressCountry: 'EG' },
    containsPlace: {
      '@type': 'Accommodation',
      additionalType: 'EntirePlace',
      numberOfBedrooms: unit.bedrooms,
      numberOfBathroomsTotal: unit.baths,
      bed: { '@type': 'BedDetails', numberOfBeds: unit.beds },
      occupancy: { '@type': 'QuantitativeValue', value: unit.guests },
      amenityFeature: unit.amenities.map((key) => ({
        '@type': 'LocationFeatureSpecification',
        name: amenities[key][locale],
        value: true,
      })),
    },
  };
  // Approximate on purpose: the same area the page's map shows.
  if (lat != null && lng != null) listing.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
  if (unit.fromPriceUsd) listing.priceRange = formatMoney(locale, usd(unit.fromPriceUsd));
  if (rating) {
    listing.aggregateRating = { '@type': 'AggregateRating', ratingValue: rating.value, ratingCount: rating.count, bestRating: 5, worstRating: 1 };
    listing.review = reviews
      .filter((r) => r.rating !== null)
      .map((r) => ({
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
        author: { '@type': 'Person', name: r.name[locale] },
        ...(r.date ? { datePublished: r.date } : {}),
        reviewBody: r.text,
        inLanguage: r.lang,
      }));
  }

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: site.name, item: absolute(locale, '/') },
      { '@type': 'ListItem', position: 2, name: destination, item: absolute(locale, `/destinations/${unit.destination}`) },
      { '@type': 'ListItem', position: 3, name: unit.name[locale], item: url },
    ],
  };

  return { '@context': 'https://schema.org', '@graph': [listing, breadcrumb] };
}

/** Serialises JSON-LD for a script tag, escaping "<" so no string in the data can close the tag. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
