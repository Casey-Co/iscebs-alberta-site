// Publish Wix CMS > Resources into the static directory and category filters.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadWix, ROOT } from './wix.mjs';

const { WixSite: W } = await loadWix();
const { esc, settings } = W;
const sharedLinks = new Map([
  ['ISCEBS Webcasts URL', 'iscebsWebcasts'],
  ['Canadian CEBS Courses URL', 'canadianCebs']
]);
const categoryOrder = ['Education', 'CEBS', 'News', 'Community'];
const text = value => String(value ?? '').trim();
const rows = await W.queryCollection(settings.COLLECTIONS.resources);

const resources = rows.map(row => {
  const title = text(row.title);
  const category = text(row.category);
  const displayOrder = text(row.displayOrder);
  const order = Number(displayOrder);
  if (!title || !category || category === 'All' || !displayOrder || !Number.isFinite(order)) {
    throw new Error(`Resource "${title}" needs a title, category other than All, and numeric display order.`);
  }

  const shared = text(row.websiteSettingsLink);
  const key = sharedLinks.get(shared);
  if (shared && !key) throw new Error(`Resource "${title}" has an unknown Website Settings Link.`);
  const url = URL.parse(key ? settings.PUBLIC_SETTINGS[key] : text(row.resourceURL));
  if (url?.protocol !== 'https:' || url.username || url.password) {
    throw new Error(`Resource "${title}" needs a public HTTPS link.`);
  }
  return { title, category, order, key, url: url.href, description: text(row.description), access: text(row.accessNote) };
}).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'en-CA'));

const categories = new Set(resources.map(resource => resource.category));
const existingCategories = categoryOrder.filter(category => categories.has(category));
const newCategories = [...categories].filter(category => !categoryOrder.includes(category));
const filters = ['All', ...existingCategories, ...newCategories]
  .map(category => `<button data-filter="${esc(category)}" aria-pressed="${category === 'All'}">${esc(category)}</button>`)
  .join('');

const cards = resources.map(({ title, category, key, url, description, access }) =>
  `<article class="resource-item" data-category="${esc(category)}"><div class="eyebrow">${esc(category.toUpperCase())}</div><h3>${esc(title)}</h3>` +
  (description ? `<p>${esc(description)}</p>` : '') +
  (access ? `<span class="access-note">${esc(access)}</span>` : '') +
  `<a class="text-link"${key ? ` data-site-link="${key}"` : ''} href="${esc(url)}" target="_blank" rel="noopener noreferrer">Visit resource<span aria-hidden="true">↗</span></a></article>`
).join('');

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
  .replace(/<p id="resource-empty"(?: hidden)?>[^<]*<\/p>/, resources.length
    ? '<p id="resource-empty" hidden>No resources match that search. Try another word or category.</p>'
    : '<p id="resource-empty">No resources are listed right now.</p>');
if (next !== html) await writeFile(file, next);
console.log(`Resources: ${resources.length} cards. ${next === html ? 'No changes.' : 'Updated resources.html.'}`);
