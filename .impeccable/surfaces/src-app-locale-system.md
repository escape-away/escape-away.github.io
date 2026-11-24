---
version: 1
slug: "src-app-locale-system"
primary_target: "src/app/[locale]/(system)"
related_targets: ["src/system"]
---

# Surface brief: the Escape Away system (demo)

Scope: the internal system screens under /[locale]/admin, the housekeeping phone view under /[locale]/staff and the owner portal under /[locale]/portal. Mode: Operate (the owner portal leans Read). Built on sample data, labelled as such, inside the website codebase so the real system replaces only the data source.

Audience and job: Escape Away's decision-maker clicks through it on a phone and a laptop during the pitch for the booking system; later the reservations team runs 400+ homes from it every day. Task: see today, scan every home's calendar, open any booking, fix clashes, fill missing guest details; housekeepers work their turnovers in Arabic; owners read their statement.

Constraints: the website's DESIGN.md world (cream, sand, shell, espresso, one navy for actions), the brand DNA PMS rules (sidebar items, booking states with words, neutral channel chips, units-as-rows calendar, tables opening side panels), Arabic and English with Western digits, light only, no AI images.

## Direction contract

THESIS: One calm timetable of every stay, where clashes and missing details surface before they cost money. Refuses the grey SaaS admin: no generic cards grid, no blue-on-white dashboard, no decorative stat strips (the KPI tiles the brand DNA's 3-pms.md pins for Today and Reports are the only figure band).

OWN-WORLD: The website's house turned inward. A navy sidebar is the back office; the work sits on cream with shell panels and sand hairlines, espresso text, navy as the only colour that asks for a tap. Booking states are soft tints that always carry their word. Channels are outlined neutral tags. Fraunces only on page titles; Jost and Alexandria carry everything operational, in tabular figures.

STORY: The team sees today (arrivals, departures, turnovers, what needs attention), scans all homes on one timetable, opens any booking beside the list, resolves a clash, fills an Airbnb booking's details. The decision-maker understands it replaces juggling Airbnb, Booking.com, WhatsApp and spreadsheets.

FIRST VIEWPORT: Navy sidebar at inline-start; a slim top bar with search, the sample-data label, the guided demo and the language switch. Today's title with the date, one red line per clash, quieter notices in one block under it, the day's KPI tiles in tabular figures (pinned by 3-pms.md: "KPI tiles (Today and Reports)"), then arrivals and departures side by side with their turnovers. On the calendar, homes with a clash are pinned in a "Needs attention" group above the areas. Primary action: New booking, top end.

FORM: pinned by the brand DNA's PMS spec.
seed: none (pinned) "Sidebar: deep fill, on-deep text, 240px. Items: Today, Calendar, Reservations, Units, Owners, Guests, Leads, Payouts, Reports, Settings."

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment

On the calendar, a website booking and an Airbnb booking land on the same nights: both bars stay, outlined in the error colour, and a banner names the unit and the fix.

## Unresolved

- Real unit list, owners and commission model (sample until Escape Away provides them).
- Whether the PMS keeps Fraunces titles once the licensed Recoleta arrives.
