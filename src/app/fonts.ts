import { Alexandria, Fraunces, Jost } from 'next/font/google';

/**
 * Fraunces stands in for Recoleta in the public demo repo; SOFT 100 brings it close. Not preloaded:
 * its 120 KB file competed with the hero photo and the stylesheet on slow phones (LCP 3.5 s), and
 * Arabic pages never use it. Headings show the size-matched fallback until it arrives.
 */
export const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'opsz'],
  variable: '--font-fraunces',
  display: 'swap',
  preload: false,
});

/** Jost stands in for Garet. */
export const jost = Jost({
  subsets: ['latin'],
  variable: '--font-jost',
  display: 'swap',
});

/** Alexandria carries all Arabic text (pair C). Not preloaded, so English pages don't download it. */
export const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  variable: '--font-alexandria',
  display: 'swap',
  preload: false,
});

export const fontVariables = `${fraunces.variable} ${jost.variable} ${alexandria.variable}`;
