'use client';

import { useSyncExternalStore } from 'react';
import { amenities, isAmenity, type AmenityKey } from './amenities';
import { isUnitType, unitTypes, type UnitType } from './unit-types';

/**
 * The stays search lives in the address (?where=north-coast&in=2027-06-11&out=2027-06-14&adults=6),
 * so a search can be shared on WhatsApp, survives the back button, and carries into a listing.
 * The explorer's filters ride along in the same address (&type=villa,chalet&bedrooms=3&amenities=private-pool).
 */
export type SearchState = {
  where: string;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  infants: number;
  collection: string;
  /** Explorer filters: kinds of home, the fewest bedrooms, amenities every stay must have, a nightly price range. */
  types: UnitType[];
  bedrooms: number;
  amenities: AmenityKey[];
  priceMin: number;
  priceMax: number;
};

export const noFilters = {
  types: [] as UnitType[],
  bedrooms: 0,
  amenities: [] as AmenityKey[],
  priceMin: 0,
  priceMax: 0,
} satisfies Partial<SearchState>;

export const emptySearch: SearchState = {
  where: '',
  checkin: '',
  checkout: '',
  adults: 0,
  children: 0,
  infants: 0,
  collection: '',
  ...noFilters,
};

/** How many filters are on: each kind of home and amenity counts, bedrooms and price count once. */
export function filterCount(s: SearchState) {
  return s.types.length + s.amenities.length + (s.bedrooms ? 1 : 0) + (s.priceMin || s.priceMax ? 1 : 0);
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const count = (v: string | null, max: number) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};
const amenityOrder = Object.keys(amenities) as AmenityKey[];

/** A comma list from the address, keeping known values only, once each, in the canonical order. */
function list<T extends string>(v: string | null, known: readonly T[], ok: (x: string) => x is T): T[] {
  const picked = new Set((v ?? '').split(',').map((x) => x.trim()).filter(ok));
  return known.filter((x) => picked.has(x));
}

export function parseSearch(query: string): SearchState {
  const p = new URLSearchParams(query);
  const checkin = p.get('in') ?? '';
  const checkout = p.get('out') ?? '';
  const priceMin = count(p.get('min'), 10_000_000);
  const priceMax = count(p.get('max'), 10_000_000);
  return {
    where: (p.get('where') ?? '').slice(0, 80),
    checkin: isoDate.test(checkin) ? checkin : '',
    checkout: isoDate.test(checkout) && checkout > checkin ? checkout : '',
    adults: count(p.get('adults'), 16),
    children: count(p.get('children'), 16),
    infants: count(p.get('infants'), 6),
    collection: (p.get('collection') ?? '').slice(0, 20),
    types: list(p.get('type'), unitTypes, isUnitType),
    bedrooms: count(p.get('bedrooms'), 10),
    amenities: list(p.get('amenities'), amenityOrder, isAmenity),
    priceMin,
    priceMax: priceMax && priceMin && priceMax < priceMin ? 0 : priceMax,
  };
}

export function searchQuery(s: SearchState) {
  const p = new URLSearchParams();
  if (s.where) p.set('where', s.where);
  if (s.checkin) p.set('in', s.checkin);
  if (s.checkout) p.set('out', s.checkout);
  if (s.adults) p.set('adults', String(s.adults));
  if (s.children) p.set('children', String(s.children));
  if (s.infants) p.set('infants', String(s.infants));
  if (s.collection) p.set('collection', s.collection);
  if (s.types.length) p.set('type', s.types.join(','));
  if (s.bedrooms) p.set('bedrooms', String(s.bedrooms));
  if (s.amenities.length) p.set('amenities', s.amenities.join(','));
  if (s.priceMin) p.set('min', String(s.priceMin));
  if (s.priceMax) p.set('max', String(s.priceMax));
  // Commas are safe in a query string; keeping them readable makes a shared link easier to trust.
  return p.toString().replace(/%2C/g, ',');
}

const listeners = new Set<() => void>();
let cache = { key: '\u0000', value: emptySearch };

function snapshot() {
  const key = window.location.search;
  if (key !== cache.key) cache = { key, value: parseSearch(key) };
  return cache.value;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

export function useSearch() {
  return useSyncExternalStore(subscribe, snapshot, () => emptySearch);
}

/** Updates the search in the address without reloading, then tells every listener. */
export function setSearch(next: Partial<SearchState>, options: { replace?: boolean; hash?: string } = {}) {
  const merged = { ...snapshot(), ...next };
  const query = searchQuery(merged);
  const hash = options.hash ?? window.location.hash;
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${hash}`;
  window.history[options.replace ? 'replaceState' : 'pushState'](null, '', url);
  listeners.forEach((l) => l());
}

/** Like setSearch, but computed from the latest address, so quick repeated taps each count. */
export function updateSearch(change: (current: SearchState) => Partial<SearchState>, options: { replace?: boolean } = {}) {
  setSearch(change(snapshot()), options);
}

export function clearSearch() {
  setSearch(emptySearch, { replace: false });
}

/** Turns every filter off and keeps the place, dates and guests. */
export function clearFilters() {
  setSearch(noFilters, { replace: true });
}

type LenisLike = { scrollTo: (t: number, o?: object) => void; stop: () => void; start: () => void };
export const lenis = () => (window as unknown as { __lenis?: LenisLike }).__lenis;

/**
 * Scrolls an element to just under the header (plus `gap`), through Lenis when it is running so the
 * two never fight. The target is a number on purpose: Lenis adds the page's scroll padding to an
 * element target, so a number lands in the same place with or without it.
 */
export function scrollToElement(el: Element, gap = 0) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 64;
  const top = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - header - gap));
  const smooth = lenis();
  if (smooth && !reduce) smooth.scrollTo(top);
  else window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
}

/** Scrolls to a section and moves focus there, so keyboard and screen-reader users land there too. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  scrollToElement(el);
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}
