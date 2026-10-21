// Test-only: scripted states for screenshots in demo mode (?demo&drive=<name>). Never loaded otherwise.
const wait = ms => new Promise(r => setTimeout(r, ms));   // wait-ok: lets demo renders settle between scripted steps
export async function drive(name, L) {
  const { S, render } = L;
  await wait(300);
  if (name === 'drawer') { S.open.add('t0'); L.seek('t0', .38); render(); L.seek('t0', .38); }
  if (name === 'menu') { S.menu = 'r-lp'; S.confirmDel = 'r-eh2'; render(); }
  if (name === 'people') { document.querySelector('#ppl').click(); }
  if (name === 'confirmtrack') { S.open.add('t2'); S.confirmTrack = 't2'; render(); }
  if (name === 'uploads') { S.uploads = [{ name: 'Nebula Drift - final master.wav', p: .62, state: 'sending' }, { name: 'Comet Tail.aif', p: 0, state: 'reading' }, { name: 'Huge mix.wav', p: 0, state: 'error', err: 'That file is bigger than the upload limit' }, { name: 'Glass Harbour v2.flac', p: 1, state: 'done' }]; render(); }
  if (name === 'pinv') { document.querySelector('#ppl').click(); await wait(500); for (const who of ['Kessler Drift', 'Sam from the Patreon']) { const f = document.querySelector('#pinvform'); f.label.value = who; f.requestSubmit(); await wait(400); } const c = document.querySelector('[data-pcancel]'); c.click(); c.click(); }
  if (name === 'details') { document.querySelector('#dets').click(); }
  if (name === 'fill') { const f = document.querySelector('#signin'); f.email.value = 'groovingbiz@outlook.com'; f.password.value = 'example-pass'; f.email.focus(); document.querySelector('#msg').textContent = 'Too many sign-in emails have gone out in the last hour. Use your password, or try the link again later.'; }
  if (name === 'hot') { document.querySelectorAll('.dropzone').forEach(z => z.style.transition = 'none'); document.body.classList.add('dragging-files'); }
  if (name === 'ctx') { const t = document.querySelector('.trk'); const r = t.getBoundingClientRect(); t.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 300, clientY: r.top + 30 })); }
  if (name === 'ctxconfirm') { const t = document.querySelector('.trk'); const r = t.getBoundingClientRect(); t.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 300, clientY: r.top + 30 })); [...document.querySelectorAll('.ctx div')].find(d => /Delete/.test(d.textContent)).click(); }
  if (name === 'members') { document.querySelector('#ppl').click(); }
  if (name === 'account') { document.querySelector('#me').click(); }
  if (name === 'ownerinv') { document.querySelector('#ppl').click(); await wait(800); document.querySelector('#invmem').click(); await wait(400); document.querySelector('#invown').click(); }
  if (name === 'addresses') { document.querySelector('#dets').click(); }
  if (name === 'newrel') { document.querySelector('#newrel').click(); }
}
