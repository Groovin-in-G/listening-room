// The Listening Room. One page: sign in, then the room (members) or the releases you were given (guests).
import { supabaseApi, demoApi } from './api.js?v=1792582672';
import { PUBLIC_URL } from './config.js?v=1792582672';

const q = new URLSearchParams(location.search);
const DEMO = q.has('demo');
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
const RECENT_DAYS = 14;
// George 2026-10-14: a release with no cover wears one of the two Blue Dawn work-in-progress patches,
// alternating release by release in the order they were made (the worker, then the hard hat, ...).
const WIP = [{ big: './wip-worker.jpg', sm: './wip-worker-sm.jpg' }, { big: './wip-hat.jpg', sm: './wip-hat-sm.jpg' }];
const wipOf = id => {
  const order = [...S.releases].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) || (a.position - b.position) || String(a.id).localeCompare(String(b.id)));
  return WIP[Math.max(0, order.findIndex(r => r.id === id)) % 2];
};
const ICON = {
  play: '<svg viewBox="0 0 10 10"><path fill="#1a0e06" d="M1 0L10 5L1 10Z"/></svg>',
  pause: '<svg viewBox="0 0 10 10"><path fill="#1a0e06" d="M1 0h3v10H1zM6 0h3v10H6z"/></svg>',
  wait: '<svg viewBox="0 0 10 10" class="spin"><circle cx="5" cy="5" r="3.6" fill="none" stroke="#1a0e06" stroke-width="1.6" stroke-dasharray="14 9"/></svg>',
  grip: '<svg viewBox="0 0 8 16"><g fill="currentColor"><circle cx="2" cy="2" r="1.4"/><circle cx="6" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="6" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="6" cy="14" r="1.4"/></g></svg>',
  export: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v8M4.5 6.5L8 10l3.5-3.5M2.5 11v2.5h11V11"/></svg>',
  people: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="6" cy="5.5" r="2.4"/><path d="M1.8 13.5c.6-2.4 2.2-3.6 4.2-3.6s3.6 1.2 4.2 3.6"/><circle cx="11.4" cy="6.2" r="1.9"/><path d="M11.2 9.9c1.6 0 2.7.9 3.1 2.8"/></svg>',
  card: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.8" y="3" width="12.4" height="10" rx="1.6"/><circle cx="5.6" cy="7" r="1.4"/><path d="M3.6 10.8c.4-1.1 1.1-1.6 2-1.6s1.6.5 2 1.6M9.4 6.4h3M9.4 8.8h3"/></svg>',
  ext: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2.5h4v4M13.5 2.5L7.5 8.5M12 9.5v3.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1H7"/></svg>',
  rocket: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 .8c2.2 1.6 3.3 4.1 3.1 7.4l1.7 1.9-.3 3.1-2.4-1.5H5.9l-2.4 1.5-.3-3.1 1.7-1.9C4.7 4.9 5.8 2.4 8 .8zm0 4a1.3 1.3 0 1 0 0 2.6A1.3 1.3 0 0 0 8 4.8zM6.6 12.4h2.8L8 15.4z"/></svg>',
  back: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5L5.5 8l4.5 4.5"/></svg>',
  copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V3.8a1.3 1.3 0 0 0-1.3-1.3H3.8a1.3 1.3 0 0 0-1.3 1.3v5.4a1.3 1.3 0 0 0 1.3 1.3h1.7"/></svg>',
  chev: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
};

const S = {
  api: null, me: null, releases: [], tracks: [], notes: [], names: {},
  view: 'all', menu: null, confirmDel: null, renaming: null, search: '', showReleased: false, newRel: false,
  open: new Set(), uploads: [], cur: null, audios: new Map(), pos: new Map(), waiting: new Set(), auto: true,
  peopleOpen: false, people: [], art: {}, confirmTrack: null, setPw: false, account: false, setMail: false,
  detailsOpen: false, details: [], detailsFor: null, editDetails: false, detLink: {}, invLink: {}, pinv: {}, pinvFor: '', pinvOwner: false, shown: {}, artMeta: {}, detIndex: [],
};
const joinUrl = tok => `${PUBLIC_URL}?join=${tok}`;
// An 8-character code is the short address link (step 14, served by 404.html); anything longer is the old token link.
const linkUrl = tok => tok.length === 8 ? `${PUBLIC_URL}address/${tok}` : `${PUBLIC_URL}?details=${tok}`;
const ADDRESS_CODE = location.pathname.match(/\/address\/([a-z0-9]{8})\/?$/i)?.[1];
// Details are per artist: one answer covers every track that artist has on the release.
const artistKey = t => (t?.artist || t?.title || '').trim().toLowerCase();
const detailsIn = t => S.details.concat(S.detIndex).some(d => { const dt = S.tracks.find(x => x.id === d.track_id); return dt && dt.release_id === t.release_id && artistKey(dt) === artistKey(t); });
const isMember = () => S.me?.kind === 'member';
const lastSeen = () => { try { return +localStorage.getItem('lr-last-seen') || 0; } catch { return 0; } };
const markSeen = () => { try { localStorage.setItem('lr-last-seen', Date.now()); } catch {} };

// ------------------------------------------------------------------ boot
async function boot() {
  try { S.api = DEMO ? demoApi(q.get('demo') === 'guest' ? 'guest' : 'member') : await supabaseApi(); }
  catch (e) { return fatal('Could not reach the server. Check your connection and reload.'); }
  if (q.get('details')) return linkFormView(q.get('details'));
  if (ADDRESS_CODE) return linkFormView(await S.api.resolveDetails(ADDRESS_CODE) || 'closed');
  if (q.get('join')) return joinView(q.get('join'));
  S.api.onAuth(s => { if (!s && S.me) { S.me = null; clearCache(); stopAll(); signInView(); } });
  paintFromCache();
  await enter();
}
// A refresh draws what this browser last saw at once, then quietly swaps in the fresh copy
// (George 2026-10-14: the "Loading…" then pop-in "looks really naff"). Sign-out wipes it.
const CACHE = 'lr-cache-v1';
const clearCache = () => { try { localStorage.removeItem(CACHE); } catch {} };
function saveCache() {
  if (DEMO || !S.me) return;
  try { localStorage.setItem(CACHE, JSON.stringify({ me: S.me, releases: S.releases, tracks: S.tracks, notes: S.notes, names: S.names, art: S.art, artMeta: S.artMeta, detIndex: S.detIndex })); } catch {}
}
function paintFromCache() {
  if (DEMO) return;
  let c; try { c = JSON.parse(localStorage.getItem(CACHE)); } catch {}
  if (!c?.me || c.me.kind === 'none') return;
  Object.assign(S, { me: c.me, releases: c.releases || [], tracks: c.tracks || [], notes: c.notes || [], names: c.names || {}, detIndex: c.detIndex || [] });
  const now = Date.now();
  for (const [id, m] of Object.entries(c.artMeta || {})) if (m.until > now && c.art?.[id]) { S.art[id] = c.art[id]; S.artMeta[id] = m; }
  pickView(); whoPill(); render();
}
function pickView() {
  if (S.me.kind === 'guest') S.view = S.releases.some(r => r.id === q.get('view')) ? q.get('view') : S.releases[0]?.id || 'none';
  else if (q.get('view')) S.view = q.get('view');
}
async function enter() {
  const sess = await S.api.session();
  if (!sess) { clearCache(); S.me = null; return signInView(); }
  S.me = await S.api.whoAmI();
  if (!S.me) { clearCache(); return signInView(); }
  whoPill();
  if (S.me.kind === 'none') return noAccess();
  await reload();
  pickView();
  render(); saveCache();
}
async function reload() {
  const [d, di] = await Promise.all([S.api.load(), S.me?.kind === 'member' && S.api.detailsIndex ? S.api.detailsIndex().catch(() => []) : []]);
  Object.assign(S, d); S.detIndex = di;
  S.releases.forEach(r => {
    const m = S.artMeta[r.id];
    if (!r.art_path) { delete S.art[r.id]; delete S.artMeta[r.id]; return; }
    if (S.art[r.id] && m && m.path === r.art_path && m.until > Date.now()) return;
    S.api.artUrl(r.art_path).then(u => { S.art[r.id] = u; S.artMeta[r.id] = { path: r.art_path, until: Date.now() + 50 * 60e3 }; render(); saveCache(); }).catch(() => {});
  });
}
function fatal(msg) { $('#root').innerHTML = `<div class="gate"><p>${esc(msg)}</p></div>`; }

