# The Escape Away system: demo

A clickable demo of Escape Away's own property system (PMS and CRM), built inside the website so the real system later swaps the data source, not the screens. Everything runs in the browser on sample data: made-up homes, guests, owners and numbers, labelled as such on every screen.

## Open it

```bash
npm run dev
```

- System: http://localhost:3000/en/admin/ (Arabic: /ar/admin/)
- Housekeeping app: /ar/staff/ (Arabic first, built for a phone)
- Owner portal: /en/portal/

The guided demo opens on the first visit and from the top bar: ten steps through one day (a website booking, an Airbnb clash and its fix, missing guest details, a finished clean, an owner's statement). It returns to the language it started in after the Arabic housekeeping step. "Reset the demo" in the sidebar starts over. Add `?tour=off` to a link to open a screen without the tour (for sharing one screen).

The built site works the same way: `npm run build`, then `npm run serve:out` and open http://127.0.0.1:4174/en/admin/.

## Presenting it

- Present from the built site (`npm run build`, then `npm run serve:out`), not the dev server: pages open instantly and nothing recompiles mid-pitch.
- Open http://127.0.0.1:4174/en/admin/ in a fresh window; the guided demo starts by itself. "Reset the demo" in the sidebar starts the story over.
- The housekeeping step switches to Arabic (it is the staff's language) and the tour returns to the language it started in.
- The housekeeping app (`/ar/staff/`) and the owner portal (`/en/portal/`) are built phone-first: narrow the window, or use the browser's device mode, to show them as a phone would.
- Every screen says "Sample data"; no real guest, owner or number is in the demo.

## Screens

| Screen | Address | Phase |
| --- | --- | --- |
| Today | /admin | Core |
| Calendar (every home on one timetable) | /admin/calendar | Core |
| Reservations | /admin/reservations | Core |
| Units | /admin/units | Core |
| Guests | /admin/guests | Core |
| Settings (calendar links, roles, activity) | /admin/settings | Core |
| Owners and statements | /admin/owners | Wave 2 |
| Payouts | /admin/payouts | Wave 2 |
| Reports | /admin/reports | Wave 2 |
| Owner leads | /admin/leads | Wave 2 |
| Housekeeping app | /staff | Wave 2 |
| Owner portal | /portal | Wave 2 |

## Where things live

| What | Where |
| --- | --- |
| Routes (admin, staff, portal) | `src/app/[locale]/(system)/` |
| Website routes, moved into their own group with the header and footer | `src/app/[locale]/(site)/` |
| Records in the System Blueprint's shape | `src/system/types.ts` |
| Areas, compounds, owners, staff, the 60 sample units (the website's five keep their codes and photos) | `src/system/catalog.ts` |
| Generated stays, tasks, leads and calendar links around today's date, with each area's real season | `src/system/seed.ts` |
| Clashes, occupancy, revenue, owner statements | `src/system/select.ts` |
| The demo's memory (actions replayed from session storage) | `src/system/store.tsx` |
| The guided demo | `src/system/tour.tsx` |
| Screens and shared parts | `src/system/screens/`, `src/system/ui/` |
| Styles (loaded by the system's layout only) | `src/styles/system*.css` |

## Rules the demo already follows

- Airbnb and Booking.com bookings that reach the system are always saved; an overlap becomes a flagged clash, never a rejection. The no-overlap rule applies to bookings Escape Away takes itself (website, WhatsApp, phone), before anything is saved.
- Calendar-link mode is shown honestly: imports carry dates only (the team fills the guest's details), every link shows when it was last read, and every direct booking asks the team on WhatsApp to close the nights on the platforms.
- Arabic and English everywhere, Western digits in both, codes and phone numbers kept left to right inside Arabic.

## Not real yet

No database, logins, Paymob, WhatsApp or calendar links are connected. Those come with the real build (Supabase, then the calendar sync).
