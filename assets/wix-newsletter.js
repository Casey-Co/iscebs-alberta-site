/*
  Chapter newsletter, loaded from the Wix CMS "Newsletter Issues" collection.

  EDITORS: one row per issue in Wix > CMS > Newsletter Issues.
  - Slug: the issue's web address, e.g. 2027-01 -> newsletter-issue.html?issue=2027-01
  - Published: tick to show the issue on the website. Unticked issues can be
    previewed with newsletter-issue.html?issue=<slug>&preview=1
  - Each section only appears if it has content, so leave a section blank to skip it.
  - Education ahead: lists upcoming Wix events automatically with Register links.
    The issue only sets the section's label, heading and intro.
  - President: type the board member's name; their photo, credentials and
    LinkedIn come from the Board Members collection automatically.
  - Member spotlight: any member. Fill Spotlight Name, Spotlight Photo (image),
    Spotlight Role, Spotlight Work and Spotlight LinkedIn. If the person is on
    the board, blank fields are filled from Board Members.

  Pages: newsletter.html (latest issue + archive) and newsletter-issue.html (one issue).
*/
(() => {
  const W = window.WixSite;
  const issueRoot = document.querySelector('[data-issue-root]');
  const archiveRoot = document.querySelector('[data-newsletter-archive]');
  if (!issueRoot && !archiveRoot) return;
  const { esc, field, imageUrl, safeLink, settings } = W || {};
  const params = new URLSearchParams(location.search);
  const preview = params.get('preview') === '1';
  const CONTACT = 'ab.iscebs@gmail.com';

  // ---------- Helpers ----------
  const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const firstName = s => String(s || '').trim().split(/\s+/)[0] || '';

  function dateOf(v) {
    if (!v) return null;
    const raw = typeof v === 'object' ? (v.$date || v.date || '') : v;
    const d = new Date(String(raw).length === 10 ? raw + 'T12:00:00' : raw);
    return isNaN(d) ? null : d;
  }
  // Wix stores dates as UTC; read them in UTC so 1 February never shows as January.
  const monthYear = d => d ? new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d) : '';
  const issueNo = n => (n || n === 0) ? 'Issue ' + String(n).padStart(2, '0') : '';
  const isPublished = i => i.published === true || i.published === 'true';
  // Slug may be stored as text or (if Wix imported it as a date) as a date: normalise to text.
  function slugText(v) {
    if (!v) return '';
    if (typeof v === 'object' || /^\d{4}-\d{2}-\d{2}T/.test(String(v))) {
      const d = dateOf(v);
      return d ? d.toISOString().slice(0, 7) : '';
    }
    return String(v).trim();
  }
  const ym = d => d ? d.toISOString().slice(0, 7) : '';
  // An issue can be found by its slug, its issue date (YYYY-MM) or its issue number.
  const issueKeys = i => [i.slug, ym(i.date), i.number !== '' && i.number != null ? String(i.number) : '', i._id]
    .filter(Boolean).map(k => String(k).trim().toLowerCase());
  const issueUrl = i => `newsletter-issue.html?issue=${encodeURIComponent(i.slug || ym(i.date) || i._id)}`;

  // Rich text from Wix: HTML (Rich text field), Ricos JSON (Rich content field) or plain text.
  const ALLOWED = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'UL', 'OL', 'LI', 'H3', 'H4', 'BLOCKQUOTE', 'SPAN']);
  function sanitize(htmlString) {
    const doc = new DOMParser().parseFromString(`<div>${htmlString}</div>`, 'text/html');
    const clean = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 1) {
          if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'TEMPLATE'].includes(child.tagName)) { child.remove(); return; }
          if (!ALLOWED.has(child.tagName)) { child.replaceWith(...child.childNodes); clean(node); return; }
          [...child.attributes].forEach(a => {
            if (!(child.tagName === 'A' && a.name === 'href')) child.removeAttribute(a.name);
          });
          if (child.tagName === 'A') {
            const href = child.getAttribute('href') || '';
            if (!/^(https:|mailto:|[a-z0-9-]+\.html)/i.test(href)) child.removeAttribute('href');
            else if (/^https:/i.test(href)) { child.target = '_blank'; child.rel = 'noopener noreferrer'; }
          }
          clean(child);
        } else if (child.nodeType !== 3) child.remove();
      });
    };
    const root = doc.body.firstChild;
    clean(root);
    return root.innerHTML;
  }
  function rich(value) {
    if (!value) return '';
    if (typeof value === 'object') return W.richText(value);
    const s = String(value).trim();
    if (/<[a-z][\s\S]*>/i.test(s)) return sanitize(s);
    return s.split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  }
  const text = v => esc(String(v || '').trim()).replace(/\n/g, '<br>');

  // ---------- Data ----------
  async function loadIssues() {
    const id = settings.COLLECTIONS?.newsletterIssues;
    if (!id) throw new Error('No newsletter collection configured');
    const rows = await W.queryCollection(id, [{ fieldName: 'issueDate', order: 'DESC' }]);
    return rows.map(r => ({
      ...r,
      slug: slugText(field(r, 'slug')),
      date: dateOf(field(r, 'issueDate', 'date')),
      number: field(r, 'issueNumber', 'number')
    })).sort((a, b) => (b.date || 0) - (a.date || 0));
  }

  async function loadBoard() {
    const id = settings.COLLECTIONS?.boardMembers;
    if (!id) return [];
    try { return await W.queryCollection(id); } catch { return []; }
  }

  // Person details: from the issue fields first, then the Board Members collection.
  function person(issue, prefix, board) {
    const name = field(issue, prefix + 'Name');
    if (!name) return null;
    const b = board.find(m => slugify(field(m, 'title', 'name')) === slugify(name)) || {};
    const boardWork = [field(b, 'jobTitle', 'job_title'), field(b, 'company')].filter(Boolean).join('\n');
    return {
      name,
      first: firstName(name),
      photo: imageUrl(field(issue, prefix + 'Photo')) || imageUrl(field(b, 'photo', 'image')) || `assets/board/${slugify(name)}.jpg`,
      role: field(issue, prefix + 'Role') || [field(b, 'credentials'), field(b, 'role')].filter(Boolean).join(' · '),
      work: field(issue, prefix + 'Work') || boardWork,
      linkedin: safeLink(field(issue, prefix + 'LinkedIn', prefix + 'Linkedin', prefix + 'LinkedInUrl') || field(b, 'linkedIn', 'linkedin'))
    };
  }

  // Upcoming events from Wix Events (for the "Education ahead" section).
  async function loadUpcoming() {
    try {
      const { events = [] } = await W.post('/events/v3/events/query', {
        fields: ['DETAILS', 'REGISTRATION'],
        query: {
          filter: { status: { $in: ['UPCOMING', 'STARTED'] } },
          sort: [{ fieldName: 'dateAndTimeSettings.startDate', order: 'ASC' }],
          paging: { limit: 6, offset: 0 }
        }
      });
      return events;
    } catch { return []; }
  }
  function eventWhen(e) {
    const s = e.dateAndTimeSettings || {};
    if (s.dateAndTimeTbd || !s.startDate) return s.dateAndTimeTbdMessage || 'Date to be announced';
    const fmt = o => new Intl.DateTimeFormat('en-CA', { timeZone: s.timeZoneId || 'America/Edmonton', ...o }).format(new Date(s.startDate));
    return `${fmt({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${fmt({ hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`;
  }

  // ---------- Issue page ----------
  function renderIssue(issue, board, upcoming = []) {
    const f = (...k) => field(issue, ...k);
    const when = monthYear(issue.date);
    const sections = [], contents = [];

    // From the President
    const pres = person(issue, 'president', board);
    const presMessage = rich(f('presidentMessage'));
    if (pres && presMessage) {
      contents.push(['president', `From ${pres.first}`]);
      sections.push(`<section id="president" class="issue-section president-message"><div>
        <img class="issue-president-photo" src="${esc(pres.photo)}" alt="${esc(pres.name)}" width="160" height="211" onerror="this.remove()">
        <p class="eyebrow">FROM THE PRESIDENT</p>
        <h2>${esc(f('presidentHeading') || `A welcome from ${pres.first}`)}</h2>
        <p class="issue-byline">${esc(pres.name)}${f('presidentRole') ? `<br>${text(f('presidentRole'))}` : ''}</p>
      </div><div class="prose">${presMessage}</div></section>`);
    }

    // Celebrations
    const cards = [
      ['New CEBS graduates', rich(f('cebsGraduates'))],
      ['New GBA & RPA designees', rich(f('gbaRpaDesignees', 'gbaAndRpaDesignees'))],
      ['Successful exam takers', rich(f('examPasses', 'examTakers'))]
    ].filter(([, body]) => body);
    if (f('celebrationsHeading') || cards.length) {
      contents.push(['achievements', 'Celebrations']);
      sections.push(`<section id="achievements" class="issue-section">
        ${f('celebrationsPeriod') ? `<div class="eyebrow">${esc(f('celebrationsPeriod'))}</div>` : ''}
        <h2>${esc(f('celebrationsHeading') || 'Let’s celebrate your progress.')}</h2>
        ${f('celebrationsIntro') ? `<p class="issue-lead">${text(f('celebrationsIntro'))}</p>` : ''}
        ${cards.length ? `<div class="achievement-grid">${cards.map(([t, body]) => `<article><h3>${esc(t)}</h3>${body}</article>`).join('')}</div>` : ''}
        <div class="issue-callout"><h3>Have a milestone to share?</h3><p>Tell us your name, the exam or designation you completed and when you completed it. Include a photo if you’d like one featured, and let us know we have permission to publish your details.</p><a class="text-link" href="mailto:${CONTACT}?subject=Newsletter%20exam%20achievement">Share your achievement <span aria-hidden="true">↗</span></a></div>
      </section>`);
    }

    // Education ahead: live upcoming events from Wix Events, each linking to registration.
    contents.push(['education', 'Education ahead']);
    const eventItems = upcoming.map((e, idx) => {
      const r = e.registration || {};
      const open = ['OPEN_RSVP', 'OPEN_RSVP_WAITLIST_ONLY', 'OPEN_TICKETS', 'OPEN_EXTERNAL'].includes(r.status) && !r.registrationPaused && !r.registrationDisabled;
      const label = r.status === 'OPEN_TICKETS' ? 'Get tickets' : r.status === 'OPEN_RSVP_WAITLIST_ONLY' ? 'Join the waitlist' : 'Register';
      const link = open ? `events.html?register=${encodeURIComponent(e.id)}#event-${encodeURIComponent(e.id)}` : `events.html#event-${encodeURIComponent(e.id)}`;
      return `<article><span>${String(idx + 1).padStart(2, '0')}</span><div><h3>${esc(e.title)}</h3>${e.shortDescription ? `<p>${esc(e.shortDescription)}</p>` : ''}
        <a class="text-link" href="${link}">${open ? label : 'Event details'} <span aria-hidden="true">→</span></a></div>
        <small>${esc(eventWhen(e))}</small></article>`;
    });
    sections.push(`<section id="education" class="issue-section">
      ${f('educationPeriod') ? `<div class="eyebrow">${esc(f('educationPeriod'))}</div>` : ''}
      <h2>${esc(f('educationHeading') || 'What’s on the horizon?')}</h2>
      ${f('educationIntro') ? `<p class="issue-lead">${text(f('educationIntro'))}</p>` : ''}
      ${eventItems.length ? `<div class="education-list">${eventItems.join('')}</div>` : '<p class="issue-lead">New education sessions will be announced soon. Watch our <a href="events.html">Events page</a>.</p>'}
      <p>Have a topic or speaker in mind? Email <a href="mailto:${CONTACT}">${CONTACT}</a>. See every upcoming session on our <a href="events.html">Events page</a>.</p>
    </section>`);

    // Member spotlight (any member; photo from the Spotlight Photo field)
    const spot = person(issue, 'spotlight', board);
    const story = rich(f('spotlightStory'));
    if (spot && story) {
      contents.push(['spotlight', `Meet ${spot.first}`]);
      sections.push(`<section id="spotlight" class="issue-section board-spotlight"><div>
        <img src="${esc(spot.photo)}" alt="${esc(spot.name)}" width="372" height="491" loading="lazy" onerror="this.remove()">
        <p class="eyebrow">MEMBER SPOTLIGHT</p>
        <h2>Meet ${esc(spot.name)}</h2>
        ${spot.role ? `<p>${esc(spot.role)}</p>` : ''}
        ${spot.work ? `<p class="small-note">${text(spot.work)}</p>` : ''}
        ${spot.linkedin ? `<a class="text-link" href="${esc(spot.linkedin)}" target="_blank" rel="noopener noreferrer">Connect with ${esc(spot.first)} <span aria-hidden="true">↗</span></a>` : ''}
      </div><div class="prose">${f('spotlightHeading') ? `<h3>${esc(f('spotlightHeading'))}</h3>` : ''}${story}</div></section>`);
    }

    // Society connection
    if (f('societyHeading') || f('webinarsText')) {
      contents.push(['society', 'Society connection']);
      sections.push(`<section id="society" class="issue-section society-feature"><div>
        <div class="eyebrow">YOUR INTERNATIONAL SOCIETY</div>
        <h2>${esc(f('societyHeading') || 'Keep the learning going.')}</h2>
        <p>${text(f('societyIntro') || 'Your Alberta Chapter is one part of a wider professional community. Explore the International Society’s webcasts, news and peer conversations alongside our local education and events.')}</p>
      </div><div class="society-links">
        <a href="https://www.iscebs.org/home/education---resources/webcasts" target="_blank" rel="noopener noreferrer"><strong>ISCEBS webcasts ↗</strong><span>Explore current and recorded education.</span></a>
        <a href="https://www.iscebs.org/home/education---resources/newsbriefs" target="_blank" rel="noopener noreferrer"><strong>Society NewsBriefs ↗</strong><span>Read news from the Society and its chapters.</span></a>
        <a href="https://www.iscebs.org/membership/iscebslink" target="_blank" rel="noopener noreferrer"><strong>ISCEBSLink ↗</strong><span>Connect with peers in the Society member forum.</span></a>
        ${f('webinarsText') ? `<div class="issue-callout"><h3>${esc(f('webinarsHeading') || 'Canadian webinars')}</h3>${rich(f('webinarsText'))}<a class="text-link" href="https://www.iscebs.org/home/education---resources/webcasts" target="_blank" rel="noopener noreferrer">Browse Society webcasts ↗</a></div>` : ''}
        <p class="small-note">Some resources require Society membership and sign-in.</p>
      </div></section>`);
    }

    const title = f('title') || 'Chapter newsletter';
    document.title = `${when ? when + ' Newsletter' : title} | Alberta Chapter of ISCEBS`;
    issueRoot.innerHTML = `
      <div class="wrap issue-breadcrumb"><a href="newsletter.html">← All newsletters</a><span>${esc([when, issueNo(issue.number)].filter(Boolean).join(' · '))}</span></div>
      <section class="wrap issue-hero">
        <div class="eyebrow">ALBERTA CHAPTER NEWSLETTER</div>
        <h1>${text(title)}</h1>
        ${f('heroText') ? `<p>${text(f('heroText'))}</p>` : ''}
        <div class="issue-meta">${when ? `<span>${esc(when.toUpperCase())}</span>` : ''}${issue.number ? `<span>${esc(issueNo(issue.number).toUpperCase())}</span>` : ''}${!isPublished(issue) ? '<span class="issue-draft">DRAFT PREVIEW · NOT PUBLISHED</span>' : ''}</div>
      </section>
      ${contents.length > 1 ? `<nav class="wrap issue-contents" aria-label="In this issue"><span>IN THIS ISSUE</span>${contents.map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join('')}</nav>` : ''}
      <div class="wrap issue-body">${sections.join('')}
        <section class="issue-closing"><div class="eyebrow">HELP SHAPE THE NEXT ISSUE</div><h2>This is your chapter.</h2><p>A member achievement, a useful idea or someone we should spotlight—we’d like to hear it.</p><a class="button" href="mailto:${CONTACT}?subject=Alberta%20Chapter%20Newsletter">Send us a story <span aria-hidden="true">↗</span></a><a class="text-link" href="newsletter.html">Back to newsletters →</a></section>
      </div>`;
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }

  function issueMessage(heading, body) {
    issueRoot.innerHTML = `<div class="wrap issue-breadcrumb"><a href="newsletter.html">← All newsletters</a></div>
      <section class="wrap issue-hero"><div class="eyebrow">ALBERTA CHAPTER NEWSLETTER</div><h1>${heading}</h1><p>${body}</p></section>`;
  }

  // ---------- Archive page ----------
  function renderArchive(issues) {
    const published = issues.filter(isPublished);
    const latestBox = document.querySelector('[data-newsletter-latest]');
    if (!published.length) return; // keep built-in "coming soon" copy
    const [latest, ...older] = published;
    const when = monthYear(latest.date);
    if (latestBox) latestBox.innerHTML = `
      <div class="newsletter-cover"><span class="eyebrow">ISCEBS / ALBERTA</span><h2>News from<br>your chapter.</h2><p>${esc([when, issueNo(latest.number)].filter(Boolean).join(' · '))}</p></div>
      <div><div class="eyebrow">LATEST ISSUE</div>
        <h2 id="latest-heading">${esc(when)}<br>${esc(field(latest, 'title'))}</h2>
        ${field(latest, 'summary') ? `<p>${text(field(latest, 'summary'))}</p>` : ''}
        <a class="button" href="${issueUrl(latest)}">Read the ${esc(when ? when.split(' ')[0] : 'latest')} issue <span aria-hidden="true">→</span></a></div>`;
    archiveRoot.innerHTML = older.length
      ? older.map(i => `<div class="newsletter-empty"><strong>${esc([monthYear(i.date), issueNo(i.number)].filter(Boolean).join(' · '))}</strong><p>${esc(field(i, 'title'))}</p><a class="text-link" href="${issueUrl(i)}">Read issue →</a></div>`).join('')
      : '<p class="small-note">Earlier issues will appear here as new ones are published.</p>';
  }

  // ---------- Start ----------
  if (!W || !W.configured()) {
    if (issueRoot) issueMessage('Newsletter unavailable', `Please try again later, or email <a href="mailto:${CONTACT}">${CONTACT}</a>.`);
    return;
  }

  if (issueRoot) {
    Promise.all([loadIssues(), loadBoard(), loadUpcoming()]).then(([issues, board, upcoming]) => {
      const wanted = params.get('issue');
      const visible = issues.filter(i => preview || isPublished(i));
      const key = (wanted || '').trim().toLowerCase();
      const issue = key ? visible.find(i => issueKeys(i).includes(key)) : visible[0];
      if (!issue) console.warn('Newsletter: no issue matches', key, issues.map(i => ({ keys: issueKeys(i), published: i.published })));
      if (!issue) { issueMessage('Issue not found', 'This issue isn’t available. <a href="newsletter.html">See all newsletters</a>.'); return; }
      renderIssue(issue, board, upcoming);
    }).catch(err => {
      console.warn('Newsletter failed to load', err);
      issueMessage('We couldn’t load this issue', `Please refresh the page, or email <a href="mailto:${CONTACT}">${CONTACT}</a>.`);
    });
  }
  if (archiveRoot) {
    loadIssues().then(renderArchive).catch(err => console.warn('Newsletter archive: showing built-in copy.', err));
  }
})();