// ------------------------------------------------------------------ sign in
function signInView(note = '') {
  document.body.classList.add('gatepage');
  $('#who').innerHTML = ''; $('#title').innerHTML = DEFAULT_TITLE;
  $('#root').innerHTML = `<form class="gate" id="signin" autocomplete="on">
    <h2>Sign in</h2>
    <label>Email<input type="email" name="email" autocomplete="username" required></label>
    <label>Password<input type="password" name="password" autocomplete="current-password"></label>
    <button class="go" type="submit">Sign in</button>
    <button class="linkish" type="button" id="maillink">Email me a sign-in link instead</button>
    <div class="msg" id="msg">${esc(note)}</div></form>`;
  const f = $('#signin'), msg = $('#msg');
  f.onsubmit = async e => {
    e.preventDefault(); msg.textContent = 'Signing in…';
    try { await S.api.signIn(f.email.value.trim(), f.password.value); await enter(); }
    catch (err) { msg.textContent = /invalid/i.test(err.message) ? 'That email and password do not match.' : err.message; }
  };
  $('#maillink').onclick = async () => {
    if (!f.email.value.trim()) { msg.textContent = 'Type your email first.'; return; }
    msg.textContent = 'Sending…';
    try { await S.api.sendLink(f.email.value.trim()); msg.textContent = 'Check your email for a sign-in link.'; }
    catch (err) {
      msg.textContent = /rate limit/i.test(err.message) ? 'Too many sign-in emails have gone out in the last hour. Use your password, or try the link again later.'
        : /signups not allowed|not found/i.test(err.message) ? 'There is no account for that email.' : err.message;
    }
  };
}
// ------------------------------------------------------------------ details link (no account)
async function linkFormView(tok) {
  document.body.classList.add('gatepage', 'linkpage');
  let form = null; try { form = await S.api.detailsForm(tok); } catch {}
  if (!form) return fatal('This link is no longer open. Ask Blue Dawn Records for a new one.');
  const name = form.name;
  document.title = `${name} · Blue Dawn Records`;
  $('#title').innerHTML = `<div class="hero stack"><div><div class="kick">Blue Dawn Records</div><h1>${esc(name)}</h1></div><span id="linkart"></span></div>`;
  const showArt = u => { const el = $('#linkart'); if (el) el.outerHTML = `<img id="linkart" class="relart big" src="${esc(u)}" alt="">`; };
  const wip = WIP[form.wip === 1 ? 1 : 0].big;
  if (form.art) S.api.artUrl(form.art).then(u => showArt(u || wip)).catch(() => showArt(wip)); else showArt(wip);
  const tks = form.tracks || [];
  $('#root').innerHTML = `<form class="gate linkform" id="linkform"><h2>Your details</h2>
    <p>So your copy can be posted to you. Only Blue Dawn Records sees this.</p>
    ${tks.length ? `<label>Your artist name<select name="track" required><option value="">Choose your name from the list</option>${tks.map(t => `<option value="${esc(t.id)}">${esc(t.artist || '')}${t.artist && t.title ? ' · ' : ''}${esc(t.title || '')}</option>`).join('')}</select></label>` : ''}
    <label>Full name<input name="full_name" required autocomplete="name" maxlength="200"></label>
    <label>Email<input name="email" type="email" required autocomplete="email" maxlength="320"></label>
    <label>Postal address<textarea name="address" rows="4" required autocomplete="street-address" maxlength="1000"></textarea></label>
    <label>Country<input name="country" autocomplete="country-name" maxlength="100"></label>
    <button class="go" type="submit">Send my details</button><div class="msg" id="msg"></div></form>`;
  const f = $('#linkform'), msg = $('#msg');
  f.onsubmit = async e => {
    e.preventDefault(); const b = f.querySelector('.go'); b.disabled = true; msg.textContent = 'Sending…';
    try { await S.api.submitDetails(tok, Object.fromEntries(new FormData(f).entries())); $('#root').innerHTML = `<div class="gate"><h2>Thank you</h2><p>Your details are with Blue Dawn Records.</p></div>`; }
    catch (err) { b.disabled = false; msg.textContent = err.message; }
  };
}
// ------------------------------------------------------------------ join link (George 2026-10-14)
// Opening an invite link: name, email, a password of their own, and they are in as a guest of that
// one release. Someone already signed in just gains the release.
async function joinView(tok) {
  const goRoom = () => { history.replaceState(null, '', location.pathname); S.api.onAuth(s => { if (!s && S.me) { S.me = null; clearCache(); stopAll(); signInView(); } }); return enter(); };
  if (await S.api.session()) {
    try { await S.api.joinMe(tok); } catch (err) { toast(err.message, 6000); }
    return goRoom();
  }
  document.body.classList.add('gatepage', 'linkpage');
  let info = null; try { info = await S.api.inviteInfo(tok); } catch {}
  if (!info) return fatal('This invite link is no longer open. Ask Blue Dawn Records for a new one.');
  document.title = `${info.name} · Blue Dawn Records`;
  $('#title').innerHTML = `<div class="hero stack"><div><div class="kick">Blue Dawn Records</div><h1>${esc(info.name)}</h1></div><span id="linkart"></span></div>`;
  const showArt = u => { const el = $('#linkart'); if (el) el.outerHTML = `<img id="linkart" class="relart big" src="${esc(u)}" alt="">`; };
  const wip = WIP[info.wip === 1 ? 1 : 0].big;
  if (info.art) S.api.artUrl(info.art).then(u => showArt(u || wip)).catch(() => showArt(wip)); else showArt(wip);
  // A personal invite (12-personal-invites.sql) names who it is for and works once; a username is
  // what the room shows for them (George 2026-10-18: "sign up ... with their email and their username").
  $('#root').innerHTML = `<form class="gate linkform" id="joinform" autocomplete="on"><h2>${info.owner ? "You're invited to be an owner" : info.for ? `An invite for ${esc(info.for)}` : "You're invited to listen"}</h2>
    <p>${info.owner ? 'Join the Blue Dawn Records listening room as an owner: every release, uploads and invites.' : `Join to hear ${esc(info.name)} in the Blue Dawn Records listening room.`}${info.for ? ' This link works once.' : ''}</p>
    <label>Username<input name="username" required autocomplete="nickname" minlength="3" maxlength="30" pattern="[A-Za-z0-9][A-Za-z0-9 ._\-]{1,28}[A-Za-z0-9._\-]" title="3 to 30 letters, numbers, spaces, dots, dashes or underscores"></label>
    <label>Email<input name="email" type="email" required autocomplete="username" maxlength="254"></label>
    <label>Choose a password<input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
    <button class="go" type="submit">Join</button><div class="msg" id="msg"></div>
    <button class="linkish" type="button" id="havepw">I already have an account</button></form>`;
  const f = $('#joinform'), msg = $('#msg');
  $('#havepw').onclick = () => { f.querySelector('h2').textContent = 'Sign in to join'; f.username.closest('label').hidden = true; f.username.required = false; f.password.closest('label').firstChild.textContent = 'Password'; f.password.autocomplete = 'current-password'; f.querySelector('.go').textContent = 'Sign in and join'; $('#havepw').hidden = true; f.dataset.mode = 'signin'; };
  f.onsubmit = async e => {
    e.preventDefault(); const b = f.querySelector('.go'); b.disabled = true; msg.textContent = 'Joining…';
    const r = Object.fromEntries(new FormData(f).entries()); r.email = r.email.trim();
    try {
      if (f.dataset.mode !== 'signin') {
        r.username = (r.username || '').trim();
        let res;
        try { res = await S.api.joinUser(tok, r); }
        catch (err) {   // the live database may not have 12-personal-invites.sql yet: join as before
          if (!/Could not find the function|schema cache/i.test(err.message)) throw err;
          res = await S.api.join(tok, { ...r, full_name: r.username || r.email.split('@')[0] });
        }
        if (res === 'member') { msg.textContent = 'You are a member already. Sign in as usual.'; b.disabled = false; return; }
      }
      try { await S.api.signIn(r.email, r.password); }
      catch { msg.textContent = 'That email already has an account. Use its password, or ask Blue Dawn Records to reset it.'; b.disabled = false; return; }
      if (f.dataset.mode === 'signin') await S.api.joinMe(tok);
      await goRoom();
    } catch (err) { b.disabled = false; msg.textContent = err.message; }
  };
}
function noAccess() {
  document.body.classList.add('gatepage');
  $('#root').innerHTML = `<div class="gate"><h2>Not in the room yet</h2><p>You are signed in as ${esc(S.me.email)}, but nothing has been shared with you. Ask George to add you.</p></div>`;
}
// George 2026-10-21: "I should be able to click my name ... simpler showing that I'm signed in". Owners (George and
// Alex, the label) get an Owner tag and a rocket; everyone else is a Member. In the code "member" still means owner.
const isOwner = p => (p?.kind ?? S.me?.kind) === 'member';
// Badges by Echo, George's picks 2026-10-21: the commander for owners, the rocket for members.
const BADGE = { own: './owner-badge-128.png', mem: './member-badge-128.png' };
const roleTag = p => isOwner(p) ? `<span class="role own"><img src="${BADGE.own}" alt="">Owner</span>` : `<span class="role"><img src="${BADGE.mem}" alt="">Member</span>`;
const avatar = p => `<img class="av badge" src="${isOwner(p) ? BADGE.own : BADGE.mem}" alt="" title="${esc(p.name || '')}">`;
function whoPill() {
  $('#who').innerHTML = `<button class="me ${S.account ? 'on' : ''}" id="me" title="Your account">${avatar(S.me)}<b>${esc(S.me.name)}</b>${roleTag(S.me)}${ICON.chev}</button>`;
  $('#me').onclick = () => { S.account = !S.account; S.setPw = false; S.setMail = false; whoPill(); render(); };
}

// ------------------------------------------------------------------ what is in view
const inProgress = () => S.releases.filter(r => r.status !== 'released').sort((a, b) => a.position - b.position);
const released = () => S.releases.filter(r => r.status === 'released').sort((a, b) => a.position - b.position);
const relOf = id => S.releases.find(r => r.id === id);
const countIn = id => S.tracks.filter(t => t.release_id === id).length;
const isRecent = t => Date.now() - new Date(t.created_at) < RECENT_DAYS * 864e5;
function listFor(view = S.view) {
  if (view === 'all') return [...S.tracks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (view === 'recent') return S.tracks.filter(isRecent).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return S.tracks.filter(t => t.release_id === view).sort((a, b) => a.position - b.position);
}
const visible = () => listFor();

// ------------------------------------------------------------------ render
function render() {
  if (!S.me || S.me.kind === 'none') return;
  document.body.classList.remove('gatepage'); whoPill();
  const guest = S.me.kind === 'guest';
  document.body.classList.toggle('guest', guest);
  const showSide = !guest || S.releases.length > 1;
  $('#title').innerHTML = titleHtml();
  // George 2026-10-21: on a release its artwork takes the top-left corner; elsewhere the badge.
  const cur = relOf(S.view), ta = $('#topart');
  ta.src = cur && !S.account ? (S.art[cur.id] || wipOf(cur.id).big) : 'badge-240.png'; ta.classList.toggle('rel', !!cur && !S.account);
  ta.onclick = null; ta.style.cursor = ''; ta.title = '';
  // The menu bar sits above the tracks only, so the sidebar's top lines up with the first track on every page.
  $('#root').innerHTML = `<div class="shell ${showSide ? '' : 'noside'}"><div class="mbar" id="mbar">${barHtml()}</div>${showSide ? `<nav class="side" id="side">${sideHtml()}</nav>` : ''}<main id="main">${S.account ? accountHtml() : mainHtml()}</main></div>`;
  wireSide(); wireBar(); if (S.account) { wireAccount(); syncIcons(); return; } wireMain();
  // George 2026-10-14: the dotted area takes a pasted link too. A paste adds at once; Enter adds what was typed.
  const dz = $('#dropzone'), dzl = $('#dzlink'), br = $('#browse');
  if (br) { br.onclick = e => { e.stopPropagation(); $('#file').click(); }; br.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#file').click(); } }; }
  if (dz && dzl) {
    dz.onclick = e => { if (e.target !== br) dzl.focus(); };
    dzl.onpaste = e => { const v = e.clipboardData?.getData('text') || ''; e.preventDefault(); dzl.value = ''; addLinks(v); };
    dzl.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const v = dzl.value; dzl.value = ''; if (v.trim()) addLinks(v); } };
  }
  visible().forEach(t => drawTrack(t.id));
  warmList();
  const rel = relOf(S.view);
  if (rel && (rel.collect_details || isMember()) && S.detailsFor !== rel.id) {
    S.detailsFor = rel.id;
    Promise.all([S.api.details(rel.id), isMember() ? S.api.people(rel.id) : Promise.resolve(S.people)])
      .then(([d, p]) => { if (S.view !== rel.id) return; S.details = d; S.people = p; render(); }).catch(e => toast(e.message));
  }
  syncIcons();
}

