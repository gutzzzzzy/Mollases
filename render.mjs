#!/usr/bin/env node
// Headless deterministic renderer: serves this folder, drives film.html through window.setResolution()/seekTo(),
// pipes canvas JPEG frames into ffmpeg and muxes voiceover + SFX bed into output.mp4.
// usage: node render.mjs [--aspect 9:16|16:9] [--fps 24|30] [--audio assets/voiceover.mp3] [--out output.mp4] [--seconds N] [--start S] [--captions file.json|srt] [--no-captions] [--no-sfx] [--video-only]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn, spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; }, flag = (k) => process.argv.includes('--' + k);
const aspect = arg('aspect', process.env.ASPECT || '9:16'), fps = +arg('fps', process.env.FPS || 24), out = path.resolve(arg('out', 'output.mp4'));
const audioIn = arg('audio', process.env.AUDIO_PATH || 'assets/voiceover.mp3'), audio = [path.resolve(audioIn), path.resolve(here, '../../', audioIn), path.resolve(here, audioIn)].find((p) => fs.existsSync(p));
const [W, H] = aspect === '16:9' ? [1280, 720] : [720, 1280];
let chromium; for (const m of ['playwright', '/opt/npm-tools/node_modules/playwright']) { try { ({ chromium } = require(m)); break; } catch {} } if (!chromium) { console.error('playwright not found: run npm install in sandbox/pf3d'); process.exit(1); }
const sh = (cmd, a) => spawnSync(cmd, a, { encoding: 'utf8' });

// 1. audio duration (ffprobe) ---------------------------------------------------------------------------------
let dur = 118.5;
if (audio) { const r = sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio]); dur = parseFloat(r.stdout) || dur; console.log(`audio: ${audio} (${dur.toFixed(2)}s)`); } else console.warn(`WARNING: audio not found (${audioIn}) — rendering silent timeline`);
const start = +arg('start', 0), span = Math.min(+arg('seconds', dur - start), dur - start), total = Math.ceil(span * fps);

// 2. SFX bed with narration ducking (python3 + numpy) -----------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'molasses-')); let sfx = null;
if (audio && !flag('no-sfx') && !flag('test') && !flag('video-only')) { const r = sh('python3', [path.join(here, 'sfx.py'), audio, path.join(tmp, 'sfx.wav')]); if (r.status === 0) { sfx = path.join(tmp, 'sfx.wav'); console.log(r.stdout.trim()); } else console.warn('SFX skipped:', (r.stderr || '').split('\n').slice(-3).join(' ')); }

// 3. captions: explicit file > captions.json > faster-whisper transcription (best effort) --------------------------
let captions = null;
const parseSRT = (s) => { const tc = (x) => { const m = x.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/); return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000; }; const o = []; for (const b of s.replace(/\r/g, '').split(/\n\n+/)) { const l = b.split('\n').filter(Boolean), i = l.findIndex((x) => x.includes('-->')); if (i < 0) continue; const [a, c] = l[i].split('-->'); o.push({ start: tc(a), end: tc(c), text: l.slice(i + 1).join(' ') }); } return o; };
if (!flag('no-captions') && !flag('test')) {
  let cf = arg('captions', null) && path.resolve(arg('captions')); if (!cf) for (const c of [path.join(here, 'captions.json'), path.join(here, '../../assets/captions.json'), path.join(here, '../../assets/captions.srt')]) if (fs.existsSync(c)) { cf = c; break; }
  if (!cf && audio) { const o = path.join(tmp, 'captions.json'), r = sh('python3', [path.join(here, 'transcribe.py'), audio, o]); if (r.status === 0) { cf = o; console.log(r.stdout.trim()); } else console.warn('No captions: put captions.json/.srt in assets/ or `pip install faster-whisper` (auto-transcribe).'); }
  if (cf) { const s = fs.readFileSync(cf, 'utf8'); captions = cf.endsWith('.srt') ? parseSRT(s) : JSON.parse(s); console.log(`captions: ${captions.length} cues (${cf})`); }
}

