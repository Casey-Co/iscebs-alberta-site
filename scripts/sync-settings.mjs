// Publish the single Wix Website Settings row into the static pages.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadWix, ROOT } from './wix.mjs';

const { WixSite: W } = await loadWix();
const rows = await W.queryCollection(W.settings.COLLECTIONS.websiteSettings);
if (rows.length !== 1) throw new Error('Website Settings must contain exactly one item.');

const row = rows[0];
const boardYear = String(row.boardYear ?? '').trim();
const chapterEmail = String(row.chapterEmail ?? '').trim();
if (!/^[1-9]\d{3}$/.test(boardYear)) throw new Error('Enter a four-digit Board Year in Website Settings.');
if (!/^[\w.+-]+@(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(chapterEmail)) {
  throw new Error('Enter a valid Chapter Email in Website Settings.');
}

const urlFields = {
  membership: 'membershipJoinAndRenewURL',
  canadianCebs: 'canadianCEBSCoursesURL',
  chapterLinkedIn: 'chapterLinkedInURL',
  iscebsWebsite: 'iSCEBSWebsiteURL',
  iscebsWebcasts: 'iSCEBSWebcastsURL'
};
const urls = {};
for (const [name, field] of Object.entries(urlFields)) {
  const url = URL.parse(String(row[field] ?? '').trim());
  if (url?.protocol !== 'https:' || url.username || url.password) {
    throw new Error(`Website Settings field ${field} needs a public HTTPS URL.`);
  }
  urls[name] = url.href;
}

const publicSettings = {
  chapterEmail,
  chapterLinkedIn: urls.chapterLinkedIn,
  iscebsWebcasts: urls.iscebsWebcasts,
  canadianCebs: urls.canadianCebs
};
const configFile = path.join(ROOT, 'assets/wix-config.js');
const config = await readFile(configFile, 'utf8');
const configPattern = /^  PUBLIC_SETTINGS: .*,$/m;
if (!configPattern.test(config)) throw new Error('Missing PUBLIC_SETTINGS in wix-config.js.');
const output = [[configFile, config, config.replace(configPattern, () =>
  `  PUBLIC_SETTINGS: ${JSON.stringify(publicSettings)},`)]];

for (const name of (await readdir(ROOT)).filter(name => name.endsWith('.html'))) {
  const file = path.join(ROOT, name);
  const html = await readFile(file, 'utf8');
  const next = html
    .replace(/(data-site-link="(\w+)" href=")[^"]*/g, (_, prefix, key) => {
      if (!Object.hasOwn(urls, key)) throw new Error(`Unknown website link: ${key} in ${name}`);
      return prefix + W.esc(urls[key]);
    })
    .replace(/(data-site-email="(address|link)" href="mailto:)[^"?]+([^"]*"[^>]*>)([^<]*)/g,
      (_, prefix, mode, suffix, text) => prefix + chapterEmail + suffix + (mode === 'address' ? chapterEmail : text))
    .replace(/(<h2 id="board-heading">)[^<]*(<\/h2>)/g, (_, start, end) => `${start}Meet the ${boardYear} Board${end}`)
    .replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (_, start, json, end) =>
      start + json.replace(/("email"\s*:\s*")[^"]*/g, (_, prefix) => prefix + chapterEmail) + end);
  output.push([file, html, next]);
}

const changed = output.filter(([, before, after]) => before !== after);
for (const [file, , next] of changed) await writeFile(file, next);
console.log(`Website Settings: ${changed.length} files updated.`);
