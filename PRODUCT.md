# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Set by the brief, "Escape Away Website: Standalone Demo (No System)" (Nov 19, 2026):

- Next.js App Router, exported as static files (`output: 'export'`) for GitHub Pages as a user site with no basePath. The demo is noindex.
- next-intl with `/ar` and `/en`, full right-to-left layout. Tailwind with logical properties (start and end, never left and right).
- GSAP + ScrollTrigger and Lenis, loaded after the first scroll. Mapbox GL JS + Supercluster for the map; until a Mapbox token exists the same map runs on MapLibre GL JS with OpenFreeMap's free tiles.
- Units read from `data/units.json`, generated from a Google Sheet at build time. Photos pre-resized at build.
- Forms post to a Google Apps Script endpoint that writes to Google Sheets, plus a prefilled WhatsApp link.
- GA4, Meta Pixel and Microsoft Clarity.
- Portable to GoDaddy Node.js Hosting after approval: build and start scripts, `process.env.PORT`, outbound HTTPS only, no SMTP. Region Europe.
- Fonts: Recoleta and Garet on the live site; Fraunces and Jost as free stand-ins in the public demo repo.

## Users

- **Guests.** All four groups confirmed (Nov 19, 2026): Egyptians in Egypt, Egyptians abroad, Gulf visitors and international travellers. They book city escapes, seaside stays and family and group stays in Cairo, Sheikh Zayed, the North Coast, El Alamein and Gouna, mostly on a phone, usually comparing against Airbnb and Booking.com.
- **Unit owners.** People with an apartment, chalet or villa in a compound, some of them living abroad, who want it designed, furnished and managed, or already furnished and only managed. They often arrive from Instagram ads and WhatsApp links that point at `/owners`.
- **The Escape Away team.** Receives booking requests and owner leads on WhatsApp and in a Google Sheet, checks the unit's Airbnb and Booking.com calendars, replies, and sends a Paymob payment link by hand.
- **The client.** Escape Away's decision-maker is the demo's first audience and clicks through it on a phone during the pitch for the booking system.

## Product Purpose

Escape Away's own website, built before its booking system exists. Today it runs in inquiry mode: guests find a unit and send a booking request that lands with the team on WhatsApp and in a sheet; owners estimate earnings and submit their unit. It doubles as the demo that makes the case for building the system first.

Success: guests can find and request a stay in either language without help, owners submit complete unit details, the client sees the finished experience on a phone, and the system later plugs in without redesigning a page.

## Positioning

One company prepares and runs every home from start to finish: design (2D and 3D planning), furnishing and styling, listing, guest communication, housekeeping, maintenance and owner reporting. It has 400+ managed units across five destinations and 24/7 guest support. Booking direct means booking with the team that set up the home. For owners, it is a full-service way to host ("More Than A Stay. A Better Way To Host." in the company profile).

## Operating Context

- Units are also listed on Airbnb, Booking.com, Google, Agoda and Property Finder. Availability lives in those calendars until the system arrives.
- Collections in the company profile: City Escapes ("In the heart of the city"), Seaside Stays ("Wake up to the sea"), Family & Group Stays ("Room for everyone").
- Holiday escapes (Gouna, North Coast): studios, 1 to 6 bedroom apartments and villas, 25 to 600 sqm, short stays. City living (New Cairo): studios and 1 to 2 bedroom apartments, 35 to 100 sqm, short and medium stays.
- Unit mix from the profile: 1-bedroom 35.3%, 2-bedroom 27.4%, studios 17.4%, 3-bedroom+ 12.4%, villas 7.5%.
- Payment is a Paymob link sent by the team after it confirms availability. Later: Paymob checkout on the site with a hold on the dates.
- Office: Katameya Dunes, Office 42 (New Cairo). Phone +20 100 700 9505. Email escapeawayhospitality@gmail.com. Instagram @escapeawayhospitality.

## Capabilities and Constraints

- Works now (inquiry mode): one-scroll homepage, map with "from" price pins and clusters, all filters, full listing pages, request to book (short form plus prefilled WhatsApp message), the full owner section with estimator and form, `/ar` and `/en`, curated reviews, a wishlist saved on the device (hearts on every card and listing, and a Saved chip in the explorer), and the search kept in the header past the hero.
- Waits for the system: live calendars, dated prices and all-in totals, instant booking with Paymob checkout, reviews pulled from the system, guest accounts, leads into an owner CRM.
- Pages: home (one scroll), `/stays/[unit]`, `/destinations/[area]` for Cairo, Sheikh Zayed, North Coast, El Alamein and Gouna, `/owners`, and legal (terms, privacy, cancellation and refund policy, contact). Each in `/en` and `/ar`.
- Unit data matches the System Blueprint's units table. Only an approximate pin is published; exact addresses never enter the website files. Prices are "from" prices per night, labelled as starting prices.
- Undecided: the reply-time promise on the request button, the WhatsApp number that receives booking requests, who receives owner leads, the list of what owners should have ready (drafted on the site), the scoring points for owner leads (defaults set), the privacy policy text, the book-direct perks, the domain for the demo, and the 20 to 30 demo units.
- Undecided for search (step 8):
  - whether visitors can come to the Katameya office, and its opening hours
  - the office's map pin, which comes from the Google Business Profile once Google verifies it
  - which language the profile's one description uses (Arabic suggested)
  - whether AI training crawlers may read the site (search crawlers stay allowed either way)
  - the team's read of the five destination guides, which are drafted from the company profile and public facts
