# Quality gate (step 9)

The checks the demo had to pass before the client sees it, with the brief's thresholds: speed
(core-web-vitals), WCAG 2.2 AA (accessibility), a design critique and a technical audit (impeccable),
and the taste-skill finish check. Run on 2026-11-20/21 against the static export (`npm run build`,
served by `npm run serve:out`).

## Speed

The brief's targets are for real visits at the 75th percentile: LCP 2.5 s or less, INP 200 ms or less,
CLS 0.1 or less. The demo isn't online yet, so there is no field data; these are lab measurements.

**Conditions.** Chrome DevTools performance traces. Phone viewport 412 × 823 at 1.75x, "Slow 4G"
(DevTools' preset, close to Lighthouse's mobile network), CPU slowed 4x on the test machine. That
machine is a 2014 laptop, so 4x is a slower phone than Lighthouse's reference one. The site was served
locally over HTTP/1.1, where the photo, the stylesheet and the JavaScript share the connection's
bandwidth evenly. GitHub Pages serves HTTP/2 with priorities, so there the photo and the stylesheet go
first. Expect the live site to be faster than these numbers, and measure it once it's online.

### Largest paint (LCP) and layout shift (CLS)

| Page (phone) | LCP before | LCP after | CLS after |
|---|---|---|---|
| Home, English | 3.50 s | 2.40 s | 0.03 |
| Home, Arabic | 3.53 s | 2.50 s | 0.00 |
| Destination (North Coast) | 2.33 s | 2.18 s | 0.00 |
| Listing (Marassi chalet) | 2.28 s | 2.23 s | 0.00 |
| Owners | 2.33 s | 2.10 s | 0.00 |

The homepages were measured last, after every change below (the other pages before the last three,
which only help them). Both homepages now meet the lab target, in conditions slower than a phone on
GitHub Pages. The Arabic one was 2.64 s until the polish pass. Its first layout of the whole page took
540 ms on this CPU, so the hero photo, which had arrived at 2.2 s, waited behind it. Laying out the owner
section, the questions and closed popovers only when they're needed brought it to 2.50 s. What remains is
bandwidth: about 180 KB of framework JavaScript (React and Next.js, about 120 KB of it) downloads at the
same time as the hero photo over the local HTTP/1.1 connection.

A layout shift of up to 0.41 was found and removed on the homepage. A script at the top of every page
paused reading of the page until the stylesheet arrived. On a slow connection the browser could then
paint half the hero: the text first, then the photo frame dropped in above it and pushed everything
down about 250 px. The script is gone, and the layouts it switched on now use CSS
(`@media (scripting: enabled)`).

### Response to taps (INP), same phone profile

| Interaction | Time |
|---|---|
| Open dates, open guests, type in Where | 40–72 ms |
| Search (Enter in Where) | 112 ms |
| Area chips in the explorer | 136–200 ms |
| Open Filters | 154 ms the first time on a fresh page (English and Arabic); 123 ms after that |
| Private pool, Villa, close Filters | 80–120 ms |
| Card to listing | 188 ms |

Every interaction is under the 200 ms target. The first opening of Filters was the last one over it, at
246–298 ms. The browser was restyling the page for the modal sheet and styling and laying out the sheet
for the first time, and that first layout alone took 50 ms of the tap.
- The polish pass removed a second forced layout: focus now lands through the dialog's own `autofocus`.
  It also counts the filter choices before the sheet opens.
- A follow-up lays the sheet out once, out of sight. This happens while the page is idle and the list is
  near the screen, so the first tap's layout drops to 7 ms. The first opening now takes 154 ms.

### What changed for speed

1. **Photos**: AVIF first with a WebP fallback (about 40% lighter: the hero went from 67 KB to 39 KB on
   phones), plus a 640 px width for phones that used to get the 768 px file. `check:export` now checks
   all 448 photo files the pages can ask for.
2. **Fonts**: the display face (Fraunces, 120 KB) is no longer preloaded. Arabic pages don't download it
   at all, and English pages no longer download the Arabic font for the language switch's one word.
   Arabic pages' fonts went from 232 KB to 86 KB.
