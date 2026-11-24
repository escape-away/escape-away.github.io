#!/usr/bin/env node
/**
 * Checks the static export in out/ before it ships: every page exists in both languages with the
 * right lang and dir; its canonical is its own address; its language links name itself, its twin and
 * English as x-default, at their exact addresses; og:locale matches; the sitemap lists the same pairs;
 * a title and a description of its own at a length search results show, one h1, structured data that
 * parses and says what the page is (the company and its Katameya office on the home page, the office
 * on the contact page, each destination guide with its date), the footer's name, address and phone
 * matching the structured data, a share image that exists, noindex only on a NEXT_PUBLIC_NOINDEX=true build, every
 * pre-resized photo the pages rely on, and destination guides that don't read alike.
 * Exits 1 on any problem.
 */
import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'out');
const readJson = async (p) => JSON.parse(await readFile(join(root, p), 'utf8'));
const exists = (p) => access(p).then(() => true, () => false);

const units = (await readJson('data/units.json')).units.map((u) => u.slug);
// Hidden destinations have no page until they have homes to show.
const destinations = (await readJson('data/destinations.json')).destinations.filter((d) => !d.hidden).map((d) => d.slug);
const generated = await readJson('src/generated/images.json').catch(() => ({}));
const noindex = process.env.NEXT_PUBLIC_NOINDEX === 'true';

const paths = [
  '',
  'owners',
  ...destinations.map((s) => `destinations/${s}`),
  ...units.map((s) => `stays/${s}`),
  'contact',
  'terms',
  'privacy',
  'cancellation',
];

const problems = [];
const titles = new Map();
const descriptions = new Map();
/** Each page's address → its language links, to compare with the sitemap. */
const pageLinks = new Map();
let pages = 0;
let graphs = 0;
const ogLocale = { en: 'en_US', ar: 'ar_EG' };

/** Text as a reader sees it: entities decoded, so it can be compared with the data files. */
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
const digits = (s) => String(s).replace(/\D/g, '');
const typesOf = (node) => [node?.['@type']].flat().filter(Boolean);
/** The structured data a page carries, every node of every block, after checking each block parses. */
function structuredData(rel, html) {
  const nodes = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch (err) {
      problems.push(`${rel}: structured data does not parse (${err.message})`);
      continue;
    }
    graphs += 1;
    if (data['@context'] !== 'https://schema.org') problems.push(`${rel}: structured data without the schema.org @context`);
    for (const node of data['@graph'] ?? [data]) {
      if (!typesOf(node).length) problems.push(`${rel}: a structured data node has no @type`);
      nodes.push(node);
    }
  }
  return nodes;
}
const destinationData = (await readJson('data/destinations.json')).destinations.filter((d) => !d.hidden);
/** Filled from the home page's Organization, then checked against every page's footer. */
const nap = {};
const pageTexts = new Map();

