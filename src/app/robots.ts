import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * Crawling stays allowed so search engines can read a page's noindex (the system demo's pages, or the
 * whole site on a NEXT_PUBLIC_NOINDEX=true build); blocking it here would hide that tag. The sitemap
 * is announced only when the site is indexable.
 */
export default function robots(): MetadataRoute.Robots {
  return site.noindex
    ? { rules: { userAgent: '*', allow: '/' } }
    : { rules: { userAgent: '*', allow: '/' }, sitemap: `${site.url}/sitemap.xml`, host: site.url };
}
