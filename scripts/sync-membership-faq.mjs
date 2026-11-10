// Publish Wix CMS > MembershipFAQ into the static Membership page.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadWix, ROOT } from './wix.mjs';

const { WixSite: W, WixContentRender: R } = await loadWix('wix-content-render.js');
const rows = await W.queryCollection(W.settings.COLLECTIONS.membershipFaq);
const { content, count } = R.membershipFaq(rows, W);

const file = path.join(ROOT, 'membership.html');
const html = await readFile(file, 'utf8');
const block = /(<!-- cms:membership-faq -->)[\s\S]*?(<!-- \/cms:membership-faq -->)/;
if (!block.test(html)) throw new Error('Missing membership-faq markers in membership.html.');
const next = html.replace(block, (_, start, end) => start + content + end);
if (next !== html) await writeFile(file, next);
console.log(`Membership FAQs: ${count} questions. ${next === html ? 'No changes.' : 'Updated membership.html.'}`);