// 4. static server for this folder ------------------------------------------------------------------------------
const server = http.createServer((q, r) => { const f = path.join(here, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'film.html'); if (!f.startsWith(here) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => server.listen(0, '127.0.0.1', ok)); const url = `http://127.0.0.1:${server.address().port}/film.html`;

// 5. browser ---------------------------------------------------------------------------------------------------
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 900 } }); page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(url); await page.waitForFunction('window.__ready === true', null, { timeout: 120000 });
await page.evaluate((d) => window.setDuration(d), dur); await page.evaluate(([w, h]) => window.setResolution(w, h), [W, H]); if (captions) await page.evaluate((c) => window.setCaptions(c), captions);

// 5b. --test: one keyframe per camera shot (28 beats) -> JPEGs + tiled contact sheets (no audio / ffmpeg video) ------------------------
if (flag('test')) {
  const outDir = path.resolve(arg('test-out', 'contact')); fs.mkdirSync(outDir, { recursive: true });
  const keys = await page.evaluate(() => window.__film.keyTimes()); const per = +arg('per', 12), cols = +arg('cols', 6), manifest = [];
  for (let k = 0; k < keys.length; k++) { const b64 = await page.evaluate((t) => { window.seekTo(t); return document.querySelector('canvas').toDataURL('image/jpeg', 0.9).slice(23); }, keys[k].t); const f = path.join(outDir, `kf_${String(k).padStart(2, '0')}.jpg`); fs.writeFileSync(f, Buffer.from(b64, 'base64')); manifest.push({ file: path.basename(f), ...keys[k] }); console.log(`kf ${k} t=${keys[k].t} beat ${keys[k].beat}: ${keys[k].name}`); }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
  for (let s0 = 0, n = 1; s0 < keys.length; s0 += per, n++) { const cnt = Math.min(per, keys.length - s0), rows = Math.ceil(cnt / cols), r = sh('ffmpeg', ['-y', '-v', 'error', '-framerate', '1', '-start_number', String(s0), '-i', path.join(outDir, 'kf_%02d.jpg'), '-frames:v', String(cnt), '-vf', `scale=360:-1,tile=${cols}x${rows}`, '-frames:v', '1', path.join(outDir, `contact_sheet_${n}.jpg`)]); if (r.status) console.warn(r.stderr); }
  await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true }); console.log('contact sheets ->', outDir); process.exit(0);
}

// 6. ffmpeg: JPEG frames on stdin + voiceover (+ SFX) -> output.mp4 ------------------------------------------------
const a = ['-y', '-v', 'error', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-r', String(fps), '-i', '-'];
const useAudio = audio && !flag('video-only'); if (useAudio) a.push('-ss', String(start), '-t', String(span), '-i', audio);
if (sfx) a.push('-ss', String(start), '-t', String(span), '-i', sfx);
if (useAudio && sfx) a.push('-filter_complex', '[1:a]pan=stereo|c0=c0|c1=c0[v];[v][2:a]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]', '-map', '0:v', '-map', '[a]');
else if (useAudio) a.push('-map', '0:v', '-map', '1:a'); else a.push('-map', '0:v');
a.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'fast'); if (useAudio) a.push('-c:a', 'aac', '-b:a', '192k'); a.push('-movflags', '+faststart'); if (useAudio) a.push('-shortest'); a.push(out);
const ff = spawn('ffmpeg', a, { stdio: ['pipe', 'inherit', 'inherit'] }); const ffDone = new Promise((ok, bad) => { ff.on('close', (c) => (c === 0 ? ok() : bad(new Error('ffmpeg exited ' + c)))); ff.on('error', bad); });
ff.stdin.on('error', () => {});
console.log(`rendering ${total} frames @ ${fps}fps, ${W}x${H} (${aspect})`); const t0 = Date.now(); let nextLog = 10;
for (let f = 0; f < total; f++) {
  const b64 = await page.evaluate((t) => { window.seekTo(t); return document.querySelector('canvas').toDataURL('image/jpeg', 0.92).slice(23); }, start + f / fps);
  if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((ok) => ff.stdin.once('drain', ok));
  const pct = Math.floor((f + 1) / total * 100); if (pct >= nextLog) { const el = (Date.now() - t0) / 1000; console.log(`${pct}%  frame ${f + 1}/${total}  elapsed ${el.toFixed(0)}s  eta ${(el / (f + 1) * (total - f - 1)).toFixed(0)}s`); nextLog += 10; }
}
ff.stdin.end(); await ffDone; await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`done: ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
