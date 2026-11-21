'use client';

/**
 * The preload for a page's largest photo. A client component on purpose: rendered from a server
 * component, a <link rel="preload"> becomes a hint inside the page data, and Next.js prefetches that
 * data for every link on screen, so each prefetch downloaded another page's photo. From here it is
 * only drawn into <head> when the page itself renders (the built HTML, or a visit).
 */
export function PhotoPreload({ href, srcSet, sizes }: { href: string; srcSet: string; sizes: string }) {
  return <link rel="preload" as="image" type="image/avif" href={href} imageSrcSet={srcSet} imageSizes={sizes} fetchPriority="high" />;
}
