/*
  Events page: upcoming events, loaded live from Wix Events.

  Editors: create and publish events in Wix > Events. Every published upcoming
  event appears here automatically, soonest first. Put venue details, pricing
  and anything else attendees need in the event's description in Wix.

  Registration: the button opens the event's Wix registration page, which
  handles RSVPs now and paid tickets later (once payments are set up in Wix).

  If Wix can't be reached, the event built into events.html is shown until the
  date in its data-show-until attribute, then a general "check back" message.
*/
(() => {
  const W = window.WixSite;
  const root = document.querySelector('[data-wix-events]');
  if (!root) return;
  const { esc, safeLink, richText } = W || {};

  const OPEN = ['OPEN_RSVP', 'OPEN_RSVP_WAITLIST_ONLY', 'OPEN_TICKETS', 'OPEN_EXTERNAL'];

  function dateParts(event) {
    const s = event.dateAndTimeSettings || {};
    if (s.dateAndTimeTbd || !s.startDate) {
      return { tbd: true, label: s.dateAndTimeTbdMessage || 'Date to be announced' };
    }
    const d = new Date(s.startDate);
    const tz = s.timeZoneId || 'America/Edmonton';
    const fmt = opts => new Intl.DateTimeFormat('en-CA', { timeZone: tz, ...opts }).format(d);
    const zone = fmt({ timeZoneName: 'short', hour: 'numeric' }).split(' ').pop();
    return {
      dayMonth: fmt({ day: 'numeric', month: 'long' }),
      year: fmt({ year: 'numeric' }),
      long: fmt({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: fmt({ hour: 'numeric', minute: '2-digit' }).replace('a.m.', 'a.m.').replace('p.m.', 'p.m.') + ' ' + zone
    };
  }

  function where(event) {
    const loc = event.location || {};
    if (loc.type === 'ONLINE') return 'Online';
    const addr = loc.address?.formattedAddress || loc.address?.addressLine || '';
    return [loc.name, addr].filter(Boolean).map(esc).join('<br>') || 'To be announced';
  }

  function eventUrl(event) {
    const { base, path } = event.eventPageUrl || {};
    if (!base || !path) return '';
    return safeLink(base.replace(/\/$/, '') + '/' + path.replace(/^\//, ''));
  }

  function registration(event) {
    const r = event.registration || {};
    const url = r.type === 'EXTERNAL' ? safeLink(r.external?.url) : eventUrl(event);
    const price = r.type === 'TICKETING' && r.tickets?.lowestPrice
      ? (r.tickets.lowestPrice.value === r.tickets.highestPrice?.value
          ? r.tickets.lowestPrice.formattedValue
          : `${r.tickets.lowestPrice.formattedValue} – ${r.tickets.highestPrice.formattedValue}`)
      : '';
    let message, label = '';
    if (event.status === 'CANCELED') message = 'This event has been cancelled.';
    else if (r.tickets?.soldOut) message = 'This event is sold out.';
    else if (r.registrationPaused || r.registrationDisabled) message = 'Registration is currently closed. Please check back for availability.';
    else if (r.status === 'SCHEDULED_RSVP' && r.rsvp?.startDate) {
      message = 'Registration opens ' + new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: event.dateAndTimeSettings?.timeZoneId || 'America/Edmonton' }).format(new Date(r.rsvp.startDate)) + '.';
    } else if (OPEN.includes(r.status) && url) {
      label = r.status === 'OPEN_RSVP_WAITLIST_ONLY' ? 'Join the waitlist' : 'Register now';
      message = r.status === 'OPEN_RSVP_WAITLIST_ONLY'
        ? 'This event is full. You can join the waitlist.'
        : 'Registration is open.' + (price ? ` Tickets: ${esc(price)}.` : '');
    } else message = 'Registration is currently closed. Please check back for availability.';

    return `<div class="registration-panel">
      <h3>Event registration</h3>
      <p role="status">${message}</p>
      ${label ? `<a class="button" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span></a>` : ''}
    </div>`;
  }

  function render(event) {
    const d = dateParts(event);
    const kind = event.location?.type === 'ONLINE' ? 'ONLINE EVENT' : 'CHAPTER EVENT';
    const cal = event.calendarUrls || {};
    const calLinks = [cal.google && `<a class="text-link" href="${esc(safeLink(cal.google))}" target="_blank" rel="noopener noreferrer">Add to Google Calendar <span aria-hidden="true">↗</span></a>`,
      cal.ics && `<a class="text-link" href="${esc(safeLink(cal.ics))}">Add to Outlook / Apple Calendar</a>`].filter(Boolean).join(' ');
    const description = richText(event.description) || (event.shortDescription ? `<p>${esc(event.shortDescription)}</p>` : '');

    return `<section class="wrap featured-event">
      <div class="event-poster">
        <div class="eyebrow">ALBERTA CHAPTER · ${kind}</div>
        <h2>${esc(event.title)}</h2>
        <div class="poster-bottom">${d.tbd ? `<strong>${esc(d.label)}</strong>` : `<strong>${esc(d.dayMonth)}</strong><span>${esc(d.year)} · ${esc(d.time)}</span>`}</div>
      </div>
      <div class="event-details">
        <span class="tag">Upcoming chapter event</span>
        <h2>${esc(event.title)}</h2>
        ${description ? `<div class="event-description">${description}</div>` : ''}
        <dl>
          <div><dt>When</dt><dd>${d.tbd ? esc(d.label) : `${esc(d.long)}<br>${esc(d.time)}`}</dd></div>
          <div><dt>Where</dt><dd>${where(event)}</dd></div>
        </dl>
        ${registration(event)}
        ${calLinks ? `<div class="calendar-links">${calLinks}</div>` : ''}
      </div>
    </section>`;
  }

  const none = `<section class="wrap featured-event-empty section">
      <div class="eyebrow">UPCOMING EVENTS</div>
      <h2>New events are on the way.</h2>
      <p>There are no upcoming chapter events scheduled right now. Check back soon, or email
      <a href="mailto:ab.iscebs@gmail.com">ab.iscebs@gmail.com</a> to hear about the next one.</p>
    </section>`;

  // Fallback when Wix is unreachable: keep the built-in event until it has passed.
  function fallback() {
    const until = Date.parse(root.dataset.showUntil || '');
    if (!until || Date.now() > until) { root.innerHTML = none; return; }
    const status = root.querySelector('[data-registration-status]');
    if (status) status.innerHTML = 'We couldn’t load live registration details. Please refresh the page, or email <a href="mailto:ab.iscebs@gmail.com">ab.iscebs@gmail.com</a> for help.';
  }

  if (!W || !W.configured()) { fallback(); return; }

  W.post('/events/v3/events/query', {
    fields: ['DETAILS', 'TEXTS', 'REGISTRATION', 'URLS'],
    query: {
      filter: { status: { $in: ['UPCOMING', 'STARTED'] } },
      sort: [{ fieldName: 'dateAndTimeSettings.startDate', order: 'ASC' }],
      paging: { limit: 10, offset: 0 }
    }
  }).then(({ events = [] }) => {
    root.innerHTML = events.length ? events.map(render).join('') : none;
    root.dataset.source = 'wix';
  }).catch(err => { console.warn('Events: showing built-in copy.', err); fallback(); });
})();