for (const locale of ['en', 'ar']) {
  for (const path of paths) {
    const rel = `${locale}/${path ? `${path}/` : ''}index.html`;
    let html;
    try {
      html = await readFile(join(out, rel), 'utf8');
    } catch {
      problems.push(`${rel}: missing`);
      continue;
    }
    pages += 1;

    const htmlTag = html.match(/<html[^>]*>/i)?.[0] ?? '';
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    if (!htmlTag.includes(`lang="${locale}"`) || !htmlTag.includes(`dir="${dir}"`)) {
      problems.push(`${rel}: <html> should have lang="${locale}" dir="${dir}"`);
    }

    const links = html.match(/<link[^>]*>/gi) ?? [];
    const canonical = links.find((l) => /rel="canonical"/i.test(l))?.match(/href="([^"]+)"/i)?.[1] ?? '';
    const tail = `${path ? `${path}/` : ''}`;
    let origin = '';
    try {
      origin = new URL(canonical).origin;
    } catch {
      problems.push(`${rel}: canonical "${canonical}" is not a full address`);
    }
    const address = (lang) => `${origin}/${lang}/${tail}`;
    if (canonical !== address(locale)) problems.push(`${rel}: canonical "${canonical}" should be ${address(locale)}`);

    const alternates = {};
    for (const l of links.filter((x) => /rel="alternate"/i.test(x))) {
      const lang = l.match(/hreflang="([^"]+)"/i)?.[1];
      const href = l.match(/href="([^"]+)"/i)?.[1];
      if (!lang) continue;
      if (alternates[lang]) problems.push(`${rel}: two hreflang="${lang}" links`);
      alternates[lang] = href;
    }
    const expectedLinks = { en: address('en'), ar: address('ar'), 'x-default': address('en') };
    for (const [lang, href] of Object.entries(expectedLinks)) {
      if (alternates[lang] !== href) problems.push(`${rel}: hreflang="${lang}" should point to ${href}, not ${alternates[lang] ?? 'nothing'}`);
    }
    for (const lang of Object.keys(alternates)) {
      if (!(lang in expectedLinks)) problems.push(`${rel}: unexpected hreflang="${lang}"`);
    }
    pageLinks.set(canonical, alternates);

    const og = html.match(/<meta property="og:locale" content="([^"]+)"/i)?.[1];
    const ogAlt = html.match(/<meta property="og:locale:alternate" content="([^"]+)"/i)?.[1];
    if (og !== ogLocale[locale]) problems.push(`${rel}: og:locale should be ${ogLocale[locale]}, not ${og ?? 'missing'}`);
    if (ogAlt !== ogLocale[locale === 'en' ? 'ar' : 'en']) problems.push(`${rel}: og:locale:alternate should name the other language`);

    const robots = html.match(/<meta[^>]*name="robots"[^>]*>/i)?.[0] ?? '';
    if (noindex && !/noindex/i.test(robots)) problems.push(`${rel}: missing noindex on a noindex build`);
    if (!noindex && /noindex/i.test(robots)) problems.push(`${rel}: still noindex on the live site`);

    const title = decode(html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? '');
    if (!title) problems.push(`${rel}: no <title>`);
    if (title.length > 70) problems.push(`${rel}: the title is ${title.length} characters ("${title}"); results show about 60`);
    const key = `${locale}:${title}`;
    if (titles.has(key)) problems.push(`${rel}: same title as ${titles.get(key)} ("${title}")`);
    titles.set(key, rel);

    const description = decode(html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ?? '');
    if (!description) problems.push(`${rel}: no meta description`);
    else if (description.length < 50 || description.length > 170) {
      problems.push(`${rel}: the description is ${description.length} characters; keep it between 50 and 170`);
    }
    const dKey = `${locale}:${description}`;
    if (description && descriptions.has(dKey)) problems.push(`${rel}: same description as ${descriptions.get(dKey)}`);
    descriptions.set(dKey, rel);

    const h1s = html.match(/<h1[\s>]/g)?.length ?? 0;
    if (h1s !== 1) problems.push(`${rel}: ${h1s} <h1> headings; a page has exactly one`);

    // Structured data: what each kind of page should say about itself.
    const nodes = structuredData(rel, html);
    const has = (type) => nodes.find((n) => typesOf(n).includes(type));
    const need = (...types) => {
      for (const type of types) if (!has(type)) problems.push(`${rel}: no ${type} in the structured data`);
    };
    // What a reader sees: scripts (the page's own data travels in them too), styles and tags taken out.
    const text = decode(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    );
    if (path === '') {
      need('WebSite', 'Organization', 'LocalBusiness');
      const office = has('LocalBusiness');
      if (office) {
        nap[locale] = {
          name: office.name,
          street: office.address?.streetAddress,
          locality: office.address?.addressLocality,
          phone: digits(office.telephone),
        };
      }
    }
    if (path === 'contact') need('ContactPage', 'Organization', 'LocalBusiness');
    if (path.startsWith('destinations/')) {
      need('CollectionPage', 'TouristDestination', 'BreadcrumbList');
      if (has('CollectionPage') && !has('CollectionPage').dateModified) problems.push(`${rel}: the guide's date is missing from its structured data`);
      const guide = destinationData.find((d) => `destinations/${d.slug}` === path)?.guide;
      for (const part of guide ? [guide.answer[locale], ...guide.know[locale], ...guide.faq.map((f) => f.a[locale])] : []) {
        if (!text.includes(part)) problems.push(`${rel}: part of the guide is missing from the page ("${part.slice(0, 48)}…")`);
      }
    }
    if (path.startsWith('stays/') && noindex) need('VacationRental', 'BreadcrumbList');
    pageTexts.set(rel, { locale, text });

    // The picture a shared link shows, and that it was exported.
    if (!['terms', 'privacy', 'cancellation'].includes(path)) {
      const shareImage = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
      if (!shareImage) problems.push(`${rel}: no og:image for shared links`);
      else if (!(await exists(join(out, decodeURIComponent(new URL(shareImage).pathname))))) {
        problems.push(`${rel}: og:image ${shareImage} is not in the export`);
      }
    }
  }
}

