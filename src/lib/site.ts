import type { Locale } from '@/i18n/routing';

/**
 * The Katameya office as the company profile gives it. The Google Business Profile, the footer, the
 * contact page and the structured data all use these exact strings, so the name, address and phone
 * read the same everywhere (docs/google-business-profile.md).
 */
const office = {
  name: 'Escape Away Hospitality',
  address: {
    en: { street: 'Katameya Dunes, Office 42', locality: 'New Cairo', region: 'Cairo Governorate' },
    ar: { street: 'قطامية ديونز، مكتب 42', locality: 'القاهرة الجديدة', region: 'محافظة القاهرة' },
  } as Record<Locale, { street: string; locality: string; region: string }>,
  country: 'EG',
  /**
   * The office pin, copied from the Google Business Profile once Google has verified it.
   * Never guessed: until then the structured data simply leaves it out.
   */
  geo: null as { lat: number; lng: number } | null,
  /**
   * Office hours, once Escape Away confirms them (and only if visitors are welcome then), e.g.
   * [{ days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], opens: '10:00', closes: '18:00' }].
   */
  hours: null as { days: string[]; opens: string; closes: string }[] | null,
  /** The Google Business Profile's own link (its "Share" link), once it exists. */
  profileUrl: process.env.NEXT_PUBLIC_GBP_URL || '',
  /** Until the profile exists, the map link shows Katameya Dunes itself. */
  areaMapUrl: 'https://www.google.com/maps/search/?api=1&query=Katameya%20Dunes%2C%20New%20Cairo',
};

/** Site-wide facts. Contact details come from the company profile; nothing here is invented. */
export const site = {
  name: 'Escape Away',
  legalName: office.name,
  // `||`, not `??`: CI passes an unset repository variable as an empty string.
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://escape-away.github.io').replace(/\/+$/, ''),
  /** Search engines may list the site unless a build says otherwise (NEXT_PUBLIC_NOINDEX=true). */
  noindex: process.env.NEXT_PUBLIC_NOINDEX === 'true',
  /** Digits only, with the country code. Stand-in: the company number, until the request line is confirmed. */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || '201007009505',
  /** Where owner leads continue on WhatsApp. The request line until Escape Away names who takes them. */
  ownerWhatsapp: process.env.NEXT_PUBLIC_OWNER_WHATSAPP || process.env.NEXT_PUBLIC_WHATSAPP || '201007009505',
  phone: '+20 100 700 9505',
  /** The same number in the international format structured data and links use. */
  phoneE164: '+201007009505',
  phoneHref: 'tel:+201007009505',
  email: 'escapeawayhospitality@gmail.com',
  instagram: 'https://www.instagram.com/escapeawayhospitality/',
  instagramHandle: '@escapeawayhospitality',
  /**
   * The Airbnb host profile's own figures, as Airbnb showed them when checked. Update them with the
   * date when the profile changes; the homepage links to the profile so guests can read every review.
   */
  airbnb: {
    profileUrl: 'https://www.airbnb.com/users/profile/1470128624272015931',
    rating: 5,
    reviews: 11,
    checked: '2026-11-23',
  },
  office,
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
  /** The Google Apps Script web app (apps-script/Code.gs). Empty: requests go on WhatsApp alone. */
  formEndpoint: process.env.NEXT_PUBLIC_FORM_ENDPOINT || '',
  /**
   * The reply-time promise under "Send request", for Escape Away to decide (the brief's example:
   * "We reply within 30 minutes, 9 am to midnight"). Hidden while empty.
   */
  replyPromise: { en: '', ar: '' } as Record<Locale, string>,
} as const;

/** The office address on one line, in the page's language: "Katameya Dunes, Office 42, New Cairo". */
export function officeLine(locale: Locale) {
  const a = site.office.address[locale];
  return `${a.street}${locale === 'ar' ? '، ' : ', '}${a.locality}`;
}

export function whatsappLink(text?: string, number: string = site.whatsapp) {
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
