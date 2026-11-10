const toggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav?.classList.contains('open')) {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }
});

const search = document.getElementById('resource-search');
const empty = document.getElementById('resource-empty');
if (search && empty) {
  let category = 'All';
  function filter() {
    const buttons = [...document.querySelectorAll('[data-filter]')];
    const items = [...document.querySelectorAll('.resource-item')];
    if (!buttons.some(button => button.dataset.filter === category)) category = 'All';
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    const query = search.value.trim().toLowerCase();
    let count = 0;
    items.forEach(item => {
      const show = (category === 'All' || item.dataset.category === category) && item.textContent.toLowerCase().includes(query);
      item.hidden = !show;
      if (show) count++;
    });
    empty.hidden = count !== 0;
    empty.textContent = items.length
      ? 'No resources match that search. Try another word or category.'
      : 'No resources are listed right now.';
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    category = button.dataset.filter;
    filter();
  });
  search.addEventListener('input', filter);
  document.addEventListener('resources:updated', filter);
  filter();
}
