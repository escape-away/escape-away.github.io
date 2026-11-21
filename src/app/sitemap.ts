import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { destinations } from '@/lib/destinations';
import { localePath } from '@/lib/seo';
import { site } from '@/lib/site';
import { units } from '@/lib/units';

export const dynamic = 'force-static';

/**
 * Every page in both languages, each listing its twin, with English as x-default. Only the
 * destination guides carry a last-modified date: theirs is real (the date the guide was checked),
 * and a made-up date for the rest would teach search engines to ignore it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; lastModified?: string }[] = [
    { path: '/' },
    { path: '/owners' },
    ...destinations.map((d) => ({ path: `/destinations/${d.slug}`, lastModified: d.guide.updated })),
    ...units.map((u) => ({ path: `/stays/${u.slug}` })),
    { path: '/contact' },
    { path: '/terms' },
    { path: '/privacy' },
    { path: '/cancellation' },
  ];

  return pages.flatMap(({ path, lastModified }) => {
    const languages: Record<string, string> = {};
    for (const l of routing.locales) languages[l] = `${site.url}${localePath(l, path)}`;
    languages['x-default'] = `${site.url}${localePath(routing.defaultLocale, path)}`;
    return routing.locales.map((locale) => ({
      url: `${site.url}${localePath(locale, path)}`,
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages },
    }));
  });
}
