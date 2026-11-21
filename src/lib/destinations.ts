import raw from '@data/destinations.json';
import type { Locale } from '@/i18n/routing';

export type Localized = Record<Locale, string>;

export const destinationSlugs = ['cairo', 'sheikh-zayed', 'north-coast', 'el-alamein', 'gouna'] as const;
export type DestinationSlug = (typeof destinationSlugs)[number];

export const glanceKeys = ['bestFor', 'season', 'access', 'homes', 'length'] as const;
export type GlanceKey = (typeof glanceKeys)[number];

/**
 * A destination's short local guide, written separately in each language. It is the page's own
 * content, so no two destination pages read alike: the answer up top says what the place is and
 * who it suits in a few sentences that stand on their own, then the facts at a glance, what to
 * know before going, and the questions people ask about that place.
 */
export type DestinationGuide = {
  /** The date the guide was last checked (YYYY-MM-DD), shown on the page and in its structured data. */
  updated: string;
  /** The page's <title>, before " · Escape Away". */
  title: Localized;
  description: Localized;
  /** The heading in two weights: the light words, then the bold place name. */
  heading: Record<Locale, [string, string]>;
  answer: Localized;
  glance: ({ key: GlanceKey } & Localized)[];
  know: Record<Locale, string[]>;
  faq: { q: Localized; a: Localized }[];
  /** The owner band's question, e.g. "Own a chalet or villa on the North Coast?". */
  owners: Localized;
};

export type Destination = {
  slug: DestinationSlug;
  name: Localized;
  /** Other names people type for the area, in either language (search folds letter variants itself). */
  aliases: string[];
  /** One line for the homepage tile. */
  intro: Localized;
  center: { lat: number; lng: number };
  /** The map's view of the whole area; the destination map never zooms closer than this at first. */
  zoom: number;
  photo: string;
  guide: DestinationGuide;
};

export const destinations = raw.destinations as Destination[];

for (const d of destinations) {
  if (!destinationSlugs.includes(d.slug)) throw new Error(`data/destinations.json: unknown slug "${d.slug}"`);
  for (const row of d.guide.glance) {
    if (!glanceKeys.includes(row.key)) throw new Error(`data/destinations.json: ${d.slug} has an unknown glance key "${row.key}"`);
  }
}

export function getDestination(slug: string) {
  return destinations.find((d) => d.slug === slug);
}