function sideHtml() {
  if (S.me.kind === 'guest') return S.releases.map(r => relRow(r)).join('');
  const fresh = S.tracks.filter(t => new Date(t.created_at) > lastSeen() && t.uploader !== S.me.id).length;
  const lib = `<div class="row ${S.view === 'all' ? 'on' : ''}" data-view="all"><span class="nm">All demos</span><span class="n">${S.tracks.length}</span></div>
    <div class="row ${S.view === 'recent' ? 'on' : ''}" data-view="recent" data-drop="none"><span class="nm">Recently added</span>${fresh ? `<span class="fresh">${fresh} new</span>` : `<span class="n">${S.tracks.filter(isRecent).length}</span>`}</div>`;
  const rels = inProgress().filter(r => !S.search || r.name.toLowerCase().includes(S.search.toLowerCase()));
  return lib + `<div class="sec"><span>Releases in progress</span></div>
    <input class="search" id="search" placeholder="⌕ Find a release" value="${esc(S.search)}">
    ${rels.map(r => relRow(r, true)).join('') || (S.search ? '<div class="empty-s">No release by that name</div>' : '')}
    ${S.newRel ? `<input class="newin" id="newin" placeholder="Name the release, then Enter">` : `<button class="newrel" id="newrel">+ New release</button>`}
    ${released().length ? `<div class="sec fold" id="fold"><span>Released ${S.showReleased ? '▾' : '▸'}</span><span>${released().length}</span></div>${S.showReleased ? released().map(r => relRow(r, true)).join('') : ''}` : ''}`;
}
function relRow(r, editable) {
  const on = S.view === r.id, m = editable && isMember();
  return `<div class="row ${on ? 'on' : ''} ${S.menu === r.id ? 'menu' : ''}" data-view="${r.id}" data-rel="${r.id}" ${m ? 'draggable="true"' : ''}>
    <img src="${esc(S.art[r.id] || wipOf(r.id).sm)}" alt=""><span class="nm" ${S.renaming === r.id ? 'contenteditable="true"' : ''}>${esc(r.name)}</span><span class="n">${countIn(r.id)}</span>${m ? '<button class="more" title="Rename, move or delete">⋯</button>' : ''}</div>`
    + (m && S.menu === r.id ? `<div class="pop"><div data-act="rename">Rename</div><div data-act="status">${r.status === 'released' ? 'Back to in progress' : 'Mark as released'}</div><div data-act="del" class="bad">Delete release</div></div>` : '')
    + (m && S.confirmDel === r.id ? `<div class="confirm">Delete <b>${esc(r.name)}</b>? ${countIn(r.id) ? `Its ${countIn(r.id)} demo${countIn(r.id) > 1 ? 's go' : ' goes'} back to All demos, nothing is lost.` : 'It has no demos.'}<div class="btns"><button class="go">Delete</button><button class="no">Keep</button></div></div>` : '');
}

function mainHtml() {
  const member = isMember(), list = visible(), rel = relOf(S.view);
  // George 2026-10-14: no upload card. A dotted drop area always sits under the tracks (for an empty
  // release it IS the empty state) and lights up while audio is dragged over the page.
  const where = rel ? esc(rel.name) : 'Recently added';
  const zone = member ? `<div class="dropzone ${list.length ? '' : 'empty'}" id="dropzone"><input type="file" id="file" accept=".wav,.wave,.aif,.aiff,.flac,.mp3,.m4a,audio/*" multiple hidden>
    <span class="dz-idle">${list.length ? '' : (S.view === 'recent' ? `Nothing new in the last ${RECENT_DAYS} days. ` : 'No demos here yet. ')}Drag audio here to add it to ${where}, or <u id="browse" role="button" tabindex="0">browse</u>
      <input class="dz-link" id="dzlink" type="url" placeholder="or click here and paste a SoundCloud or YouTube link" autocomplete="off" aria-label="Paste a SoundCloud or YouTube link"></span><span class="dz-hot">Drop to add to ${where}</span></div>` : '';
  const ups = S.uploads.length ? `<div class="ups">${S.uploads.map(u => `<div class="uprow ${u.state}"><span class="nm">${esc(u.name)}</span><span class="st">${u.state === 'error' ? esc(u.err) : u.state === 'done' ? 'Added' : u.state === 'reading' ? 'Reading…' : Math.round(u.p * 100) + '%'}</span><i style="width:${(u.state === 'done' ? 1 : u.p) * 100}%"></i></div>`).join('')}</div>` : '';
  const total = list.reduce((a, t) => a + (t.duration_s || 0), 0);
  const title = rel ? esc(rel.name) : S.view === 'recent' ? 'Recently added' : 'All demos';
  // On a release, its name and cover take the header (titleHtml); the row below keeps only the controls.
  // George 2026-10-14: icon buttons in the same family as download/expand, named on hover.
  const relTracks = rel ? S.tracks.filter(t => t.release_id === rel.id) : [];
  const artists = [...new Map(relTracks.map(t => [artistKey(t), t])).values()];
  const nDet = artists.length ? artists.filter(detailsIn).length : S.details.length, nGuest = artists.length || S.people.filter(p => p.kind === 'guest').length;
  void total; void title; void nDet; void nGuest;
  const mine = rel && !member && rel.collect_details ? S.details.find(x => x.user_id === S.me.id) : true;
  const head = '';
  const panel = (rel && member && S.peopleOpen ? membersHtml(rel) : '')
    + (rel && member && S.detailsOpen ? `<div class="people on dets" id="detpanel"><h3>Postage addresses for ${esc(rel.name)}</h3>${detailsInner(rel)}</div>` : '')
    + (!mine ? `<div class="nudge">${esc(rel.name)} is being posted out. <button class="linkish" id="toacct">Add your postage address</button></div>` : '');
  const empty = !list.length && !member ? `<div class="emptyl">Nothing here yet.</div>` : '';
  return head + panel + empty + `<div id="list">${list.map((t, i) => trackHtml(t, i, !!rel)).join('')}</div>` + ups + zone;
}

// George 2026-10-14: "when I'm on Event Horizons it should say Event Horizons and have the artwork".
const DEFAULT_TITLE = '<div class="kick">Blue Dawn Records · A&amp;R</div><h1>The Listening Room</h1>';
function titleHtml() {   // George 2026-10-21: the page's title, centred; the artwork sits top left
  const rel = S.account ? null : relOf(S.view);
  const name = S.account ? 'Your account' : rel ? rel.name : S.view === 'recent' ? 'Recently added' : 'All demos';
  const kick = rel ? `Blue Dawn Records${rel.status === 'released' ? ' · Released' : ''}` : 'Blue Dawn Records · The Listening Room';
  return `<div class="hero c"><div class="kick">${kick}</div><h1 id="rvname">${esc(name)}</h1>${rel && isMember() ? '<input type="file" id="artfile" accept="image/jpeg,image/png" hidden>' : ''}</div>`;
}

// The menu bar over the tracks (George 2026-10-21: "more like a menu bar"): Members on the left, the count,
// length and Play through on the right. In the account view it holds the way back.
function barHtml() {
  if (S.account) return `<button class="mb" id="back">${ICON.back}Back to the tracks</button>`;
  const rel = relOf(S.view), list = visible(), total = list.reduce((a, t) => a + (t.duration_s || 0), 0);
  let members = '';
  if (rel && isMember()) {
    const guests = S.people.filter(p => !isOwner(p)), have = new Set(S.details.map(d => d.user_id));
    const nIn = guests.filter(g => have.has(g.user_id)).length;
    const stack = S.people.slice(0, 4).map(avatar).join('');
    // George 2026-10-21: members and postage are two different jobs, so two buttons.
    members = `<button class="mb ${S.peopleOpen ? 'on' : ''}" id="ppl" title="Who can hear this release"><span class="stack">${stack || ICON.people}</span>Members${S.people.length ? `<span class="cnt">${S.people.length}</span>` : ''}${ICON.chev}</button>`
      + `<button class="mb ${S.detailsOpen ? 'on' : ''}" id="dets" title="Postal addresses for this release">${ICON.card}Addresses${rel.collect_details && guests.length ? `<span class="addr ${nIn === guests.length ? 'ok' : ''}">${nIn}/${guests.length}</span>` : ''}${ICON.chev}</button>`;
  }
  return `${members}<span class="grow"></span><span class="mstat">${list.length} track${list.length === 1 ? '' : 's'}${total ? `<i></i>${fmt(total)}` : ''}</span><button class="mtog ${S.auto ? 'on' : ''}" id="auto" title="Play the next track when one ends"><span></span>Play through</button>`;
}
function wireBar() {
  const back = $('#back'); if (back) back.onclick = () => { S.account = false; whoPill(); render(); };
  const au = $('#auto'); if (au) au.onclick = () => { S.auto = !S.auto; au.classList.toggle('on', S.auto); };
  const ppl = $('#ppl');
  if (ppl) ppl.onclick = async () => { const rel = relOf(S.view); S.peopleOpen = !S.peopleOpen; S.detailsOpen = false; if (S.peopleOpen) { try { [S.people, S.details] = await Promise.all([S.api.people(rel.id), S.api.details(rel.id)]); } catch (err) { toast(err.message); } } render(); };
  const dets = $('#dets');
  if (dets) dets.onclick = async () => { const rel = relOf(S.view); S.detailsOpen = !S.detailsOpen; S.peopleOpen = false; if (S.detailsOpen) { try { S.details = await S.api.details(rel.id); } catch (err) { toast(err.message); } } render(); };
}

// One Members panel (George 2026-10-21): who can hear the release, whether each has sent an address, and the
// ways to let more people in. Replaces the separate People and Details buttons.
function membersHtml(rel) {
  const have = new Set(S.details.map(d => d.user_id));
  // George 2026-10-21: a boxed "Address", green when in, grey when not, left of the role; remove by right-click.
  const rows = S.people.map(p => `<div class="pr" ${p.kind === 'guest' ? `data-uid="${p.user_id}" data-pname="${esc(p.name)}"` : ''}>${avatar(p)}<span>${esc(p.name)} <small>· ${esc(p.email)}</small></span>${
    isOwner(p) || !rel.collect_details ? '<span></span>' : `<span class="adr ${have.has(p.user_id) ? 'ok' : ''}" title="${have.has(p.user_id) ? 'Address in' : 'No address yet'}">Address</span>`}${roleTag(p)}</div>`).join('');
  // George 2026-10-21: empty until a button is pressed; then "Member link" / "Owner link" with copy and ×.
  const sh = S.shown[rel.id] || {};
  const line = (kind, title) => `<div class="ilink"><span class="role ${kind === 'owner' ? 'own' : ''}"><img src="${kind === 'owner' ? BADGE.own : BADGE.mem}" alt="">${title}</span><button class="cpy" data-icopy="${kind}" title="Copy ${title.toLowerCase()}">${ICON.copy}</button><button class="cpy x" data-ix="${kind}" title="${kind === 'owner' ? 'Cancel: the link stops working' : 'Hide'}">×</button></div>`;
  return `<div class="people on" id="people"><h3>Members of ${esc(rel.name)}</h3>${rows}
    <div class="invs"><button class="inv" id="invmem"><img src="${BADGE.mem}" alt="">Invite a member</button>${S.me.role === 'owner' ? `<button class="inv" id="invown"><img src="${BADGE.own}" alt="">Invite an owner</button>` : ''}</div>
    ${sh.member || sh.owner ? `<div class="ilinks">${sh.member ? line('member', 'Member link') : ''}${sh.owner ? line('owner', 'Owner link') : ''}</div>` : ''}</div>`;
}

