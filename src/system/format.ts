/**
 * How the system writes money, dates, nights and times in both languages. Western digits in both,
 * through the locale's numbering system, as on the website (src/lib/format.ts).
 */
import { formatEgp, intlLocale } from '@/lib/format';
import { toDate } from './dates';
import type { Lang } from './types';

export const money = (lang: Lang, amount: number) => formatEgp(lang, Math.round(amount));

/** A large amount without its currency, for figures whose label names it: "4.07M" / "4.07 مليون". */
export function compact(lang: Lang, amount: number) {
  if (Math.abs(amount) >= 1_000_000) {
    const n = num(lang, amount / 1_000_000, 2);
    return lang === 'ar' ? `${n} مليون` : `${n}M`;
  }
  if (Math.abs(amount) >= 10_000) {
    const n = num(lang, amount / 1000, 0);
    return lang === 'ar' ? `${n} ألف` : `${n}K`;
  }
  return num(lang, amount);
}

/** Large sums in a figure: "EGP 4.07M" / "4.07 مليون ج.م". */
export function moneyShort(lang: Lang, amount: number) {
  if (Math.abs(amount) < 100_000) return money(lang, amount);
  const millions = amount / 1_000_000;
  if (millions >= 1) {
    const n = num(lang, millions, 2);
    return lang === 'ar' ? `${n} مليون ج.م` : `EGP ${n}M`;
  }
  const n = num(lang, amount / 1000, 0);
  return lang === 'ar' ? `${n} ألف ج.م` : `EGP ${n}K`;
}

export function num(lang: Lang, value: number, digits = 0) {
  return new Intl.NumberFormat(intlLocale(lang), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

export const pct = (lang: Lang, share: number) =>
  new Intl.NumberFormat(intlLocale(lang), { style: 'percent', maximumFractionDigits: 0 }).format(share);

/** A plain date ("YYYY-MM-DD"), written without any time zone shift. */
export function day(lang: Lang, iso: string, options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat(intlLocale(lang), { timeZone: 'UTC', ...options }).format(toDate(iso));
}

export function longDay(lang: Lang, iso: string) {
  return day(lang, iso, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function monthName(lang: Lang, month: string, withYear = true) {
  return day(lang, `${month}-01`, withYear ? { month: 'long', year: 'numeric' } : { month: 'long' });
}

/** "25–28 Nov" or "29 Nov – 2 Dec": the stay's nights as one short range. */
export function stayRange(lang: Lang, checkIn: string, checkOut: string) {
  const f = new Intl.DateTimeFormat(intlLocale(lang), { timeZone: 'UTC', day: 'numeric', month: 'short' });
  return f.formatRange(toDate(checkIn), toDate(checkOut));
}

/** Arabic counts change form with the number; Intl.PluralRules picks the form. */
const arPlural = new Intl.PluralRules('ar-EG');
const enPlural = new Intl.PluralRules('en');

type Forms = { one: string; other: string; two?: string; few?: string; many?: string };

export function count(lang: Lang, n: number, en: Forms, ar: Forms) {
  const forms = lang === 'ar' ? ar : en;
  const rule = (lang === 'ar' ? arPlural : enPlural).select(n) as keyof Forms;
  const pattern = forms[rule] ?? forms.other;
  return pattern.replace('#', num(lang, n));
}

export const nights = (lang: Lang, n: number) =>
  count(lang, n, { one: '# night', other: '# nights' }, { one: 'ليلة واحدة', two: 'ليلتين', few: '# ليالي', many: '# ليلة', other: '# ليلة' });

export const guestsCount = (lang: Lang, n: number) =>
  count(lang, n, { one: '# guest', other: '# guests' }, { one: 'ضيف واحد', two: 'ضيفين', few: '# ضيوف', many: '# ضيف', other: '# ضيف' });

export const homesCount = (lang: Lang, n: number) =>
  count(lang, n, { one: '# home', other: '# homes' }, { one: 'وحدة واحدة', two: 'وحدتين', few: '# وحدات', many: '# وحدة', other: '# وحدة' });

/** A clock time in Cairo, from an ISO date-time. */
export function clock(lang: Lang, isoTime: string) {
  return new Intl.DateTimeFormat(intlLocale(lang), { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' }).format(new Date(isoTime));
}

/** "4 min ago" / "من 4 دقايق": short, as the team says it. */
export function ago(lang: Lang, isoTime: string, now: number) {
  const minutes = Math.max(0, Math.round((now - new Date(isoTime).getTime()) / 60_000));
  if (minutes < 1) return lang === 'ar' ? 'دلوقتي' : 'just now';
  if (minutes < 60) {
    return lang === 'ar' ? `من ${count('ar', minutes, { one: '', other: '' }, { one: 'دقيقة', two: 'دقيقتين', few: '# دقايق', many: '# دقيقة', other: '# دقيقة' })}` : `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  return lang === 'ar'
    ? `من ${count('ar', hours, { one: '', other: '' }, { one: 'ساعة', two: 'ساعتين', few: '# ساعات', many: '# ساعة', other: '# ساعة' })}`
    : `${hours} h ago`;
}
