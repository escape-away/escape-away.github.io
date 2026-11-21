import type { Locale } from '@/i18n/routing';
import { intlLocale } from './format';

/**
 * Calendar dates as ISO strings (YYYY-MM-DD) handled in UTC, so a stay's dates never shift with the
 * visitor's time zone. Weeks start on Saturday, as calendars do in Egypt.
 */
export const WEEK_START = 6;

export const fromISO = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const toISO = (d: Date) => d.toISOString().slice(0, 10);

export function todayISO() {
  const now = new Date();
  return toISO(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDays(iso: string, days: number) {
  const d = fromISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export const monthOf = (iso: string) => `${iso.slice(0, 8)}01`;

export function addMonths(monthIso: string, months: number) {
  const d = fromISO(monthIso);
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)));
}

/** The same day in another month, kept inside that month (31 Jan + 1 month = 28 or 29 Feb). */
export function shiftMonth(iso: string, months: number) {
  const d = fromISO(iso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return toISO(new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last))));
}

export const nightsBetween =(a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 864e5);

/** The month's days laid out in weeks starting Saturday; null pads the first and last week. */
export function monthGrid(monthIso: string): (string | null)[] {
  const first = fromISO(monthIso);
  const offset = (first.getUTCDay() - WEEK_START + 7) % 7;
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(addDays(monthIso, day - 1));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export const calendarFormat = (locale: Locale, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(intlLocale(locale), { timeZone: 'UTC', ...options });

/** "12 Jun" or "12 يونيو", with Western digits in both languages. */
export const shortDate = (locale: Locale, iso: string) =>
  calendarFormat(locale, { day: 'numeric', month: 'short' }).format(fromISO(iso));