// Your account (George 2026-10-21): opened by clicking your name, shown where the tracks are.
function accountHtml() {
  const me = S.me, owner = isOwner(me);
  const d = S.details.find(x => x.user_id === me.id) || S.myAddr || {};
  const postal = owner ? '' : `<form class="asec" id="addrform"><h4>Postage address</h4><p>So a copy of a release can be posted to you. Only Blue Dawn Records sees this.</p>
      <label>Full name<input name="full_name" required value="${esc(d.full_name || me.name)}" autocomplete="name"></label>
      <label>Address<textarea name="address" rows="4" required autocomplete="street-address">${esc(d.address || '')}</textarea></label>
      <label>Country<input name="country" value="${esc(d.country || '')}" autocomplete="country-name"></label>
      <button class="go">Save address</button></form>`;
  return `<div class="acct"><div class="ahead">${avatar(me)}<div><div class="an">${esc(me.name)} ${roleTag(me)}</div><div class="ae">${esc(me.email)}</div></div></div>
    <form class="asec" id="pwform"><h4>Password</h4><p>Set one to sign in without waiting for an email link.</p><div class="arow"><input type="password" name="pw" minlength="8" placeholder="New password, 8+ characters" autocomplete="new-password"><button class="go">Save password</button></div></form>
    <form class="asec" id="mailform"><h4>Email</h4><p>A link goes to the new address to confirm it.</p><div class="arow"><input type="email" name="email" required value="${esc(me.email)}" autocomplete="email"><button class="go">Change email</button></div></form>
    ${postal}
    <div class="asec"><button class="out" id="signout">Sign out</button></div></div>`;
}
function wireAccount() {
  $('#pwform').onsubmit = async e => { e.preventDefault(); const pw = e.target.pw.value; if (pw.length < 8) return toast('Use at least 8 characters');
    try { await S.api.setPassword(pw); e.target.reset(); toast('Password saved'); } catch (err) { toast(err.message); } };
  $('#mailform').onsubmit = async e => { e.preventDefault(); const em = e.target.email.value.trim(); if (em === S.me.email) return toast('That is your email already');
    try { await S.api.setEmail(em); toast(`Check ${em} for a link to confirm the change`, 5000); } catch (err) { toast(err.message); } };
  const af = $('#addrform');
  if (af) af.onsubmit = async e => {
    e.preventDefault(); const row = { ...Object.fromEntries(new FormData(af).entries()), email: S.me.email };
    const rels = S.releases.filter(r => r.collect_details);   // the address is kept per release, so it goes to each one posting out
    try { for (const r of rels) await S.api.saveDetails(r.id, row); S.myAddr = row; toast(rels.length ? 'Address saved. Thank you!' : 'Saved'); } catch (err) { toast(err.message); }
  };
  $('#signout').onclick = async () => { clearCache(); stopAll(); S.account = false; await S.api.signOut(); S.me = null; signInView(); };
}


// George 2026-10-21: a ledger. One line per artist on the release (name, email, address), the ones still to
// send theirs greyed; each column copies on its own; the artists' form link is a button, not a raw address.
function ledgerRows(rel) {
  const relTracks = S.tracks.filter(t => t.release_id === rel.id).sort((a, b) => a.position - b.position);
  const same = (a, b) => a === b;   // S.detIndex only marks which tracks have details (no names): the ledger reads S.details
  const all = S.details;
  const byArtist = d => artistKey(S.tracks.find(t => t.id === d.track_id));
  const artists = [...new Map(relTracks.map(t => [artistKey(t), t])).values()];
  const rows = artists.map(t => ({ artist: t.artist || t.title, d: all.find(d => d.release_id === rel.id && d.track_id && byArtist(d) === artistKey(t)) }));
  all.filter(d => d.release_id === rel.id && !rows.some(r => r.d && same(r.d, d))).forEach(d => rows.push({ artist: '', d }));   // sent from an account, no track
  return rows.map(({ artist, d }) => ({ artist, in: !!d, cells: [artist, d?.full_name || '', d?.email || '', d ? [d.address, d.country].filter(Boolean).join(', ').replace(/\s*\n+\s*/g, ', ') : ''] }));
}
function detailsInner(rel) {
  const head = `<label class="tog ${rel.collect_details ? 'on' : ''}" id="collect"><i></i>Collect postal addresses for this release</label>`;
  if (!rel.collect_details) return head;
  const rows = ledgerRows(rel), cols = ['Artist', 'Name', 'Email', 'Address'];
  return head + `<div class="dbar"><button class="inv" id="dlinkcopy">${ICON.copy}Copy the address form link</button><span class="grow"></span><button class="linkish" id="dlinknew" title="The old link stops working">New link</button><button class="linkish" id="csvdets">Download CSV</button></div>
    <div class="ledger"><div class="lh">${cols.map((c, k) => `<span>${c}<button class="cpy" data-col="${k}" title="Copy every ${c.toLowerCase()}">${ICON.copy}</button></span>`).join('')}</div>
    ${rows.map(r => `<div class="lr ${r.in ? '' : 'wait'}">${r.cells.map((c, k) => `<span title="${esc(c)}">${esc(c || (k === 1 && !r.in ? 'Not sent yet' : ''))}</span>`).join('')}</div>`).join('') || '<div class="lr wait"><span>No artists on this release yet</span></div>'}</div>`;
}

function trackHtml(t, i, inRelease) {
  const member = isMember(), open = S.open.has(t.id);   // George 2026-10-14: a row shows artist and title, nothing else
  const notes = S.notes.filter(n => n.track_id === t.id).sort((a, b) => a.at_s - b.at_s);
  const dur = t.duration_s || 0;
  return `<div class="trk ${open ? 'open' : ''} ${S.cur === t.id ? 'playing' : ''}" id="k-${t.id}" data-id="${t.id}">
   <div class="hd"><span class="grip" ${member ? 'draggable="true"' : ''} title="Drag onto a release">${member ? ICON.grip : ''}</span><button class="pb" aria-label="Play ${esc(t.title)}">${ICON.play}</button>
    <div style="min-width:0"><div class="ttl">${inRelease ? `<span class="slot">${String(i + 1).padStart(2, '0')}</span>` : ''}<span class="t" data-edit="title">${esc(t.title)}</span></div>
     <div class="by"><span class="a" data-edit="artist">${esc(t.artist || 'Unknown artist')}</span>${t.link_kind ? `<span class="srctag">${t.link_kind === 'youtube' ? 'YouTube' : 'SoundCloud'}</span>` : ''}${member && relOf(t.release_id)?.collect_details && detailsIn(t) ? '<span class="dtag" title="This artist has sent their details">Details in</span>' : ''}</div></div>
    <div class="wv mini"><canvas height="30"></canvas><div class="hov"></div><div class="tip"></div></div>
    <div class="time"><b class="el">${fmt((S.pos.get(t.id) || 0) * dur)}</b> / ${fmt(dur)}</div>
    <div class="acts">${t.link_url ? `<a class="ib" href="${esc(t.link_url)}" target="_blank" rel="noopener" title="Open on ${t.link_kind === 'youtube' ? 'YouTube' : 'SoundCloud'}" aria-label="Open the original">${ICON.ext}</a>` : member ? `<button class="ib dl" title="Download the original" aria-label="Download">${ICON.export}</button>` : ''}<button class="ib ex" title="Notes" aria-label="Open notes">${ICON.chev}</button></div></div>
   <div class="big"><div><div class="bigin"><div class="wv wide"><canvas height="76"></canvas><div class="hov"></div><div class="tip"></div></div>
    ${notes.map(n => `<div class="pin" style="left:${dur ? n.at_s / dur * 100 : 0}%" data-at="${n.at_s}"><i style="background:${noteColour(n.author)}">${esc((S.names[n.author] || '?')[0])}</i></div>`).join('')}
    <div class="thread">${notes.map(n => `<div class="cm" data-at="${n.at_s}"><span class="ts">${fmt(n.at_s)}</span><span><b style="color:${noteColour(n.author, true)}">${esc(S.names[n.author] || 'Someone')}</b>${esc(n.body)}</span>${member || n.author === S.me.id ? `<button class="rmn" data-note="${n.id}" title="Delete note">×</button>` : ''}</div>`).join('')}
     <form class="noteform"><input class="reply" name="body" placeholder="Add a note at the playhead…" maxlength="1000" autocomplete="off"></form>
</div></div></div></div></div>`;
}
function noteColour(uid, text) {
  const n = S.names[uid]; if (n === 'George') return text ? '#fff' : '#f0b15a'; if (n === 'Alex') return '#8cc8ff'; return '#b9a3ff';
}

// ------------------------------------------------------------------ waveform
function drawTrack(id) {
  const t = S.tracks.find(x => x.id === id), el = document.getElementById('k-' + id);
  if (!t || !el) return;
  const a = S.audios.get(id), dur = a && isFinite(a.duration) && a.duration ? a.duration : t.duration_s || 0;
  const p = a && dur && a.currentTime ? a.currentTime / dur : (S.pos.get(id) || 0);
  const pk = t.peaks || [];
  el.querySelectorAll('.wv canvas').forEach(c => {
    if (!c.offsetParent) return;
    const dpr = devicePixelRatio || 1, W = c.clientWidth, H = +c.getAttribute('height');
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = H * dpr; }
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    const cols = Math.floor(W / 3), g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#f0b15a'); g.addColorStop(1, '#ff8351');
    for (let k = 0; k < cols; k++) {
      const v = pk.length ? pk[Math.floor(k / cols * pk.length)] : .15, h = Math.max(2, v * H * .92);
      x.fillStyle = k / cols < p ? g : 'rgba(150,170,205,.34)'; x.fillRect(k * 3, (H - h) / 2, 2, h);
    }
    x.fillStyle = '#fff'; x.fillRect(Math.round(p * W), 0, 1, H);
  });
  const e = el.querySelector('.el'); if (e) e.textContent = fmt(p * dur);
  if (id === S.cur) { $('#npbar').style.width = p * 100 + '%'; $('#nptime').textContent = `${fmt(p * dur)} / ${fmt(dur)}`; }
}
(function tick() { if (S.cur) drawTrack(S.cur); requestAnimationFrame(tick); })();
addEventListener('resize', () => { clearTimeout(window._rz); window._rz = setTimeout(() => visible().forEach(t => drawTrack(t.id)), 120); });

