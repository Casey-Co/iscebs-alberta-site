# Alberta Chapter of ISCEBS — website

Design: colour version 3 (CEBS colours, used with meaning — navy = CEBS/chapter, teal = Group Benefits, orange = Retirement Plans; Source Serif 4 + Public Sans). Colours live in `assets/vibrant.css`, layered over the shared `assets/style.css`; the email newsletter uses the same palette in `assets/wix-newsletter-email.js`.

Static HTML/CSS/JavaScript site. No build step, no server, no packages to install.
`index.html` is the home page. Published with GitHub Pages from the `main` branch (root).

## Where content lives

| Content | Edited in | Notes |
|---|---|---|
| Upcoming events, RSVPs, tickets | **Wix → Events** (headless project) | Every published upcoming event appears on `events.html` automatically. The text under the title is the event's *Short description*. RSVP events: on-page form → Wix guest list (Wix emails confirmation). Ticketed events: choose tickets on the page → Wix secure checkout → back to the Events page. Ended events appear under Past events. |
| Board members (About page) | **Wix → CMS → Board Members** collection | Sorted by *Display Order*. Photos come **only** from the collection's *Photo* field; a member with no photo uploaded is shown without one. Each night the **Sync board from Wix** job copies the board and its photos into `about.html` and `assets/board/`, so photos load from this website even where Wix is blocked (e.g. bank networks). The page also checks Wix live and shows any newer edits straight away. To publish an edit to the saved copy immediately: GitHub → **Actions → Sync board from Wix → Run workflow**. |
| Newsletter issues | **Wix → CMS → Newsletter Issues** collection | One row per issue (fixed template). "Education ahead" lists upcoming Wix events automatically, each linking to registration (`events.html?register=<eventId>`). `Slug` sets the address: `newsletter-issue.html?issue=<slug>`. Tick `Published` to show it; preview drafts with `&preview=1`. Blank sections are skipped. President and Member Spotlight details (name, role, photo) are entered in each issue; photo fields are Rich content and the first picture is used. `newsletter.html` lists the latest and past issues automatically. |
| Newsletter by email | **`newsletter-email.html`** (not linked in the menu) | Builds an email-safe copy of any issue from the same CMS row. After publishing, open the page, pick the issue and use *Copy code for Wix* (paste into an HTML element in a Wix Email Marketing campaign), *Copy email for pasting* (Gmail/Outlook) or *Download .html file* (other email tools). When `assets/wix-newsletter-email.js` changes, bump the `?v=` number on its script tag and the "Tool version" note. Layout lives in `assets/wix-newsletter-email.js`. |
| AGM minutes | **Wix → CMS → AGM Minutes** collection (`AGMMinutes`) | Title (`title`), Date (`date`), Event Name (`eventName`) and Minutes (`minutes`, Rich Text). Paste notes into Minutes and save. All saved entries containing minutes appear publicly at `agm-minutes.html`, newest first and grouped by year; each has a reading link. Empty entries are skipped. There is no approval/draft toggle: only enter minutes intended for public release. The website reads Wix live; minutes are not copied into GitHub. Linked from Resources. |
| Everything else (page text, layout, design) | The HTML files in this repository | Edit in GitHub (pencil icon) and commit; the site republishes in a minute or two. |

## Wix connection

- Settings are in **`assets/wix-config.js`**: the public OAuth client ID and CMS collection IDs.
- The client ID is public by design (anonymous visitor, read-only). **Never commit an admin API key or client secret.**
- `assets/wix-client.js` — shared connection helpers.
- `assets/wix-board.js` — checks Wix for board edits newer than the saved copy in `about.html`.
- `assets/wix-board-render.js` — board card markup, shared by the page and the nightly sync.
- `scripts/sync-board.mjs` + `.github/workflows/sync-board.yml` — nightly copy of the board and photos from Wix into the site (don't edit the board section of `about.html` by hand; it's overwritten). The job writes `.github/last-board-check` monthly so GitHub doesn't pause it.
- `assets/wix-events.js` — upcoming events, RSVP/tickets and past events on `events.html`.
- `assets/wix-home-event.js` — the next upcoming event in the home page event box.
- `assets/wix-newsletter.js` — newsletter issue page and archive.
- `assets/wix-newsletter-email.js` — email version of an issue (`newsletter-email.html`).
- Each page keeps a built-in copy of its content, shown if Wix can't be reached.

## Ticket checkout requirements

- Payments set up in Wix (Core plan + a payment provider under Getting Paid). Without them, visitors see "Tickets aren't on sale online yet".
- The site's domain added to the Chapter Website OAuth client's allowed redirect domains (Headless Settings), so Wix can send buyers back.

## When the site moves to its final domain

1. In Wix: Headless Settings → the "Chapter Website" client → add the new domain to its allowed domains/URLs.
2. Search the HTML for `sharkey-c980.chatgpt.site` and replace with the new domain (newsletter sharing metadata).

## Search and sharing

- Every public page has a title, description and social preview tags (`og:*`), using `assets/share.jpg` (1200×630) and the final address `https://abiscebs.com/`.
- `index.html` carries the chapter's Organization details for Google (JSON-LD, logo `assets/logo.png`).
- `sitemap.xml` and `robots.txt` use `https://abiscebs.com/`; they take effect once the domain points here. Add new newsletter issues to `sitemap.xml` if you want them listed.
- `newsletter-email.html` and `newsletter-january-2027.html` are `noindex` (kept out of search).
- If a page's title or description changes, update its matching `og:title` / `og:description` too.
