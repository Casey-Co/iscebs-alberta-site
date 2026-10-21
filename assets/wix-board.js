/*
  About page: "Meet the Board" section.
  Editors: Wix > CMS > Board Members collection. Sort order = "Display Order".

  How it loads:
  1. about.html already contains the board, photos included, saved from Wix each night
     by the "Sync board from Wix" job (scripts/sync-board.mjs). The photos live on this
     website, so they show even on networks that block Wix.
  2. This script then checks Wix in the background. If the board was edited since the
     last sync, it shows the newer version (new photos come from Wix until the next
     sync saves them here). If nothing changed, it does nothing.
*/
(() => {
  const W = window.WixSite, R = window.BoardRender;
  const grid = document.querySelector('[data-wix-board]');
  const collection = W?.settings.COLLECTIONS?.boardMembers;
  if (!W || !R || !grid || !collection || !W.configured()) return;

  // Photos already saved on this website, by Wix photo.
  const saved = {};
  grid.querySelectorAll('img[data-local][data-photo-key]').forEach(img => {
    saved[img.dataset.photoKey] = { src: img.getAttribute('src'), srcset: img.getAttribute('srcset') || '', local: true };
  });

  W.queryCollection(collection, [{ fieldName: 'displayOrder', order: 'ASC' }]).then(items => {
    if (!items.length) return; // keep the saved copy
    const members = R.normalize(items, W);
    const sig = R.signature(members);
    if (grid.dataset.sig === sig) return; // saved copy is current
    grid.innerHTML = members.map(m =>
      R.card(m, m.photo ? (saved[m.photoKey] || R.wixSources(m.photo)) : null, W.esc)).join('');
    grid.dataset.sig = sig;
    grid.dataset.source = 'wix';
  }).catch(err => console.warn('Board: Wix not reached; showing saved copy.', err));
})();
