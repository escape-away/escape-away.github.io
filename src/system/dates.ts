/**
 * Stays are counted in nights between dates, so the system keeps dates as plain "YYYY-MM-DD"
 * strings and does its arithmetic at UTC midnight: no time zone can shift a night.
 */

const DAY = 86_400_000;

export const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const toIso = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (iso: string, days: number) => toIso(new Date(toDate(iso).getTime() + days * DAY));
export const diffDays = (from: string, to: string) => Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY);

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (iso: string) => toDate(iso).getUTCDay();
/** Egypt's weekend is Friday and Saturday; Thursday and Friday nights carry the weekend rate. */
export const isWeekend = (iso: string) => weekday(iso) === 5 || weekday(iso) === 6;
export const isWeekendNight = (iso: string) => weekday(iso) === 4 || weekday(iso) === 5;

export const monthOf = (iso: string) => iso.slice(0, 7);
export const monthStart = (month: string) => `${month}-01`;
export const addMonths = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return toIso(d).slice(0, 7);
};
export const daysInMonth = (month: string) => diffDays(monthStart(month), monthStart(addMonths(month, 1)));

/** Today's date in Cairo, whatever the device's own time zone. */
export function cairoToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Nights of a stay that fall inside [from, to). */
export function overlapNights(checkIn: string, checkOut: string, from: string, to: string) {
  const start = checkIn > from ? checkIn : from;
  const end = checkOut < to ? checkOut : to;
  return Math.max(0, diffDays(start, end));
}

/** Two stays share a night when each starts before the other ends (check-out day is free). */
export const overlaps = (aIn: string, aOut: string, bIn: string, bOut: string) => aIn < bOut && bIn < aOut;

export function eachDay(from: string, count: number) {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}
