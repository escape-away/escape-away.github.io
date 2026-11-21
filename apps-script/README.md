# The forms' Google Sheet

The website's two forms post here: **stay requests** from listing pages and **owner leads** from the owner form (homepage and `/owners`). This script writes each one into the team's Google Sheet, scores owner leads, and can email the team. It is free and runs on the team's own Google account; the website works the same on GitHub Pages and on GoDaddy.

Until it's set up, the site still works: each form ends on a WhatsApp message with everything the visitor typed, so nothing is lost.

## What the sheet looks like

| Tab | What's in it |
| --- | --- |
| **Stay requests** | One row per request: reference, status, days to check-in, home and code, dates, guests, name, WhatsApp, email, note, language, a "Reply on WhatsApp" link, the page it came from. |
| **Owner leads** | One row per unit: reference, **score out of 100, priority, next step, call-by time**, status, area, compound, type, bedrooms, size, furnished, state, availability, photos, lives abroad, contact details, language, how the score was worked out, a "Reply on WhatsApp" link. |
| **Call next** | A live list of owner leads still marked New, best score first. Start each day here. |
| **Scoring** | How a lead earns its score. Written from the script, so it always matches. |

The Status column has a dropdown (New, Replied, Payment link sent, Booked… for stays; New, Called, Visit booked, Signed… for owners). Change a lead's status from New and it leaves the Call next list.

### How owner leads are scored

The brief asks for a simple score from three things, routed hot, warm and cool:

| Part | Points |
| --- | --- |
| **Location demand**, up to 40 | 30 for any of the five areas (Cairo, Sheikh Zayed, North Coast, El Alamein, Gouna), 0 for elsewhere; 10 more in a compound where Escape Away already lists a home |
| **Unit readiness**, up to 30 | Furnished and ready 30 · needs a refresh 20 · finished but empty 15 · not handed over 5 |
| **Timeline**, up to 30 | First guests right away 30 · within 3 months 20 · later 10 · not sure 5 |

| Priority | Score | Next step |
| --- | --- | --- |
| Hot | 80 and up | Call within 1 hour |
| Warm | 60 to 79 | Call within 24 hours |
| Cool | 40 to 59 | WhatsApp first, then call within 3 days |
| Nurture | under 40 | Keep in touch, no call yet |

These points are a starting point for Escape Away to tune: if the North Coast is worth more than Cairo in summer, raise it. Edit `SCORING` at the top of `Code.gs`, then run `refreshScoringTab` and `rescoreOwnerLeads` from the editor; old leads are scored again with the new points.

## Set it up (about 10 minutes)

1. **Make the sheet.** In the Google account that should own the leads, create a new Google Sheet, for example "Escape Away website leads". Share it only with the people who handle requests: it holds guests' and owners' contact details.
2. **Add the script.** In the sheet: Extensions → Apps Script. Delete what's in `Code.gs` and paste in [`Code.gs`](Code.gs) from this folder. Optional but tidy: Project Settings → tick "Show appsscript.json", then replace its content with [`appsscript.json`](appsscript.json) (Cairo time, and only the two permissions the script needs).
3. **Run setup once.** Choose `setup` in the function menu and press Run. Google asks you to authorise the script: it can edit this one spreadsheet and send email as you. Setup creates the four tabs, the dropdowns and the colours.
4. **Turn on email alerts (optional).** Project Settings → Script properties → add `ALERT_EMAIL` with one address, or several separated by commas. Every request and lead then arrives by email too, with a ready "Reply on WhatsApp" link. Gmail allows about 100 emails a day from a script on a free account.
5. **Publish it.** Deploy → New deployment → type: Web app. Description "Website forms", Execute as: **Me**, Who has access: **Anyone**. Deploy, then copy the Web app URL (it ends in `/exec`).
6. **Connect the website.** Set the URL as the form endpoint and rebuild:
   - GitHub Pages: repository Settings → Secrets and variables → Actions → Variables → `FORM_ENDPOINT`, then re-run the deploy workflow.
   - GoDaddy or a local run: `NEXT_PUBLIC_FORM_ENDPOINT=<the /exec URL>` in `.env.local`.
7. **Check it.** Open the `/exec` URL in a browser: it shows `{"ok":true,"service":"Escape Away website forms"}`. Then send a test request from a listing page and a test unit from `/owners`; both rows should appear within a few seconds.

When you change the script later, use Deploy → Manage deployments → Edit (the pencil) → Version: New version. That keeps the same URL, so the website needs no change.

## Safety

- The address is public (it's in the website's code), so the script trusts nothing it receives: it checks every field, caps lengths, refuses anything malformed, and stores what visitors type as plain text, so a name starting with `=` can never run as a formula.
- A hidden field that only bots fill in is dropped quietly.
- The script can only touch this spreadsheet and send email; it reads nothing back to the website except "ok" and the reference.
- Before the site goes live, publish the privacy policy page (`/privacy`): the forms link to it, and it should say what the sheet keeps, who sees it and for how long.

## Try it without Google

`npm run test:forms` runs `Code.gs` in Node against an in-memory sheet and checks the rows, scores, alerts and refusals. `npm run forms:sink` starts the same thing as a local endpoint on port 4180: put `NEXT_PUBLIC_FORM_ENDPOINT=http://localhost:4180/exec` in `.env.development.local`, run `npm run dev`, send the forms, and see the rows at `http://localhost:4180/rows`. Nothing is written to disk.
