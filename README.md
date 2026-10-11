# Alberta Chapter of ISCEBS — website

Static HTML/CSS/JavaScript site. No build step, no server, no packages to install.
`index.html` is the home page. Published with GitHub Pages from the `main` branch (root).

## Where content lives

| Content | Edited in | Notes |
|---|---|---|
| Upcoming events, registration | **Wix → Events** (headless project) | Every published upcoming event appears on `events.html` automatically. |
| Board members (About page) | **Wix → CMS → Board Members** collection | Sorted by *Display Order*. Photos uploaded in Wix; if none, `assets/board/<first-last>.jpg` is used. |
| Everything else (page text, layout, design) | The HTML files in this repository | Edit in GitHub (pencil icon) and commit; the site republishes in a minute or two. |

## Wix connection

- Settings are in **`assets/wix-config.js`**: the public OAuth client ID and CMS collection IDs.
- The client ID is public by design (anonymous visitor, read-only). **Never commit an admin API key or client secret.**
- `assets/wix-client.js` — shared connection helpers.
- `assets/wix-board.js` — loads the board onto `about.html`.
- `assets/wix-events.js` — loads upcoming events onto `events.html`.
- Each page keeps a built-in copy of its content, shown if Wix can't be reached.

## When the site moves to its final domain

1. In Wix: Headless Settings → the "Chapter Website" client → add the new domain to its allowed domains/URLs.
2. Search the HTML for `sharkey-c980.chatgpt.site` and replace with the new domain (newsletter sharing metadata).