// ------------------------------------------------------------------ playback: one at a time
function audioFor(t) {
  let a = S.audios.get(t.id);
  if (a) return a;
  if (t.link_url) {
    a = new LinkPlayer(t);
    a.addEventListener('loadedmetadata', () => {   // links have no stored length until first played
      if (!t.duration_s && isFinite(a.duration) && a.duration > 0) { t.duration_s = a.duration; render(); if (isMember()) S.api.updateTrack(t.id, { duration_s: a.duration }).catch(() => {}); }
    });
  } else { a = new Audio(); a.preload = 'none'; }   // nothing loads until someone presses play
  a.addEventListener('waiting', () => { S.waiting.add(t.id); syncIcons(); });
  a.addEventListener('playing', () => { S.waiting.delete(t.id); syncIcons(); });
  a.addEventListener('pause', syncIcons);
  a.addEventListener('ended', () => {
    const l = visible(), i = l.findIndex(x => x.id === t.id);
    S.pos.set(t.id, 0);
    if (S.auto && i >= 0 && i < l.length - 1) play(l[i + 1].id); else syncIcons();
  });
  a.addEventListener('error', () => { S.waiting.delete(t.id); syncIcons(); toast(`${t.title} would not play in this browser`); });
  S.audios.set(t.id, a);
  return a;
}
// Warm a track before it is pressed: its address and the WAV's header and tail are fetched while the
// pointer is still on its way, so play starts at once (a cold WAV took ~3 s plus the address trip).
async function warm(id) {
  const t = S.tracks.find(x => x.id === id); if (!t) return;
  if (t.link_url) { audioFor(t).ensure().catch(() => {}); return; }   // a link warms by loading its player
  const a = audioFor(t);
  if (a.src && a._until > Date.now()) return;
  try { a.src = await S.api.streamUrl(t); a._until = Date.now() + 50 * 60e3; } catch { return; }
  if (a.preload === 'none') a.preload = 'metadata';
}
// After the list draws, warm every track in view, top first, one at a time so it never crowds out
// a play. Each warm-up fetches a WAV's header and tail, not the file.
let warmGen = 0;
async function warmList() {
  const gen = ++warmGen, l = visible().filter(t => !t.link_url).slice(0, 40);
  try { await S.api.signAll?.(l); } catch {}
  for (const t of l) { if (gen !== warmGen) return; await new Promise(r => setTimeout(r, 300)); warm(t.id); }
}
async function play(id) {
  const t = S.tracks.find(x => x.id === id); if (!t) return;
  S.audios.forEach((a, k) => { if (k !== id) a.pause(); });
  const a = audioFor(t); S.cur = id;
  if (!a.src || !(a._until > Date.now())) {
    S.waiting.add(id); syncIcons();
    try { a.src = await S.api.streamUrl(t); a._until = Date.now() + 50 * 60e3; } catch (e) { S.waiting.delete(id); syncIcons(); return toast('Could not open that track: ' + e.message); }
  }
  const p = S.pos.get(id);
  if (p) { if (a.readyState >= 1 && isFinite(a.duration)) { if (Math.abs(a.currentTime - p * a.duration) > .5) a.currentTime = p * a.duration; } else a.addEventListener('loadedmetadata', () => { a.currentTime = p * a.duration; }, { once: true }); }
  $('#np').classList.add('on');
  $('#npt').innerHTML = `<b>${esc(t.title)}</b> <span>· ${esc(t.artist || '')}</span>`;
  try { await a.play(); } catch (e) { if (e.name !== 'AbortError') toast('Press play again to start'); }
  syncIcons();
  const l = visible(), i = l.findIndex(x => x.id === id);
  if (i >= 0 && i < l.length - 1) setTimeout(() => warm(l[i + 1].id), 2000);   // the next one, for play-through
}
function toggle(id) { const a = S.audios.get(id); if (id === S.cur && a && !a.paused) a.pause(); else play(id); }
function seek(id, p) {
  p = Math.max(0, Math.min(1, p)); S.pos.set(id, p);
  const a = S.audios.get(id); if (a && isFinite(a.duration) && a.duration) a.currentTime = p * a.duration;
  drawTrack(id);                                  // seeking never starts playback by itself
}
function stopAll() { S.audios.forEach(a => { a.pause(); a.removeAttribute('src'); }); S.audios.clear(); S.cur = null; $('#np').classList.remove('on'); }
function syncIcons() {
  document.querySelectorAll('.trk').forEach(el => {
    const id = el.dataset.id, a = S.audios.get(id), on = id === S.cur && a && !a.paused;
    el.querySelector('.pb').innerHTML = S.waiting.has(id) && id === S.cur ? ICON.wait : on ? ICON.pause : ICON.play;
    el.classList.toggle('playing', id === S.cur);
  });
  const cur = S.tracks.find(x => x.id === S.cur);
  $('#dock').classList.toggle('on', !!cur?.link_url && S.audios.get(S.cur)?._ready != null);
  S.audios.forEach((p, k) => { if (p.box) p.box.hidden = k !== S.cur; });
  const a = S.audios.get(S.cur);
  $('#npb').innerHTML = S.waiting.has(S.cur) ? ICON.wait : a && !a.paused ? ICON.pause : ICON.play;
}
$('#npb').onclick = () => S.cur && toggle(S.cur);
addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable || !S.me) return;
  const l = visible(); if (!l.length) return;
  const id = S.cur || l[0].id, i = l.findIndex(t => t.id === id), t = l[i], a = S.audios.get(id);
  const dur = (a && a.duration) || t?.duration_s || 1, now = a && a.currentTime ? a.currentTime : (S.pos.get(id) || 0) * dur;
  if (e.code === 'Space') { e.preventDefault(); toggle(id); }
  else if (e.code === 'ArrowRight') seek(id, (now + 5) / dur);
  else if (e.code === 'ArrowLeft') seek(id, (now - 5) / dur);
  else if (e.code === 'ArrowDown' && i < l.length - 1) { e.preventDefault(); play(l[i + 1].id); }
  else if (e.code === 'ArrowUp' && i > 0) { e.preventDefault(); play(l[i - 1].id); }
});

// ------------------------------------------------------------------ wiring: sidebar
function wireSide() {
  const side = $('#side'); if (!side) return;
  side.querySelectorAll('.row').forEach(rw => {
    const view = rw.dataset.view, rel = rw.dataset.rel;
    rw.onclick = e => {
      if (e.target.closest('.more') || rw.querySelector('[contenteditable]')) return;
      S.view = view; S.account = false; S.menu = null; S.confirmDel = null; S.peopleOpen = false; S.detailsOpen = false; S.details = []; S.detailsFor = null; S.editDetails = false;
      if (view === 'recent') { render(); markSeen(); return; }
      render();
    };
    rw.ondragover = e => {
      const tr = e.dataTransfer.types.includes('text/track'), rr = e.dataTransfer.types.includes('text/rel');
      if ((tr && rel) || (tr && view === 'all') || (rr && rel)) { e.preventDefault(); rw.classList.add('drop'); }
    };
    rw.ondragleave = () => rw.classList.remove('drop');
    rw.ondrop = async e => {
      e.preventDefault(); rw.classList.remove('drop');
      const tid = e.dataTransfer.getData('text/track'), rid = e.dataTransfer.getData('text/rel');
      if (tid) return moveTrack(tid, rel || null);
      if (rid && rel && rid !== rel) {
        const order = inProgress().concat(released()), from = order.findIndex(r => r.id === rid), to = order.findIndex(r => r.id === rel);
        const [m] = order.splice(from, 1); order.splice(to, 0, m);
        order.forEach((r, i) => r.position = i); render();
        try { await Promise.all(order.map(r => S.api.updateRelease(r.id, { position: r.position }))); } catch (err) { toast(err.message); await reload(); render(); }
      }
    };
    if (rel && rw.draggable) {
      rw.ondragstart = e => { if (S.renaming) return e.preventDefault(); e.dataTransfer.setData('text/rel', rel); rw.classList.add('rdrag'); };
      rw.ondragend = () => rw.classList.remove('rdrag');
      rw.querySelector('.more').onclick = e => { e.stopPropagation(); S.menu = S.menu === rel ? null : rel; S.confirmDel = null; render(); };
      rw.querySelector('.nm').ondblclick = () => { S.renaming = rel; S.menu = null; render(); };
    }
  });
  side.querySelectorAll('.pop div').forEach(d => d.onclick = async () => {
    const id = S.menu; S.menu = null;
    if (d.dataset.act === 'rename') { S.renaming = id; render(); }
    else if (d.dataset.act === 'del') { S.confirmDel = id; render(); }
    else if (d.dataset.act === 'status') {
      const r = relOf(id); r.status = r.status === 'released' ? 'in_progress' : 'released'; if (r.status === 'released') S.showReleased = true; render();
      try { await S.api.updateRelease(id, { status: r.status }); } catch (err) { toast(err.message); }
    }
  });
  const cf = side.querySelector('.confirm');
  if (cf) {
    cf.querySelector('.go').onclick = async () => {
      const r = relOf(S.confirmDel); S.confirmDel = null;
      try { await S.api.deleteRelease(r.id); } catch (err) { return toast(err.message); }
      S.releases = S.releases.filter(x => x.id !== r.id); S.tracks.forEach(t => { if (t.release_id === r.id) t.release_id = null; });
      if (S.view === r.id) S.view = 'all';
      render(); toast(`${r.name} deleted`);
    };
    cf.querySelector('.no').onclick = () => { S.confirmDel = null; render(); };
  }
  const ed = side.querySelector('.nm[contenteditable]');
  if (ed) {
    ed.focus(); getSelection().selectAllChildren(ed);
    const done = async keep => {
      const r = relOf(S.renaming), v = ed.textContent.trim(); S.renaming = null;
      if (keep && v && v !== r.name) { r.name = v; try { await S.api.updateRelease(r.id, { name: v }); } catch (err) { toast(err.message); } }
      render();
    };
    ed.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') done(false); };
    ed.onblur = () => S.renaming && done(true);
  }
  const se = $('#search');
  if (se) se.oninput = () => { S.search = se.value; const pos = se.selectionStart; render(); const n = $('#search'); n.focus(); n.setSelectionRange(pos, pos); };
  const nr = $('#newrel'); if (nr) nr.onclick = () => { S.newRel = true; render(); $('#newin').focus(); };
  const ni = $('#newin');
  if (ni) {
    ni.onkeydown = async e => {
      if (e.key === 'Escape') { S.newRel = false; return render(); }
      if (e.key !== 'Enter' || !ni.value.trim()) return;
      try { const r = await S.api.createRelease(ni.value.trim(), S.releases.length); S.releases.push(r); S.view = r.id; } catch (err) { toast(err.message); }
      S.newRel = false; render();
    };
    ni.onblur = () => { if (!ni.value.trim()) { S.newRel = false; render(); } };
  }
  const fold = $('#fold'); if (fold) fold.onclick = () => { S.showReleased = !S.showReleased; render(); };
}

async function moveTrack(tid, relId) {
  const t = S.tracks.find(x => x.id === tid); if (!t || t.release_id === relId) return;
  const pos = relId ? countIn(relId) : 0;
  const before = t.release_id; t.release_id = relId; t.position = pos; render();
  try { await S.api.updateTrack(tid, { release_id: relId, position: pos }); toast(relId ? `${t.title} moved to ${relOf(relId).name}` : `${t.title} taken out of ${relOf(before)?.name || 'its release'}`); }
  catch (err) { t.release_id = before; render(); toast(err.message); }
}
async function reorderWithin(tid, beforeId) {
  const l = visible(), from = l.findIndex(t => t.id === tid), to = l.findIndex(t => t.id === beforeId);
  if (from < 0 || to < 0 || from === to) return;
  const [m] = l.splice(from, 1); l.splice(to, 0, m);
  const changed = l.filter((t, i) => t.position !== i); l.forEach((t, i) => t.position = i); render();
  try { await Promise.all(changed.map(t => S.api.updateTrack(t.id, { position: t.position }))); } catch (err) { toast(err.message); await reload(); render(); }
}

