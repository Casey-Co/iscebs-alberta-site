/*
  Shared Wix connection helpers used by wix-board.js and wix-events.js.
  Settings (client ID, collection IDs) live in wix-config.js, not here.
*/
(() => {
  const settings = window.WIX_SETTINGS || {};
  const API = 'https://www.wixapis.com';
  let tokenPromise;

  const configured = () =>
    Boolean(settings.WIX_CLIENT_ID) && !String(settings.WIX_CLIENT_ID).startsWith('PASTE');

  async function request(path, options = {}) {
    const response = await fetch(API + path, { ...options, signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const err = new Error('Wix request failed: ' + response.status);
      err.status = response.status;
      err.code = body?.details?.applicationError?.code || '';
      throw err;
    }
    return response.json();
  }

  // Anonymous visitor token: read-only access to public content. No admin keys.
  function getToken() {
    if (!tokenPromise) {
      tokenPromise = request('/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: settings.WIX_CLIENT_ID, grantType: 'anonymous' })
      }).then(t => t.access_token).catch(err => { tokenPromise = null; throw err; });
    }
    return tokenPromise;
  }

  async function post(path, body) {
    const token = await getToken();
    return request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(body)
    });
  }

  async function queryCollection(collectionId, sort = []) {
    const result = await post('/wix-data/v2/items/query',
      { dataCollectionId: collectionId, query: { sort, paging: { limit: 100 } } });
    return (result.dataItems || []).map(i => i.data || {});
  }

  // Field keys depend on how fields were named in Wix, so accept common variants.
  function field(item, ...keys) {
    for (const k of keys) {
      const v = item?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const safeLink = url => (/^https:\/\//i.test(String(url || '')) ? String(url) : '');

  // First picture inside a Wix Rich content value (used when a photo field is Rich content).
  function firstRichImage(doc) {
    const stack = [...(doc.nodes || [])];
    while (stack.length) {
      const n = stack.shift();
      const img = n.imageData?.image;
      const src = img?.src || n.galleryData?.items?.[0]?.image?.media?.src;
      if (src?.id && img?.width && img?.height && n.imageData?.crop) {
        // Respect a crop made in the Wix editor (crop values are fractions of the original).
        const c = n.imageData.crop, W = img.width, H = img.height;
        const px = v => Math.max(0, Math.round(v));
        return `https://static.wixstatic.com/media/${src.id}/v1/crop/x_${px(c.x * W)},y_${px(c.y * H)},w_${px(c.width * W)},h_${px(c.height * H)}/${src.id}`;
      }
      if (src) return src.url || src.id || '';
      if (n.nodes) stack.unshift(...n.nodes);
    }
    return '';
  }

  // Wix image value (wix:image://v1/<id>/<name>#...) -> public URL.
  function imageUrl(value) {
    if (!value) return '';
    if (typeof value === 'object' && Array.isArray(value.nodes)) value = firstRichImage(value); // Rich content field
    if (typeof value === 'object' && value) value = value.url || value.src || value.image || value.id || '';
    if (/^[\w-]+~mv2\.\w+$/.test(String(value))) return `https://static.wixstatic.com/media/${value}`;
    const m = String(value).match(/^(?:wix:)?image:\/\/v1\/([^/#?]+)/);
    if (m) return `https://static.wixstatic.com/media/${m[1]}`;
    return safeLink(value);
  }

  // Minimal Wix rich-text renderer: paragraphs, headings and lists, as plain text.
  function richText(rich) {
    const text = node => (node.nodes || []).map(n =>
      n.type === 'TEXT' ? esc(n.textData?.text || '') : text(n)).join('');
    const block = node => {
      switch (node.type) {
        case 'PARAGRAPH': { const t = text(node); return t.trim() ? `<p>${t.replace(/\n/g, '<br>')}</p>` : ''; }
        case 'HEADING': return `<h4>${text(node)}</h4>`;
        case 'BULLETED_LIST': return `<ul>${(node.nodes || []).map(li => `<li>${text(li)}</li>`).join('')}</ul>`;
        case 'ORDERED_LIST': return `<ol>${(node.nodes || []).map(li => `<li>${text(li)}</li>`).join('')}</ol>`;
        default: return '';
      }
    };
    return (rich?.nodes || []).map(block).join('');
  }

  window.WixSite = { settings, configured, post, queryCollection, field, esc, safeLink, imageUrl, richText };
})();
