/* Public AGM archive. Editors manage Title, Date, Event Name and Minutes in Wix.
   No draft flag: every saved entry with minutes is public. Content stays in Wix. */
(() => {
  const root = document.querySelector('[data-minutes-root]');
  if (!root) return;
  const W = window.WixSite;
  const params = new URLSearchParams(location.search);
  const meeting = params.get('meeting');
  const dateOf = value => {
    const raw = typeof value === 'object' && value ? value.$date || value.date : value;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const dateText = d => d ? new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  }).format(d) : '';

  // Rebuild allowed formatting in a detached document. Never trust pasted HTML,
  // inline styles, event handlers, embedded objects or arbitrary link protocols.
  const allowed = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'UL',
    'OL', 'LI', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'DIV', 'SPAN',
    'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'HR', 'SUB', 'SUP', 'A']);
  const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE',
    'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'LINK', 'META']);
  function cleanHtml(value) {
    const parsed = new DOMParser().parseFromString(String(value), 'text/html');
    function copy(node) {
      if (node.nodeType === 3) return document.createTextNode(node.textContent);
      const fragment = document.createDocumentFragment();
      if (node.nodeType !== 1 || blocked.has(node.tagName)) return fragment;
      let output = fragment;
      if (allowed.has(node.tagName) || node.tagName === 'H1') {
        output = document.createElement(node.tagName === 'H1' ? 'h2' : node.tagName.toLowerCase());
        if (node.tagName === 'A') {
          const href = (node.getAttribute('href') || '').trim();
          try {
            const url = new URL(href);
            if (['https:', 'http:', 'mailto:'].includes(url.protocol)) {
              output.setAttribute('href', url.href);
              if (url.protocol !== 'mailto:') {
                output.setAttribute('target', '_blank');
                output.setAttribute('rel', 'noopener noreferrer');
              }
            }
          } catch {}
        }
      }
      // Wix/Word sometimes expresses emphasis with span styles rather than tags.
      // Translate only these three formatting properties into semantic markup.
      let target = output;
      const emphasis = [];
      if (node.style.fontWeight === 'bold' || Number(node.style.fontWeight) >= 600) emphasis.push('strong');
      if (node.style.fontStyle === 'italic') emphasis.push('em');
      if (/\bunderline\b/.test(node.style.textDecorationLine || node.style.textDecoration)) emphasis.push('u');
      for (const tag of emphasis) {
        const wrapper = document.createElement(tag);
        target.append(wrapper); target = wrapper;
      }
      for (const child of node.childNodes) target.append(copy(child));
      return output;
    }
    const container = document.createElement('div');
    for (const child of parsed.body.childNodes) container.append(copy(child));
    return container.innerHTML;
  }
  function rich(value) {
    if (!value) return '';
    if (typeof value === 'object') return cleanHtml(W.richText(value));
    const s = String(value).trim();
    if (/<[a-z][\s\S]*>/i.test(s)) return cleanHtml(s);
    return s.split(/\n\s*\n/).map(p => `<p>${W.esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  }
  function hasContent(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return Boolean(parsed.body.textContent.trim());
  }
  async function load() {
    // Page through all records so older years remain available beyond 100 entries.
    const rows = [];
    let offset = 0;
    while (true) {
      const result = await W.post('/wix-data/v2/items/query', {
        dataCollectionId: W.settings.COLLECTIONS.agmMinutes,
        query: { sort: [{ fieldName: 'date', order: 'DESC' }, { fieldName: '_id', order: 'ASC' }],
          paging: { limit: 100, offset } }
      });
      const items = result.dataItems || [];
      rows.push(...items.map(i => ({ ...i.data, _id: i.id || i.data?._id })));
      if (items.length < 100) break;
      offset += items.length;
    }
    return rows.map(r => ({
      id: r._id, title: W.field(r, 'title') || W.field(r, 'eventName') || 'AGM minutes',
      event: W.field(r, 'eventName'), date: dateOf(r.date), body: rich(r.minutes)
    })).filter(r => r.id && hasContent(r.body)).sort((a, b) => (b.date || 0) - (a.date || 0));
  }
  function status(message, retry = false) {
    root.innerHTML = `<section class="wrap minutes-status"><p role="status">${W.esc(message)}</p>
      ${retry ? '<button class="button" type="button" data-minutes-retry>Try again</button>' : ''}
      ${meeting ? '<p><a class="text-link" href="agm-minutes.html">Back to AGM minutes <span aria-hidden="true">→</span></a></p>' : ''}</section>`;
    root.querySelector('[data-minutes-retry]')?.addEventListener('click', init);
  }
  function render(rows) {
    if (meeting) {
      const entry = rows.find(r => r.id === meeting);
      if (!entry) { status('These minutes are not available. Please return to the archive.'); return; }
      document.title = `${entry.title} | AGM Minutes | Alberta Chapter of ISCEBS`;
      document.querySelector('[data-minutes-intro]').hidden = true;
      root.innerHTML = `<article class="wrap minutes-reader">
        <a class="text-link minutes-back" href="agm-minutes.html">← All AGM minutes</a>
        <div class="eyebrow">ANNUAL GENERAL MEETING</div><h1>${W.esc(entry.title)}</h1>
        <p class="minutes-meta">${entry.event ? `<span>${W.esc(entry.event)}</span>` : ''}
        ${entry.date ? `<time datetime="${entry.date.toISOString().slice(0, 10)}">${W.esc(dateText(entry.date))}</time>` : ''}</p>
        <div class="minutes-body">${entry.body}</div></article>`;
      return;
    }
    if (!rows.length) { status('No AGM minutes have been added yet. Please check back soon.'); return; }
    const years = new Map();
    for (const entry of rows) {
      const year = entry.date ? String(entry.date.getUTCFullYear()) : 'Other meetings';
      if (!years.has(year)) years.set(year, []);
      years.get(year).push(entry);
    }
    root.innerHTML = `<div class="wrap minutes-archive">${[...years].map(([year, entries]) =>
      `<section class="minutes-year" aria-label="${W.esc(year)} meetings"><h2>${W.esc(year)}</h2>
      <div>${entries.map(e => `<article class="minutes-card">
        ${e.date ? `<time datetime="${e.date.toISOString().slice(0, 10)}">${W.esc(dateText(e.date))}</time>` : ''}
        <h3><a href="agm-minutes.html?meeting=${encodeURIComponent(e.id)}">${W.esc(e.title)}</a></h3>
        ${e.event && e.event !== e.title ? `<p>${W.esc(e.event)}</p>` : ''}
        <a class="text-link" href="agm-minutes.html?meeting=${encodeURIComponent(e.id)}" aria-label="${W.esc('Read minutes: ' + e.title)}">Read minutes <span aria-hidden="true">→</span></a>
      </article>`).join('')}</div></section>`).join('')}</div>`;
  }
  async function init() {
    if (!W?.configured() || !W.settings.COLLECTIONS?.agmMinutes) {
      root.innerHTML = '<section class="wrap minutes-status"><p role="status">AGM minutes are temporarily unavailable. Please check back later.</p></section>';
      return;
    }
    status('Loading AGM minutes…');
    try { render(await load()); }
    catch { status('We couldn’t load the AGM minutes. Please try again.', true); }
  }
  init();
})();
