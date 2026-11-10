/* Resource cards and membership FAQs, shared by live pages and the nightly sync. */
(() => {
  const text = value => String(value ?? '').trim();
  const sharedLinks = new Map([
    ['ISCEBS Webcasts URL', 'iscebsWebcasts'],
    ['Canadian CEBS Courses URL', 'canadianCebs']
  ]);
  const categoryOrder = ['Education', 'CEBS', 'News', 'Community'];

  function resources(rows, W) {
    const { esc, settings } = W;
    const items = rows.map(row => {
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
      let url;
      try { url = new URL(key ? settings.PUBLIC_SETTINGS[key] : text(row.resourceURL)); } catch {}
      if (url?.protocol !== 'https:' || url.username || url.password) {
        throw new Error(`Resource "${title}" needs a public HTTPS link.`);
      }
      return { title, category, order, key, url: url.href, description: text(row.description), access: text(row.accessNote) };
    }).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'en-CA'));

    const categories = new Set(items.map(item => item.category));
    const existing = categoryOrder.filter(category => categories.has(category));
    const added = [...categories].filter(category => !categoryOrder.includes(category));
    const filters = ['All', ...existing, ...added].map(category =>
      `<button data-filter="${esc(category)}" aria-pressed="${category === 'All'}">${esc(category)}</button>`
    ).join('');
    const cards = items.map(({ title, category, key, url, description, access }) =>
      `<article class="resource-item" data-category="${esc(category)}"><div class="eyebrow">${esc(category.toUpperCase())}</div><h3>${esc(title)}</h3>` +
      (description ? `<p>${esc(description)}</p>` : '') +
      (access ? `<span class="access-note">${esc(access)}</span>` : '') +
      `<a class="text-link"${key ? ` data-site-link="${key}"` : ''} href="${esc(url)}" target="_blank" rel="noopener noreferrer">Visit resource<span aria-hidden="true">↗</span></a></article>`
    ).join('');
    return { filters, cards, count: items.length };
  }

  function membershipFaq(rows, W) {
    const { esc, settings } = W;
    const email = esc(settings.PUBLIC_SETTINGS.chapterEmail);
    const contact = `<a data-site-email="address" href="mailto:${email}">${email}</a>`;
    const questions = rows.map(row => {
      const title = text(row.title);
      const answer = text(row.answer);
      const displayOrder = text(row.displayOrder);
      const order = Number(displayOrder);
      if (!title || !answer || !displayOrder || !Number.isFinite(order)) {
        throw new Error(`Membership FAQ "${title}" needs a question, answer, and numeric display order.`);
      }
      return { title, answer, order };
    }).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'en-CA'));
    const content = questions.length ? questions.map(({ title, answer }) => {
      const linkedAnswer = esc(answer).replaceAll('{{chapterEmail}}', () => contact);
      return `<details><summary>${esc(title)}<span aria-hidden="true">+</span></summary><div>${linkedAnswer}</div></details>`;
    }).join('') : `<p>Email ${contact} with your questions about the Alberta Chapter.</p>`;
    return { content, count: questions.length };
  }

  window.WixContentRender = { resources, membershipFaq };
})();