// Name, address and phone: every page's footer says exactly what the structured data (and the
// Google Business Profile) says.
for (const [rel, { locale, text }] of pageTexts) {
  const n = nap[locale];
  if (!n) {
    problems.push(`${locale}/: no office in the home page's structured data to check the footers against`);
    break;
  }
  for (const part of [n.name, n.street, n.locality]) {
    if (!part || !text.includes(part)) problems.push(`${rel}: the page doesn't show "${part}" as the structured data has it`);
  }
  const phones = (text.match(/\+?\d[\d\s]{8,18}\d/g) ?? []).map(digits);
  if (!phones.includes(n.phone)) problems.push(`${rel}: the page doesn't show the phone number the structured data has`);
}

// Each destination guide is its own: no two share much wording (word 3-grams, Jaccard).
const shingles = (s) => {
  const words = s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let i = 0; i + 2 < words.length; i += 1) set.add(words.slice(i, i + 3).join(' '));
  return set;
};
let mostAlike = 0;
for (const locale of ['en', 'ar']) {
  const sets = destinationData.map((d) => {
    const g = d.guide;
    const parts = [g.answer[locale], ...g.glance.map((r) => r[locale]), ...g.know[locale], ...g.faq.flatMap((f) => [f.q[locale], f.a[locale]])];
    return { slug: d.slug, set: shingles(parts.join(' ')) };
  });
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const a = sets[i].set;
      const b = sets[j].set;
      const shared = [...a].filter((x) => b.has(x)).length;
      const alike = shared / (a.size + b.size - shared);
      mostAlike = Math.max(mostAlike, alike);
      if (alike > 0.15) problems.push(`destination guides ${sets[i].slug} and ${sets[j].slug} (${locale}) share ${Math.round(alike * 100)}% of their wording`);
    }
  }
}

// The home page's segment prefetch file. The website's pages sit in the (site) route group, which the
// router names in base64 inside the file name (__next.$d$locale.!KHNpdGUp.__PAGE__.txt).
for (const locale of ['en', 'ar']) {
  const names = await readdir(join(out, locale)).catch(() => []);
  const found = names.some((n) => /^__next\.\$d\$locale(\.![A-Za-z0-9_-]+)?\.__PAGE__\.txt$/.test(n));
  if (!found) problems.push(`${locale}/__next.$d$locale[.<group>].__PAGE__.txt: segment prefetch file missing (client navigation would 404)`);
}

