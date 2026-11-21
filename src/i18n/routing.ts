import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  // A static export has no server to negotiate the locale, so every URL carries it.
  localePrefix: 'always',
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export const directionOf = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr');
