# Escape Away website

The Escape Away site in Arabic and English. It runs today as a standalone demo in inquiry mode (requests go to WhatsApp and a Google Sheet) and is built so the booking system plugs in later without redesigning a page.

- Product context: [PRODUCT.md](PRODUCT.md)
- Design system: [DESIGN.md](DESIGN.md), tokens in [design/tokens.css](design/tokens.css), base layer in [design/base.css](design/base.css), visual preview in [design/tokens-preview.html](design/tokens-preview.html)

## Run it

Node 22 or newer.

```bash
npm install
npm run dev            # http://localhost:3000, redirects to /en/ or /ar/
npm run build          # static export into out/ (pre-resizes photos first)
npm run serve:out      # serve out/ like GitHub Pages (gzip, AVIF), http://127.0.0.1:4174
npm run check:export   # every page in both languages: lang/dir, canonical, hreflang, titles, noindex, photos
npm run test:forms     # the forms' sheet script, run in Node: rows, scores, alerts, refusals
npm run test:arabic    # Arabic search folding, place search, and en/ar messages in step
```

Copy `.env.example` to `.env.local` to change the site URL, the WhatsApp number, the Mapbox token or the form endpoint.

## Where things live

| What | Where |
| --- | --- |
| Units (the shape of the System Blueprint's units table) | `data/units.json` |
| Destinations, their intros and local guides | `data/destinations.json` |
| Arabic names of compounds | `data/compounds.json` |
| Guest reviews (real ones only; a home's code, or null for Escape Away itself) | `data/reviews.json` |
| Photo slots: source, credit, licence, alt text in both languages | `data/images.json` |
| All interface copy, English and Arabic | `src/messages/en.json`, `src/messages/ar.json` |
| The forms' Google Sheet script and its setup | `apps-script/` |
| The Google Business Profile for the Katameya office, ready to paste | `docs/google-business-profile.md` |
| Pages | `src/app/[locale]/…` |

Photos are pre-resized at build by `scripts/images.mjs` into `public/img/<slot>/<width>.avif` and `.webp` (320 to 1920 px wide). Pages offer the AVIF first, about 40% lighter at the same look, and browsers that can't show it take the WebP (`src/components/slot-image.tsx`). A fresh run encodes every width in both formats and takes a few minutes; later runs only redo photos whose original changed, and the GitHub workflow keeps the resized files between deploys. To swap a stock photo for one of Escape Away's own, set the slot's `"file"` to the original in the repo and its `"status"` to `"original"`.

The EA mark comes from the client's own file. `node scripts/icons.mjs` rebuilds the favicon, the touch icon, the full-size mark and the small mask the header, footer and map draw it with, all from `design/assets/ea-mark.png`; run it again when the vector logo arrives.

## The stays map

The explorer on the homepage (list, map with price pins and EA clusters, filters) reads the same address as the hero search, so every search and filter can be shared as a link.

- **Without a Mapbox token** (the default): the map runs on MapLibre GL JS, Mapbox GL's open-source twin, with OpenFreeMap's free tiles. No account, no key, no usage limit; the map credits OpenFreeMap, OpenMapTiles and OpenStreetMap in its corner.
- **With a token**: set `NEXT_PUBLIC_MAPBOX_TOKEN` to a public `pk.` token (in Mapbox, limit it to the site's address) and rebuild. The same explorer then uses Mapbox GL JS on Mapbox's light style, recoloured to the brand palette. This path has not been tried with a real token yet; check it once one exists.
- The map library, its stylesheet and its worker load only when the map is about to be seen. Clustering is Supercluster. The basemap colours are the `--map-*` tokens in `design/tokens.css`.
- Pins are approximate on purpose (`pinApprox` in `data/units.json`). A pin shows the starting price once `fromPriceEgp` is set, and the kind of home until then. The price filter appears once two or more units have a price.
- Any server for the static export must send `.mjs` files as JavaScript (GitHub Pages and `next start` do; `npm run serve:out` does too), or the map's worker can't start and the map shows its "didn't load" state.

## Saved stays and the header search

- **Saved stays.** The heart on every card and listing saves a stay on the guest's device (`localStorage`, key `ea-saved`; `src/lib/saved.ts`). There's no account and nothing is sent anywhere; where storage is blocked, the list lasts the visit. The explorer's Saved chip shows only the saved stays, and the list it shows is fixed when it's turned on, so un-hearting a stay there doesn't pull its card away.
- **The header search.** Once the hero's search has scrolled away, the header shows the search as a pill (place, dates, guests) that opens the same search bar in a panel: `src/components/search/compact-search.tsx`, mounted on the homepage. Esc closes an open calendar first, then the panel.

## Arabic

`/ar` is the whole site in Arabic, right to left, written separately rather than translated (a mix: clear standard Arabic for headings and policies, Egyptian warmth in short lines, buttons and WhatsApp messages; gender-neutral wherever the guest or owner is the one speaking).

- **Layout** mirrors through logical properties; arrows, the calendar, the photo viewer, the destinations scroll and the map's controls all flip. Codes, phone numbers, emails, links and the company's Latin name are isolated so they read left to right inside Arabic.
- **Digits** are Western on both sides by design, set through the locale (`ar-EG-u-nu-latn`). Arabic-Indic digits typed into a form or the search are read as Western ones.
- **Search** folds the ways people type a name: the forms of alef, taa marbuta and yaa, hamza seats, diacritics and tatweel, and the Persian letter forms some keyboards send. Other names for an area (Sahel, التجمع…) are `aliases` in `data/destinations.json`.
- **Language links**: every page names itself and its twin with `hreflang`, English as `x-default`, and the sitemap lists the same pairs; `npm run check:export` fails if any of them drift. Switching language keeps the search in the address.
- `npm run test:arabic` checks the folding, searches the real places in both languages, and keeps `src/messages/en.json` and `ar.json` in step: the same keys, placeholders and rich-text tags, Western digits, and Arabic punctuation (، ؟ ؛) next to Arabic words.

## Search, maps and AI answers

The demo carries noindex until go-live, but every page is already built to be found and quoted.

- **The Katameya office.** One set of details is used everywhere: the name, address and phone in `site.office` (`src/lib/site.ts`). That is the footer on every page, the contact page and the structured data, and it must stay identical to the Google Business Profile. The profile itself is Escape Away's to create; [docs/google-business-profile.md](docs/google-business-profile.md) has every field to paste, in both languages. After Google verifies it, set `NEXT_PUBLIC_GBP_URL` (repository variable `GBP_URL`) to the profile's link, and copy its pin and hours into `office.geo` and `office.hours`.
- **Structured data.**
  - The home page carries the site, the company (Organization) and its office (LocalBusiness). The contact page carries the office.
  - Each destination carries its guide (with its date), the place, the trail and its stays.
  - Each listing carries the home and the trail. Sample listings get none on the live site.
  - Ratings come only from real reviews.
- **Destination pages** (`/destinations/<area>`) each have their own short guide in `data/destinations.json`, written separately in both languages:
  - an answer up top that stands on its own (what the place is, which homes, who they suit)
  - facts at a glance
  - what to know before going
  - the questions people ask about that place
  - the area's stays on the map and as cards

  Each guide has an `updated` date that shows on the page and in the sitemap; change it when the guide changes. The facts come from the company profile and from public sources: drive times are typical and rounded. The team should read every guide before go-live.
- **For AI answers.** Every page is plain HTML from the build. Each page answers its main question first, in sentences that make sense when quoted alone. The company is described in one paragraph (`meta.about`), the same words as the first answer in the homepage FAQ and the structured data.
  - **Robots.** `robots.txt` lets every crawler in. That includes the search crawlers behind AI answers (OAI-SearchBot, Claude-SearchBot, PerplexityBot, Bingbot). It also lets in the crawlers that collect training data (GPTBot, ClaudeBot, Google-Extended, CCBot). Blocking those is Escape Away's call, and it would not affect search.
  - **No `llms.txt`.** Google says it doesn't use one, and nothing yet shows other AI search tools rely on it.
- `npm run check:export` checks every page for the following, and fails if any one drifts:
  - a title and a description of its own, at a length search results show
  - one h1
  - structured data that parses and says what the page is
  - the footer's name, address and phone matching the structured data
  - a share image that exists
  - every photo file a page can ask for (both formats, every width) present in `out/`, each photo offering AVIF first
  - destination guides that don't read alike (it fails if two share more than 15% of their wording)

## Speed

Measured in step 9 on a simulated mid-range phone (slow 4G, 4x slower CPU), the homepage's main photo now
shows in 2.4 s in English and 2.5 s in Arabic, down from 3.5 s, and the destination, listing and owners
pages in 2.1 to 2.2 s; nothing on the first screen jumps while it loads. The full numbers, conditions and limits are in
[docs/quality-gate.md](docs/quality-gate.md). What keeps it there:

- **Photos**: AVIF first with a WebP fallback, a 640 px width for phones, and only the hero (or a listing's
  first photo) preloaded and fetched early. Every other photo waits until it is near.
- **Fonts**: only the body face (Jost) is preloaded. The display face (Fraunces, 120 KB) arrives after the
  first paint, and Arabic pages never download it: English quoted inside an Arabic page keeps Alexandria.
  English pages never download the Arabic font for the language switch's one word.
- **No blocking script**: layouts that need JavaScript switch on with `@media (scripting: enabled)` in
  CSS, so the page parses and paints in one pass instead of jumping. If the motion code fails to load,
  `html.no-motion` puts the plain layouts back.
- **The footer, and the homepage's owner section and questions,** lay out only when the reader nears
  them, and a closed popover isn't laid out at all (`content-visibility`). The scroll scenes measure
  again whenever the page's height changes.
- **Cropping a photo**: a slot in `data/images.json` can carry `"crop": { "right": 0.095 }` (fractions of
  each edge); `npm run images` makes that slot's files again.
- After launch, measure real visitors (PageSpeed Insights on the live address, or the `web-vitals`
  library), since a lab run on a local server can't show what GitHub Pages' HTTP/2 does.

## The forms

Two forms, both in Arabic and English, both ending on a WhatsApp message that's already written:

- **Request to book** (listing pages). The home, dates and guests come from the page; the guest adds a name, a WhatsApp number, an email and an optional note. On sending, the request goes to the team's Google Sheet and the guest sees "Continue on WhatsApp" with the home, code, dates, guests and the request's reference written in. A centred panel from laptops up, a bottom sheet on phones.
- **The owner form** (homepage owner section and `/owners`). Three short steps: the estimator (area, type, bedrooms, furnished), the details (compound, size, how ready, when it could take guests, photos), then the owner (name, WhatsApp, optional email, lives in Egypt or abroad). It ends on a thank-you screen with what to have ready. Answers survive a reload in the same tab.

Both post to a Google Apps Script web app that writes to the sheet, scores owner leads out of 100 (location demand, unit readiness, timeline) and routes them hot, warm, cool or nurture. Setup, scoring and safety: [apps-script/README.md](apps-script/README.md). Without an endpoint (`NEXT_PUBLIC_FORM_ENDPOINT` empty), the forms skip the sheet and WhatsApp carries everything the visitor typed; if the sheet can't be reached, they say so and offer the same.

Phone numbers may be typed the Egyptian way (010…) or with a country code, in Western or Arabic digits. A hidden field catches bots. Form events go to `window.dataLayer` once analytics is added. Still for Escape Away to decide: the reply-time promise under "Send request" (`replyPromise` in `src/lib/site.ts`, hidden while empty), who receives owner leads (`NEXT_PUBLIC_OWNER_WHATSAPP`), and the "what to have ready" list, written as a draft.

## Deploy

**Live, GitHub Pages.** Push to `main` of `escape-away/escape-away.github.io`, with Pages set to "GitHub Actions". The workflow in `.github/workflows/deploy-pages.yml` builds, checks every page and publishes. The site's address (canonicals, sitemap, share links) comes from the Pages settings: `https://www.escape-away.com` once that custom domain is set there, `https://escape-away.github.io` without one, so connecting or removing the domain needs only a new deploy. Search engines may list it; the system pages (`/admin`) are noindex. Optional repository variables: `WHATSAPP_NUMBER`, `OWNER_WHATSAPP_NUMBER`, `MAPBOX_TOKEN`, `FORM_ENDPOINT`, `GBP_URL`. The domain's DNS, its switch and how to undo it: `../backup/README.md` in the project folder.

**Live, GoDaddy Node.js Hosting.** Same code, server build:

```bash
npm run build:node
npm start              # listens on process.env.PORT
```

Set `NEXT_PUBLIC_SITE_URL` to the real domain and `NEXT_PUBLIC_NOINDEX=false`, choose the Europe region, and keep email records at GoDaddy as they are.

## House rules

- Layout uses logical properties only (start and end, never left and right), so Arabic mirrors for free.
- Only the brand palette exists as Tailwind colours; the default palette is switched off.
- Prices and dates use Western digits in both languages through the locale, never hard-coded.
- Real numbers only, from the company profile. Stock photos never stand for a real unit on the live site.
- The client's source files (company profile, decks, briefs, original logo) stay out of the repo; `.gitignore` covers them.
