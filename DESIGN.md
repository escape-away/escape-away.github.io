---
name: Escape Away
description: Managed stays across Egypt, booked direct, in Arabic and English.
colors:
  cream: "#F4ECDF"
  sand: "#DBC9B3"
  navy: "#003C82"
  espresso: "#3B2D21"
  warm-gold: "#A8906E"
  ice-blue: "#8AA4C9"
  shell: "#FBF7F0"
  espresso-muted: "#5E4D3E"
  control-line: "#8C7A66"
  ice-text: "#C3D1E6"
  navy-hover: "#00336F"
  navy-deep: "#002B5E"
  success: "#3F6B3A"
  warning: "#8A5A00"
  error: "#A23B2A"
  error-on-navy: "#F3B7A6"
typography:
  display:
    fontFamily: "Fraunces, Recoleta, Georgia, serif"
    fontSize: "clamp(2.75rem, 1.55rem + 5.1vw, 6rem)"
    fontWeight: 300
    lineHeight: 1.02
    letterSpacing: "-0.02em"
    fontVariation: "\"SOFT\" 100, \"WONK\" 0"
  headline:
    fontFamily: "Fraunces, Recoleta, Georgia, serif"
    fontSize: "clamp(2.125rem, 1.55rem + 2.45vw, 3.75rem)"
    fontWeight: 300
    lineHeight: 1.06
    letterSpacing: "-0.02em"
    fontVariation: "\"SOFT\" 100, \"WONK\" 0"
  title:
    fontFamily: "Fraunces, Recoleta, Georgia, serif"
    fontSize: "clamp(1.625rem, 1.33rem + 1.31vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.12
    fontVariation: "\"SOFT\" 100, \"WONK\" 0"
  lead:
    fontFamily: "Jost, Garet, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 1.06rem + 0.28vw, 1.3125rem)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Jost, Garet, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Jost, Garet, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
  display-arabic:
    fontFamily: "Alexandria, Noto Sans Arabic, sans-serif"
    fontWeight: 200
    lineHeight: 1.28
    letterSpacing: "0"
  body-arabic:
    fontFamily: "Alexandria, Noto Sans Arabic, sans-serif"
    fontWeight: 400
    lineHeight: 1.8
rounded:
  arch: "9999px 9999px 0 0"
  soft-arch: "50% 50% 0 0 / 18% 18% 0 0"
  pill: "9999px"
  input: "12px"
  card: "16px"
  sheet: "20px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "64px"
  "9": "96px"
  "10": "128px"
  section: "clamp(4rem, 2.6rem + 6vw, 8rem)"
  gutter: "clamp(1.25rem, 0.5rem + 3.2vw, 3rem)"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.navy-hover}"
  button-primary-pressed:
    backgroundColor: "{colors.navy-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-on-navy:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "48px"
  input-field:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.espresso}"
    rounded: "{rounded.input}"
    padding: "0 16px"
    height: "48px"
  chip-filter:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.espresso}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  chip-filter-selected:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.cream}"
  price-pin:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  price-pin-selected:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.navy}"
  cluster:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.cream}"
    rounded: "9999px"
    size: "52px"
  map-control:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.espresso}"
    rounded: "{rounded.input}"
    size: "44px"
  map-card:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.espresso}"
    rounded: "{rounded.card}"
  card-listing:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.espresso}"
    rounded: "{rounded.soft-arch}"
---

# Design System: Escape Away

<!-- Written at step 1 of the build plan (Nov 19, 2026) from the client's company profile, EA logo and the pitch deck's accents. Tokens live in design/tokens.css; the shared base layer in design/base.css; the preview in design/tokens-preview.html. Re-run /impeccable document after the first pages ship to fold in the built components. -->

## Overview

**Creative North Star: "The Open Arch"** (proposed; rename it at the token review)

Every Escape Away home is entered through a doorway someone prepared. The site works the same way: real photographs of the places, framed by the arch from the company profile, on warm cream and sand, with navy as the one colour that means "do this". Guests read it like a well-kept house: calm, specific, nothing shouting. Owners see the same care turned towards them when the page turns navy.

The brief pins this world: Escape Away's own palette and type, the arch as the one signature shape, photographs leading, flat grounds, and no WebGL, shader or scene effects. Density is low on guest pages (one main action a screen) and practical in the explorer, where the map, the list and the filters do real work.

