/*
  Board card markup, shared by the About page (wix-board.js) and the nightly sync
  (scripts/sync-board.mjs), so the saved copy and the live copy always match.
  Needs window.WixSite (wix-client.js) for field/esc/imageUrl/webLink.
*/
(() => {
  const PORTRAIT_W = 160, PORTRAIT_H = 211; // matches .board-portrait (372:491)

  // Wix media id from a plain Wix image URL, or '' for anything else (crops, other hosts).
  function mediaId(url) {
    const m = String(url || '').match(/^https:\/\/static\.wixstatic\.com\/media\/([^/?#]+)$/);
    return m ? m[1] : '';
  }

  // Ask Wix for a photo already sized (and sharpened) for the 160px-wide portrait,
  // plus a 2x version for high-resolution screens.
  function wixSize(url, scale) {
    const id = mediaId(url);
    if (!id) return url;
    return `https://static.wixstatic.com/media/${id}/v1/fill/w_${PORTRAIT_W * scale},h_${PORTRAIT_H * scale},al_c,q_80,usm_0.66_1.00_0.01,enc_auto/${id}`;
  }
  const wixSources = url => mediaId(url)
    ? { src: wixSize(url, 2), srcset: `${wixSize(url, 1)} 1x, ${wixSize(url, 2)} 2x`, original: url }
    : { src: url, srcset: '', original: '' };

  // CMS rows -> plain member records. Field keys depend on how fields were named in Wix.
  function normalize(items, W) {
    const str = v => (v === undefined || v === null ? '' : String(v).trim());
    return items.map(m => {
      const photo = W.imageUrl(W.field(m, 'photo', 'image'));
      return {
        name: str(W.field(m, 'title', 'name')),
        role: str(W.field(m, 'role')),
        credentials: str(W.field(m, 'credentials')),
        work: [W.field(m, 'jobTitle', 'job_title', 'jobtitle'), W.field(m, 'company')].map(str).filter(Boolean),
        linkedin: W.webLink(W.field(m, 'linkedIn', 'linkedin', 'linkedInUrl')),
        photo,
        photoKey: mediaId(photo) || photo
      };
    });
  }

  // What the visitor sees, as one string. Same board in Wix = same signature.
  const signature = members => JSON.stringify(members.map(m =>
    [m.name, m.role, m.credentials, m.work, m.linkedin, m.photoKey]));

  // pic: { src, srcset, original, local } or null for no photo.
  function card(m, pic, esc) {
    const img = !pic ? '' : `<img class="board-portrait" src="${esc(pic.src)}"${pic.srcset ? ` srcset="${esc(pic.srcset)}"` : ''}`
      + ` data-photo-key="${esc(m.photoKey)}"${pic.local ? ' data-local="1"' : ''}${pic.original ? ` data-original="${esc(pic.original)}"` : ''}`
      + ` alt="${esc(m.name)}" width="372" height="491" loading="lazy" decoding="async"`
      + ` onerror="if(this.dataset.original&&this.src!==this.dataset.original){this.removeAttribute('srcset');this.src=this.dataset.original;this.dataset.original=''}else{this.remove()}">`;
    return `<article class="board-member">${img}`
      + (m.role ? `<div class="eyebrow">${esc(m.role)}</div>` : '')
      + `<h3>${esc(m.name)}</h3>`
      + (m.credentials ? `<p class="board-credentials">${esc(m.credentials)}</p>` : '')
      + (m.work.length ? `<p class="board-work">${m.work.map(esc).join('<br>')}</p>` : '')
      + (m.linkedin ? `<a class="board-link" href="${esc(m.linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(m.name)} on LinkedIn">LinkedIn <span aria-hidden="true">↗</span></a>` : '')
      + `</article>`;
  }

  window.BoardRender = { PORTRAIT_W, PORTRAIT_H, mediaId, wixSize, wixSources, normalize, signature, card };
})();
