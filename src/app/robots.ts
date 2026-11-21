import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * Crawling stays allowed so search engines can read each page's noindex while the site is a demo;
 * blocking it here would hide that tag. The sitemap is announced only on the live site.
 */
export default function robots(): MetadataRoute.Robots {
  return site.noindex
    ? { rules: { userAgent: '*', allow: '/' } }
    : { rules: { userAgent: '*', allow: '/' }, sitemap: `${site.url}/sitemap.xml`, host: site.url };
}
