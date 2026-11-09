// Publish Wix CMS > MembershipFAQ into the static Membership page.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadWix, ROOT } from './wix.mjs';

const { WixSite: W } = await loadWix();
const { esc, settings } = W;
const email = esc(settings.PUBLIC_SETTINGS.chapterEmail);
const contact = `<a data-site-email="address" href="mailto:${email}">${email}</a>`;
const rows = await W.queryCollection(settings.COLLECTIONS.membershipFaq);
const questions = rows.map(row => {
  const title = String(row.title ?? '').trim();
  const answer = String(row.answer ?? '').trim();
  const displayOrder = String(row.displayOrder ?? '').trim();
  const order = Number(displayOrder);
  if (!title || !answer || !displayOrder || !Number.isFinite(order)) {
    throw new Error(`Membership FAQ "${title}" needs a question, answer, and numeric display order.`);
  }
  return { title, answer, order };
}).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'en-CA'));

const content = questions.length
  ? questions.map(({ title, answer }) => {
    const linkedAnswer = esc(answer).replaceAll('{{chapterEmail}}', () => contact);
    return `<details><summary>${esc(title)}<span aria-hidden="true">+</span></summary><div>${linkedAnswer}</div></details>`;
  }).join('')
  : `<p>Email ${contact} with your questions about the Alberta Chapter.</p>`;

const file = path.join(ROOT, 'membership.html');
const html = await readFile(file, 'utf8');
const block = /(<!-- cms:membership-faq -->)[\s\S]*?(<!-- \/cms:membership-faq -->)/;
if (!block.test(html)) throw new Error('Missing membership-faq markers in membership.html.');
const next = html.replace(block, (_, start, end) => start + content + end);
if (next !== html) await writeFile(file, next);
console.log(`Membership FAQs: ${questions.length} questions. ${next === html ? 'No changes.' : 'Updated membership.html.'}`);
