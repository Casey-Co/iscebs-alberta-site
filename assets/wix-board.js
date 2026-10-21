/*
  About page: "Meet the Board" section, loaded from the Wix CMS.
  Editors: Wix > CMS > Board Members collection. Sort order = "Display Order".
  Photos come only from the CMS (Photo field). If Wix can't be reached, the board list
  built into about.html is shown instead, without photos.
*/
(() => {
  const W = window.WixSite;
  const grid = document.querySelector('[data-wix-board]');
  const collection = W?.settings.COLLECTIONS?.boardMembers;
  if (!W || !grid || !collection || !W.configured()) return;

  // Ask Wix for a photo already sized (and sharpened) for the 160px-wide portrait,
  // with a 2x version for high-resolution screens (3x adds weight with no visible gain at this size). Shrinking a full-size phone photo
  // in the browser makes it look soft until you zoom in.
  const PORTRAIT_W = 160, PORTRAIT_H = 211; // matches .board-portrait (372:491)
  function portraitSources(url) {
    const m = String(url).match(/^https:\/\/static\.wixstatic\.com\/media\/([^/?#]+)$/);
    if (!m) return { src: url, srcset: '' };
    const id = m[1];
    const at = n => `https://static.wixstatic.com/media/${id}/v1/fill/w_${PORTRAIT_W * n},h_${PORTRAIT_H * n},al_c,q_80,usm_0.66_1.00_0.01,enc_auto/${id}`;
    return { src: at(2), srcset: `${at(1)} 1x, ${at(2)} 2x` };
  }

  const { field, esc, imageUrl, store } = W;
  const CACHE_KEY = 'wix-board-v1:' + collection;

  function render(members) {
    const html = members.map(m => {
      const name = field(m, 'title', 'name');
      const role = field(m, 'role');
      const credentials = field(m, 'credentials');
      const work = [field(m, 'jobTitle', 'job_title', 'jobtitle'), field(m, 'company')]
        .filter(Boolean).map(esc).join('<br>');
      const linkedin = W.webLink(field(m, 'linkedIn', 'linkedin', 'linkedInUrl')); // https:// optional
      // Photo comes only from the Wix CMS. No photo uploaded = no photo shown.
      const photo = imageUrl(field(m, 'photo', 'image'));
      const pic = portraitSources(photo);
      return `<article class="board-member">
        ${photo ? `<img class="board-portrait" src="${esc(pic.src)}"${pic.srcset ? ` srcset="${esc(pic.srcset)}"` : ''} data-original="${esc(photo)}" alt="${esc(name)}" width="372" height="491" loading="lazy" decoding="async" onerror="if(this.dataset.original&&this.src!==this.dataset.original){this.removeAttribute('srcset');this.src=this.dataset.original;this.dataset.original=''}else{this.remove()}">` : ''}
        ${role ? `<div class="eyebrow">${esc(role)}</div>` : ''}
        <h3>${esc(name)}</h3>
        ${credentials ? `<p class="board-credentials">${esc(credentials)}</p>` : ''}
        ${work ? `<p class="board-work">${work}</p>` : ''}
        ${linkedin ? `<a class="board-link" href="${esc(linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(name)} on LinkedIn">LinkedIn <span aria-hidden="true">↗</span></a>` : ''}
      </article>`;
    }).join('');
    if (grid.dataset.html !== html) { grid.innerHTML = html; grid.dataset.html = html; }
    grid.dataset.source = 'wix';
  }

  // Show the board from the last visit straight away (photos usually already in the
  // browser cache), then refresh from Wix in the background. Only redraws if something
  // changed in the CMS, so returning visitors never wait on Wix.
  const cached = store.get(CACHE_KEY);
  if (Array.isArray(cached) && cached.length) render(cached);

  W.queryCollection(collection, [{ fieldName: 'displayOrder', order: 'ASC' }]).then(members => {
    if (!members.length) return; // keep built-in copy
    store.set(CACHE_KEY, members);
    render(members);
  }).catch(err => console.warn('Board: Wix not reached; showing ' + (cached ? 'saved' : 'built-in') + ' copy.', err));
})();
