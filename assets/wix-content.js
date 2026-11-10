/* Refresh CMS content without hiding the saved page while Wix loads. */
(() => {
  const W = window.WixSite;
  const R = window.WixContentRender;
  if (!W || !R || !W.configured()) return;

  const cards = document.querySelector('[data-wix-resources]');
  const filters = document.querySelector('[data-wix-resource-filters]');
  if (cards && filters) {
    Promise.all([W.queryCollection(W.settings.COLLECTIONS.resources), W.settingsReady]).then(([rows]) => {
      const result = R.resources(rows, W);
      filters.innerHTML = result.filters;
      cards.innerHTML = result.cards;
      document.dispatchEvent(new CustomEvent('resources:updated'));
    }).catch(err => console.warn('Resources: showing saved copy.', err));
  }

  const faq = document.querySelector('[data-wix-membership-faq]');
  if (faq) {
    Promise.all([W.queryCollection(W.settings.COLLECTIONS.membershipFaq), W.settingsReady]).then(([rows]) => {
      const result = R.membershipFaq(rows, W);
      const open = new Set([...faq.querySelectorAll('details[open]')].map(item => item.querySelector('summary').textContent));
      faq.innerHTML = result.content;
      faq.querySelectorAll('details').forEach(item => {
        item.open = open.has(item.querySelector('summary').textContent);
      });
    }).catch(err => console.warn('Membership FAQs: showing saved copy.', err));
  }
})();