// ------------------------------------------------------------------ wiring: main
function wireMain() {
  const member = isMember(), rel = relOf(S.view);
  const file = $('#file'); if (file) file.onchange = () => { handleFiles([...file.files]); file.value = ''; };
  const artEl = rel ? $('#topart') : null, artIn = $('#artfile');
  const ta = $('#toacct'); if (ta) ta.onclick = () => { S.account = true; whoPill(); render(); };
  if (artEl && artIn) { artEl.title = S.art[rel.id] ? 'Change the artwork' : 'Add the cover'; artEl.style.cursor = 'pointer'; artEl.onclick = () => artIn.click();
    artIn.onchange = async () => { const f = artIn.files[0]; if (!f) return; try { const p = await S.api.setReleaseArt(rel.id, f); rel.art_path = p; S.art[rel.id] = await S.api.artUrl(p); S.artMeta[rel.id] = { path: p, until: Date.now() + 50 * 60e3 }; render(); saveCache(); } catch (err) { toast(err.message); } }; }
  if (member && rel) {
    const h = $('#rvname'); h.ondblclick = () => { h.contentEditable = 'true'; h.focus(); getSelection().selectAllChildren(h); };
    h.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); h.blur(); } else if (e.key === 'Escape') { h.textContent = rel.name; h.blur(); } };
    h.onblur = async () => { if (h.contentEditable !== 'true') return; h.contentEditable = 'false'; const v = h.textContent.trim(); if (v && v !== rel.name) { rel.name = v; render(); try { await S.api.updateRelease(rel.id, { name: v }); } catch (err) { toast(err.message); } } else h.textContent = rel.name; };
  }
  const col = $('#collect');
  if (col) col.onclick = async () => { rel.collect_details = !rel.collect_details; S.detailsFor = null; render(); try { await S.api.updateRelease(rel.id, { collect_details: rel.collect_details }); } catch (err) { toast(err.message); } };
  if ($('#ilinkurl') && !S.invLink[rel.id]) S.api.inviteLink(rel.id).then(t => { S.invLink[rel.id] = t; render(); }).catch(err => toast(err.message));
  const ic = $('#ilinkcopy'); if (ic) ic.onclick = async () => { if (!S.invLink[rel.id]) return; try { await navigator.clipboard.writeText(joinUrl(S.invLink[rel.id])); toast('Invite link copied. Whoever opens it can listen to this release only.'); } catch { $('#ilinkurl').select(); toast('Press Cmd+C to copy'); } };
  const inw = $('#ilinknew'); if (inw) inw.onclick = async () => {
    if (inw.dataset.sure !== '1') { inw.dataset.sure = '1'; inw.textContent = 'Old link stops working. Sure?'; return; }
    try { S.invLink[rel.id] = await S.api.inviteLink(rel.id, true); render(); toast('New invite link made. The old one no longer works.'); } catch (err) { toast(err.message); }
  };
  if ($('#pinvform') && S.pinv[rel.id] === undefined) {
    S.pinv[rel.id] = [];
    S.api.personalInvites(rel.id).then(l => { S.pinv[rel.id] = l; render(); })
      .catch(() => { S.pinv[rel.id] = null; render(); });   // 12-personal-invites.sql not run yet: the form still shows
  }
  const pf = $('#pinvform'); if (pf) {
    pf.label.oninput = () => { S.pinvFor = pf.label.value; };
    pf.onsubmit = async e => {
      e.preventDefault(); const label = pf.label.value.trim(); if (!label) return;
      try {
        const own = S.pinvOwner, tok = await (own ? S.api.ownerInvite(rel.id, label) : S.api.personalInvite(rel.id, label)); S.pinvFor = '';
        S.pinv[rel.id] = await S.api.personalInvites(rel.id); render();
        try { await navigator.clipboard.writeText(joinUrl(tok)); toast(`Link for ${label} copied. It works once.`); } catch { toast(`Link for ${label} made. Copy it from the list.`); }
      } catch (err) { toast(/Could not find the function|schema cache/i.test(err.message) ? (S.pinvOwner ? 'Owner invites need setup step 13 run in Supabase first.' : 'Personal invites need setup step 12 run in Supabase first.') : err.message, 6000); }
    };
  }
  const copyLink = async (url, msg) => { try { await navigator.clipboard.writeText(url); toast(msg, 4000); } catch { toast('Could not copy. Try again'); } };
  const im = $('#invmem');
  if (im) im.onclick = async () => {   // the release's member link: anyone who opens it can listen to this release
    try { if (!S.invLink[rel.id]) S.invLink[rel.id] = await S.api.inviteLink(rel.id); S.shown[rel.id] = { ...S.shown[rel.id], member: true }; render(); } catch (err) { toast(err.message); }
  };
  const io = $('#invown');
  if (io) io.onclick = async () => {   // one use; whoever uses it becomes an owner (13-owner-invites.sql)
    try { const tok = await S.api.ownerInvite(rel.id, 'Owner invite'); S.shown[rel.id] = { ...S.shown[rel.id], owner: tok }; render(); }
    catch (err) { toast(/Could not find the function|schema cache/i.test(err.message) ? 'Owner invites need setup step 13 run in Supabase first.' : err.message, 6000); }
  };
  document.querySelectorAll('[data-icopy]').forEach(b => b.onclick = () => { const sh = S.shown[rel.id] || {};
    if (b.dataset.icopy === 'owner') copyLink(joinUrl(sh.owner), 'Owner link copied. It works once. Send it only to Alex.');
    else copyLink(joinUrl(S.invLink[rel.id]), `Member link copied. Whoever opens it can listen to ${rel.name}.`); });
  document.querySelectorAll('[data-ix]').forEach(b => b.onclick = async () => { const sh = { ...S.shown[rel.id] };
    if (b.dataset.ix === 'owner') { try { await S.api.cancelPersonalInvite(sh.owner); toast('Owner link cancelled. It no longer works.'); } catch (err) { return toast(err.message); } delete sh.owner; }
    else delete sh.member;   // the member link is the release's shared link: hiding it here does not switch it off
    S.shown[rel.id] = sh; render(); });
  if ($('#people') && S.pinv[rel.id] === undefined) { S.pinv[rel.id] = []; S.api.personalInvites(rel.id).then(l => { S.pinv[rel.id] = l; render(); }).catch(() => { S.pinv[rel.id] = null; }); }
  document.querySelectorAll('.olink').forEach(b => b.oncontextmenu = e => { e.preventDefault();
    openCtx(e, [{ label: 'Copy owner link', run: () => b.click() }, { label: 'Cancel this link', bad: true, run: () => confirmCtx('Cancel this owner link? It stops working.', async () => {
      try { await S.api.cancelPersonalInvite(b.dataset.pcopy); S.pinv[rel.id] = await S.api.personalInvites(rel.id); render(); toast('Owner link cancelled'); } catch (err) { toast(err.message); } }, 'Cancel link') }]); });
  document.querySelectorAll('#people .pr[data-uid]').forEach(r => r.oncontextmenu = e => { e.preventDefault();
    openCtx(e, [{ label: `Remove ${r.dataset.pname}`, bad: true, run: () => confirmCtx(`Remove <b>${esc(r.dataset.pname)}</b>? They can no longer hear ${esc(rel.name)}.`, async () => {
      try { await S.api.removeGuest(rel.id, r.dataset.uid); S.people = S.people.filter(p => p.user_id !== r.dataset.uid); render(); } catch (err) { toast(err.message); } }, 'Remove') }]); });
  document.querySelectorAll('[data-pkind]').forEach(b => b.onclick = () => { S.pinvOwner = b.dataset.pkind === 'owner'; render(); });
  document.querySelectorAll('[data-pcopy]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(joinUrl(b.dataset.pcopy)); toast('Owner link copied. It works once.'); } catch { toast('Could not copy'); } });
  document.querySelectorAll('[data-pcancel]').forEach(b => b.onclick = async () => {
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Sure?'; return; }
    try { await S.api.cancelPersonalInvite(b.dataset.pcancel); S.pinv[rel.id] = await S.api.personalInvites(rel.id); render(); toast('Invite cancelled. That link no longer works.'); } catch (err) { toast(err.message); }
  });
  if ($('#dlinkcopy') && !S.detLink[rel.id]) S.api.detailsLink(rel.id).then(t => { S.detLink[rel.id] = t; render(); }).catch(err => toast(err.message));
  const dc = $('#dlinkcopy'); if (dc) dc.onclick = async () => { if (!S.detLink[rel.id]) return; try { await navigator.clipboard.writeText(linkUrl(S.detLink[rel.id])); toast('Address form link copied. Send it to the artists.'); } catch { toast('Could not copy. Try again'); } };
  document.querySelectorAll('.cpy[data-col]').forEach(b => b.onclick = async () => {
    const k = +b.dataset.col, vals = ledgerRows(rel).filter(r => r.in).map(r => r.cells[k]);
    if (!vals.length) return toast('Nothing to copy yet');
    try { await navigator.clipboard.writeText(vals.join('\n')); toast(`Copied ${vals.length} ${['artists', 'names', 'emails', 'addresses'][k]}`); } catch { toast('Could not copy'); }
  });
  const dn = $('#dlinknew'); if (dn) dn.onclick = async () => {
    if (dn.dataset.sure !== '1') { dn.dataset.sure = '1'; dn.textContent = 'Old link stops working. Sure?'; return; }
    try { S.detLink[rel.id] = await S.api.detailsLink(rel.id, true); render(); toast('New link made. The old one no longer works.'); } catch (err) { toast(err.message); }
  };
  const artistOf = d => S.tracks.find(t => t.id === d.track_id)?.artist || '';
  const rows = () => [['Artist', 'Name', 'Email', 'Address', 'Country', 'Note', 'Updated'], ...S.details.map(d => [artistOf(d), d.full_name, d.email, d.address.replace(/\n+/g, ', '), d.country, d.note || '', d.updated_at.slice(0, 10)])];
  const cp = $('#copydets'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(rows().map(r => r.join('\t')).join('\n')); toast('Copied, ready to paste into a spreadsheet'); } catch { toast('The browser blocked copying'); } };
  const csv = $('#csvdets');
  if (csv) csv.onclick = () => {
    const body = rows().map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); a.download = `${rel.name} details.csv`; a.click();
  };
  const ed = $('#editdets'); if (ed) ed.onclick = () => { S.editDetails = true; render(); };
  const md = $('#mydets');
  if (md) md.onsubmit = async e => {
    e.preventDefault(); const f = new FormData(md), row = Object.fromEntries(f.entries());
    try { const d = await S.api.saveDetails(rel.id, row); S.details = S.details.filter(x => x.user_id !== S.me.id).concat(d); S.editDetails = false; render(); toast('Saved. Thank you!'); }
    catch (err) { toast(err.message); }
  };
  const ag = $('#addguest');
  if (ag) {
    ag.onsubmit = async e => {
      e.preventDefault(); const email = ag.email.value.trim();
      let r; try { r = await S.api.addGuest(rel.id, email); } catch (err) { return toast(err.message); }
      if (r === 'no-account') return toast('No account for that email yet. Invite them in Supabase first, then add them here.', 6000);
      if (r === 'is-member') return toast('That person is already a member');
      S.people = await S.api.people(rel.id); render(); toast(`${email} can now hear ${rel.name}`);
    };
    document.querySelectorAll('#people .rm').forEach(b => b.onclick = async () => {
      try { await S.api.removeGuest(rel.id, b.dataset.uid); S.people = S.people.filter(p => p.user_id !== b.dataset.uid); render(); } catch (err) { toast(err.message); }
    });
  }
  document.querySelectorAll('.trk').forEach(el => wireTrack(el, member, !!rel));
}

