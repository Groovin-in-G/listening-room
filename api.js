// The data layer. Two backends with one shape:
//   supabaseApi() — the real one: auth, tables, private storage (signed URLs only).
//   demoApi(kind) — in memory, generated audio; drives every screen without a login (?demo, ?demo=guest).
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET, PUBLIC_URL } from './config.js?v=1792594060';

const ext = n => (n.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
const safe = n => n.replace(/[^\w.\- ]+/g, '_').slice(0, 120);
// Browsers often give an empty or odd type for .flac/.aif; the bucket only accepts the listed types.
const MIME = { '.wav': 'audio/wav', '.wave': 'audio/wav', '.aif': 'audio/aiff', '.aiff': 'audio/aiff', '.flac': 'audio/flac',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

export async function supabaseApi() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, detectSessionInUrl: true } });
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  const urlCache = new Map();   // path -> {url, until}

  async function signed(path, secs = 3600) {
    const c = urlCache.get(path);
    if (c && c.until > Date.now() + 60e3) return c.url;
    const d = ok(await sb.storage.from(BUCKET).createSignedUrl(path, secs));
    urlCache.set(path, { url: d.signedUrl, until: Date.now() + secs * 1000 });
    return d.signedUrl;
  }

  // Upload through XHR so the page can show real progress (supabase-js upload has none).
  async function put(path, file, onProgress) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Signed out');
    await new Promise((res, rej) => {
      const x = new XMLHttpRequest();
      x.open('POST', `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`);
      x.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      x.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      x.setRequestHeader('Content-Type', MIME[ext(file.name)] || file.type || 'application/octet-stream');
      x.setRequestHeader('x-upsert', 'false');
      x.setRequestHeader('cache-control', 'max-age=31536000');   // a stored file never changes; let browsers keep it
      x.upload.onprogress = e => e.lengthComputable && onProgress && onProgress(e.loaded / e.total);
      x.onload = () => x.status < 300 ? res() : rej(new Error(uploadError(x)));
      x.onerror = () => rej(new Error('The connection dropped during the upload'));
      x.send(file);
    });
  }
  function uploadError(x) {
    try { const j = JSON.parse(x.responseText); if (/maximum allowed size|too large/i.test(j.message || '')) return 'That file is bigger than the upload limit'; return j.message || `Upload refused (${x.status})`; }
    catch { return `Upload refused (${x.status})`; }
  }

  return {
    demo: false,
    async session() { return (await sb.auth.getSession()).data.session; },
    onAuth(cb) { sb.auth.onAuthStateChange((_e, s) => cb(s)); },
    async signIn(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); },
    async sendLink(email) { ok(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: PUBLIC_URL } })); },
    async setPassword(password) { ok(await sb.auth.updateUser({ password })); },
    async setEmail(email) { ok(await sb.auth.updateUser({ email })); },   // Supabase emails a confirm link to the new address
    async signOut() { await sb.auth.signOut(); },
    async whoAmI() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      const m = ok(await sb.from('lr_members').select('name, role').eq('user_id', user.id).maybeSingle());
      if (m) return { id: user.id, name: m.name, kind: 'member', role: m.role, email: user.email };   // role 'owner' = George: makes owner links
      const g = ok(await sb.from('lr_release_guests').select('release_id').eq('user_id', user.id));
      return { id: user.id, name: user.user_metadata?.name || user.email.split('@')[0], kind: g.length ? 'guest' : 'none', email: user.email };
    },
    async load() {
      const [releases, tracks, notes, names] = await Promise.all([
        sb.from('lr_releases').select('*').order('position').then(ok),
        sb.from('lr_tracks').select('*').order('position').then(ok),
        sb.from('lr_notes').select('*').order('at_s').then(ok),
        sb.rpc('lr_names').then(ok),
      ]);
      return { releases, tracks, notes, names: Object.fromEntries(names.map(n => [n.user_id, n.name])) };
    },
    async createRelease(name, position) { return ok(await sb.from('lr_releases').insert({ name, position }).select().single()); },
    async updateRelease(id, patch) { ok(await sb.from('lr_releases').update(patch).eq('id', id)); },
    async deleteRelease(id) { ok(await sb.from('lr_releases').delete().eq('id', id)); },
    async setReleaseArt(id, file) {
      const path = `art/${id}/${Date.now()}${ext(file.name) || '.jpg'}`;
      await put(path, file);
      ok(await sb.from('lr_releases').update({ art_path: path }).eq('id', id));
      return path;
    },
    async uploadTrack(file, row, onProgress) {
      const id = crypto.randomUUID();
      const path = `tracks/${id}/${safe(file.name)}`;
      await put(path, file, onProgress);
      try { return ok(await sb.from('lr_tracks').insert({ ...row, id, original_path: path }).select().single()); }
      catch (e) { await sb.storage.from(BUCKET).remove([path]); throw e; }   // no orphan file without a row
    },
    async updateTrack(id, patch) { ok(await sb.from('lr_tracks').update(patch).eq('id', id)); },
    // A SoundCloud or YouTube link stands in for a file (setup/09-link-tracks.sql).
    async addLink(row) { return ok(await sb.from('lr_tracks').insert(row).select().single()); },
    async deleteTrack(t) {
      ok(await sb.from('lr_tracks').delete().eq('id', t.id));
      if (t.original_path) await sb.storage.from(BUCKET).remove([t.original_path]);   // a link track has no file
    },
    streamUrl: t => signed(t.original_path),
    // One request signs every track in view, so pressing play does not wait on its own address.
    async signAll(ts) {
      const paths = ts.map(t => t.original_path).filter(p => { if (!p) return false; const c = urlCache.get(p); return !(c && c.until > Date.now() + 600e3); });
      if (!paths.length) return;
      const d = ok(await sb.storage.from(BUCKET).createSignedUrls(paths, 3600));
      d.forEach(x => x.signedUrl && urlCache.set(x.path, { url: x.signedUrl, until: Date.now() + 3600e3 }));
    },
    artUrl: path => signed(path),
    async downloadUrl(t) {
      const name = t.original_path.split('/').pop();
      return ok(await sb.storage.from(BUCKET).createSignedUrl(t.original_path, 120, { download: name })).signedUrl;
    },
    async addNote(track_id, at_s, body) {
      const { data: { user } } = await sb.auth.getUser();
      return ok(await sb.from('lr_notes').insert({ track_id, at_s, body, author: user.id }).select().single());
    },
    async deleteNote(id) { ok(await sb.from('lr_notes').delete().eq('id', id)); },
    async people(rel) { return ok(await sb.rpc('lr_people', { rel })); },
    async addGuest(rel, email) { return ok(await sb.rpc('lr_add_guest', { rel, guest_email: email })); },
    // Join links (setup/11-invite-link.sql): a person joins one release as a guest, no email involved.
    async inviteLink(rel, renew = false) { return ok(await sb.rpc('lr_invite_link', { rel, renew })); },
    async inviteInfo(tok) { return ok(await sb.rpc('lr_invite_info', { tok })); },
    async join(tok, r) { return ok(await sb.rpc('lr_join', { tok, full_name: r.full_name, email: r.email, password: r.password })); },
    async joinMe(tok) { return ok(await sb.rpc('lr_join_me', { tok })); },
    // Personal one-use invites and usernames (setup/12-personal-invites.sql).
    async personalInvite(rel, label) { return ok(await sb.rpc('lr_personal_invite', { rel, invite_label: label })); },
    async ownerInvite(rel, label) { return ok(await sb.rpc('lr_owner_invite', { rel, invite_label: label })); },   // 13-owner-invites.sql
    async personalInvites(rel) { return ok(await sb.rpc('lr_personal_invites', { rel })); },
    async cancelPersonalInvite(tok) { return ok(await sb.rpc('lr_personal_invite_cancel', { tok })); },
    async joinUser(tok, r) { return ok(await sb.rpc('lr_join_user', { tok, username: r.username, email: r.email, password: r.password })); },
    async removeGuest(rel, uid) { ok(await sb.from('lr_release_guests').delete().eq('release_id', rel).eq('user_id', uid)); },
    // Postal details: members get every row for the release, a guest gets only their own (RLS decides).
    async details(rel) { return ok(await sb.from('lr_details').select('*').eq('release_id', rel)); },
    // Which tracks have details in, across every release (members only see all; RLS decides).
    async detailsIndex() { return ok(await sb.from('lr_details').select('release_id,track_id').not('track_id', 'is', null)); },
    async saveDetails(rel, row) {
      const { data: { user } } = await sb.auth.getUser();
      return ok(await sb.from('lr_details').upsert({ ...row, release_id: rel, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'release_id,user_id' }).select().single());
    },
    // The details link: artists fill in the form with no account (setup/06-details-link.sql).
    // The short code (step 14) when the database has it, else the long token, so the room works either side of step 14.
    async detailsLink(rel, renew = false) {
      const tok = ok(await sb.rpc('lr_details_link', { rel, renew }));
      const c = await sb.rpc('lr_details_code', { rel }); return c.error || !c.data ? tok : c.data;
    },
    async resolveDetails(code) { const r = await sb.rpc('lr_details_resolve', { code }); return r.error ? null : r.data; },
    async detailsForm(tok) { return ok(await sb.rpc('lr_details_form', { tok })); },
    async submitDetails(tok, r) { return ok(await sb.rpc('lr_submit_details', { tok, full_name: r.full_name, email: r.email, address: r.address, country: r.country || '', note: r.note || '', track: r.track || null })); },
  };
}