- Search setup (step 8):
  - The Google Business Profile for the office is ready to paste in `docs/google-business-profile.md`. Escape Away creates and verifies it in its own Google account.
  - The site's name, address and phone come from one place (`site.office`) and are checked on every page.
- After launch (step 9, `docs/quality-gate.md`):
  - Speed was measured in the lab only. Once the demo is online, run PageSpeed Insights on the live address, and add real-visitor measurement with the analytics (the `web-vitals` library) to confirm the 75th-percentile targets.
  - The live site's licensed fonts (Recoleta, Garet) replace the stand-ins. Each language should then preload its own font, which needs the font files hosted with the site.

## Brand Commitments

- Name: Escape Away (Escape Away Hospitality). The exact EA monogram from the client's files, never redrawn, traced or recreated with AI. It also appears in the map's cluster bubbles and loading states.
- Palette from the company profile: cream #F4ECDF, sand #DBC9B3, navy #003C82 for actions, espresso brown #3B2D21 for text. Accents from the pitch deck the client liked: navy fields for the owner section and footer, a short warm-gold rule under section titles, ice blue for small details on dark grounds.
- Type: Recoleta and Garet on the live site. The arch from the company profile photography is the one signature shape: it frames the hero, the photo crops and the owner journey.
- Photography leads: free stock now (Unsplash, Pexels), replaced slot by slot with Escape Away's originals. No AI images. No WebGL or shader effects.
- Voice: plain, specific and warm, written separately in Arabic and English rather than translated. Arabic drafts use a mix until the client approves the tone: clear standard Arabic for headings, listings and policies, with Egyptian warmth in short lines, buttons and WhatsApp messages (chosen Nov 19, 2026).
- Only real numbers, the ones in the company profile.
- The pitch deck is confidential: it is a design reference only, and none of its content is used.

## Evidence on Hand

- `Escape Away Hospitality Company Profile.pdf`: 400+ managed units, EGP 50M revenue generated in 2025, 24/7 guest support; growth from 2022 to 2025; the five destinations; services (interior design, guest experience, property management); "what we manage" (reservations, interior styling, maintenance, listing management, housekeeping, guest communication, photography, pricing); the eight-step hospitality journey (property, design, photography, listing, bookings, guest experience, operations, reporting); guest promises (fast check-in, hotel-quality bedding, professional cleaning, luxury amenities, 24/7 concierge, smart home integration); communities named with unit counts (El Safwa, Emaar, SODIC, Al-Futtaim, Swan Lake, Al-Alamein Towers); one guest quote ("A truly exceptional stay…", Abdallah, Luxury Traveler).
- `EA Logo.PNG`: raster EA monogram, black on white, 1080 × 1350. The vector (SVG or PDF) and a transparent PNG are still to come from the client.
- The pitch deck (kept out of the repo): design reference only, confidential.
- Not yet on hand, never to be invented: the demo units and their real photos, 5 to 10 real guest reviews, the request WhatsApp number and reply-time promise, book-direct perks, the Arabic tone approval, licences for Recoleta and Garet, and permission to show partner communities' logos.

## Product Principles

1. **Show the action, not a link to it.** Search works from the first screen, and every screen has one clear next step: search, view, request, list your unit.
2. **Honest by default.** Real numbers only, "from" prices labelled as starting prices, "Sample listing" on demo cards, approximate pins only, and stock photos never presented as a real unit on the live site.
3. **Built once, upgraded in place.** The demo uses the final site's structure and data shape, so the system swaps data sources and the booking step without redesigning a page.
4. **Two languages, both native.** Arabic and English are written separately, right-to-left works from the first screen, and both use Western digits by design.
5. **Guests and owners on one site.** The site books stays and brings in new units; the owner path is a full part of the page, not a footer link.

## Accessibility & Inclusion

- WCAG 2.2 AA. A map that works without dragging: zoom buttons, and a list view that always shows the same units.
- Focus never hidden: the sticky header and the request bar never cover the field or button a keyboard user is on.
- Tap targets at least 24 × 24 px, larger on map controls. Dates and guests carry from the listing into the request form, with no re-typing.
- Arabic search treats letter variants as the same letter (the forms of alef, taa marbuta and yaa). Long Arabic names and descriptions are tested in every card and button.
- Speed at the 75th percentile on mid-range phones: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Scroll effects animate transform and opacity only, and text that fades in with the scroll reaches full contrast before it can be read.