function wireTrack(el, member, inRelease) {
  const id = el.dataset.id, t = S.tracks.find(x => x.id === id);
  el.querySelector('.pb').onclick = () => toggle(id);
  let dwell;   // a pointer resting on a row (not one sweeping past) warms that track
  el.addEventListener('pointerenter', () => { dwell = setTimeout(() => warm(id), 150); });
  el.addEventListener('pointerleave', () => clearTimeout(dwell));
  el.addEventListener('touchstart', () => warm(id), { passive: true });
  el.querySelector('.ex').onclick = () => { S.open.has(id) ? S.open.delete(id) : S.open.add(id); el.classList.toggle('open'); requestAnimationFrame(() => drawTrack(id)); setTimeout(() => drawTrack(id), 300); };
  const dl = el.querySelector('.dl');
  if (dl) dl.onclick = async () => { try { const u = await S.api.downloadUrl(t); const a = document.createElement('a'); a.href = u; a.download = t.original_path.split('/').pop(); document.body.appendChild(a); a.click(); a.remove(); } catch (err) { toast(err.message); } };
  el.querySelectorAll('.pin,.cm').forEach(n => n.onclick = e => {
    if (e.target.closest('.rmn')) return;
    const dur = (S.audios.get(id)?.duration) || t.duration_s || 1;
    seek(id, +n.dataset.at / dur); if (S.cur !== id || S.audios.get(id)?.paused) play(id);
  });
  el.querySelectorAll('.rmn').forEach(b => b.onclick = async () => {
    try { await S.api.deleteNote(b.dataset.note); S.notes = S.notes.filter(n => n.id !== b.dataset.note); render(); } catch (err) { toast(err.message); }
  });
  el.querySelector('.noteform').onsubmit = async e => {
    e.preventDefault(); const body = e.target.body.value.trim(); if (!body) return;
    const a = S.audios.get(id), dur = (a && a.duration) || t.duration_s || 0;
    const at = a && a.currentTime ? a.currentTime : (S.pos.get(id) || 0) * dur;
    try { const n = await S.api.addNote(id, at, body); S.notes.push(n); S.open.add(id); render(); } catch (err) { toast(err.message); }
  };
  el.querySelectorAll('.wv').forEach(w => {
    let drag = false;
    const P = e => (e.clientX - w.getBoundingClientRect().left) / w.clientWidth;
    w.onpointermove = e => {
      const p = Math.max(0, Math.min(1, P(e))), dur = (S.audios.get(id)?.duration) || t.duration_s || 0;
      w.querySelector('.hov').style.left = p * 100 + '%'; const tp = w.querySelector('.tip'); tp.style.left = p * 100 + '%'; tp.textContent = fmt(p * dur);
      if (drag) seek(id, p);
    };
    w.onpointerdown = e => { drag = true; w.setPointerCapture(e.pointerId); seek(id, P(e)); };
    w.onpointerup = w.onpointercancel = () => { drag = false; };
  });
  if (!member) return;
  const g = el.querySelector('.grip');
  g.ondragstart = e => { e.dataTransfer.setData('text/track', id); e.dataTransfer.setDragImage(el, 30, 30); el.classList.add('dragging'); };
  g.ondragend = () => el.classList.remove('dragging');
  if (inRelease) {
    el.ondragover = e => { if (e.dataTransfer.types.includes('text/track')) { e.preventDefault(); el.classList.add('dropbefore'); } };
    el.ondragleave = () => el.classList.remove('dropbefore');
    el.ondrop = e => { e.preventDefault(); el.classList.remove('dropbefore'); const tid = e.dataTransfer.getData('text/track'); if (tid && tid !== id) { const src = S.tracks.find(x => x.id === tid); if (src.release_id === t.release_id) reorderWithin(tid, id); else moveTrack(tid, t.release_id); } };
  }
  el.querySelectorAll('[data-edit]').forEach(s => {
    s.ondblclick = () => { s.contentEditable = 'true'; s.focus(); getSelection().selectAllChildren(s); };
    s.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); s.blur(); } else if (e.key === 'Escape') { s.textContent = t[s.dataset.edit] || ''; s.blur(); } };
    s.onblur = async () => {
      if (s.contentEditable !== 'true') return; s.contentEditable = 'false';
      const k = s.dataset.edit, v = s.textContent.trim();
      if (v && v !== t[k]) { t[k] = v; try { await S.api.updateTrack(id, { [k]: v }); } catch (err) { toast(err.message); } } else s.textContent = t[k] || (k === 'artist' ? 'Unknown artist' : '');
    };
  });
}