**Key Characteristics:**
- Photographs lead, 12 to 20 on the homepage, framed by the arch or the soft arch.
- Cream and sand grounds; navy for every action and for the owner section, the answers after it, and the footer.
- Headlines in two weights of one colour: a light line and a bold line.
- A short warm-gold rule under every section title, the only ornament.
- Arabic and English are equals: mirrored layouts, their own faces, Western digits in both.

## Colors

A warm, papery ground with one committed navy: the brand's colours from the company profile, plus the deck's gold and ice blue kept small.

### Primary
- **Escape Navy** (#003C82): buttons, links, selected chips, price pins, focus rings; also the ground of the owner section, the answers after it, and the footer. 9.1:1 on cream.

### Secondary
- **Warm Gold** (#A8906E): the short rule under section titles. Decorative only, never text.
- **Ice Blue** (#8AA4C9): rules, icons and marks on navy grounds. Small text on navy uses **Ice Text** (#C3D1E6, 6.9:1).

### Neutral
- **Cream** (#F4ECDF): the page ground.
- **Sand** (#DBC9B3): bands, cards, image placeholders and hairlines on cream.
- **Shell** (#FBF7F0): raised surfaces such as inputs, sheets and popovers.
- **Espresso** (#3B2D21): all text and icons on light grounds. 11.3:1 on cream.
- **Espresso Muted** (#5E4D3E): secondary text. 6.9:1 on cream, 5.0:1 on sand.
- **Control Line** (#8C7A66): borders of inputs and controls. 3.5:1 on cream.
- **Navy Hover** (#00336F) and **Navy Deep** (#002B5E): hover and pressed navy; the footer's base strip.
- **Success** (#3F6B3A), **Warning** (#8A5A00), **Error** (#A23B2A): states, each at least 5:1 on cream.
- **Error on navy** (#F3B7A6): form errors in the owner section, 6.2:1 on navy and 8:1 on navy deep.

### Named Rules
**The One Action Colour Rule.** Navy is the only colour that asks for a tap. Gold and ice blue never sit on a button, a link or a pin.

**The Light Only Rule.** Guests plan on phones in daylight, so the site has no dark theme. Navy appears as a ground only from the owner section to the end of the page: the owner section, the answers, and the footer. On the homepage the page turns to it as the owner section arrives.

## Typography

**Display Font:** Recoleta on the live site; Fraunces (soft axis 100, wonk 0) in the demo, with Georgia as the fallback.
**Body Font:** Garet on the live site; Jost in the demo, with the system sans as the fallback.
**Arabic:** Alexandria alone (pair C, chosen Nov 19, 2026): 200 for the light line and 700 for the bold line, 400 for text, 500 for labels. Headings scale to 94% so they sit with the Latin.

**Each page carries its own language's faces.** An English guest quote on an Arabic page keeps Alexandria (it draws Latin too), and the language switch's one Arabic word on an English page uses the phone's own Arabic face, so neither page downloads the other language's display font for a single line. Only the body face is preloaded; headings show a size-matched fallback until Fraunces arrives.

**Character:** a soft, warm serif that speaks in two weights, over a clean geometric sans that keeps forms, prices and filters easy to read. Fraunces is here only as the brief's free stand-in for Recoleta.

### Hierarchy
- **Display** (300 with 700 for the bold line, 44 to 96 px, 1.02): the hero headline only.
- **Headline** (300 with 700, 34 to 60 px, 1.06): section titles, always followed by the gold rule.
- **Title** (400, 26 to 40 px, 1.12): listing names on their page, sub-sections, the owner journey steps.
- **Lead** (Jost 400, 18 to 21 px, 1.55): the line under a title; at most about 70–75 characters a line (`--measure`, 56ch).
- **Body** (Jost 400, 17 px, 1.6): descriptions, rules, guides; the same measure. Jost's ch is wider than its average letter, so 56ch is what keeps a line near 70 characters.
- **Label** (Jost 500, 13 px, 1.35): form labels, group labels, card facts. Never a small label above a heading.

### Named Rules
**The Two Weights Rule.** A headline may set its key words in bold. Both lines keep one colour; emphasis comes from weight alone.

**The Arabic Room Rule.** Arabic takes no letter-spacing and no capitals, labels sit at 14 px, and line heights rise (1.28 to 1.3 for headings, 1.8 for text).

**The Isolation Rule.** Inside Arabic, anything that reads left to right (a unit code, a phone number, an email, a link, "+971", the company's Latin name standing alone) sits in its own left-to-right run (`dir="ltr"`, `<bdi>` or the isolate characters), so it never breaks apart or swaps its pieces. The Latin brand name inside an Arabic sentence needs nothing.

## Layout

A 12-column grid inside a 1280 px container, with page edges of 20 px on phones growing to 48 px. Sections are separated by space (64 px on phones to 128 px on desktop), never by boxes, with more room above a title than below it. One main action per screen: search, view, book or request, list your unit. Layout uses logical properties throughout, so Arabic mirrors the whole page; maps, photographs and digits keep their direction. In the stays explorer the list sits beside a map that stays pinned under the header from laptops up (list on the start side, so Arabic puts the map on the left); on phones and tablets the explorer shows one at a time and switches with one floating button, and a search from the hero lands on the map. The listing's book bar sits pinned to the bottom without covering a focused field.

## Elevation & Depth

Flat by default. Depth comes from the ground changing (cream, sand, navy), not from shadows. Shadows appear only on things that float above the page: sheets, popovers, the date picker, the selected card on the map, and price pins.

### Shadow Vocabulary
- **Raise** (`box-shadow: 0 1px 2px rgb(59 45 33 / 0.06), 0 4px 12px rgb(59 45 33 / 0.07)`): a hovered card, the compact search pill.
- **Float** (`box-shadow: 0 2px 6px rgb(59 45 33 / 0.08), 0 18px 44px rgb(59 45 33 / 0.16)`): sheets, popovers, the map's card.
- **Pin** (`box-shadow: 0 1px 2px rgb(0 27 60 / 0.28), 0 4px 10px rgb(0 27 60 / 0.18)`): price pins and clusters.

## Shapes

**The arch** is the one signature shape: straight sides and a full semicircle top (9999px top radii). It frames the hero, the destination and collection tiles, and the owner journey. **The soft arch** gives landscape crops, such as listing cards, a shallow curved top (50% / 18%), so the photograph keeps most of its frame. Everything else stays quiet: pill buttons, chips and price pins; 12 px inputs; 16 px panels; 20 px tops on bottom sheets. Photographs are never filtered, never carry words, and never take any other cut-out shape.

## Components

### Buttons
- **Shape:** pill (9999px), 48 px tall; 44 px is the floor for anything tappable. A label too long for its space (a long Arabic or English label on a small phone) takes a balanced second line instead of spilling out.
- **Primary:** navy with cream text (Jost 500). One per screen.
- **Hover / Press:** navy hover (#00336F); pressed navy deep (#002B5E) and a 97% scale over 120 ms.
- **Secondary:** a navy outline on cream. **On navy:** cream with navy text.

### Chips
- **Style:** shell with an espresso label and a control-line border, 44 px tall.
- **Selected:** navy with cream text; the border disappears.
- **Counts:** inside the filters, each choice shows how many stays it would leave in a small muted number; a choice that would leave none has a dashed border.
- **In the explorer:** the five areas are one row of chips beside the Filters chip (it carries a navy count when filters are on); on phones the row scrolls under the thumb to the page edge. Filter choices are real checkboxes and radios inside their chips, so taps and screen readers both reach them. Once a stay is saved, a Saved chip (a heart and the count) sits after Filters and shows only the saved stays.

### Cards / Containers
- **Listing card:** the lead photograph in a soft arch (no carousel), then name (up to three lines, then an ellipsis; the full name is on its page), compound and destination, facts and the price in tabular figures. Demo cards say "Sample listing".
- **Prices:** in US dollars ("From $118 a night"), followed by the pound equivalent ("≈ EGP 6,410") at 80% of the line's size (never under 12 px), regular weight, in muted ink. The same pair appears on cards, the map's card, and the booking panel and bar. Pins and the price filter show dollars only.
- **Save heart:** a navy heart on a pale disc in the photo's top end corner (a 44 px target above the card's link), filled once saved. On a listing it is a small "Save" pill at the end of the line under the name. Saved stays live on the guest's device only.
- **Panels:** sand or shell, 16 px corners, no shadow at rest.
- **Fewer stays than a row holds:** on a destination page, the rest of the row is a sand panel saying more homes are coming, with "Ask what's free" on WhatsApp.

### Inputs / Fields
- **Style:** shell ground, control-line border, 12 px corners, 48 px tall, a visible label above.
- **Focus:** a 2 px navy ring with a 3 px offset (cream on navy).
- **Error:** an error-coloured border and a message under its own field that names the fix.

### Navigation
- **Header:** the EA mark, Stays, Destinations, Owners, the language switch, WhatsApp (outlined, so each page's own main action stays the one filled button on screen). Past the hero, the search folds into a compact pill in the header's middle: place, dates and guests, then only the place, then only the magnifier as the header narrows. It opens the same search bar in a cream panel under the header (a full screen on phones); searching closes it and lands on the stays.
- **Phones:** a full-screen cream menu (a modal: the mark and close on top, the pages as large display-type links on hairlines, WhatsApp and the language switch at the foot); the listing's book bar and the explorer's map and list switch sit at the bottom. Without JavaScript, Menu jumps to the footer, which carries every page.
- **Footer on phones:** the two link lists side by side.

### Price pin (signature)
A navy pill with cream tabular digits, 32 px tall. Selected, it turns cream with a navy border and text. Until a unit has a starting price, its pin names the kind of home (Chalet, شاليه). Clusters are navy circles ringed in cream with the EA mark over the count, 52, 60 or 68 px as they grow. The card and pin of the same stay light up together: hovering or focusing a card raises its pin, and the pin's card lifts onto shell with the raise shadow.

### The stays map
- **Basemap:** the light vector map recoloured from the `--map-*` tokens: land a shade under cream, water in a pale ice blue, quiet roads, place names in espresso muted in the page's language. Shops, stations and road names are hidden so only the pins speak.
- **Frame:** a 16 px panel with a sand hairline. A shell note in its top start corner says pins show the area, not the address.
- **Credits:** one quiet line on shell in the bottom corner, at 11 px: the one size below the type ramp, so OpenStreetMap's credit stays on one line on a phone-width map.
- **Labels:** English maps show only names with an English or Latin spelling; country names are hidden. A single stay opens with its stretch of coast or city around it (zoom 10), not street by street.
- **Controls:** zoom in, zoom out and "fit every stay" as 44 px shell buttons at the top end; nothing on the map needs dragging. In a scrolling page the map takes two fingers on phones and Ctrl or ⌘ with the wheel on desktop.
- **The stay's card:** choosing a pin opens a shell card at the bottom start (photo in the soft arch, name, area, facts, price, "Sample listing"), the whole card one link that carries dates and guests.
- **States:** a breathing EA mark while it loads; on sand, a plain sentence and "Try again" if it can't (every stay is still in the list); a shell card with one action when nothing matches.

### Filters
A shell panel that grows from the Filters chip over the list, so pins visibly leave and return on the map beside it; on phones a sheet from the bottom over a soft espresso scrim. Groups: type of place, bedrooms, amenities, and price once units have prices. Every change applies at once; the footer offers "Clear filters" and "Show N stays".

### Listing page
- **Head:** the trail (Escape Away / destination / home; on phones it stops before the home), the name in the Title style, then compound · destination and a sand "Sample listing" tag on demo units.
- **Gallery:** the lead photograph in the soft arch beside a grid of four with 12 px corners, and a shell "Show all photos" button; on phones one row to swipe, each photo in the soft arch, with a "1 / 5" count. No captions.
- **Viewer:** every photograph whole on shell, one at a time: swipe, arrow keys (mirrored in Arabic), 52 px round buttons and a count; Escape returns to the photo that opened it.
- **Body:** facts in the lead size (guests, bedrooms, beds, bathrooms), the home's own words, then sections divided by sand hairlines with Title-style headings: what's there, what every Escape Away stay includes, where it is, good to know, reviews. Lists carry the small gold dot.
- **Where it is:** the brand map with a soft navy circle (12% fill, 55% line) around the approximate pin, never a pin on the building, and one line saying the address comes with the confirmation.
- **Request:** flat beside the page from laptops up, under a sand hairline: the price, one bordered box with When and Who, the nights, the one primary button ("Add your dates" until there are dates, then "Request to book", which opens the request form), and a line saying nothing is paid yet. On phones the same as a bar pinned to the bottom that opens a sheet with the calendar and the guests.
- **Reviews:** real ones only. Until a home has its own, the page says so and shows what guests say about Escape Away, labelled as such, on a sand panel in the display face.

### Destination page
- **Head:**
  - On the start side: the trail (Escape Away / the place), the headline in two weights ("Stays on the / **North Coast**").
  - Under it, the answer in the lead size: a few sentences that say what the place is, which homes are there and who they suit, and that make sense when quoted alone.
  - Then the stays count as a link to them, and the guide's date.
  - On the end side: the place's photograph in the arch from tablets up. On phones it is a landscape crop in the soft arch, so the answer and the facts stay near the top.
- **At a glance:** label and value rows on sand hairlines (label in the label style, muted). The rows are best for, when to go, getting there, the homes, length of stay, and where the listed stays are, then one muted line saying drive times are typical.
- **The stays:** the explorer's map framed on the whole area (it never zooms closer than the area's view at first), then the same stays as cards, then a link to search them with dates and filters.
- **Guide:** "Good to know" as a gold-dot list beside "Questions people ask", each question in the lead size with its answer in muted text. Side by side from laptops up; stacked below that.
- **More destinations:** the other four in the arch, four across from tablets up, two on phones.
- **Owner band:** one navy band right before the navy footer, with the place's own question ("Own a chalet or villa on the North Coast?"), one line, and the cream button to the owner form.

### Forms
- **Fields:** the label above (13 px, 500), a 48 px field with 12 px corners and a control-line border, then the error and the hint under it. Required fields carry no mark; optional ones say "(optional)" after the label. Text is 16 px or more so phones never zoom. Numbers, emails and links type left to right and still sit on the right in Arabic.
- **Choices:** a few options are pill radios (shell, control-line border, navy when chosen; on navy, cream lines and cream when chosen). A long list is a select.
- **Errors:** shown when a filled field is left or on sending, never while typing, and cleared as soon as the value is right. The first field that needs fixing takes focus; the message names the fix ("Numbers from outside Egypt need their country code, like +971.").
- **The request form:** opens from "Request to book". From laptops up a centred shell panel (34 rem, 16 px corners, the float shadow) over the espresso scrim; on phones the bottom sheet. The home, code, dates and guests sit at the top under a sand hairline with "Change dates or guests"; then name, WhatsApp, email and a note; "Send request" stays pinned at the bottom with the no-payment line. It ends on "Request sent" (or "One last step" when the sheet isn't set up, or an honest failure with "Try again"), each with the WhatsApp message already written.
- **The owner form:** a navy-deep panel with a cream hairline. "What could your unit earn?", then three short steps with the step's name and "Step 1 of 3" on one line and a three-part ice-blue bar under it. Each step slides in 16 px from the side it comes from (mirrored in Arabic). It ends on a thank-you with the WhatsApp button and what to have ready.

### Empty results
A sand panel in the list: the headline in the display face's light weight, one line of help, then "Clear filters" (or "Clear search") as the one primary action, with WhatsApp as a link.

## Do's and Don'ts

### Do:
- **Do** frame portrait photographs in the arch and landscape ones in the soft arch.
- **Do** put the gold rule (48 × 3 px) under every section title, aligned to its start.
- **Do** keep text pairs at the listed contrasts: espresso on cream 11.3:1, cream on navy 9.1:1.
- **Do** write prices and dates with Western digits in both languages, set through the locale.
- **Do** animate transform and opacity only: the hero arch opens from 86% while its photograph settles from 116%, over 1.1 s.

### Don't:
- **Don't** redraw, trace, recolour outside the palette, or recreate the EA mark; use the client's file.
- **Don't** use WebGL, shaders, gradients as decoration, glass, grain or AI images.
- **Don't** put a small label above a heading, or set a headline in two colours.
- **Don't** use gold or ice blue for text, buttons or links.
- **Don't** build a row of identical icon cards or a big-number stat strip; the three real figures sit in a sentence.
