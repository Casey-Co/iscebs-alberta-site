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

  W.queryCollection(collection, [{ fieldName: 'displayOrder', order: 'ASC' }]).then(members => {
    if (!members.length) return; // keep built-in copy
    const { field, esc, safeLink, imageUrl } = W;
    grid.innerHTML = members.map(m => {
      const name = field(m, 'title', 'name');
      const role = field(m, 'role');
      const credentials = field(m, 'credentials');
      const work = [field(m, 'jobTitle', 'job_title', 'jobtitle'), field(m, 'company')]
        .filter(Boolean).map(esc).join('<br>');
      const linkedin = safeLink(field(m, 'linkedIn', 'linkedin', 'linkedInUrl'));
      // Photo comes only from the Wix CMS. No photo uploaded = no photo shown.
      const photo = imageUrl(field(m, 'photo', 'image'));
      return `<article class="board-member">
        ${photo ? `<img class="board-portrait" src="${esc(photo)}" alt="${esc(name)}" width="372" height="491" loading="lazy" onerror="this.remove()">` : ''}
        ${role ? `<div class="eyebrow">${esc(role)}</div>` : ''}
        <h3>${esc(name)}</h3>
        ${credentials ? `<p class="board-credentials">${esc(credentials)}</p>` : ''}
        ${work ? `<p class="board-work">${work}</p>` : ''}
        ${linkedin ? `<a class="board-link" href="${esc(linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(name)} on LinkedIn">LinkedIn <span aria-hidden="true">↗</span></a>` : ''}
      </article>`;
    }).join('');
    grid.dataset.source = 'wix';
  }).catch(err => console.warn('Board: showing built-in copy.', err));
})();
