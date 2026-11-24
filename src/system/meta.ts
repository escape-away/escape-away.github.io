import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import { nav, type NavKey } from './copy';

const extra = {
  staff: { en: 'Housekeeping', ar: 'النضافة' },
  portal: { en: 'Owner portal', ar: 'بوابة الملاك' },
};

/** The system's pages are never indexed, whatever the website does. */
export function systemMeta(locale: Locale, key: NavKey | keyof typeof extra): Metadata {
  const label = key in nav ? nav[key as NavKey][locale] : extra[key as keyof typeof extra][locale];
  return {
    title: `${label} · ${locale === 'ar' ? 'السيستم' : 'System'}`,
    description:
      locale === 'ar'
        ? 'عرض تجريبي لسيستم Escape Away: الحجوزات والتقويم والوحدات والملاك، ببيانات متألفة.'
        : 'A demo of the Escape Away system: bookings, calendar, units and owners, on sample data.',
    robots: { index: false, follow: false },
  };
}
