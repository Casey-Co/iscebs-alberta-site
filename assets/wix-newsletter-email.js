/*
  Newsletter EMAIL VERSION (newsletter-email.html).

  Builds an email-safe copy of a newsletter issue from the same Wix CMS row the
  website uses (Wix > CMS > Newsletter Issues), so nothing is typed twice.
  - Open newsletter-email.html?issue=<slug>, or pick the issue from the list.
  - "Copy code for Wix" copies a version for the HTML element in Wix Email
    Marketing, using only the tags and attributes Wix allows.
  - "Copy email code" copies the HTML for other email tools that accept custom HTML.
  - "Copy email for pasting" copies the formatted email for pasting into an
    email you are writing (e.g. Gmail or Outlook).
  Email programs ignore most website styling, so this file uses simple tables and
  inline styles on purpose. It mirrors the sections of the website issue page.
*/
(() => {
  const W = window.WixSite;
  const root = document.querySelector('[data-email-tool]');
  if (!root) return;
  const { esc, field, imageUrl } = W || {};
  const CONTACT = 'ab.iscebs@gmail.com';
  // Absolute links back to this website, wherever it is hosted.
  const SITE = new URL('.', location.href).href;
  const abs = p => new URL(p, SITE).href;

  // ---------- Colours and fonts (match the website) ----------
  // Colour version 3: navy = CEBS/chapter, teal = Group Benefits, orange = Retirement Plans, peach = warm sections.
  const C = { navy: '#00447C', ink: '#12263F', head: '#00447C', teal: '#1C6987', orange: '#E27508', orangeText: '#A34E06', muted: '#3F5468', ivory: '#F5F8FB', sage: '#F9E4D1', peach: '#F9E4D1', line: '#D3E1EE', paleText: '#E6EFF8' };
  const SERIF = "'Source Serif 4',Georgia,'Times New Roman',serif";
  const SANS = "'Public Sans',Arial,Helvetica,sans-serif";

  // ---------- Helpers (same rules as the website issue page) ----------
  const firstName = s => String(s || '').trim().split(/\s+/)[0] || '';
  function dateOf(v) {
    if (!v) return null;
    const raw = typeof v === 'object' ? (v.$date || v.date || '') : v;
    const d = new Date(String(raw).length === 10 ? raw + 'T12:00:00' : raw);
    return isNaN(d) ? null : d;
  }
  const monthYear = d => d ? new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d) : '';
  const issueNo = n => (n || n === 0) ? 'Issue ' + String(n).padStart(2, '0') : '';
  const isPublished = i => i.published === true || i.published === 'true';
  function slugText(v) {
    if (!v) return '';
    if (typeof v === 'object' || /^\d{4}-\d{2}-\d{2}T/.test(String(v))) { const d = dateOf(v); return d ? d.toISOString().slice(0, 7) : ''; }
    return String(v).trim();
  }
  const ym = d => d ? d.toISOString().slice(0, 7) : '';
  const issueKeys = i => [i.slug, ym(i.date), i.number !== '' && i.number != null ? String(i.number) : '', i._id]
    .filter(Boolean).map(k => String(k).trim().toLowerCase());
  const issueSlug = i => i.slug || ym(i.date) || i._id;
  const text = v => esc(String(v || '').trim()).replace(/\n/g, '<br>');

  // Rich text -> email-safe HTML with inline styles.
  const P_STYLE = `margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:26px;color:${C.muted};`;
  const STYLES = {
    P: P_STYLE, UL: `margin:0 0 16px;padding-left:22px;font-family:${SANS};font-size:16px;line-height:26px;color:${C.muted};`,
    OL: `margin:0 0 16px;padding-left:22px;font-family:${SANS};font-size:16px;line-height:26px;color:${C.muted};`,
    LI: 'margin:0 0 6px;', A: `color:${C.ink};text-decoration:underline;`,
    H3: `margin:0 0 12px;font-family:${SERIF};font-size:22px;line-height:28px;font-weight:600;color:${C.head};`,
    H4: `margin:0 0 10px;font-family:${SANS};font-size:16px;line-height:24px;font-weight:bold;color:${C.ink};`,
    BLOCKQUOTE: `margin:0 0 16px;padding-left:14px;border-left:3px solid ${C.line};`
  };
  const ALLOWED = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'UL', 'OL', 'LI', 'H3', 'H4', 'BLOCKQUOTE', 'SPAN']);
  function emailRich(value) {
    if (!value) return '';
    let html;
    if (typeof value === 'object') html = W.richText(value);
    else {
      const s = String(value).trim();
      html = /<[a-z][\s\S]*>/i.test(s) ? s : s.split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    }
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const clean = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 1) {
          if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'TEMPLATE', 'IMG'].includes(child.tagName)) { child.remove(); return; }
          if (!ALLOWED.has(child.tagName)) { child.replaceWith(...child.childNodes); clean(node); return; }
          [...child.attributes].forEach(a => { if (!(child.tagName === 'A' && a.name === 'href')) child.removeAttribute(a.name); });
          if (child.tagName === 'A') {
            const href = child.getAttribute('href') || '';
            if (/^[a-z0-9-]+\.html/i.test(href)) child.setAttribute('href', abs(href));
            else if (!/^(https:|mailto:)/i.test(href)) child.removeAttribute('href');
          }
          if (STYLES[child.tagName]) child.setAttribute('style', STYLES[child.tagName]);
          clean(child);
        } else if (child.nodeType !== 3) child.remove();
      });
    };
    const box = doc.body.firstChild;
    clean(box);
    return box.innerHTML;
  }

  function person(issue, prefix) {
    const name = field(issue, prefix + 'Name');
    if (!name) return null;
    return {
      name, first: firstName(name),
      photo: imageUrl(field(issue, prefix + 'Photo')),
      role: field(issue, prefix + 'Role'),
      work: field(issue, prefix + 'Work'),
      linkedin: W.webLink(field(issue, prefix + 'LinkedIn', prefix + 'Linkedin', prefix + 'LinkedInUrl', prefix + 'LinkedinUrl', prefix + 'Link'))
    };
  }

  async function loadIssues() {
    const rows = await W.queryCollection(W.settings.COLLECTIONS.newsletterIssues, [{ fieldName: 'issueDate', order: 'DESC' }]);
    return rows.map(r => ({ ...r, slug: slugText(field(r, 'slug')), date: dateOf(field(r, 'issueDate', 'date')), number: field(r, 'issueNumber', 'number') }))
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }
  async function loadUpcoming() {
    try {
      const { events = [] } = await W.post('/events/v3/events/query', {
        fields: ['DETAILS', 'REGISTRATION'],
        query: { filter: { status: { $in: ['UPCOMING', 'STARTED'] } }, sort: [{ fieldName: 'dateAndTimeSettings.startDate', order: 'ASC' }], paging: { limit: 6, offset: 0 } }
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

  // ---------- Email building blocks ----------
  const eyebrow = (t, color = C.head) => `<p style="margin:0 0 14px;font-family:${SANS};font-size:11px;line-height:16px;letter-spacing:2px;font-weight:bold;text-transform:uppercase;color:${color};">${esc(t)}</p>`;
  const h2 = t => `<h2 style="margin:0 0 16px;font-family:${SERIF};font-size:28px;line-height:34px;font-weight:600;color:${C.head};">${t}</h2>`;
  const lead = t => `<p style="margin:0 0 20px;font-family:${SANS};font-size:17px;line-height:26px;color:${C.muted};">${t}</p>`;
  const textLink = (label, href) => `<a href="${esc(href)}" style="font-family:${SANS};font-size:15px;font-weight:bold;color:${C.ink};text-decoration:underline;text-decoration-color:${C.orange};">${esc(label)} &#8599;</a>`;
  const button = (label, href) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C.orange}" style="background:${C.orange};">
    <a href="${esc(href)}" style="display:inline-block;padding:15px 26px;font-family:${SANS};font-size:15px;font-weight:bold;color:${C.ink};text-decoration:none;">${esc(label)} &#8599;</a></td></tr></table>`;
  const section = (inner, bg = '#ffffff') => `<tr><td bgcolor="${bg}" style="background:${bg};padding:34px 26px 28px;border-top:1px solid ${C.line};">${inner}</td></tr>`;

  // Photo on the left, intro (label, heading, name) on the right; text below runs full width.
  // Tables rather than floats so it holds together in Outlook and in Wix.
  // Photo beside the intro on wide screens; it drops above the intro on phones.
  // Two inline-block boxes with max-widths wrap on their own, so no media queries
  // are needed (Wix removes them). font-size:0 removes the gap between the boxes.
  const beside = (src, alt, intro) => src ? `<div style="font-size:0;margin:0 0 22px;">
      <div style="display:inline-block;width:100%;max-width:150px;vertical-align:middle;font-size:16px;"><img src="${esc(src)}" alt="${esc(alt)}" width="130" style="display:block;width:130px;max-width:100%;height:auto;border:0;margin:0 0 14px;"></div><div style="display:inline-block;width:100%;max-width:370px;vertical-align:middle;font-size:16px;">${intro}</div></div>` : `<div style="margin:0 0 8px;">${intro}</div>`;
  const h2side = t => `<h2 style="margin:0 0 12px;font-family:${SERIF};font-size:28px;line-height:34px;font-weight:600;color:${C.head};">${t}</h2>`;

  function buildEmail(issue, upcoming) {
    const f = (...k) => field(issue, ...k);
    const when = monthYear(issue.date);
    const title = f('title') || 'Chapter newsletter';
    const issueLink = abs(`newsletter-issue.html?issue=${encodeURIComponent(issueSlug(issue))}`);
    const parts = [];

    // From the President
    const pres = person(issue, 'president');
    const presMessage = emailRich(f('presidentMessage'));
    if (pres && presMessage) parts.push(section(`
      ${beside(pres.photo, pres.name, `${eyebrow('From the President')}
        ${h2side(esc(f('presidentHeading') || `A welcome from ${pres.first}`))}
        <p style="margin:0;font-family:${SANS};font-size:14px;line-height:22px;color:${C.muted};">${esc(pres.name)}${f('presidentRole') ? `<br>${text(f('presidentRole'))}` : ''}</p>`)}
      ${presMessage}`));

    // Celebrations
    const cards = [
      ['New CEBS graduates', emailRich(f('cebsGraduates'))],
      ['New GBA &amp; RPA designees', emailRich(f('gbaRpaDesignees', 'gbaAndRpaDesignees'))],
      ['Successful exam takers', emailRich(f('examPasses', 'examTakers'))]
    ].filter(([, body]) => body);
    if (f('celebrationsHeading') || cards.length) parts.push(section(`
      ${f('celebrationsPeriod') ? eyebrow(f('celebrationsPeriod')) : ''}
      ${h2(esc(f('celebrationsHeading') || 'Let’s celebrate your progress.'))}
      ${f('celebrationsIntro') ? lead(text(f('celebrationsIntro'))) : ''}
      ${cards.map(([t, body]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr><td style="border-top:3px solid ${C.teal};padding-top:14px;">
        <h3 style="margin:0 0 10px;font-family:${SERIF};font-size:22px;line-height:28px;font-weight:600;color:${C.head};">${t}</h3>${body}</td></tr></table>`).join('')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C.sage}" style="background:${C.sage};padding:20px;">
        <h3 style="margin:0 0 10px;font-family:${SANS};font-size:18px;line-height:24px;color:${C.ink};">Have a milestone to share?</h3>
        <p style="${P_STYLE}">Tell us your name, the exam or designation you completed and when you completed it. Include a photo if you’d like one featured, and let us know we have permission to publish your details.</p>
        ${textLink('Share your achievement', `mailto:${CONTACT}?subject=Newsletter%20exam%20achievement`)}</td></tr></table>`));

    // Education ahead (live events from Wix Events)
    const events = upcoming.map((e, idx) => {
      const r = e.registration || {};
      const open = ['OPEN_RSVP', 'OPEN_RSVP_WAITLIST_ONLY', 'OPEN_TICKETS', 'OPEN_EXTERNAL'].includes(r.status) && !r.registrationPaused && !r.registrationDisabled;
      const label = r.status === 'OPEN_TICKETS' ? 'Get tickets' : r.status === 'OPEN_RSVP_WAITLIST_ONLY' ? 'Join the waitlist' : 'Register';
      const link = abs(open ? `events.html?register=${encodeURIComponent(e.id)}#event-${encodeURIComponent(e.id)}` : `events.html#event-${encodeURIComponent(e.id)}`);
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="36" valign="top" style="border-top:1px solid ${C.line};padding:18px 0;font-family:${SANS};font-size:14px;font-weight:bold;color:${C.orangeText};">${String(idx + 1).padStart(2, '0')}</td>
        <td valign="top" style="border-top:1px solid ${C.line};padding:18px 0;">
          <h3 style="margin:0 0 6px;font-family:${SERIF};font-size:22px;line-height:28px;font-weight:600;color:${C.head};">${esc(e.title)}</h3>
          <p style="margin:0 0 8px;font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};">${esc(eventWhen(e))}</p>
          ${e.shortDescription ? `<p style="${P_STYLE}margin-bottom:10px;">${esc(e.shortDescription)}</p>` : ''}
          ${textLink(open ? label : 'Event details', link)}</td></tr></table>`;
    }).join('');
    parts.push(section(`
      ${f('educationPeriod') ? eyebrow(f('educationPeriod')) : ''}
      ${h2(esc(f('educationHeading') || 'What’s on the horizon?'))}
      ${f('educationIntro') ? lead(text(f('educationIntro'))) : ''}
      ${events || lead(`New education sessions will be announced soon. Watch our <a href="${abs('events.html')}" style="${STYLES.A}">Events page</a>.`)}
      <p style="${P_STYLE}margin-top:16px;">Have a topic or speaker in mind? Email <a href="mailto:${CONTACT}" style="${STYLES.A}">${CONTACT}</a>. See every upcoming session on our <a href="${abs('events.html')}" style="${STYLES.A}">Events page</a>.</p>`));

    // Member spotlight
    const spot = person(issue, 'spotlight');
    const story = emailRich(f('spotlightStory'));
    if (spot && story) parts.push(section(`
      ${beside(spot.photo, spot.name, `${eyebrow('Member spotlight')}
        ${h2side(`Meet ${esc(spot.name)}`)}
        ${spot.role ? `<p style="margin:0 0 6px;font-family:${SANS};font-size:15px;line-height:22px;color:${C.ink};">${esc(spot.role)}</p>` : ''}
        ${spot.work ? `<p style="margin:0 0 12px;font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};">${text(spot.work)}</p>` : ''}
        ${spot.linkedin ? `<p style="margin:0;">${textLink(`Connect with ${spot.first}`, spot.linkedin)}</p>` : ''}`)}
      ${f('spotlightHeading') ? `<h3 style="${STYLES.H3}">${esc(f('spotlightHeading'))}</h3>` : ''}${story}`));

    // Society connection
    if (f('societyHeading') || f('societyIntro')) {
      const link = (t, href, d) => `<tr><td style="border-bottom:1px solid ${C.line};padding:14px 0;"><a href="${href}" style="font-family:${SANS};font-size:16px;font-weight:bold;color:${C.ink};text-decoration:none;">${t} &#8599;</a>
        <p style="margin:6px 0 0;font-family:${SANS};font-size:14px;line-height:20px;color:${C.muted};">${d}</p></td></tr>`;
      parts.push(section(`
        ${eyebrow('Your International Society')}
        ${h2(esc(f('societyHeading') || 'Keep the learning going.'))}
        <p style="${P_STYLE}">${text(f('societyIntro') || 'Your Alberta Chapter is one part of a wider professional community. Explore the International Society’s webcasts, news and peer conversations alongside our local education and events.')}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${link('ISCEBS webcasts', 'https://www.iscebs.org/home/education---resources/webcasts', 'Explore current and recorded education.')}
          ${link('Society NewsBriefs', 'https://www.iscebs.org/home/education---resources/newsbriefs', 'Read news from the Society and its chapters.')}
          ${link('ISCEBSLink', 'https://www.iscebs.org/membership/iscebslink', 'Connect with peers in the Society member forum.')}
        </table>
        <p style="margin:14px 0 0;font-family:${SANS};font-size:12px;line-height:18px;color:${C.muted};">Some resources require Society membership and sign-in.</p>`, C.sage));
    }

    // Closing
    parts.push(section(`
      ${eyebrow('Help shape the next issue')}${h2('This is your chapter.')}
      <p style="${P_STYLE}">A member achievement, a useful idea or someone we should spotlight—we’d like to hear it.</p>
      ${button('Send us a story', `mailto:${CONTACT}?subject=Alberta%20Chapter%20Newsletter`)}`));

    const preheader = f('summary') || f('heroText') || '';
    const meta = [when.toUpperCase(), issueNo(issue.number).toUpperCase()].filter(Boolean).join(' &nbsp;·&nbsp; ');
    return `<!doctype html>
<html lang="en-CA"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<title>${esc(when ? when + ' Newsletter' : title)} | Alberta Chapter of ISCEBS</title>
<style>@media (max-width:620px){.email-pad{padding-left:22px!important;padding-right:22px!important}}</style></head>
<body style="margin:0;padding:0;background:${C.ivory};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ivory}" style="background:${C.ivory};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;" data-email-card>
  <tr><td bgcolor="${C.teal}" style="padding:12px 26px;font-family:${SANS};font-size:12px;line-height:18px;color:#E8F2F7;background:${C.teal};" class="email-pad">
    <a href="${issueLink}" style="color:#E8F2F7;">View this newsletter on the website</a></td></tr>
  <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:22px 26px;border-bottom:3px solid ${C.teal};" class="email-pad">
    <p style="margin:0;font-family:${SANS};font-size:20px;line-height:26px;font-weight:bold;letter-spacing:1px;color:${C.navy};">ISCEBS Alberta Chapter</p>
    <p style="margin:4px 0 0;font-family:${SANS};font-size:11px;line-height:16px;color:${C.muted};">International Society of Certified Employee Benefit Specialists</p></td></tr>
  <tr><td bgcolor="${C.navy}" style="background:${C.navy};padding:30px 26px 0;" class="email-pad">
    ${eyebrow('Alberta Chapter Newsletter', C.peach)}
    <h1 style="margin:0 0 18px;font-family:${SERIF};font-size:38px;line-height:44px;font-weight:600;color:#ffffff;">${text(title)}</h1>
    ${f('heroText') ? `<p style="margin:0 0 26px;font-family:${SANS};font-size:18px;line-height:28px;color:${C.paleText};">${text(f('heroText'))}</p>` : ''}
    ${meta ? `<p style="margin:0;font-family:${SANS};font-size:12px;line-height:18px;letter-spacing:2px;color:#ffffff;">${meta}</p>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:30px;"><tr><td width="36" height="3" bgcolor="${C.orange}" style="width:36px;height:3px;background:${C.orange};font-size:0;line-height:3px;">&nbsp;</td></tr></table>
    <p style="margin:0;font-size:0;line-height:38px;">&nbsp;</p></td></tr>
  <tr><td style="padding:0;font-size:0;line-height:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="34%" height="8" bgcolor="#003562" style="height:8px;background:#003562;font-size:0;line-height:8px;">&nbsp;</td><td width="33%" height="8" bgcolor="${C.teal}" style="height:8px;background:${C.teal};font-size:0;line-height:8px;">&nbsp;</td><td width="33%" height="8" bgcolor="${C.orange}" style="height:8px;background:${C.orange};font-size:0;line-height:8px;">&nbsp;</td></tr></table></td></tr>
  ${parts.join('\n')}
  <tr><td bgcolor="${C.navy}" style="background:${C.navy};padding:28px 26px;font-family:${SANS};font-size:12px;line-height:20px;color:#E6EFF8;" class="email-pad">
    <p style="margin:0 0 10px;font-family:${SERIF};font-size:18px;line-height:24px;font-weight:600;color:#ffffff;">Knowledge shared. Connections made. Careers strengthened.</p>
    <p style="margin:0 0 6px;">Alberta Chapter · International Society of Certified Employee Benefit Specialists</p>
    <p style="margin:0;"><a href="mailto:${CONTACT}" style="color:#D2E3F2;">${CONTACT}</a> &nbsp;·&nbsp; <a href="${abs('index.html')}" style="color:#D2E3F2;">Chapter website</a> &nbsp;·&nbsp; <a href="https://www.linkedin.com/company/94094639/" style="color:#D2E3F2;">LinkedIn</a></p></td></tr>
</table></td></tr></table></body></html>`;
  }

  // ---------- Wix version ----------
  // Wix Email Marketing's HTML element keeps only these tags and attributes and
  // removes everything else (no <head>, <style>, bgcolor, <strong>, <em>...).
  const WIX = {
    H1: 'style dir class', H2: 'style dir class', H3: 'style dir class', H4: 'style dir class', H5: 'style dir class',
    DIV: 'style dir class', SPAN: 'style dir class', P: 'style dir class', A: 'style dir target rel href',
    OL: 'style dir class start', UL: 'style dir class', LI: 'style dir class', S: 'style dir class', B: 'style dir class',
    I: 'style dir class', U: 'style dir class', BR: '', PRE: 'style dir class',
    TABLE: 'style class align role cellpadding cellspacing width', TR: 'style class', TBODY: 'style class', THEAD: 'style class',
    TD: 'style class align valign width rowspan colspan', IMG: 'style class src width height border alt'
  };
  const RENAME = { STRONG: 'b', EM: 'i', BLOCKQUOTE: 'div' };
  function toWix(fullHtml) {
    const doc = new DOMParser().parseFromString(fullHtml, 'text/html');
    const card = doc.querySelector('[data-email-card]');
    card.setAttribute('width', '100%');
    card.setAttribute('style', card.getAttribute('style').replace('width:600px;', 'width:100%;'));
    const walk = el => {
      [...el.children].forEach(child => {
        let node = child;
        if (RENAME[node.tagName]) {
          const n = doc.createElement(RENAME[node.tagName]);
          [...node.attributes].forEach(a => n.setAttribute(a.name, a.value));
          n.append(...node.childNodes); node.replaceWith(n); node = n;
        }
        if (!(node.tagName in WIX)) { const kids = [...node.childNodes]; node.replaceWith(...kids); kids.forEach(k => k.nodeType === 1 && walk({ children: [k] })); return; }
        const ok = WIX[node.tagName].split(' ');
        [...node.attributes].forEach(a => { if (!ok.includes(a.name)) node.removeAttribute(a.name); });
        walk(node);
      });
    };
    const holder = doc.createElement('div'); holder.append(card);
    walk(holder);
    return holder.innerHTML;
  }

  // ---------- Tool page ----------
  const select = root.querySelector('[data-email-issue]');
  const frame = root.querySelector('[data-email-preview]');
  const status = root.querySelector('[data-email-status]');
  const buttons = root.querySelectorAll('[data-email-action]');
  let issues = [], upcoming = [], html = '', wixHtml = '', current = null;
  const say = t => { status.textContent = t; };

  function show(issue) {
    current = issue;
    html = buildEmail(issue, upcoming);
    wixHtml = toWix(html);
    frame.srcdoc = html;
    buttons.forEach(b => { b.disabled = false; });
    const note = isPublished(issue) ? '' : ' This issue is not published yet, so the “View on the website” link will not work for members until it is.';
    say(`Email ready for ${[monthYear(issue.date), issueNo(issue.number)].filter(Boolean).join(' · ') || 'this issue'}.${note}`);
    const url = new URL(location.href); url.searchParams.set('issue', issueSlug(issue)); history.replaceState(null, '', url);
  }

  async function copyText(value, done) {
    try { await navigator.clipboard.writeText(value); say(done); }
    catch {
      const t = document.createElement('textarea'); t.value = value; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.append(t); t.select(); const ok = document.execCommand('copy'); t.remove();
      say(ok ? done : 'Copy was blocked by the browser. Use “Download .html file” instead.');
    }
  }
  const copyWix = () => copyText(wixHtml, 'Wix code copied. In your Wix campaign, add an HTML element and paste it in.');
  const copyHtml = () => copyText(html, 'Email code copied. Paste it into your email tool’s custom HTML / code option.');
  async function copyRich() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([frame.contentDocument.body.innerText], { type: 'text/plain' }) })]);
      say('Formatted email copied. Click into the body of a new email and paste (Ctrl + V).');
    } catch {
      const doc = frame.contentDocument, range = doc.createRange();
      range.selectNodeContents(doc.body); const sel = doc.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      const ok = doc.execCommand('copy'); sel.removeAllRanges();
      say(ok ? 'Formatted email copied. Click into the body of a new email and paste (Ctrl + V).' : 'Copy was blocked by the browser.');
    }
  }
  function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = `alberta-chapter-newsletter-${issueSlug(current)}.html`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    say('Email file downloaded.');
  }
  buttons.forEach(b => b.addEventListener('click', () => ({ wix: copyWix, html: copyHtml, rich: copyRich, download })[b.dataset.emailAction]()));
  select.addEventListener('change', () => show(issues[select.selectedIndex]));

  if (!W || !W.configured()) { say('The Wix connection is not set up.'); return; }
  say('Loading issues from Wix…');
  Promise.all([loadIssues(), loadUpcoming()]).then(([list, events]) => {
    issues = list; upcoming = events;
    if (!issues.length) { say('No newsletter issues found in the CMS.'); return; }
    select.innerHTML = issues.map(i => `<option>${esc([monthYear(i.date), issueNo(i.number)].filter(Boolean).join(' · ') || field(i, 'title'))}${isPublished(i) ? '' : ' (draft)'} — ${esc(field(i, 'title'))}</option>`).join('');
    const key = (new URLSearchParams(location.search).get('issue') || '').trim().toLowerCase();
    let idx = key ? issues.findIndex(i => issueKeys(i).includes(key)) : issues.findIndex(isPublished);
    if (idx < 0) idx = 0;
    select.selectedIndex = idx;
    show(issues[idx]);
  }).catch(err => { console.warn('Email version failed to load', err); say('Couldn’t load issues from Wix. Please refresh the page.'); });
})();
