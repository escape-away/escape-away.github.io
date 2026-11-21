import type { AmenityKey } from './amenities';
import { matchesAll } from './normalize';
import type { SearchState } from './search-state';
import type { UnitType } from './unit-types';

/** A photo the explorer can draw on the client: the slot plus what the server already resolved. */
export type ExplorerPhoto = { slot: string; alt: string; width: number; height: number; color: string };

/**
 * One stay as the explorer needs it: the words already written in the page's language on the server,
 * plus the plain facts the filters and the map work from.
 */
export type ExplorerItem = {
  slug: string;
  href: string;
  name: string;
  /** "Marassi · North Coast" */
  area: string;
  /** "7 guests · 3 bedrooms · 2 baths" */
  facts: string;
  /** "From EGP 4,500 a night", or "Price on request" until the price is in */
  price: string;
  /** What the map pin says: the starting price, or the kind of home until there is one. */
  pin: string;
  photo: ExplorerPhoto | null;
  sample: boolean;
  destination: string;
  compound: string;
  type: UnitType;
  bedrooms: number;
  guests: number;
  amenities: AmenityKey[];
  collections: string[];
  priceEgp: number | null;
  /** [lng, lat] of the approximate pin, or null for a stay with no pin yet. */
  lngLat: [number, number] | null;
  /** Names, compound, destination and code in both languages, folded for search. */
  keys: string;
};

export type Option<T extends string = string> = { value: T; label: string };

export type FilterOptions = {
  types: Option<UnitType>[];
  bedrooms: number[];
  amenities: Option<AmenityKey>[];
  /** Price steps for the range, or empty while fewer than two stays have a starting price. */
  prices: number[];
};

/** Amenities offered as filters, most asked-for first. Wi-Fi, air conditioning and a kitchen come with every home. */
export const filterAmenities: AmenityKey[] = [
  'private-pool',
  'sea-view',
  'beach-access',
  'garden',
  'shared-pool',
  'parking',
  'workspace',
  'washer',
  'lift',
];

/** Rounded steps between the lowest and highest starting price, for the price range's two lists. */
export function priceSteps(values: number[]) {
  if (values.length < 2) return [];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (hi <= lo) return [];
  const raw = (hi - lo) / 6;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const steps: number[] = [];
  for (let v = Math.floor(lo / step) * step; v < hi + step; v += step) if (v > 0) steps.push(Math.round(v));
  return steps;
}

export type WhereKind = 'none' | 'destination' | 'compound' | 'text';

export function whereKind(where: string, destinations: readonly string[], compounds: readonly string[]): WhereKind {
  if (!where) return 'none';
  if (destinations.includes(where)) return 'destination';
  if (compounds.includes(where)) return 'compound';
  return 'text';
}

/** Whether a stay fits the search and every filter. `query` is the folded Where text. */
export function matches(item: ExplorerItem, s: SearchState, kind: WhereKind, query: string) {
  if (s.collection && !item.collections.includes(s.collection)) return false;
  const party = s.adults + s.children;
  if (party && item.guests < party) return false;
  if (s.types.length && !s.types.includes(item.type)) return false;
  if (s.bedrooms && item.bedrooms < s.bedrooms) return false;
  if (s.amenities.length && !s.amenities.every((a) => item.amenities.includes(a))) return false;
  if (s.priceMin && (item.priceEgp == null || item.priceEgp < s.priceMin)) return false;
  if (s.priceMax && (item.priceEgp == null || item.priceEgp > s.priceMax)) return false;
  switch (kind) {
    case 'destination':
      return item.destination === s.where;
    case 'compound':
      return item.compound === s.where;
    case 'text':
      return matchesAll(item.keys, query);
    default:
      return true;
  }
}
