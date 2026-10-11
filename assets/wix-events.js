/*
  Events page: upcoming events, loaded live from Wix Events.

  Editors: create and publish events in Wix > Events. Every published upcoming
  event appears here automatically, soonest first. Put venue details, pricing
  and anything else attendees need in the event's description in Wix.

  Registration (RSVP events): the form is built from the event's registration
  form in Wix (Wix > Events > event > Registration form), shown on this page,
  and each response is saved straight into the event's guest list in Wix.
  Wix sends the confirmation email. Paid ticketing is not wired up yet.

  If Wix can't be reached, the event built into events.html is shown until the
  date in its data-show-until attribute, then a general "check back" message.
*/
(() => {
  const W = window.WixSite;
  const root = document.querySelector('[data-wix-events]');
  if (!root) return;
  const { esc, safeLink, richText } = W || {};

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

  const tz = event => event.dateAndTimeSettings?.timeZoneId || 'America/Edmonton';
  const events = new Map();

  function registration(event) {
    const r = event.registration || {};
    let message, action = '';
    if (event.status === 'CANCELED') message = 'This event has been cancelled.';
    else if (r.tickets?.soldOut) message = 'This event is sold out.';
    else if (r.registrationPaused || r.registrationDisabled) message = 'Registration is currently closed. Please check back for availability.';
    else if (r.status === 'SCHEDULED_RSVP' && r.rsvp?.startDate) {
      message = 'Registration opens ' + new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: tz(event) }).format(new Date(r.rsvp.startDate)) + '.';
    } else if ((r.status === 'OPEN_RSVP' || r.status === 'OPEN_RSVP_WAITLIST_ONLY') && event.form?.controls?.length) {
      const waitlist = r.status === 'OPEN_RSVP_WAITLIST_ONLY';
      message = waitlist ? 'This event is full. You can join the waitlist.' : 'Registration is open.';
      action = `<button class="button" type="button" data-rsvp-open="${esc(event.id)}" aria-expanded="false">${waitlist ? 'Join the waitlist' : 'Register now'}</button>
        <form class="rsvp-form" data-rsvp-form="${esc(event.id)}" hidden novalidate>${formFields(event)}
          <p class="rsvp-error" role="alert" hidden></p>
          <button class="button" type="submit">${esc(event.form.messages?.rsvp?.submitActionLabel || (waitlist ? 'Join the waitlist' : 'Submit registration'))}</button>
        </form>`;
    } else if (r.status === 'OPEN_EXTERNAL' && safeLink(r.external?.url)) {
      message = 'Registration is open.';
      action = `<a class="button" href="${esc(safeLink(r.external.url))}" target="_blank" rel="noopener noreferrer">Register now <span aria-hidden="true">↗</span></a>`;
    } else if (r.status === 'OPEN_TICKETS') {
      message = 'Tickets will be available here soon. Email <a href="mailto:ab.iscebs@gmail.com">ab.iscebs@gmail.com</a> to register in the meantime.';
    } else message = 'Registration is currently closed. Please check back for availability.';

    return `<div class="registration-panel" data-rsvp-panel="${esc(event.id)}">
      <h3>Event registration</h3>
      <p role="status" data-rsvp-status>${message}</p>
      ${action}
    </div>`;
  }

  // Build form fields from the event's Wix registration form.
  function formFields(event) {
    const controls = (event.form.controls || []).filter(c => !c.deleted)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    let n = 0;
    const id = () => `rsvp-${esc(event.id)}-${n++}`;
    const req = i => (i.mandatory ? ' required' : '');
    const star = i => (i.mandatory ? ' <span aria-hidden="true">*</span>' : '');
    return controls.map(c => {
      if (c.type === 'GUEST_CONTROL') return ''; // additional guests: register separately
      return (c.inputs || []).map(i => {
        const name = esc(i.name), label = esc(i.label || i.name), fid = id();
        const opts = i.options || [];
        if (c.type === 'DROPDOWN') {
          return `<label class="rsvp-field" for="${fid}"><span>${label}${star(i)}</span>
            <select id="${fid}" name="${name}"${req(i)}><option value="">Please select</option>${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select></label>`;
        }
        if (c.type === 'RADIO' || c.type === 'CHECKBOX') {
          const type = c.type === 'RADIO' ? 'radio' : 'checkbox';
          return `<fieldset class="rsvp-field rsvp-choice" data-name="${name}" data-type="${type}"${i.mandatory ? ' data-required' : ''}>
            <legend>${label}${star(i)}</legend>
            ${opts.map(o => `<label><input type="${type}" name="${name}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</fieldset>`;
        }
        if (c.type === 'TEXTAREA') {
          return `<label class="rsvp-field" for="${fid}"><span>${label}${star(i)}</span>
            <textarea id="${fid}" name="${name}" rows="3"${i.maxLength ? ` maxlength="${+i.maxLength}"` : ''}${req(i)}></textarea></label>`;
        }
        const type = i.name === 'email' ? 'email' : c.type === 'DATE' ? 'date' : /phone/i.test(i.name) ? 'tel' : 'text';
        const auto = { firstName: 'given-name', lastName: 'family-name', email: 'email' }[i.name] || 'off';
        return `<label class="rsvp-field" for="${fid}"><span>${label}${star(i)}</span>
          <input id="${fid}" type="${type}" name="${name}" autocomplete="${auto}"${i.maxLength ? ` maxlength="${+i.maxLength}"` : ''}${req(i)}></label>`;
      }).join('');
    }).join('');
  }

  const ERRORS = {
    MEMBER_EMAIL_ALREADY_REGISTERED: 'You’re already registered for this event with that email address.',
    MEMBER_ALREADY_REGISTERED: 'You’re already registered for this event.',
    RSVPS_CLOSED: 'Registration for this event has closed.',
    RSVPS_NOT_STARTED: 'Registration for this event hasn’t opened yet.',
    GUEST_LIMIT_EXCEEDED: 'Sorry, this event is now full.',
    RSVP_LIMIT_EXCEEDED: 'Sorry, this event is now full.',
    WAITING_LIST_UNAVAILABLE: 'Sorry, the waitlist for this event isn’t available.',
    INVALID_FORM_RESPONSE: 'Please check the form: one or more answers weren’t accepted.'
  };

  async function submitRsvp(form) {
    const event = events.get(form.dataset.rsvpForm);
    const panel = form.closest('[data-rsvp-panel]');
    const errorBox = form.querySelector('.rsvp-error');
    const submit = form.querySelector('button[type="submit"]');
    errorBox.hidden = true;

    // Validate (including required radio/checkbox groups).
    let valid = form.checkValidity();
    form.querySelectorAll('fieldset[data-required]').forEach(fs => {
      const ok = fs.querySelector('input:checked');
      fs.classList.toggle('invalid', !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      errorBox.textContent = 'Please complete the required fields (marked *).';
      errorBox.hidden = false;
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const inputValues = [];
    const checkboxNames = new Set([...form.querySelectorAll('fieldset[data-type="checkbox"]')].map(f => f.dataset.name));
    for (const name of new Set(data.keys())) {
      if (checkboxNames.has(name)) inputValues.push({ inputName: name, values: data.getAll(name) });
      else if (String(data.get(name)).trim()) inputValues.push({ inputName: name, value: String(data.get(name)).trim() });
    }
    const get = k => String(data.get(k) || '').trim();
    const waitlist = event.registration?.status === 'OPEN_RSVP_WAITLIST_ONLY';

    submit.disabled = true;
    submit.textContent = 'Sending…';
    try {
      const result = await W.post('/events/v2/rsvps', {
        rsvp: {
          eventId: event.id, firstName: get('firstName'), lastName: get('lastName'), email: get('email'),
          status: waitlist ? 'WAITLIST' : 'YES', form: { inputValues }
        }
      });
      const conf = event.form.messages?.rsvp?.[waitlist ? 'waitlistMessages' : 'positiveMessages']?.confirmation || {};
      const cal = result.calendarLinks || event.calendarUrls || {};
      panel.innerHTML = `<h3>${esc(conf.title || (waitlist ? 'You’re on the waitlist' : 'You’re registered!'))}</h3>
        <p role="status">${esc(conf.message || 'Thank you. A confirmation email is on its way to ' + get('email') + '.')}</p>
        ${safeLink(cal.google) ? `<a class="text-link" href="${esc(safeLink(cal.google))}" target="_blank" rel="noopener noreferrer">Add to Google Calendar <span aria-hidden="true">↗</span></a>` : ''}`;
      panel.querySelector('h3').setAttribute('tabindex', '-1');
      panel.querySelector('h3').focus();
    } catch (err) {
      console.warn('RSVP failed', err.status, err.code, err);
      errorBox.innerHTML = esc(ERRORS[err.code] || 'Sorry, we couldn’t complete your registration online.') +
        ' Need help? Email <a href="mailto:ab.iscebs@gmail.com">ab.iscebs@gmail.com</a>.';
      errorBox.hidden = false;
      submit.disabled = false;
      submit.textContent = event.form.messages?.rsvp?.submitActionLabel || (waitlist ? 'Join the waitlist' : 'Submit registration');
    }
  }

  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-rsvp-open]');
    if (!btn) return;
    const form = root.querySelector(`[data-rsvp-form="${CSS.escape(btn.dataset.rsvpOpen)}"]`);
    form.hidden = false;
    btn.hidden = true;
    btn.setAttribute('aria-expanded', 'true');
    form.querySelector('input, select, textarea')?.focus();
  });
  root.addEventListener('change', e => {
    e.target.closest('fieldset.invalid')?.classList.remove('invalid');
  });
  root.addEventListener('submit', e => {
    const form = e.target.closest('[data-rsvp-form]');
    if (!form) return;
    e.preventDefault();
    submitRsvp(form);
  });

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

  // Past events: every Wix event that has ended, newest first, grouped by year.
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
      if (!all.length) return; // nothing ended yet: section stays hidden

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

  if (!W || !W.configured()) { fallback(); return; }
  loadPast();

  W.post('/events/v3/events/query', {
    fields: ['DETAILS', 'TEXTS', 'REGISTRATION', 'FORM'],
    query: {
      filter: { status: { $in: ['UPCOMING', 'STARTED'] } },
      sort: [{ fieldName: 'dateAndTimeSettings.startDate', order: 'ASC' }],
      paging: { limit: 10, offset: 0 }
    }
  }).then(({ events: list = [] }) => {
    list.forEach(e => events.set(e.id, e));
    root.innerHTML = list.length ? list.map(render).join('') : none;
    root.dataset.source = 'wix';
  }).catch(err => { console.warn('Events: showing built-in copy.', err); fallback(); });
})();