// ------------------------------------------------------------------ right-click menu (George 2026-10-14)
// Right-click a demo, a release or a note: rename or delete it there, rather than buttons on every card.
const ctx = document.createElement('div'); ctx.className = 'ctx'; document.body.appendChild(ctx);
function closeCtx() { ctx.classList.remove('on'); ctx.innerHTML = ''; }
function openCtx(e, items) {
  e.preventDefault();
  ctx.innerHTML = items.map((it, i) => `<div class="${it.bad ? 'bad' : ''}" data-i="${i}">${esc(it.label)}</div>`).join('');
  ctx.classList.add('on');
  const r = ctx.getBoundingClientRect();
  ctx.style.left = Math.min(e.clientX, innerWidth - r.width - 8) + 'px';
  ctx.style.top = Math.min(e.clientY, innerHeight - r.height - 8) + 'px';
  ctx.querySelectorAll('[data-i]').forEach(d => d.onclick = ev => { ev.stopPropagation(); items[+d.dataset.i].run(); });
}
function confirmCtx(text, run, go = 'Delete') {   // the second step stays inside the menu, so nothing is deleted on one click
  ctx.innerHTML = `<p>${text}</p><div class="btns"><button class="go">${go}</button><button class="no">Keep</button></div>`;
  ctx.querySelector('.go').onclick = ev => { ev.stopPropagation(); closeCtx(); run(); };
  ctx.querySelector('.no').onclick = ev => { ev.stopPropagation(); closeCtx(); };
}
addEventListener('click', e => { if (!ctx.contains(e.target)) closeCtx(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeCtx(); });
addEventListener('scroll', closeCtx, true);
addEventListener('contextmenu', e => {
  if (!isMember() && !e.target.closest('.cm')) return;
  const cm = e.target.closest('.cm'), trk = e.target.closest('.trk'), row = e.target.closest('.row[data-rel]');
  if (cm) {
    const n = S.notes.find(x => x.id === cm.querySelector('.rmn')?.dataset.note); if (!n) return;
    return openCtx(e, [{ label: 'Delete note', bad: true, run: async () => { closeCtx(); try { await S.api.deleteNote(n.id); S.notes = S.notes.filter(x => x.id !== n.id); render(); } catch (err) { toast(err.message); } } }]);
  }
  if (trk) {
    const t = S.tracks.find(x => x.id === trk.dataset.id); if (!t) return;
    const edit = k => () => { closeCtx(); const sp = trk.querySelector(`[data-edit="${k}"]`); sp.contentEditable = 'true'; sp.focus(); getSelection().selectAllChildren(sp); };
    return openCtx(e, [
      { label: 'Rename', run: edit('title') }, { label: 'Edit artist', run: edit('artist') },
      ...(t.release_id ? [{ label: `Take out of ${relOf(t.release_id)?.name || 'release'}`, run: () => { closeCtx(); moveTrack(t.id, null); } }] : []),
      { label: 'Delete demo', bad: true, run: () => confirmCtx(`Delete <b>${esc(t.title)}</b> for good?${t.link_url ? '' : ' The file goes too.'}`, () => deleteTrack(t)) },
    ]);
  }
  if (row) {
    const r = relOf(row.dataset.rel); if (!r) return;
    return openCtx(e, [
      { label: 'Rename', run: () => { closeCtx(); S.renaming = r.id; render(); } },
      { label: r.status === 'released' ? 'Back to in progress' : 'Mark as released', run: async () => { closeCtx(); r.status = r.status === 'released' ? 'in_progress' : 'released'; if (r.status === 'released') S.showReleased = true; render(); try { await S.api.updateRelease(r.id, { status: r.status }); } catch (err) { toast(err.message); } } },
      { label: 'Delete release', bad: true, run: () => confirmCtx(`Delete <b>${esc(r.name)}</b>? ${countIn(r.id) ? 'Its demos go back to All demos, nothing is lost.' : 'It has no demos.'}`, async () => {
        try { await S.api.deleteRelease(r.id); } catch (err) { return toast(err.message); }
        S.releases = S.releases.filter(x => x.id !== r.id); S.tracks.forEach(x => { if (x.release_id === r.id) x.release_id = null; });
        if (S.view === r.id) S.view = 'all'; render(); toast(`${r.name} deleted`);
      }) },
    ]);
  }
});
async function deleteTrack(t) {
  const a = S.audios.get(t.id); if (a) { a.pause(); S.audios.delete(t.id); } if (S.cur === t.id) { S.cur = null; $('#np').classList.remove('on'); }
  try { await S.api.deleteTrack(t); S.tracks = S.tracks.filter(x => x.id !== t.id); S.notes = S.notes.filter(n => n.track_id !== t.id); render(); toast(`${t.title} deleted`); }
  catch (err) { toast(err.message); }
}

// ------------------------------------------------------------------ upload
const AUDIO_EXT = /\.(wav|wave|aif|aiff|flac|mp3|m4a)$/i;
let dragDepth = 0;
const dragHot = on => { document.body.classList.toggle('dragging-files', on); };
addEventListener('dragenter', e => { if (isMember() && e.dataTransfer.types.includes('Files')) { dragDepth++; dragHot(true); } });
addEventListener('dragleave', e => { if (e.dataTransfer.types.includes('Files') && --dragDepth <= 0) { dragDepth = 0; dragHot(false); } });
addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files') || (isMember() && e.dataTransfer.types.includes('text/uri-list'))) e.preventDefault(); });
addEventListener('paste', e => {   // a link pasted anywhere outside a text field lands in the current view
  if (!isMember() || /INPUT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable) return;
  const v = e.clipboardData?.getData('text') || '';
  if (/soundcloud\.com|youtu\.?be/i.test(v)) { e.preventDefault(); addLinks(v); }
});
addEventListener('drop', e => {
  if (!e.dataTransfer.types.includes('Files')) {
    const v = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (isMember() && /soundcloud\.com|youtu\.?be/i.test(v) && !e.dataTransfer.getData('text/track')) { e.preventDefault(); addLinks(v); }
    return;
  }
  e.preventDefault(); dragDepth = 0; dragHot(false);
  if (isMember()) handleFiles([...e.dataTransfer.files]);
});

// ------------------------------------------------------------------ SoundCloud / YouTube links
// George 2026-10-14: artists sometimes send a link, not a file. The link becomes a row like any
// other; the sound comes from the site's own player (their terms: it stays visible while it plays),
// which sits in a small dock and is driven by our play button, seek and play-through.
function ytId(href) {
  try { const u = new URL(href); if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1).split('/')[0] || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v'); const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/); return m ? m[2] : null; } catch { return null; }
}
function parseLink(s) {
  let u; try { u = new URL(s.trim()); } catch { return null; }
  const h = u.hostname.replace(/^(www|m)\./, '');
  if (h === 'soundcloud.com' || h === 'on.soundcloud.com') return { kind: 'soundcloud', url: u.origin + u.pathname + (u.search.includes('secret') || /\/s-\w+/.test(u.pathname) ? u.search : '') };
  if (/^(music\.)?youtube\.com$|^youtu\.be$/.test(h)) { const id = ytId(u.href); if (id) return { kind: 'youtube', url: `https://www.youtube.com/watch?v=${id}` }; }
  return null;
}
async function linkMeta(L) {
  const ep = L.kind === 'soundcloud' ? 'https://soundcloud.com/oembed?format=json&url=' : 'https://www.youtube.com/oembed?format=json&url=';
  const r = await fetch(ep + encodeURIComponent(L.url)).catch(() => null);
  if (!r || !r.ok) throw new Error(r && r.status < 500 ? 'That link is private or does not exist' : `Could not reach ${L.kind === 'youtube' ? 'YouTube' : 'SoundCloud'}`);
  const j = await r.json(); let title = j.title || '', artist = j.author_name || '';
  if (L.kind === 'soundcloud' && artist && title.endsWith(' by ' + artist)) title = title.slice(0, -(' by ' + artist).length);
  const m = title.split(/\s+[-–]\s+/);   // "Artist - Title" is the common shape on both sites
  if (m.length > 1) { artist = m[0].trim(); title = m.slice(1).join(' - ').trim(); }
  title = title.replace(/\s*[([](official\s+(music\s+)?(video|audio|visuali[sz]er)|lyrics?(\s+video)?|visuali[sz]er|audio|hd|hq|4k(\s+remaster(ed)?)?|remaster(ed)?|free\s+download)[)\]]/gi, '').trim() || title;
  return { title: title.trim(), artist: artist.trim() };
}
async function addLinks(text) {
  const links = [...new Set((text.match(/https?:\/\/\S+/g) || []))].map(parseLink).filter(Boolean);
  if (!links.length) return toast('That is not a SoundCloud or YouTube link');
  const relId = relOf(S.view) ? S.view : null;
  for (const L of links) {
    if (S.tracks.some(t => t.link_url === L.url && t.release_id === relId)) { toast('That link is already here'); continue; }
    const u = { name: L.url.replace(/^https?:\/\/(www\.)?/, ''), p: 0, state: 'reading' }; S.uploads.push(u); render();
    try {
      const m = await linkMeta(L); u.state = 'sending'; u.p = 1; render();
      const t = await S.api.addLink({ title: m.title || 'Untitled', artist: m.artist || '', release_id: relId, position: relId ? countIn(relId) : 0,
        format: L.kind === 'youtube' ? 'YouTube' : 'SoundCloud', link_url: L.url, link_kind: L.kind });
      S.tracks.push(t); u.state = 'done'; render(); saveCache();
      setTimeout(() => { S.uploads = S.uploads.filter(x => x !== u); render(); }, 2500);   // wait-ok: lets the 'Added' row be read before it clears
    } catch (err) { u.state = 'error'; u.err = err.message; render(); }
  }
}
const SDK = {};
const loadScript = src => SDK[src] ||= new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = () => { delete SDK[src]; rej(new Error('Could not reach ' + new URL(src).host)); }; document.head.appendChild(el); });
const ytApi = () => SDK.yt ||= new Promise(res => { if (window.YT?.Player) return res(); const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); }; loadScript('https://www.youtube.com/iframe_api'); });
// Looks enough like an <audio> element (play, pause, currentTime, duration, paused, events) that the
// rest of the player treats a link like any track.
class LinkPlayer extends EventTarget {
  constructor(t) { super(); this.t = t; this.kind = t.link_kind; this.paused = true; this._time = 0; this._dur = t.duration_s || NaN; this.src = 'link'; this._until = Infinity; this.readyState = 0; this.preload = 'none'; this.box = null; this._ready = null; }
  get duration() { const d = this.yt?.getDuration?.(); return d || this._dur; }
  get currentTime() { return this.yt?.getCurrentTime ? this.yt.getCurrentTime() || 0 : this._time; }
  set currentTime(v) { this._time = v; if (this._ready) this._ready.then(() => this.kind === 'youtube' ? this.yt.seekTo(v, true) : this.sc.seekTo(v * 1000)).catch(() => {}); }
  fire(n) { this.dispatchEvent(new Event(n)); }
  ensure() { return this._ready ||= this._mount().catch(e => { this._ready = null; this.box?.remove(); this.box = null; throw e; }); }
  async _mount() {
    const box = this.box = document.createElement('div'); box.className = 'dockp'; box.hidden = true; $('#dock').appendChild(box);
    const late = (what, rej) => setTimeout(() => rej(new Error(`${what} did not answer`)), 20000);
    if (this.kind === 'soundcloud') {
      await loadScript('https://w.soundcloud.com/player/api.js');
      const f = document.createElement('iframe'); f.allow = 'autoplay'; f.title = 'SoundCloud player'; f.className = 'sc';
      f.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(this.t.link_url)}&auto_play=false&visual=false&show_comments=false&hide_related=true&show_reposts=false&show_teaser=false&color=%23f0b15a`;
      box.appendChild(f);
      const w = this.sc = window.SC.Widget(f), E = window.SC.Widget.Events;
      await new Promise((res, rej) => { w.bind(E.READY, res); late('SoundCloud', rej); });
      await new Promise(res => w.getDuration(ms => { if (ms) this._dur = ms / 1000; res(); }));
      w.bind(E.PLAY, () => { this.paused = false; this.fire('playing'); });
      w.bind(E.PAUSE, () => { this.paused = true; this.fire('pause'); });
      w.bind(E.FINISH, () => { this.paused = true; this._time = 0; this.fire('ended'); });
      w.bind(E.PLAY_PROGRESS, e => { this._time = e.currentPosition / 1000; });
      w.bind(E.ERROR, () => this.fire('error'));
    } else {
      await ytApi();
      const d = document.createElement('div'); box.appendChild(d);
      await new Promise((res, rej) => {
        this.yt = new window.YT.Player(d, { width: 320, height: 180, videoId: ytId(this.t.link_url), playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
          events: { onReady: res, onError: () => this.fire('error'), onStateChange: e => {
            if (e.data === 1) { this.paused = false; this.fire('playing'); } else if (e.data === 2) { this.paused = true; this.fire('pause'); }
            else if (e.data === 0) { this.paused = true; this.fire('ended'); } else if (e.data === 3) this.fire('waiting'); } } });
        late('YouTube', rej);
      });
    }
    this.readyState = 1; this.fire('loadedmetadata');
  }
  async play() {
    this.fire('waiting');
    try { await this.ensure(); } catch (e) { this.fire('error'); return; }
    syncIcons();
    if (this._time && this.kind === 'soundcloud') this.sc.seekTo(this._time * 1000);
    this.kind === 'youtube' ? this.yt.playVideo() : this.sc.play();
  }
  pause() { this.paused = true; if (!this._ready) return; this._ready.then(() => this.kind === 'youtube' ? this.yt.pauseVideo() : this.sc.pause()).catch(() => {}); }
  removeAttribute() { this.pause(); try { this.yt?.destroy?.(); } catch {} this.box?.remove(); this.box = null; this._ready = null; this.sc = this.yt = null; this.src = ''; this.readyState = 0; }
}

async function handleFiles(files) {
  const relId = relOf(S.view) ? S.view : null;
  files = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));   // "01 …" to "14 …" keep running order
  for (const f of files) {
    if (!AUDIO_EXT.test(f.name)) { toast(`${f.name} is not an audio file`); continue; }
    const u = { name: f.name, p: 0, state: 'reading' }; S.uploads.push(u); render();
    try {
      const info = await readAudio(f);
      u.state = 'sending'; render();
      const base = f.name.replace(/\.[^.]+$/, '').replace(/^\d{1,3}[\s._-]+/, ''), parts = base.split(/\s+-\s+/);
      const row = { title: (parts.length > 1 ? parts.slice(1).join(' - ') : base).trim(), artist: parts.length > 1 ? parts[0].trim() : '',
        release_id: relId, position: relId ? countIn(relId) : 0, format: info.format, duration_s: info.duration, peaks: info.peaks };
      const bar = () => { const r = document.querySelectorAll('.uprow')[S.uploads.indexOf(u)]; if (r) { r.querySelector('i').style.width = u.p * 100 + '%'; r.querySelector('.st').textContent = Math.round(u.p * 100) + '%'; } };
      const t = await S.api.uploadTrack(f, row, p => { u.p = p; bar(); });
      S.tracks.push(t); u.state = 'done'; render();
      setTimeout(() => { S.uploads = S.uploads.filter(x => x !== u); render(); }, 2500);   // wait-ok: lets the 'Added' row be read before it clears; UI linger, not a sync wait
    } catch (err) { u.state = 'error'; u.err = err.message; render(); }
  }
}

// Duration, a 600-point peak outline and "WAV 24/48" style format, read once in the uploader's browser.
async function readAudio(f) {
  const buf = await f.arrayBuffer();
  const format = formatOf(f.name, new DataView(buf));
  let duration = null, peaks = null;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ab = await ctx.decodeAudioData(buf.slice(0));
    duration = ab.duration;
    const ch = [...Array(ab.numberOfChannels)].map((_, i) => ab.getChannelData(i)), n = ab.length, cols = 600, step = Math.max(1, Math.floor(n / cols));
    peaks = []; for (let c = 0; c < cols; c++) { let m = 0; for (let i = c * step; i < Math.min(n, (c + 1) * step); i += 4) for (const d of ch) { const v = Math.abs(d[i]); if (v > m) m = v; } peaks.push(m); }
    const mx = Math.max(...peaks) || 1; peaks = peaks.map(v => +(v / mx).toFixed(3));
    ctx.close();
  } catch { /* this browser cannot decode the format (AIFF outside Safari): upload anyway, no waveform */ }
  return { duration, peaks, format };
}
function formatOf(name, v) {
  const tag = s => String.fromCharCode(...[0, 1, 2, 3].map(i => v.getUint8(s + i)));
  try {
    if (tag(0) === 'RIFF' && tag(8) === 'WAVE') {
      for (let o = 12; o < Math.min(v.byteLength - 8, 4096);) { const id = tag(o), sz = v.getUint32(o + 4, true);
        if (id === 'fmt ') return `WAV ${v.getUint16(o + 22, true)}/${Math.round(v.getUint32(o + 12, true) / 1000)}`; o += 8 + sz + (sz & 1); }
      return 'WAV';
    }
    if (tag(0) === 'fLaC') { const b = i => v.getUint8(8 + i); const rate = (b(10) << 12) | (b(11) << 4) | (b(12) >> 4), bits = (((b(12) & 1) << 4) | (b(13) >> 4)) + 1; return `FLAC ${bits}/${Math.round(rate / 1000)}`; }
    if (tag(0) === 'FORM' && /AIF/.test(tag(8))) return 'AIFF';
  } catch {}
  return (name.match(/\.([a-z0-9]+)$/i) || ['', ''])[1].toUpperCase();
}

// ------------------------------------------------------------------ toast
function toast(t, ms = 2600) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), ms); }

boot().then(() => {   // demo only: a test hook so every state can be driven and photographed without a mouse
  if (!DEMO) return;
  window.__lr = { S, render, play, seek, moveTrack, toggle, handleFiles };
  if (q.get('drive')) import('./demo-drive.js?v=' + Date.now()).then(m => m.drive(q.get('drive'), window.__lr));
});