3. **No parser-blocking script** (the layout-shift fix above).
4. **Footer**: lays out when the reader nears it, so its photo credits no longer pull an extended-Latin
   font file on every load.
5. **Logo**: a 3 KB copy of the client's mark at the size the header draws it, instead of the 10 KB
   original (which stays as the logo in the structured data).
6. **Preview server**: `npm run serve:out` now gzips and serves AVIF, like GitHub Pages.
7. **One photo preload per page, for that page only.** The hero's preload sits in `<head>` (React only
   lifts a `<link>` that has an `href`), drawn by a small client component. Rendered from a server
   component, the same `<link>` became a hint inside the page data Next.js prefetches for every link on
   screen, so the homepage was also downloading the owners and destination heroes. No page data carries
   a photo hint now (all 169 files checked).

8. **Laid out when near** (polish pass): the homepage's owner section and questions, and every closed
   popover (the hero calendar alone holds 70 days), skip layout until they're needed
   (`content-visibility`). The Arabic homepage's first layout went from 764 ms to 607 ms on this CPU.
   The scroll scenes measure again when the page's height changes, so the turn to navy stays in time.

Tried and not kept: inlining the CSS into each page (Next.js's experimental `inlineCss`). It tripled the
page's HTML (27 KB to 82 KB) and made the homepage slower (2.87 s).

### Still open for speed

- Split the below-the-fold islands (the owner form, the filter sheet) out of the first JavaScript load,
  to cut download contention and hydration work.
- Preload each language's own font (Alexandria on Arabic pages, Jost on English ones). That needs
  self-hosted font files; revisit with the live site's licensed fonts (Recoleta, Garet).
- GitHub Pages caches every file for 10 minutes and can't be told otherwise. `next start` on GoDaddy
  caches the hashed files for a year.
- After launch: PageSpeed Insights on the live address, and real-visitor measurement (`web-vitals`).

## Accessibility (WCAG 2.2 AA)

**Automated.** Lighthouse (axe-core) Accessibility 100 on the English and Arabic homepages, a listing, an
Arabic destination, the Arabic owners page, contact, the Arabic terms, the 404 and the root page. Best
Practices 100 and Agentic Browsing 100 on all of them. SEO scores 66 to 69 only because the demo is
noindex on purpose.

**By hand**, at phone and desktop widths, in both languages:

- **Map without dragging (2.5.7).** Zoom in, zoom out and fit buttons (44 × 44 px), clusters that zoom
  in when tapped (52 × 52 px), pins that are buttons (32 px tall), and a list that always shows the same
  stays as the map.
- **Focus not hidden (2.4.11).** No focused control is hidden by the sticky header or the listing's
  request bar (75 px), and the skip link shows on top even halfway down the page.
- **Target size (2.5.8).** Every control is at least 24 × 24 px or spaced well enough. The map's credit
  links, small text in one line, were padded to 25 px anyway.
- **No re-typing (3.3.7).** Dates and guests chosen on a listing arrive in the request form's summary,
  with "Change dates or guests" beside them.
- **Dialogs.** The request form, photo viewer and filter sheet keep Tab inside, close with Esc and
  return focus to the button that opened them. Arrow keys move the photos, and the photo count is
  announced.
- **Form errors.** Focus moves to the first missing answer, which says what to fix.
- **Contrast.** No text sits on a photo; the sticky header is solid cream.

**Fixed in this step:**

- Required fields now say so with `aria-required`. The native attribute made Chrome announce the empty
  "Where is it?" choice as invalid before an owner had touched it.
- The photo buttons' names had a double full stop.
- The 404 page gained its own title and description.

## Design critique and technical audit

### Design critique (impeccable, two independent reviewers)

**30/40, Good**, for the homepage, a destination, a listing, /owners and contact, in both languages, on
phone and desktop. Strongest: error recovery (4/4). Weakest: flexibility (2/4), because past the hero
there was no way to change dates or guests. No P0s, three P1s, two P2s. You chose to fix all of them and
to build the two promised features that were missing. Each fix was checked in the built site.

| Finding | What changed |
|---|---|
| [P1] /owners promised an estimate it didn't give, and showed no proof | Rebuilt: a finished home beside the promise; the three real figures (400+ homes, EGP 50M in 2025, 24/7); the reassurance near the top (a minute, phone photos, a video call from abroad); Design, Style and Manage in arches; a line for each of the eight steps; the owners' questions. The button now says "Ask for an estimate", and both forms' endings say the request isn't with the team until it's sent on WhatsApp, and who replies there. |
| [P1] Arabic card titles lost the dots under a final ي | Room under every clamped title, and a taller line for Arabic. No Arabic title clips now. |
| [P1] The photo viewer showed half a photo | The AVIF `<source>` no longer takes a place in the viewer's grid. Photos show whole. |
| [P2] The phone search was fiddly | Values are 16 px on touch screens, so iPhones don't zoom. The When and Who labels open their panels. Guests has a Done button and lines up with its field. An opened panel scrolls into view. The focus ring goes round the whole field, and the date range is filled in sand. |
| [P2] The explorer could contradict the screen | The map card closes when a cluster opens. The phone booking bar says "Sleeps up to 2 guests" when the party is bigger. "More stays" offers only homes that sleep the party. At zero results, "Clear filters" is the main button, and "Clear search" shows only when there's a search to clear. |
| Not built: the wishlist and the compact search | Built. A heart on every card and listing saves a stay on the device, and a Saved chip in the explorer shows them. Past the hero, the header carries the search as a pill that opens it in a panel. |

Also fixed: after the WhatsApp hand-off, the owner form no longer reopens at step 3 with the name filled
in, and a listing's facts sit two by two on phones instead of wrapping with a stray "·".

**The critique's minor items** were then taken up in a polish pass, and each was checked in the built
site:

- The contact page's phone and email links are navy and underlined, 44 px tall.
- The header's WhatsApp button is outlined, so each page's own main action is its one filled button.
- Every filter choice shows how many stays it would leave; a choice that would leave none is dashed.
- A single stay is framed with its stretch of coast or city around it, not street by street.
- The map:
  - the credits are one small line on shell;
  - the English map hides names it has no English spelling for, instead of showing Arabic;
  - country names are hidden, so none is cut at the edge of the Egypt view.
- "Escape Away" no longer breaks across lines inside Arabic text, and English uses curly apostrophes throughout.
- Phones get DESIGN.md's full-screen menu: a modal with large links, WhatsApp and the language switch. Without JavaScript, Menu jumps to the footer.
- The phone footer went from 1,523 px to about 1,050:
  - the two link lists sit side by side;
  - the photo credits fold into one line that opens.
- The Marassi photo is cropped clear of the dark pillar on its edge. `data/images.json` now takes a `crop` per photo.
- A destination with fewer stays than a row holds fills the rest with a note: more homes are coming, and the team (400+ homes) answers on WhatsApp.
- The guest steppers use the site's drawn plus and minus icons instead of typed characters.

Found while checking: the scroll scenes measured their positions once, so a change in the explorer's
results could make the turn to navy fire at the wrong point. They now measure again when the page's
height changes.

**Still the client's call:**

- the order of the homepage's questions and owner section;
- Egyptian-coast stand-ins for the hero and North Coast photos (or the real photos);
- the Google Sheet endpoint, without which both forms end on WhatsApp.

### Technical audit (impeccable)

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 | WCAG 2.2 AA met on every page checked (Lighthouse 100, and the four rules by hand); not yet tried with a screen reader on a phone |
| 2 | Performance | 3 | Lab LCP 2.10–2.48 s, except the Arabic homepage at 2.64 s; opening Filters takes 216 ms on a slow CPU |
| 3 | Theming | 3 | Brand tokens only (Tailwind's palette is reset to the brand's); light only, by design |
| 4 | Responsive design | 3 | 375 px to desktop in both directions; map gestures and the chip row's swipe not tried with real touch |
| 5 | Implementation integrity | 4 | Detector clean; a product-specific system throughout |
| **Total** | | **16/20** | **Good** |

**Verdict: pass.** The bundled detector finds nothing in the changed files. Its two advisory colours (a
new backdrop shade and a white disc) now use the house espresso scrim and the surface token. In the
critique, its 14 page scans found one real issue (long lines, fixed) and one known false positive (the
cream ground). The system is Escape Away's own:

- the arch crop;
- navy as the only tap colour, and the turn to navy for owners;
- the EA mark in map clusters;
- two-weight headlines in Fraunces and Alexandria;
- "Sample listing" wherever a stand-in appears.

**Findings:** no P0 or P1 findings, two P2s, two P3s.

- **[P2] The Arabic homepage's LCP is 2.64 s in the lab** (target 2.5 s; English 2.48 s).
  - Where: `/ar`, the hero photo.
  - Why: the framework JavaScript (about 180 KB) shares the connection with the photo, and Arabic text adds about 0.16 s of render delay.
  - Fix: split the owner form and the filter sheet out of the first load, then measure again on GitHub Pages (HTTP/2).
  - Command: `/impeccable optimize`.
- **[P2] Opening Filters takes 216 ms** on the 4× slower CPU (target 200 ms).
  - Where: `filter-sheet.tsx`.
  - Why: nearly all of it is rendering the sheet after it opens.
  - Fix: keep the sheet's body rendered and hidden, or render its sections in two passes.
  - Command: `/impeccable optimize`.
- **[P3] The contact page's phone and email links don't look like links.**
  - Fix: underline them, or give them the link style used in the footer.
  - Command: `/impeccable polish`.
- **[P3] A few small places on the English map keep Arabic names.**
  - Why: the style already asks for English first, but OpenFreeMap's data has no English name for some villages, so their Arabic name shows.
  - Fix: hide village labels on the English map at the zooms where this happens, or leave the real names.
  - Command: `/impeccable polish`.

**Patterns.** None systemic. Hard-coded colours are limited to espresso-based shadows and scrims, and one
value repeats in three files.

**Working well:**

- Logical properties throughout, so Arabic mirrors without overrides.
- Every control is 44 px or more, except the 32 px price pins.
- Native `<dialog>` everywhere, with focus returned to the opener.
- State in the address, and the forms' drafts saved.
- AVIF photos with exact `sizes`.
- No layout-shift sources.

**Recommended next:**

1. [P2] `/impeccable optimize`: split the below-the-fold islands out of the first load; make Filters open in under 200 ms.
2. [P3] `/impeccable polish`: the contact links, the map's village labels, and the critique's open items above.

**After the polish pass:**

- Fixed:
  - the Arabic homepage's LCP (2.50 s);
  - the contact links;
  - the map's Arabic village names on the English map.
- Fixed in a follow-up: the first opening of Filters (154 ms, from 246–298 ms). The sheet is now laid out once while the page is idle.
- Lighthouse Accessibility, Best Practices and Agentic Browsing: still 100 on the English homepage (phone), an Arabic destination and contact.
- The detector's one note is the map credits' 11 px text. It is a deliberate exception, written into DESIGN.md.

**Not covered:**

- A screen reader on a real phone (VoiceOver, TalkBack).
- Touch gestures on a real phone.
- Field data, until the site is live.


## Taste-skill finish check

The taste skill's own scripts, run directly against the built pages. Its finish gate wasn't armed: it
grades pages built from its own kit, and this site isn't.

- **Copy lint**:
  - Home: the one fail ("unparalleled") and the "!" both come from the real guest review in the company profile, which is quoted exactly.
  - Its "stat strip" warning was the date picker's day numbers.
  - Owners, a destination and contact: no fails or warnings.
  - "In the heart of the city" was replaced with "Cairo and Sheikh Zayed".
- **Layout** at 1440, 820 and 390 px:
  - Its structural findings (edge lines, sections exactly one or two screens) compare against its own grid, and this site keeps its own design.
  - On a phone, the hero's search and its button are fully on the first screen.
- **Speed**: images pass (none unsized, unlazy or oversized); CLS 0.008.
  - The "JavaScript parsed" fail at 1440 px is the map library, loaded when the reader reaches the map.
  - The "four font families" fail counts the fallback faces next/font generates: there are two web fonts in three files.
- **Fixed from the visual check**:
  - The footer email broke mid-address at 1024 px. It now breaks after the "@".
  - The "on navy" button's hover used an off-palette cream; it now uses shell.

