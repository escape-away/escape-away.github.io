import type { Locale } from '@/i18n/routing';

/**
 * Prices and dates use Western digits in both languages by design. The digits come from the
 * locale's numbering system (ar-EG-u-nu-latn), never from hard-coded strings.
 */
export const intlLocale = (locale: Locale) => (locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-EG');

export function formatNumber(locale: Locale, value: number) {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 }).format(value);
}

export function formatEgp(locale: Locale, amount: number) {
  const n = formatNumber(locale, amount);
  return locale === 'ar' ? `${n} ج.م` : `EGP ${n}`;
}

export function formatDate(
  locale: Locale,
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' },
) {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: 'Africa/Cairo', ...options }).format(value);
}