// The sitemap lists every page once, with the same language links as the page itself.
const sitemap = await readFile(join(out, 'sitemap.xml'), 'utf8').catch(() => '');
const listed = new Map();
for (const block of sitemap.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '';
  const links = Object.fromEntries(
    [...block.matchAll(/<xhtml:link[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)].map((m) => [m[1], m[2]]),
  );
  if (listed.has(loc)) problems.push(`sitemap.xml: ${loc} listed twice`);
  listed.set(loc, links);
  // Only the destination guides carry a date, and it is the one the guide was checked on.
  const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? '';
  const guide = destinationData.find((d) => new RegExp(`/destinations/${d.slug}/$`).test(loc))?.guide;
  if (guide && !lastmod.startsWith(guide.updated)) problems.push(`sitemap.xml: ${loc} should carry lastmod ${guide.updated}, not ${lastmod || 'nothing'}`);
  if (!guide && lastmod) problems.push(`sitemap.xml: ${loc} carries a lastmod no one checked`);
}
for (const [loc, links] of pageLinks) {
  const inMap = listed.get(loc);
  if (!inMap) {
    problems.push(`sitemap.xml: ${loc} is missing`);
    continue;
  }
  for (const lang of ['en', 'ar', 'x-default']) {
    if (inMap[lang] !== links[lang]) problems.push(`sitemap.xml: ${loc} hreflang="${lang}" is ${inMap[lang] ?? 'missing'}, the page says ${links[lang]}`);
  }
}
for (const loc of listed.keys()) {
  if (!pageLinks.has(loc)) problems.push(`sitemap.xml: ${loc} is not one of the site's pages`);
}

for (const file of ['index.html', '404.html', 'sitemap.xml', 'robots.txt']) {
  if (!(await exists(join(out, file)))) problems.push(`${file}: missing`);
}
for (const slot of Object.keys(generated)) {
  for (const ext of ['avif', 'webp']) {
    if (!(await exists(join(out, 'img', slot, `1080.${ext}`)))) problems.push(`img/${slot}: resized ${ext} photos missing`);
  }
}

// Every photo file a page can ask for (img and source srcsets, preloads) must exist, and each
// photo offers AVIF before its WebP fallback.
let photoFiles = 0;
const seenPhotos = new Set();
const htmlFiles = ['index.html', '404.html', ...['en', 'ar'].flatMap((l) => paths.map((p) => `${l}/${p ? `${p}/` : ''}index.html`))];
for (const rel of htmlFiles) {
  const html = await readFile(join(out, rel), 'utf8').catch(() => '');
  const sets = [...html.matchAll(/\b(?:srcSet|srcset|imageSrcSet|imagesrcset)="([^"]+)"|\bsrc="(\/img\/[^"]+)"/g)];
  for (const [, set, single] of sets) {
    for (const url of (set ?? single).split(',').map((part) => part.trim().split(/\s+/)[0])) {
      if (!url.startsWith('/img/') || seenPhotos.has(url)) continue;
      seenPhotos.add(url);
      photoFiles += 1;
      if (!(await exists(join(out, url)))) problems.push(`${rel}: ${url} is missing from out/`);
    }
  }
  const pictures = html.match(/<picture\b[\s\S]*?<\/picture>/g) ?? [];
  for (const picture of pictures) {
    if (!/<source type="image\/avif"/.test(picture)) problems.push(`${rel}: a photo has no AVIF source`);
  }
  if (/<img\b(?![^>]*\bsrc="data:)[^>]*\bsrc="\/img\//.test(html.replace(/<picture\b[\s\S]*?<\/picture>/g, ''))) {
    problems.push(`${rel}: a photo is outside <picture>, so it has no AVIF`);
  }
}

if (problems.length) {
  console.error(`check-export: ${problems.length} problem(s) in ${pages} pages\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `check-export: ${pages} pages in en and ar, lang/dir, canonicals, hreflang pairs and x-default, og:locale, the sitemap's ${listed.size} entries, titles and descriptions, one h1 each, ${graphs} structured data blocks, name/address/phone on every page, share images, robots, and ${photoFiles} photo files (AVIF first, WebP fallback) all OK; the most alike destination guides share ${Math.round(mostAlike * 100)}% of their wording`,
);
