// Preview UI + deterministic render API (window.setResolution / window.seekTo / window.setCaptions).
import { createFilm, TIMELINE, DURATION } from './film.js';
const $ = (id) => document.getElementById(id), canvas = $('c');
let aspect = '9:16', playing = false, clock0 = 0, base = 0, rendering = false;
const RES = { '9:16': [720, 1280], '16:9': [1280, 720] }, PREV = 0.6;   // preview renders at 60% for phones; setResolution() is always 1:1
const film = createFilm(canvas, { width: 720, height: 1280 }), audio = new Audio(), sfx = new Audio(); audio.preload = sfx.preload = 'auto';
const setDur = (d) => { film.setDuration(d); $('seek').max = d; };
const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
function fit() { const [w, h] = RES[aspect]; film.setResolution(Math.round(w * PREV), Math.round(h * PREV)); const r = $('wrap').getBoundingClientRect(), k = Math.min(r.width / w, r.height / h); canvas.style.width = Math.floor(w * k) + 'px'; canvas.style.height = Math.floor(h * k) + 'px'; film.seek(film.t); }
const cur = () => (audio.src && !audio.paused ? audio.currentTime : playing ? base + (performance.now() - clock0) / 1000 : film.t);
function seekUI(t) { t = Math.max(0, Math.min(DURATION, t)); if (audio.src) audio.currentTime = t; if (sfx.src) sfx.currentTime = t; base = t; clock0 = performance.now(); film.seek(t); $('seek').value = t; $('time').textContent = fmt(t) + ' / ' + fmt(DURATION); $('scn').value = film.scene_i; }
function loop() { if (rendering) return; if (playing) { const t = cur(); if (t >= DURATION) { playing = false; $('play').textContent = 'Play'; } else { film.seek(t); $('seek').value = t; $('time').textContent = fmt(t) + ' / ' + fmt(DURATION); $('scn').value = film.scene_i; } } requestAnimationFrame(loop); }
TIMELINE.forEach((s, i) => { const o = document.createElement('option'); o.value = i; o.textContent = 'Scene ' + s.id + ' · ' + fmt(s.start) + ' · ' + s.name; $('scn').appendChild(o); });
$('scn').onchange = (e) => seekUI(TIMELINE[+e.target.value].start);
$('seek').oninput = (e) => seekUI(+e.target.value);
$('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; base = film.t; clock0 = performance.now(); for (const a of [audio, sfx]) if (a.src) { a.currentTime = film.t; playing ? a.play() : a.pause(); } };
$('asp').onclick = () => { aspect = aspect === '9:16' ? '16:9' : '9:16'; $('asp').textContent = aspect; fit(); };
$('cap').onclick = () => { film.setCaptionsOn(!film.captionsOn); $('cap').textContent = film.captionsOn ? 'CC on' : 'CC off'; film.seek(film.t); };
$('aud').onchange = (e) => { const f = e.target.files[0]; if (!f) return; audio.src = URL.createObjectURL(f); audio.onloadedmetadata = () => { if (isFinite(audio.duration)) setDur(audio.duration); }; audio.currentTime = film.t; if (playing) audio.play(); };
$('sfxf').onchange = (e) => { const f = e.target.files[0]; if (!f) return; sfx.src = URL.createObjectURL(f); sfx.currentTime = film.t; if (playing) sfx.play(); };
function parseSRT(s) { const out = [], tc = (x) => { const m = x.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/); return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000; }; for (const b of s.replace(/\r/g, '').split(/\n\n+/)) { const l = b.split('\n').filter(Boolean), i = l.findIndex((x) => x.includes('-->')); if (i < 0) continue; const [a, c] = l[i].split('-->'); out.push({ start: tc(a), end: tc(c), text: l.slice(i + 1).join(' ') }); } return out; }
$('capf').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const s = await f.text(); film.setCaptions(f.name.endsWith('.json') ? JSON.parse(s) : parseSRT(s)); film.seek(film.t); };
addEventListener('resize', fit);
// ---- deterministic render API ----
window.setResolution = (w, h) => { rendering = true; playing = false; audio.pause(); sfx.pause(); document.body.classList.add('render'); film.setResolution(w, h); canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; return [w, h]; };
window.setDuration = (d) => { setDur(d); return d; };
window.seekTo = (t) => { rendering = true; film.seek(t); return t; };
window.setCaptions = (list) => { film.setCaptions(list); return list ? list.length : 0; };
window.__frame = (q = 0.92) => canvas.toDataURL('image/jpeg', q);
window.__film = film; window.__ready = true;
fit(); seekUI(0); requestAnimationFrame(loop);
// optional auto-load of captions.json next to the page
fetch('captions.json').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && !rendering) { film.setCaptions(j); film.seek(film.t); } }).catch(() => {});