// ---------------------------------------------------------------- demo backend (no network)
export function demoApi(kind = 'member') {
  const SR = 22050, DUR = 36;
  function synth(f, seed) {
    const n = SR * DUR, b = new Float32Array(n); let r = seed;
    for (let i = 0; i < n; i++) {
      const t = i / SR, env = Math.min(1, t / 2) * Math.min(1, (DUR - t) / 3), bar = t % 2 < 1 ? 1 : .75;
      let s = 0; f.forEach((fr, k) => { s += Math.sin(2 * Math.PI * fr * t) * (k ? .25 : .5); });
      const kick = Math.exp(-(t % .5) * 14) * Math.sin(2 * Math.PI * 55 * (t % .5));
      r = (r * 1103515245 + 12345) % 2147483648; const hat = t % .25 < .02 ? (r / 2147483648 - .5) * .3 : 0;
      b[i] = (s * .5 * bar * (t > DUR * .38 ? 1 : .6) + kick * .6 * (t > DUR * .2 ? 1 : 0) + hat) * env * .6;
    }
    return b;
  }
  function wav(b) {
    const n = b.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, b[i])) * 32767, true);
    return new Blob([buf], { type: 'audio/wav' });
  }
  const pk = b => { const out = []; const st = Math.floor(b.length / 600); for (let c = 0; c < 600; c++) { let m = 0; for (let i = c * st; i < (c + 1) * st; i += 8) m = Math.max(m, Math.abs(b[i])); out.push(m); } const mx = Math.max(...out); return out.map(x => +(x / mx).toFixed(3)); };
  const G = 'u-george', A = 'u-alex', S = 'u-sam', K = 'u-kit';
  const day = d => new Date(Date.now() - d * 864e5).toISOString();
  const releases = [
    { id: 'r-ep', name: 'Untitled EP', position: 0, status: 'in_progress', art_path: 'demo-art', collect_details: true },
    { id: 'r-lp', name: 'Long player', position: 1, status: 'in_progress' },
    { id: 'r-eh2', name: 'Event Horizons II', position: 2, status: 'in_progress' },
    { id: 'r-eh1', name: 'Event Horizons', position: 3, status: 'released', collect_details: true },
  ];
  const spec = [
    ['Perihelion', 'Two Moons Over Leeds', G, 'r-ep', 0, [110, 165, 220], 12],
    ['Daybreak Protocol', 'Kessler Drift', A, 'r-ep', 1, [98, 147, 196], 16],
    ['Aphelion', 'Two Moons Over Leeds', G, 'r-ep', 2, [123, 185, 247], 16],
    ['Low Orbit', 'saluu', A, 'r-lp', 0, [87, 130, 174], 20],
    ['Signal Loss', 'tdel', G, null, 0, [104, 156, 208], 1],
    ['Glass Harbour', 'forever', A, null, 1, [92, 138, 184], 0.3],
  ];
  const blobs = {};
  const tracks = spec.map(([title, artist, up, rel, pos, f, age], i) => {
    const b = synth(f, i + 3); const id = 't' + i; blobs[id] = URL.createObjectURL(wav(b));
    return { id, title, artist, uploader: up, release_id: rel, position: pos, format: 'WAV 24/48', duration_s: DUR, peaks: pk(b), original_path: 'demo', created_at: day(age) };
  });
  const notes = [
    { id: 'n1', track_id: 't0', at_s: DUR * .38, author: G, body: 'this drop is the moment. Opener.', created_at: day(2) },
    { id: 'n2', track_id: 't0', at_s: DUR * .71, author: A, body: 'the breakdown drags here. Ask for an edit?', created_at: day(1) },
    { id: 'n3', track_id: 't1', at_s: DUR * .2, author: S, body: 'love the intro on this', created_at: day(1) },
  ];
  const names = { [G]: 'George', [A]: 'Alex', [S]: 'Sam', [K]: 'Kit' };
  const guests = { 'r-ep': [S, K], 'r-eh1': [S, K] };
  const links = {};
  const personal = [{ token: 'demo-used', rel: 'r-ep', label: 'Alex, Human Synthetics', created_at: '2026-10-18T10:00:00Z', used_at: '2026-10-18T12:00:00Z', used_name: 'Human Synthetics', cancelled: false }];
  const details = [{ release_id: 'r-ep', track_id: 't0', user_id: K, full_name: 'Kit Marlowe', email: 'kit@example.com', address: '14 Orbital Way\nLeeds\nLS1 4AB', country: 'United Kingdom', note: '', updated_at: day(0.2) }];
  const me = kind === 'guest' ? { id: S, name: 'Sam', kind: 'guest', email: 'sam@example.com' } : { id: G, name: 'George', kind: 'member', role: 'owner', email: 'george@example.com' };
  let signedIn = !/signin/.test(location.search);
  const vis = () => me.kind === 'member' ? { releases, tracks, notes }
    : (() => { const rs = releases.filter(r => (guests[r.id] || []).includes(me.id)); const ids = new Set(rs.map(r => r.id)); const ts = tracks.filter(t => ids.has(t.release_id)); const tids = new Set(ts.map(t => t.id)); return { releases: rs, tracks: ts, notes: notes.filter(n => tids.has(n.track_id)) }; })();
  const wait = (v, ms = 80) => new Promise(r => setTimeout(() => r(v), ms));
  return {
    demo: true,
    async session() { return signedIn ? { user: { id: me.id } } : null; },
    onAuth() {},
    async signIn() { signedIn = true; }, async sendLink() {}, async setPassword() {}, async setEmail() {}, async signOut() { signedIn = false; },
    async whoAmI() { return signedIn ? me : null; },
    async load() { const v = vis(); return wait({ releases: v.releases.map(r => ({ ...r })), tracks: v.tracks.map(t => ({ ...t })), notes: v.notes.map(n => ({ ...n })), names }); },
    async createRelease(name, position) { const r = { id: 'r' + Date.now(), name, position, status: 'in_progress' }; releases.push(r); return wait({ ...r }); },
    async updateRelease(id, patch) { Object.assign(releases.find(r => r.id === id), patch); return wait(); },
    async deleteRelease(id) { releases.splice(releases.findIndex(r => r.id === id), 1); tracks.forEach(t => { if (t.release_id === id) t.release_id = null; }); return wait(); },
    async setReleaseArt(id, file) { const u = URL.createObjectURL(file); blobs['art:' + id] = u; Object.assign(releases.find(r => r.id === id), { art_path: 'art:' + id }); return 'art:' + id; },
    async uploadTrack(file, row, onProgress) {
      for (let p = 0; p <= 1; p += .1) { onProgress && onProgress(p); await wait(0, 60); }
      const id = 't' + Date.now(); blobs[id] = URL.createObjectURL(file);
      const t = { ...row, id, uploader: me.id, original_path: file.name, created_at: new Date().toISOString() }; tracks.push(t); return { ...t };
    },
    async updateTrack(id, patch) { Object.assign(tracks.find(t => t.id === id), patch); return wait(); },
    async addLink(row) { const t = { ...row, id: 't' + Date.now(), uploader: me.id, created_at: new Date().toISOString() }; tracks.push(t); return wait({ ...t }); },
    async deleteTrack(t) { tracks.splice(tracks.findIndex(x => x.id === t.id), 1); return wait(); },
    async streamUrl(t) { return blobs[t.id]; },
    async signAll() {},
    async artUrl(path) { return blobs[path] || (path === 'demo-art' ? './demo-art.jpg' : ''); },
    async downloadUrl(t) { return blobs[t.id]; },
    async addNote(track_id, at_s, body) { const n = { id: 'n' + Date.now(), track_id, at_s, body, author: me.id, created_at: new Date().toISOString() }; notes.push(n); return wait({ ...n }); },
    async deleteNote(id) { notes.splice(notes.findIndex(n => n.id === id), 1); return wait(); },
    async people(rel) { return wait([{ user_id: G, name: 'George', email: 'george@example.com', kind: 'member' }, { user_id: A, name: 'Alex', email: 'alex@example.com', kind: 'member' }, ...(guests[rel] || []).map(u => ({ user_id: u, name: names[u], email: names[u].toLowerCase() + '@example.com', kind: 'guest' }))]); },
    async inviteLink(rel, renew) { return wait(renew || !links['i' + rel] ? (links['i' + rel] = 'demo' + Math.random().toString(16).slice(2).padEnd(32, '0')) : links['i' + rel]); },
    async inviteInfo(tok) { const p = personal.find(x => x.token === tok && !x.used_at && !x.cancelled); return wait(/^demo/.test(tok) && !/^demo-used/.test(tok) ? { name: 'Untitled EP', art: 'demo-art', wip: 0, for: p?.label || (/^demo-for/.test(tok) ? 'Alex, Human Synthetics' : null), owner: !!p?.owner } : null); },
    async join() { return wait('created'); },
    async joinMe() { return wait('added'); },
    async personalInvite(rel, label) { const token = 'demo' + Math.random().toString(16).slice(2).padEnd(32, '0'); personal.unshift({ token, rel, label, created_at: new Date().toISOString(), used_at: null, used_name: null, cancelled: false }); return wait(token); },
    async ownerInvite(rel, label) { const token = 'demo' + Math.random().toString(16).slice(2).padEnd(32, '0'); personal.unshift({ token, rel, label, created_at: new Date().toISOString(), used_at: null, used_name: null, cancelled: false, owner: true }); return wait(token); },
    async personalInvites(rel) { return wait(personal.filter(p => p.rel === rel).map(p => ({ ...p }))); },
    async cancelPersonalInvite(tok) { const p = personal.find(x => x.token === tok); if (p && !p.used_at) p.cancelled = true; return wait(); },
    async joinUser(tok, r) { if (/^.{0,2}$/.test(r.username)) throw new Error('A username is 3 to 30 letters, numbers, spaces, dots, dashes or underscores'); return wait('created'); },
    async addGuest(rel, email) { if (!/@/.test(email)) return 'no-account'; const u = 'u-' + email; names[u] = email.split('@')[0]; (guests[rel] = guests[rel] || []).push(u); return wait('added'); },
    async removeGuest(rel, uid) { guests[rel] = (guests[rel] || []).filter(x => x !== uid); return wait(); },
    async details(rel) { return wait(details.filter(d => d.release_id === rel && (me.kind === 'member' || d.user_id === me.id)).map(d => ({ ...d }))); },
    async detailsLink(rel, renew) { return wait(renew || !links[rel] ? (links[rel] = Array.from({ length: 8 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.random() * 31 | 0]).join('')) : links[rel]); },
    async resolveDetails(code) { return wait('demo'); },
    async detailsForm(tok) { return wait(Object.values(links).includes(tok) || tok === 'demo' ? { name: 'Event Horizons', art: 'demo-art', tracks: tracks.filter(t => t.release_id === 'r-ep').map(t => ({ id: t.id, artist: t.artist, title: t.title })) } : null); },
    async submitDetails(tok, r) { details.push({ ...r, track_id: r.track || null, id: 'd' + Date.now(), release_id: 'r-eh1', user_id: null, via_link: true, updated_at: new Date().toISOString() }); return wait(true); },
    async detailsIndex() { return wait(details.filter(d => d.track_id).map(d => ({ release_id: d.release_id, track_id: d.track_id }))); },
    async saveDetails(rel, row) { const i = details.findIndex(d => d.release_id === rel && d.user_id === me.id); const d = { ...row, release_id: rel, user_id: me.id, updated_at: new Date().toISOString() }; if (i >= 0) details[i] = d; else details.push(d); return wait({ ...d }); },
  };
}
