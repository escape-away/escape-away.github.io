import raw from '@data/reviews.json';
import type { Localized } from './destinations';
import { units } from './units';

/** One real guest review, in the language the guest wrote it. */
export type Review = {
  id: string;
  /** The unit's code, or null for a review of Escape Away itself. */
  unit: string | null;
  /** The guest's first name, written in each script. */
  name: Localized;
  /** "2026-08" or "2026-08-14"; null when the date isn't known. */
  date: string | null;
  /** 1 to 5, or null when the review has no score. */
  rating: number | null;
  lang: 'en' | 'ar';
  text: string;
  source: string;
};

/** Fails the build with a readable message when a review can't be shown honestly. */
function validate(list: Review[]) {
  const codes = new Set(units.map((u) => u.code));
  const seen = new Set<string>();
  for (const r of list) {
    const where = `data/reviews.json (${r.id ?? 'no id'})`;
    if (!r.id || seen.has(r.id)) throw new Error(`${where}: every review needs its own id`);
    seen.add(r.id);
    if (r.unit !== null && !codes.has(r.unit)) throw new Error(`${where}: no unit with code "${r.unit}"`);
    if (!r.name?.en?.trim() || !r.name?.ar?.trim() || !r.text?.trim()) throw new Error(`${where}: a review needs the guest's first name in both scripts and their words`);
    if (r.rating !== null && !(Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5)) {
      throw new Error(`${where}: rating must be a whole number from 1 to 5, or null`);
    }
    if (r.date !== null && !/^\d{4}-\d{2}(-\d{2})?$/.test(r.date)) throw new Error(`${where}: date must look like 2026-08 or 2026-08-14`);
    if (r.lang !== 'en' && r.lang !== 'ar') throw new Error(`${where}: lang must be "en" or "ar"`);
  }
  return list;
}

export const reviews = validate(raw.reviews as Review[]);

export const reviewsOf = (code: string) => reviews.filter((r) => r.unit === code);

export const companyReviews = () => reviews.filter((r) => r.unit === null);

/** The average of the reviews that carry a score, to one decimal, with how many there are. */
export function ratingOf(list: Review[]) {
  const scored = list.filter((r) => r.rating !== null);
  if (!scored.length) return null;
  const average = scored.reduce((sum, r) => sum + r.rating!, 0) / scored.length;
  return { value: Math.round(average * 10) / 10, count: scored.length };
}
