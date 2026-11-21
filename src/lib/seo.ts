import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';
import { imageSlot } from './images';
import { site } from './site';

/** A photo slot as the picture a shared link shows (WhatsApp, Facebook, X), at 1440 px wide. */
export function ogImage(slot: string, locale: Locale) {
  const image = imageSlot(slot);
  if (!image) return undefined;
  return {
    url: `${site.url}/img/${slot}/1440.webp`,
    width: 1440,
    height: Math.round((image.height * 1440) / image.width),
    alt: image.alt[locale],
  };
}

/** A path inside a locale, in the trailing-slash form the static export writes. */
export function localePath(locale: Locale, path = '/') {
  const inner = path.replace(/^\/+|\/+$/g, '');
  return inner ? `/${locale}/${inner}/` : `/${locale}/`;
}

type PageMeta = {
  locale: Locale;
  /** The page's path without the locale, e.g. "/owners". */
  path?: string;
  title: string;
  description: string;
  /** Use the title as-is instead of "<title> · Escape Away". */
  absolute?: boolean;
  /** The picture a shared link shows (WhatsApp, Facebook, X), as an absolute URL. */
  image?: { url: string; width: number; height: number; alt: string };
};

/**
 * A name short enough for a <title>: search results show about 60 characters, so a long listing
 * name is cut at a word with an ellipsis there. The page itself keeps the full name.
 */
export function titleText(text: string, max = 55) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,،:;·-]+$/u, '')}…`;
}

/** Title, description, canonical and the language pair (with English as x-default) for one page. */
export function pageMetadata({ locale, path = '/', title, description, absolute, image }: PageMeta): Metadata {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localePath(l, path);
  languages['x-default'] = localePath(routing.defaultLocale, path);
  const fullTitle = absolute ? title : `${title} · ${site.name}`;

  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: localePath(locale, path), languages },
    openGraph: {
      type: 'website',
      siteName: site.name,
      title: fullTitle,
      description,
      url: localePath(locale, path),
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
      alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_EG'],
      ...(image ? { images: [image] } : {}),
    },
    ...(image ? { twitter: { card: 'summary_large_image', images: [image.url] } } : {}),
  };
}
