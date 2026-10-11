# Alberta Chapter of ISCEBS — website

Static HTML/CSS/JavaScript site. No build step, no server, no packages to install.
`index.html` is the home page. Published with GitHub Pages from the `main` branch (root).

## Where content lives

| Content | Edited in | Notes |
|---|---|---|
| Upcoming events, RSVPs, tickets | **Wix → Events** (headless project) | Every published upcoming event appears on `events.html` automatically. The text under the title is the event's *Short description*. RSVP events: on-page form → Wix guest list (Wix emails confirmation). Ticketed events: choose tickets on the page → Wix secure checkout → back to the Events page. Ended events appear under Past events. |
| Board members (About page) | **Wix → CMS → Board Members** collection | Sorted by *Display Order*. Photos uploaded in Wix; if none, `assets/board/<first-last>.jpg` is used. |
| Newsletter issues | **Wix → CMS → Newsletter Issues** collection | One row per issue (fixed template). "Education ahead" lists upcoming Wix events automatically, each linking to registration (`events.html?register=<eventId>`). `Slug` sets the address: `newsletter-issue.html?issue=<slug>`. Tick `Published` to show it; preview drafts with `&preview=1`. Blank sections are skipped. President and Member Spotlight details (name, role, photo) are entered in each issue; photo fields are Rich content and the first picture is used. `newsletter.html` lists the latest and past issues automatically. |
| Everything else (page text, layout, design) | The HTML files in this repository | Edit in GitHub (pencil icon) and commit; the site republishes in a minute or two. |

## Wix connection

- Settings are in **`assets/wix-config.js`**: the public OAuth client ID and CMS collection IDs.
- The client ID is public by design (anonymous visitor, read-only). **Never commit an admin API key or client secret.**
- `assets/wix-client.js` — shared connection helpers.
- `assets/wix-board.js` — loads the board onto `about.html`.
- `assets/wix-events.js` — upcoming events, RSVP/tickets and past events on `events.html`.
- `assets/wix-newsletter.js` — newsletter issue page and archive.
- Each page keeps a built-in copy of its content, shown if Wix can't be reached.

## Ticket checkout requirements

- Payments set up in Wix (Core plan + a payment provider under Getting Paid). Without them, visitors see "Tickets aren't on sale online yet".
- The site's domain added to the Chapter Website OAuth client's allowed redirect domains (Headless Settings), so Wix can send buyers back.

## When the site moves to its final domain

1. In Wix: Headless Settings → the "Chapter Website" client → add the new domain to its allowed domains/URLs.
2. Search the HTML for `sharkey-c980.chatgpt.site` and replace with the new domain (newsletter sharing metadata).
