/*
  Events page: upcoming and past events, loaded live from Wix Events.

  EDITORS (all in Wix > Events, headless project):
  - Every published upcoming event appears here automatically, soonest first.
  - The text under the event title is the event's "Short description" in Wix.
  - RSVP events: visitors fill in the registration form on this page and are
    added to the event's guest list in Wix. Wix sends the confirmation email.
  - Ticketed events: visitors choose tickets here and pay on Wix's secure
    checkout, then return to this page. Requires payments set up in Wix.
  - Past events: every event that has ended, grouped by year.

  If Wix can't be reached, the event built into events.html is shown until the
  date in its data-show-until attribute, then a general "check back" message.
*/
(() => {
  const W = window.WixSite;
  const root = document.querySelector('[data-wix-events]');
  if (!root) return;
  const { esc, safeLink } = W || {};
  const CONTACT = '<a href="mailto:ab.iscebs@gmail.com">ab.iscebs@gmail.com</a>';
  const tz = event => event.dateAndTimeSettings?.timeZoneId || 'America/Edmonton';
  const events = new Map();

  // ---------- Formatting ----------
  function dateParts(event) {
    const s = event.dateAndTimeSettings || {};
    if (s.dateAndTimeTbd || !s.startDate) {
      return { tbd: true, label: s.dateAndTimeTbdMessage || 'Date to be announced' };
    }
    const d = new Date(s.startDate);
    const fmt = opts => new Intl.DateTimeFormat('en-CA', { timeZone: tz(event), ...opts }).format(d);
    const zone = fmt({ timeZoneName: 'short', hour: 'numeric' }).split(' ').pop();
    return {
      dayMonth: fmt({ day: 'numeric', month: 'long' }),
      year: fmt({ year: 'numeric' }),
      long: fmt({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: fmt({ hour: 'numeric', minute: '2-digit' }) + ' ' + zone
    };
  }

  function where(event) {
    const loc = event.location || {};
    if (loc.type === 'ONLINE') return esc(loc.name || 'Online');
    const addr = loc.address?.formattedAddress || loc.address?.addressLine || '';
    return [loc.name, addr].filter(Boolean).map(esc).join('<br>') || 'To be announced';
  }

  const money = m => {
    if (!m || m.value === undefined) return '';
    const n = Number(m.value);
    if (!n) return 'Free';
    try { return new Intl.NumberFormat('en-CA', { style: 'currency', currency: m.currency || 'CAD' }).format(n); }
    catch { return `${m.value} ${m.currency || ''}`.trim(); }
  };

  // ---------- Upcoming event card ----------
  function render(event) {
    const d = dateParts(event);
    const kind = event.location?.type === 'ONLINE' ? 'ONLINE EVENT' : 'CHAPTER EVENT';
    return `<section class="wrap featured-event" id="event-${esc(event.id)}">
      <div class="event-poster">
        <div class="eyebrow">ALBERTA CHAPTER · ${kind}</div>
        <h2>${esc(event.title)}</h2>
        <div class="poster-bottom">${d.tbd ? `<strong>${esc(d.label)}</strong>` : `<strong>${esc(d.dayMonth)}</strong><span>${esc(d.year)} · ${esc(d.time)}</span>`}</div>
      </div>
      <div class="event-details">
        <span class="tag">Upcoming chapter event</span>
        <h2>${esc(event.title)}</h2>
        ${event.shortDescription ? `<p>${esc(event.shortDescription)}</p>` : ''}
        <dl>
          <div><dt>When</dt><dd>${d.tbd ? esc(d.label) : `${esc(d.long)}<br>${esc(d.time)}`}</dd></div>
          <div><dt>Where</dt><dd>${where(event)}</dd></div>
        </dl>
        ${registration(event)}
      </div>
    </section>`;
  }

  function registration(event) {
    const r = event.registration || {};
    const id = esc(event.id);
    let message = '', action = '';
    if (event.status === 'CANCELED') message = 'This event has been cancelled.';
    else if (r.tickets?.soldOut) message = 'This event is sold out.';
    else if (r.registrationPaused || r.registrationDisabled) message = 'Registration is currently closed. Please check back for availability.';
    else if (r.status === 'SCHEDULED_RSVP' && r.rsvp?.startDate) {
      message = 'Registration opens ' + new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: tz(event) }).format(new Date(r.rsvp.startDate)) + '.';
    } else if (r.status === 'OPEN_RSVP' || r.status === 'OPEN_RSVP_WAITLIST_ONLY') {
      const waitlist = r.status === 'OPEN_RSVP_WAITLIST_ONLY';
      if (waitlist) message = 'This event is full. You can join the waitlist.';
      action = `<button class="button" type="button" data-open="rsvp" data-event="${id}" aria-expanded="false">${waitlist ? 'Join the waitlist' : 'RSVP now'}</button>
        <form class="rsvp-form" data-rsvp-form="${id}" hidden novalidate>${formFields(event)}
          <p class="rsvp-error" role="alert" hidden></p>
          <button class="button" type="submit">${waitlist ? 'Join the waitlist' : 'Submit RSVP'}</button>
        </form>`;
    } else if (r.status === 'OPEN_TICKETS') {
      action = `<button class="button" type="button" data-open="tickets" data-event="${id}" aria-expanded="false">Get tickets</button>
        <form class="ticket-form" data-ticket-form="${id}" hidden novalidate>
          <div class="ticket-list" data-ticket-list><p>Loading tickets…</p></div>
          <p class="rsvp-error" role="alert" hidden></p>
          <button class="button" type="submit" hidden>Continue to checkout</button>
        </form>`;
    } else if (r.status === 'OPEN_EXTERNAL' && safeLink(r.external?.url)) {
      action = `<a class="button" href="${esc(safeLink(r.external.url))}" target="_blank" rel="noopener noreferrer">Register now <span aria-hidden="true">↗</span></a>`;
    } else message = 'Registration is currently closed. Please check back for availability.';

    return `<div class="registration-panel" data-panel="${id}">
      ${message ? `<p role="status">${message}</p>` : ''}
      ${action}
    </div>`;
  }

  // ---------- RSVP ----------
  // Build fields from the event's Wix registration form (name and email if none is shared).
  function formFields(event) {
    const fallback = [
      { type: 'NAME', inputs: [{ name: 'firstName', label: 'First name', mandatory: true }, { name: 'lastName', label: 'Last name', mandatory: true }] },
      { type: 'INPUT', inputs: [{ name: 'email', label: 'Email', mandatory: true }] }
    ];
    const controls = (event.form?.controls?.length ? event.form.controls : fallback)
      .filter(c => !c.deleted && c.type !== 'GUEST_CONTROL')
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    let n = 0;
    const fid = () => `rsvp-${esc(event.id)}-${n++}`;
    const req = i => (i.mandatory ? ' required' : '');
    const star = i => (i.mandatory ? ' <span aria-hidden="true">*</span>' : '');
    return controls.map(c => (c.inputs || []).map(i => {
      const name = esc(i.name), label = esc(i.label || i.name), id = fid(), opts = i.options || [];
      if (c.type === 'DROPDOWN') {
        return `<label class="rsvp-field" for="${id}"><span>${label}${star(i)}</span>
          <select id="${id}" name="${name}"${req(i)}><option value="">Please select</option>${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select></label>`;
      }
      if (c.type === 'RADIO' || c.type === 'CHECKBOX') {
        const type = c.type === 'RADIO' ? 'radio' : 'checkbox';
        return `<fieldset class="rsvp-field rsvp-choice" data-name="${name}" data-type="${type}"${i.mandatory ? ' data-required' : ''}>
          <legend>${label}${star(i)}</legend>
          ${opts.map(o => `<label><input type="${type}" name="${name}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</fieldset>`;
      }
      if (c.type === 'TEXTAREA') {
        return `<label class="rsvp-field" for="${id}"><span>${label}${star(i)}</span>
          <textarea id="${id}" name="${name}" rows="3"${i.maxLength ? ` maxlength="${+i.maxLength}"` : ''}${req(i)}></textarea></label>`;
      }
      const type = i.name === 'email' ? 'email' : c.type === 'DATE' ? 'date' : /phone/i.test(i.name) ? 'tel' : 'text';
      const auto = { firstName: 'given-name', lastName: 'family-name', email: 'email' }[i.name] || 'off';
      return `<label class="rsvp-field" for="${id}"><span>${label}${star(i)}</span>
        <input id="${id}" type="${type}" name="${name}" autocomplete="${auto}"${i.maxLength ? ` maxlength="${+i.maxLength}"` : ''}${req(i)}></label>`;
    }).join('')).join('');
  }

  const RSVP_ERRORS = {
    MEMBER_EMAIL_ALREADY_REGISTERED: 'You’re already registered for this event with that email address.',
    MEMBER_ALREADY_REGISTERED: 'You’re already registered for this event.',
    RSVPS_CLOSED: 'Registration for this event has closed.',
    RSVPS_NOT_STARTED: 'Registration for this event hasn’t opened yet.',
    GUEST_LIMIT_EXCEEDED: 'Sorry, this event is now full.',
    RSVP_LIMIT_EXCEEDED: 'Sorry, this event is now full.',
    WAITING_LIST_UNAVAILABLE: 'Sorry, the waitlist for this event isn’t available.',
    INVALID_FORM_RESPONSE: 'Please check the form: one or more answers weren’t accepted.'
  };

  function showError(form, html) {
    const box = form.querySelector('.rsvp-error');
    box.innerHTML = html;
    box.hidden = false;
  }

  async function submitRsvp(form) {
    const event = events.get(form.dataset.rsvpForm);
    const panel = form.closest('[data-panel]');
    const submit = form.querySelector('button[type="submit"]');
    const label = submit.textContent;
    form.querySelector('.rsvp-error').hidden = true;

    let valid = form.checkValidity();
    form.querySelectorAll('fieldset[data-required]').forEach(fs => {
      const ok = fs.querySelector('input:checked');
      fs.classList.toggle('invalid', !ok);
      if (!ok) valid = false;
    });
    if (!valid) { showError(form, 'Please complete the required fields (marked *).'); form.reportValidity(); return; }

    const data = new FormData(form);
    const checkboxes = new Set([...form.querySelectorAll('fieldset[data-type="checkbox"]')].map(f => f.dataset.name));
    const inputValues = [];
    for (const name of new Set(data.keys())) {
      if (checkboxes.has(name)) inputValues.push({ inputName: name, values: data.getAll(name) });
      else if (String(data.get(name)).trim()) inputValues.push({ inputName: name, value: String(data.get(name)).trim() });
    }
    const get = k => String(data.get(k) || '').trim();
    const waitlist = event.registration?.status === 'OPEN_RSVP_WAITLIST_ONLY';

    submit.disabled = true;
    submit.textContent = 'Sending…';
    try {
      await W.post('/events/v2/rsvps', {
        rsvp: {
          eventId: event.id, firstName: get('firstName'), lastName: get('lastName'), email: get('email'),
          status: waitlist ? 'WAITLIST' : 'YES', form: { inputValues }
        }
      });
      const conf = event.form?.messages?.rsvp?.[waitlist ? 'waitlistMessages' : 'positiveMessages']?.confirmation || {};
      panel.innerHTML = `<h3 tabindex="-1">${esc(conf.title || (waitlist ? 'You’re on the waitlist' : 'You’re registered!'))}</h3>
        <p role="status">${esc(conf.message || 'Thank you. A confirmation email is on its way to ' + get('email') + '.')}</p>`;
      panel.querySelector('h3').focus();
    } catch (err) {
      console.warn('RSVP failed', err.status, err.code, err);
      showError(form, esc(RSVP_ERRORS[err.code] || 'Sorry, we couldn’t complete your registration online.') + ` Need help? Email ${CONTACT}.`);
      submit.disabled = false;
      submit.textContent = label;
    }
  }

  // ---------- Tickets ----------
  async function loadTickets(form) {
    const event = events.get(form.dataset.ticketForm);
    const list = form.querySelector('[data-ticket-list]');
    const submit = form.querySelector('button[type="submit"]');
    try {
      const { definitions = [] } = await W.post('/events/v1/checkout/available-tickets/query',
        { offset: 0, limit: 100, sort: 'orderIndex:asc', filter: { eventId: event.id } });
      const rows = [];
      definitions.forEach(t => {
        const max = Math.min(t.limitPerCheckout || 10, 10);
        const onSale = !t.saleStatus || t.saleStatus === 'SALE_STARTED';
        const status = t.saleStatus === 'SALE_SCHEDULED' ? 'Not on sale yet' : t.saleStatus === 'SALE_ENDED' ? 'Sale ended' : '';
        const options = t.pricing?.pricingOptions?.options?.length
          ? t.pricing.pricingOptions.options.map(o => ({ key: `${t.id}|${o.id}`, name: `${t.name} – ${o.name}`, price: money(o.price) }))
          : [{ key: `${t.id}|`, name: t.name, price: money(t.pricing?.fixedPrice || t.pricing?.minPrice || t.price) }];
        options.forEach(o => rows.push(`<div class="ticket-row">
          <div><strong>${esc(o.name)}</strong>${t.description ? `<small>${esc(t.description)}</small>` : ''}</div>
          <div class="ticket-price">${esc(o.price)}</div>
          ${onSale ? `<label class="ticket-qty"><span class="sr-only">Quantity of ${esc(o.name)}</span>
            <select name="${esc(o.key)}">${Array.from({ length: max + 1 }, (_, n) => `<option>${n}</option>`).join('')}</select></label>`
            : `<div class="ticket-status">${status}</div>`}
        </div>`));
      });
      if (!rows.length) { list.innerHTML = `<p>Tickets aren’t available online right now. Email ${CONTACT} for help.</p>`; return; }
      list.innerHTML = rows.join('');
      submit.hidden = false;
    } catch (err) {
      console.warn('Tickets failed to load', err.status, err.code, err);
      list.innerHTML = `<p>We couldn’t load tickets right now. Please refresh the page, or email ${CONTACT}.</p>`;
    }
  }

  async function checkout(form) {
    const event = events.get(form.dataset.ticketForm);
    const submit = form.querySelector('button[type="submit"]');
    form.querySelector('.rsvp-error').hidden = true;
    const tickets = [...form.querySelectorAll('.ticket-qty select')]
      .map(s => ({ key: s.name, quantity: +s.value })).filter(t => t.quantity > 0)
      .map(({ key, quantity }) => {
        const [ticketDefinitionId, pricingOptionId] = key.split('|');
        return { ticketDefinitionId, quantity, ...(pricingOptionId ? { ticketInfo: { pricingOptionId } } : {}) };
      });
    if (!tickets.length) { showError(form, 'Please choose at least one ticket.'); return; }

    submit.disabled = true;
    submit.textContent = 'Reserving your tickets…';
    try {
      const res = await W.post('/events/v1/ticket-reservations', { ticketReservation: { tickets } });
      const reservationId = res.ticketReservation?.id || res.id;
      const here = location.href.split(/[?#]/)[0];
      const { redirectSession } = await W.post('/_api/redirects-api/v1/redirect-session', {
        eventsCheckout: { reservationId, eventSlug: event.slug },
        callbacks: { postFlowUrl: here, thankYouPageUrl: here + '?purchase=complete' }
      });
      location.href = redirectSession.fullUrl;
    } catch (err) {
      console.warn('Checkout failed', err.status, err.code, err);
      const msg = err.status === 403
        ? 'Tickets aren’t on sale online yet.'
        : 'Sorry, we couldn’t start checkout.';
      showError(form, `${msg} Email ${CONTACT} to register.`);
      submit.disabled = false;
      submit.textContent = 'Continue to checkout';
    }
  }

  // Message after returning from Wix checkout.
  function purchaseNotice() {
    const q = new URLSearchParams(location.search);
    if (q.get('purchase') !== 'complete') return;
    const note = document.createElement('div');
    note.className = 'wrap purchase-notice';
    note.setAttribute('role', 'status');
    note.innerHTML = `<strong>Thank you, your tickets are confirmed.</strong> ${q.get('orderNumber') ? `Order ${esc(q.get('orderNumber'))}. ` : ''}A confirmation email with your tickets is on its way.`;
    root.before(note);
  }

  // ---------- Interactions ----------
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-open]');
    if (!btn) return;
    const id = CSS.escape(btn.dataset.event);
    const form = root.querySelector(btn.dataset.open === 'rsvp' ? `[data-rsvp-form="${id}"]` : `[data-ticket-form="${id}"]`);
    form.hidden = false;
    btn.hidden = true;
    btn.setAttribute('aria-expanded', 'true');
    if (btn.dataset.open === 'tickets') loadTickets(form);
    else form.querySelector('input, select, textarea')?.focus();
  });
  root.addEventListener('change', e => {
    e.target.closest('fieldset.invalid')?.classList.remove('invalid');
    const err = e.target.closest('form')?.querySelector('.rsvp-error');
    if (err) err.hidden = true;
  });
  root.addEventListener('submit', e => {
    const form = e.target.closest('form');
    if (!form) return;
    e.preventDefault();
    if (form.dataset.rsvpForm) submitRsvp(form);
    else if (form.dataset.ticketForm) checkout(form);
  });

  // ---------- Empty / offline states ----------
  const none = `<section class="wrap featured-event-empty section">
      <div class="eyebrow">UPCOMING EVENTS</div>
      <h2>New events are on the way.</h2>
      <p>There are no upcoming chapter events scheduled right now. Check back soon, or email ${CONTACT} to hear about the next one.</p>
    </section>`;

  function fallback() {
    const until = Date.parse(root.dataset.showUntil || '');
    if (!until || Date.now() > until) { root.innerHTML = none; return; }
    const status = root.querySelector('[data-registration-status]');
    if (status) status.innerHTML = `We couldn’t load live registration details. Please refresh the page, or email ${CONTACT} for help.`;
  }

  // ---------- Past events ----------
  // Every Wix event that has ended, newest first, grouped by year.
  // The section stays hidden until Wix returns at least one ended event.
  function loadPast() {
    const box = document.querySelector('[data-past-events]');
    if (!box) return;
    W.post('/events/v3/events/query', {
      fields: ['DETAILS'],
      query: {
        filter: { status: { $eq: 'ENDED' } },
        sort: [{ fieldName: 'dateAndTimeSettings.startDate', order: 'DESC' }],
        paging: { limit: 200, offset: 0 }
      }
    }).then(({ events: ended = [] }) => {
      const all = ended.filter(e => e.title && e.dateAndTimeSettings?.startDate).map(e => {
        const d = new Date(e.dateAndTimeSettings.startDate);
        const zone = tz(e);
        const loc = e.location || {};
        const city = loc.address?.city || '';
        return {
          date: new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d),
          label: new Intl.DateTimeFormat('en-US', { timeZone: zone, month: 'long', day: 'numeric', year: 'numeric' }).format(d),
          title: e.title,
          format: loc.type === 'ONLINE' ? (loc.name || 'Online') : [loc.name, city !== loc.name ? city : ''].filter(Boolean).join(' · ')
        };
      }).sort((a, b) => b.date.localeCompare(a.date));
      if (!all.length) return;

      const years = [...new Set(all.map(e => e.date.slice(0, 4)))];
      const list = y => `<ol class="past-list">${all.filter(e => e.date.startsWith(y)).map(e =>
        `<li class="past-event"><time datetime="${esc(e.date)}">${esc(e.label)}</time><h4>${esc(e.title)}</h4>${e.format ? `<p>${esc(e.format)}</p>` : ''}</li>`).join('')}</ol>`;
      box.innerHTML = years.map((y, i) => i === 0
        ? `<div class="past-year"><h3>${esc(y)}</h3>${list(y)}</div>`
        : `<details class="past-year"><summary>Explore ${esc(y)} events</summary>${list(y)}</details>`).join('');
      box.dataset.source = 'wix';
      box.closest('section').hidden = false;
    }).catch(err => console.warn('Past events: could not load from Wix.', err));
  }

  // ---------- Start ----------
  purchaseNotice();
  if (!W || !W.configured()) { fallback(); return; }
  loadPast();

  W.post('/events/v3/events/query', {
    fields: ['DETAILS', 'REGISTRATION', 'FORM'],
    query: {
      filter: { status: { $in: ['UPCOMING', 'STARTED'] } },
      sort: [{ fieldName: 'dateAndTimeSettings.startDate', order: 'ASC' }],
      paging: { limit: 10, offset: 0 }
    }
  }).then(({ events: list = [] }) => {
    list.forEach(e => events.set(e.id, e));
    root.innerHTML = list.length ? list.map(render).join('') : none;
    root.dataset.source = 'wix';
    // Arriving from a link like events.html?register=<id>: go to that event and open its form.
    const want = new URLSearchParams(location.search).get('register') || (location.hash.startsWith('#event-') ? location.hash.slice(7) : '');
    if (want) {
      const card = document.getElementById('event-' + want);
      card?.scrollIntoView({ block: 'start' });
      if (new URLSearchParams(location.search).get('register')) card?.querySelector('[data-open]')?.click();
    }
  }).catch(err => { console.warn('Events: showing built-in copy.', err); fallback(); });
})();
