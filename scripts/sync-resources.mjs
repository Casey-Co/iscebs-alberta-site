// Publish Wix CMS > Resources into the static directory and category filters.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadWix, ROOT } from './wix.mjs';

const { WixSite: W, WixContentRender: R } = await loadWix('wix-content-render.js');
const rows = await W.queryCollection(W.settings.COLLECTIONS.resources);
const { filters, cards, count } = R.resources(rows, W);

const file = path.join(ROOT, 'resources.html');
const html = await readFile(file, 'utf8');
function updateBlock(page, name, content) {
  const start = `<!-- cms:${name} -->`;
  const end = `<!-- /cms:${name} -->`;
  const from = page.indexOf(start);
  const to = page.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`Missing ${name} markers in resources.html.`);
  return page.slice(0, from + start.length) + content + page.slice(to);
}

const next = updateBlock(updateBlock(html, 'resource-filters', filters), 'resource-cards', cards)
  .replace(/<p id="resource-empty"(?: hidden)?>[^<]*<\/p>/, count
    ? '<p id="resource-empty" hidden>No resources match that search. Try another word or category.</p>'
    : '<p id="resource-empty">No resources are listed right now.</p>');
if (next !== html) await writeFile(file, next);
console.log(`Resources: ${count} cards. ${next === html ? 'No changes.' : 'Updated resources.html.'}`);
