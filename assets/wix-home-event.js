/*
  Home page: "Coming together in Alberta" event box.
  Shows the next upcoming event from Wix > Events automatically (title, date,
  short description, time and place) and links to it on the Events page.
  No upcoming events: shows a "new events coming soon" message instead.
  If Wix can't be reached, the general message built into index.html stays.
*/
(() => {
  const W = window.WixSite;
  const box = document.querySelector('[data-wix-home-event]');
  if (!W || !box || !W.configured()) return;
  const { esc } = W;
  const tz = e => e.dateAndTimeSettings?.timeZoneId || 'America/Edmonton';

  function show(e) {
    const s = e.dateAndTimeSettings || {};
    const tbd = s.dateAndTimeTbd || !s.startDate;
    const d = tbd ? null : new Date(s.startDate);
    const fmt = o => new Intl.DateTimeFormat('en-CA', { timeZone: tz(e), ...o }).format(d);
    const loc = e.location || {};
    const online = loc.type === 'ONLINE';
    const place = online ? (loc.name || 'Online') : (loc.name || loc.address?.city || loc.address?.formattedAddress || '');
    const time = tbd ? (s.dateAndTimeTbdMessage || 'Date to be announced')
      : `${fmt({ hour: 'numeric', minute: '2-digit' })} ${fmt({ timeZoneName: 'short', hour: 'numeric' }).split(' ').pop()}`;
    box.href = `events.html#event-${encodeURIComponent(e.id)}`;
    box.innerHTML = `
      <div class="event-date">${tbd ? '<span>DATE</span><strong>–</strong><small>TBA</small>'
        : `<span>${esc(fmt({ month: 'short' }).replace('.', '').toUpperCase())}</span><strong>${esc(fmt({ day: 'numeric' }))}</strong><small>${esc(fmt({ year: 'numeric' }))}</small>`}</div>
      <div class="event-info"><div class="eyebrow">${online ? 'ONLINE EVENT' : 'CHAPTER EVENT'}</div>
        <h3>${esc(e.title)}</h3>
        ${e.shortDescription ? `<p>${esc(e.shortDescription)}</p>` : ''}
        <div class="event-meta">${esc([time, place].filter(Boolean).join(' · '))}</div></div>
      <span class="round-arrow" aria-hidden="true">↗</span>`;
    box.setAttribute('aria-label', `${e.title}: event details and registration`);
  }

  function none() {
    box.href = 'events.html';
    box.innerHTML = `<div class="event-date"><span>NEW</span><strong>+</strong><small>SOON</small></div>
      <div class="event-info"><div class="eyebrow">CHAPTER EVENTS</div><h3>New events coming soon</h3>
        <p>We’re planning our next sessions. See past events and check back for what’s next.</p></div>
      <span class="round-arrow" aria-hidden="true">↗</span>`;
  }

  W.post('/events/v3/events/query', {
    fields: ['DETAILS'],
    query: { filter: { status: { $in: ['UPCOMING', 'STARTED'] } }, sort: [{ fieldName: 'dateAndTimeSettings.startDate', order: 'ASC' }], paging: { limit: 1, offset: 0 } }
  }).then(({ events = [] }) => { events.length ? show(events[0]) : none(); box.dataset.source = 'wix'; })
    .catch(err => console.warn('Home event: showing built-in message.', err));
})();
