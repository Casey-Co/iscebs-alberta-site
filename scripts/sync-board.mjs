// Saves the board from the Wix CMS into about.html, with photos stored on this website.
// Run by .github/workflows/sync-board.yml (nightly, or "Run workflow" in GitHub Actions).
// Uses the same public, read-only Wix access as the website. No secrets needed.
//
//   node scripts/sync-board.mjs
//
// If Wix can't be reached or returns no board members, nothing is changed.
import { readFile, writeFile, mkdir, readdir, unlink, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PAGE = path.join(ROOT, 'about.html');
const PHOTO_DIR = path.join(ROOT, 'assets', 'board');
const PHOTO_URL = 'assets/board/';

// Load the website's own Wix helpers and card markup, so output matches the live page exactly.
const window = {};
const context = vm.createContext({ window, fetch, AbortSignal, URL, console, Promise, JSON, Date });
for (const f of ['wix-config.js', 'wix-client.js', 'wix-board-render.js']) {
  vm.runInContext(await readFile(path.join(ROOT, 'assets', f), 'utf8'), context, { filename: f });
}
const W = window.WixSite, R = window.BoardRender;
if (!W.configured()) { console.log('Wix is not configured; nothing to do.'); process.exit(0); }

const items = await W.queryCollection(W.settings.COLLECTIONS.boardMembers, [{ fieldName: 'displayOrder', order: 'ASC' }]);
if (!items.length) { console.log('Wix returned no board members; leaving the page as it is.'); process.exit(0); }
const members = R.normalize(items, W);
console.log(`Board members from Wix: ${members.length}`);

const EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' };
const exists = p => access(p).then(() => true, () => false);

async function download(url, base) {
  // Reuse a file already saved for this exact photo and size.
  for (const ext of Object.values(EXT)) if (await exists(path.join(PHOTO_DIR, `${base}.${ext}`))) return `${base}.${ext}`;
  const res = await fetch(url, { headers: { Accept: 'image/webp,image/jpeg,image/png;q=0.8' }, signal: AbortSignal.timeout(30000) });
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!res.ok || !EXT[type]) throw new Error(`${res.status} ${type || 'unknown type'}`);
  const name = `${base}.${EXT[type]}`;
  await writeFile(path.join(PHOTO_DIR, name), Buffer.from(await res.arrayBuffer()));
  return name;
}

await mkdir(PHOTO_DIR, { recursive: true });
const used = new Set();
const cards = [];
for (const m of members) {
  let pic = null;
  if (m.photo) {
    // File names come from the Wix photo, so a replaced photo gets a new name (no stale caches).
    const base = createHash('sha1').update(m.photoKey).digest('hex').slice(0, 12);
    try {
      if (R.mediaId(m.photo)) {
        const one = await download(R.wixSize(m.photo, 1), `${base}-160`);
        const two = await download(R.wixSize(m.photo, 2), `${base}-320`);
        used.add(one); used.add(two);
        pic = { src: PHOTO_URL + two, srcset: `${PHOTO_URL + one} 1x, ${PHOTO_URL + two} 2x`, local: true };
      } else {
        const only = await download(m.photo, `${base}-orig`);
        used.add(only);
        pic = { src: PHOTO_URL + only, srcset: '', local: true };
      }
    } catch (err) {
      console.warn(`Photo for ${m.name} not saved (${err.message}); page will load it from Wix.`);
      pic = R.wixSources(m.photo);
    }
  }
  cards.push(R.card(m, pic, W.esc));
}

const grid = `<div class="board-grid" data-wix-board data-sig="${W.esc(R.signature(members))}">${cards.join('')}<!--board:end--></div>`;
const html = await readFile(PAGE, 'utf8');
const pattern = /<div class="board-grid" data-wix-board[^>]*>[\s\S]*?<!--board:end--><\/div>/;
if (!pattern.test(html)) throw new Error('Could not find the board section (<!--board:end--> marker) in about.html');
const next = html.replace(pattern, () => grid);
if (next !== html) { await writeFile(PAGE, next); console.log('about.html updated.'); }
else console.log('about.html already up to date.');

// Remove photos no longer used by anyone on the board.
for (const f of await readdir(PHOTO_DIR)) {
  if (!used.has(f) && /^[0-9a-f]{12}-(160|320|orig)\.\w+$/.test(f)) { await unlink(path.join(PHOTO_DIR, f)); console.log(`Removed old photo ${f}`); }
}
