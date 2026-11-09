# Alberta Chapter of ISCEBS — website

Design: colour version 3 (CEBS colours, used with meaning — navy = CEBS/chapter, teal = Group Benefits, orange = Retirement Plans; Source Serif 4 + Public Sans). Colours live in `assets/vibrant.css`, layered over the shared `assets/style.css`; the email newsletter uses the same palette in `assets/wix-newsletter-email.js`.

Static HTML/CSS/JavaScript site. No build step, no server, no packages to install.
`index.html` is the home page. GitHub Pages publishes from the root of `main`.

## Where content lives

| Content | Edited in | Notes |
|---|---|---|
| Upcoming events, RSVPs, tickets | **Wix → Events** (headless project) | Every published upcoming event appears on `events.html` automatically. The text under the title is the event's *Short description*. RSVP events: on-page form → Wix guest list (Wix emails confirmation). Ticketed events: choose tickets on the page → Wix secure checkout → back to the Events page. Ended events appear under Past events. |
| Chapter email, board year, and shared links | **Wix → CMS → Website Settings** collection (`Import4`) | Edit the single row. The job publishes these settings into the site each night. To publish sooner, use GitHub → **Actions → Sync website from Wix → Run workflow**. |
| Resource cards and categories | **Wix → CMS → Resources** collection (`Import5`) | Edit, add, or remove rows. Display Order sets the card order and Category supplies the filters. Enter an HTTPS Resource URL for regular cards. For ISCEBS webcasts and Canadian CEBS courses, leave Resource URL blank and use the existing Website Settings Link value. The same nightly job publishes the directory. |
| Membership questions | **Wix → CMS → MembershipFAQ** collection (`Import6`) | Title is the question. Edit the Answer as plain text and use Display Order to arrange questions. In an answer, `{{chapterEmail}}` inserts the chapter's linked email address from Website Settings. The same nightly job publishes the FAQs. |
| Board members (About page) | **Wix → CMS → Board Members** collection | Sorted by *Display Order*. Photos come **only** from the collection's *Photo* field; a member with no photo uploaded is shown without one. The same nightly job copies the board and its photos into `about.html` and `assets/board/`, so photos load from this website even where Wix is blocked (e.g. bank networks). The page also checks Wix live for newer roster edits. |
| Newsletter issues | **Wix → CMS → Newsletter Issues** collection | Save one row per issue. Use `newsletter-issue.html?issue=<slug>&preview=1` to review an unchecked issue. The preview URL is public. Check **Published** when the issue is ready to appear in the archive, then share the URL without `&preview=1`. "Education ahead" lists upcoming Wix events with registration links. Blank sections are skipped. For President and Member Spotlight photos, the template uses the first picture in each Rich content field. |
| Newsletter by email | **`newsletter-email.html`** (unlisted utility) | Select a draft or published issue to preview its email layout. Use *Copy code for Wix* for Wix Email Marketing, *Copy email for pasting* for Gmail or Outlook, or *Download .html file* for other tools. When `assets/wix-newsletter-email.js` changes, bump its `?v=` value and the "Tool version" note. |
| AGM minutes | **Wix → CMS → AGM Minutes** collection (`AGMMinutes`) | Title (`title`), Date (`date`), Event Name (`eventName`) and Minutes (`minutes`, Rich Text). Paste notes into Minutes and save. All saved entries containing minutes appear publicly at `agm-minutes.html`, newest first and grouped by year; each has a reading link. Empty entries are skipped. There is no approval/draft toggle: only enter minutes intended for public release. The website reads Wix live; minutes are not copied into GitHub. Linked from Resources. |
| Everything else (page text, layout, design) | The HTML files in this repository | Edit in GitHub (pencil icon) and commit; the site republishes in a minute or two. |

## Wix connection

- Settings are in **`assets/wix-config.js`**: the public OAuth client ID and CMS collection IDs.
- The client ID is public by design (anonymous visitor, read-only). **Never commit an admin API key or client secret.**
- `assets/wix-client.js` — shared connection helpers.
- `assets/wix-board.js` — checks Wix for board edits newer than the saved copy in `about.html`.
- `assets/wix-board-render.js` — board card markup, shared by the page and the nightly sync.
- **Nightly sync:** `.github/workflows/sync-board.yml` publishes Website Settings, Resources, Membership FAQs, and a saved copy of the board roster and photos. Links marked with `data-site-link` or `data-site-email` are managed by Website Settings. The job writes `.github/last-board-check` monthly so GitHub doesn't pause it.
- **Live from Wix:** Events, newsletter issues and the email builder, and AGM minutes. The About page also checks Wix live for board updates. If Wix Events is unavailable, visitors see a chapter contact link.
- `assets/wix-events.js` — upcoming events, RSVP/tickets and past events on `events.html`.
- `assets/wix-home-event.js` — the next upcoming event in the home page event box.
- `assets/wix-newsletter.js` — newsletter issue page and archive.
- `assets/wix-newsletter-email.js` — email version of an issue (`newsletter-email.html`).

## Ticket checkout requirements

- Payments set up in Wix (Core plan + a payment provider under Getting Paid). Without them, visitors see "Tickets aren't on sale online yet".
- The site's domain added to the Chapter Website OAuth client's allowed redirect domains (Headless Settings), so Wix can send buyers back.

## Utility pages and redirects

- `newsletter-email.html` is the unlisted, `noindex` email builder.
- `newsletter-january-2027.html` redirects older links to the January 2027 issue.

## Domain cutover and sharing

The current host is `thenucleus.ca`. The planned chapter domain is `abiscebs.ca`.

1. Connect `abiscebs.ca` in GitHub Pages and verify DNS and HTTPS.
2. Add the new address to the allowed redirect URLs for the Wix "Chapter Website" OAuth client in Headless Settings.
3. Align the sitemap, robots file, social-sharing URLs and image URLs, and structured data with the new address. The metadata still includes URLs using `abiscebs.com` and `thenucleus.ca`.
4. Verify the homepage, shared links, and the event checkout return URL on the new domain.

Use **Alberta Chapter of ISCEBS** for the site identity. If a page title or description changes, update its matching social metadata. The share image is `assets/share.jpg` and the organization logo is `assets/logo.png`.
