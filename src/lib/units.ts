import raw from '@data/units.json';
import compoundsRaw from '@data/compounds.json';
import type { Locale } from '@/i18n/routing';
import { isAmenity, type AmenityKey } from './amenities';
import { destinationSlugs, type DestinationSlug, type Localized } from './destinations';
import { isUnitType, type UnitType } from './unit-types';

export type { UnitType };
export type CollectionKey = 'city' | 'seaside' | 'family';

/** One unit, in the shape of the System Blueprint's units table. */
export type Unit = {
  code: string;
  slug: string;
  sample?: boolean;
  name: Localized;
  description: Localized;
  type: UnitType;
  destination: DestinationSlug;
  compound: string;
  bedrooms: number;
  beds: number;
  baths: number;
  guests: number;
  amenities: AmenityKey[];
  /** The nightly "from" price in whole US dollars; pounds are derived from it (lib/pricing.ts). */
  fromPriceUsd: number | null;
  pinApprox: { lat: number | null; lng: number | null };
  photos: string[];
  collections: CollectionKey[];
  airbnbUrl: string | null;
  bookingUrl: string | null;
};

const compounds = compoundsRaw.compounds as Record<string, { ar: string }>;

/** Fails the build with a readable message when the sheet produces a bad row. */
function validate(list: Unit[]) {
  const seen = new Set<string>();
  for (const u of list) {
    const where = `data/units.json (${u.code ?? 'no code'})`;
    if (!u.code || !u.slug) throw new Error(`${where}: code and slug are required`);
    if (seen.has(u.slug)) throw new Error(`${where}: duplicate slug "${u.slug}"`);
    seen.add(u.slug);
    if (!/^[a-z0-9-]+$/.test(u.slug)) throw new Error(`${where}: slug must be lowercase letters, digits and dashes`);
    if (!destinationSlugs.includes(u.destination)) throw new Error(`${where}: unknown destination "${u.destination}"`);
    if (!isUnitType(u.type)) throw new Error(`${where}: unknown type "${u.type}"`);
    const { lat, lng } = u.pinApprox ?? { lat: null, lng: null };
    if ((lat == null) !== (lng == null)) throw new Error(`${where}: pinApprox needs both lat and lng, or neither`);
    if (lat != null && lng != null && (lat < 21 || lat > 32 || lng < 24 || lng > 37)) {
      throw new Error(`${where}: pinApprox (${lat}, ${lng}) is outside Egypt; check the order of lat and lng`);
    }
    if (u.fromPriceUsd != null && !(Number.isInteger(u.fromPriceUsd) && u.fromPriceUsd > 0)) {
      throw new Error(`${where}: fromPriceUsd must be a whole number of dollars above 0, or null`);
    }
    if (!u.name?.en || !u.name?.ar) throw new Error(`${where}: name needs both English and Arabic`);
    for (const a of u.amenities) if (!isAmenity(a)) throw new Error(`${where}: unknown amenity "${a}"`);
    if (!compounds[u.compound]) throw new Error(`${where}: add an Arabic name for "${u.compound}" in data/compounds.json`);
  }
  return list;
}

export const units = validate(raw.units as unknown as Unit[]);

export function getUnit(slug: string) {
  return units.find((u) => u.slug === slug);
}

export function unitsIn(destination: DestinationSlug) {
  return units.filter((u) => u.destination === destination);
}

export function compoundName(unit: Unit, locale: Locale) {
  return locale === 'ar' ? compounds[unit.compound].ar : unit.compound;
}
