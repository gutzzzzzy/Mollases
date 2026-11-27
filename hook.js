// Checkpoint-1 props (0:00-0:59): rubber duck, red X, syrup jug + 2,000,000 GAL meter, 50 FT ruler, hero shadow, chimney smoke, band-aid seam. Every prop is a pure function of t.
import { toon, makeInk, INK_K, clamp } from './engine.js';
const T = window.THREE, PI = Math.PI, sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, eOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const cel = (geo, mat, w = 0.04) => { const m = new T.Mesh(geo, mat); m.castShadow = true; if (w) { const h = new T.Mesh(geo, makeInk(w, false, INK_K)); h.userData.hull = 1; m.add(h); } return m; };
const label = (txt, w, h, fg = '#fff6e0', bg = null, font = '900 120px Georgia') => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = h * 0.16; g.strokeStyle = '#2b1a2a'; g.strokeText(txt, w / 2, h / 2); g.fillStyle = fg; g.fillText(txt, w / 2, h / 2); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
const plane = (tx, w, h) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false })); m.renderOrder = 20; return m; };

export function createDuck() {   // classic yellow rubber duck, ~0.9 m long, faces +z
  const g = new T.Group(), y = toon('#ffd23a'), o = toon('#ff8a1f'), k = toon('#1b1b22');
  const body = cel(new T.SphereGeometry(0.42, 18, 14), y, 0.03); body.scale.set(1, 0.8, 1.2); g.add(body);
  const head = cel(new T.SphereGeometry(0.26, 16, 12), y, 0.03); head.position.set(0, 0.5, 0.26); g.add(head);
  const beak = cel(new T.BoxGeometry(0.22, 0.07, 0.2), o, 0.02); beak.position.set(0, 0.46, 0.5); g.add(beak);
  for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.035, 8, 6), k); e.position.set(s * 0.1, 0.56, 0.45); g.add(e); }
  const tail = cel(new T.ConeGeometry(0.14, 0.3, 10), y, 0.02); tail.position.set(0, 0.2, -0.52); tail.rotation.x = -1.1; g.add(tail);
  return g;
}

export function createXMark(camera) {   // bold red X stamped over the lens
  const g = new T.Group(); g.position.z = -1.0; g.renderOrder = 999; camera.add(g); g.visible = false;
  const mk = (w, c, z) => { for (const r of [PI / 4, -PI / 4]) { const m = new T.Mesh(new T.PlaneGeometry(w, 0.2 * w / 1.5), new T.MeshBasicMaterial({ color: c, depthTest: false, depthWrite: false, transparent: true, toneMapped: false })); m.rotation.z = r; m.position.z = z; m.renderOrder = 999; g.add(m); } };
  mk(1.9, '#2b1a2a', 0); mk(1.7, '#e51c1c', 0.001);
  return { set(u) { g.visible = u > 0 && u < 1; if (!g.visible) return; const p = u < 0.25 ? sm(u / 0.25) * 1.2 : u < 0.4 ? 1.2 - 0.2 * sm((u - 0.25) / 0.15) : 1; g.scale.setScalar(p * (u > 0.8 ? 1 - 0.3 * (u - 0.8) / 0.2 : 1)); g.rotation.z = 0.12 * Math.sin(u * 40) * (1 - u); } };
}

export function createJug() {   // giant syrup jug + 2,000,000 GAL meter (studio set)
  const g = new T.Group(), amber = toon('#b5601a'), dark = toon('#5a2a0c'), cap = toon('#d9b24a');
  const jug = new T.Group(); g.add(jug);
  jug.add(cel(new T.CylinderGeometry(1.0, 1.1, 1.7, 28), amber, 0.05)).position.y = 0.85;
  const sh = cel(new T.CylinderGeometry(0.42, 1.0, 0.5, 28), amber, 0.05); sh.position.y = 1.95; jug.add(sh);
  const nk = cel(new T.CylinderGeometry(0.34, 0.4, 0.4, 20), amber, 0.04); nk.position.y = 2.4; jug.add(nk);
  const cp = cel(new T.CylinderGeometry(0.4, 0.4, 0.22, 20), cap, 0.04); cp.position.y = 2.7; jug.add(cp);
  const hd = cel(new T.TorusGeometry(0.5, 0.09, 10, 24, PI), dark, 0.04); hd.position.set(0.95, 1.7, 0); hd.rotation.set(0, 0, -PI / 2 + 0.25); jug.add(hd);
  const lb = new T.Mesh(new T.PlaneGeometry(1.5, 1.0), new T.MeshBasicMaterial({ map: label('SYRUP', 512, 340, '#fff6e0', '#7a2f0a', '900 120px Georgia'), toneMapped: false })); lb.position.set(0, 0.95, 1.07); jug.add(lb);
  // meter: tube + rising fill + big number
  const meter = new T.Group(); meter.position.set(-3.1, 0, 0); g.add(meter);
  meter.add(cel(new T.BoxGeometry(0.9, 0.2, 0.6), dark, 0.04)).position.y = 0.1;
  const tube = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 3.6, 18), new T.MeshToonMaterial({ color: '#dfeef5', transparent: true, opacity: 0.35 })); tube.position.y = 2.0; meter.add(tube);
  const fill = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 1, 16), toon('#4a1e08')); meter.add(fill);
  for (let i = 0; i <= 8; i++) { const t = new T.Mesh(new T.BoxGeometry(i % 2 ? 0.25 : 0.4, 0.04, 0.04), new T.MeshBasicMaterial({ color: '#2b1a2a' })); t.position.set(0.45, 0.3 + i * 0.43, 0); meter.add(t); }
  const num = plane(label('2,000,000 GAL', 1024, 256, '#ffd24a', null, '900 140px Georgia'), 3.6, 0.9); num.position.set(-0.6, 4.4, 0.9); g.add(num);
  return { group: g, update(u) {   // u = seconds since the cutaway began
    const d = clamp((u - 0.1) / 0.28, 0, 1), fall = 1 - d * d, bounce = u > 0.38 ? Math.max(0, Math.sin((u - 0.38) * 14) * 0.45 * Math.exp(-(u - 0.38) * 4)) : 0;
    jug.position.y = 6 * fall + bounce; jug.rotation.z = (1 - d) * 0.5; const sq = u > 0.38 ? 1 - 0.08 * Math.exp(-(u - 0.38) * 5) * Math.cos((u - 0.38) * 18) : 1; jug.scale.set(1 / sq, sq, 1 / sq);
    const k = sm((u - 0.38) / 0.45), fh = Math.max(0.01, 3.4 * k); fill.scale.set(1, fh, 1); fill.position.y = 0.2 + fh / 2;
    const ps = u < 0.38 ? 0 : 1 + 0.35 * Math.exp(-(u - 0.38) * 3.5) * Math.cos((u - 0.38) * 14); num.scale.setScalar(Math.max(0.001, ps)); num.material.opacity = u < 0.38 ? 0 : 1; } };
}

export function createRuler() {   // vertical dotted 50 FT height ruler, rises from the ground beside the tank
  const g = new T.Group(), H = 15.24, dots = [], mat = new T.MeshBasicMaterial({ color: '#fff6e0', toneMapped: false }), ink = new T.MeshBasicMaterial({ color: '#2b1a2a', toneMapped: false });
  for (let i = 0; i <= 30; i++) { const y = i * H / 30, big = i % 5 === 0; const d = new T.Mesh(new T.SphereGeometry(big ? 0.36 : 0.24, 10, 8), mat); d.position.y = y; const o = new T.Mesh(new T.SphereGeometry(big ? 0.46 : 0.32, 10, 8), ink); o.position.y = y; o.position.z = -0.02; g.add(o, d); dots.push([d, o, y]); if (big) { const tk = new T.Mesh(new T.BoxGeometry(1.6, 0.2, 0.08), mat); tk.position.set(0.5, y, 0); g.add(tk); dots.push([tk, null, y]); } }
  const lab = plane(label('50 FT', 512, 256, '#ffd24a', null, '900 150px Georgia'), 4.6, 2.3); g.add(lab);
  return { group: g, H, update(u) { const p = eOut(clamp(u / 1.5, 0, 1)), top = p * H; for (const [a, b, y] of dots) { const on = y <= top + 1e-3; a.visible = on; if (b) b.visible = on; } lab.position.set(2.6, top, 0); lab.visible = p > 0.05; lab.scale.setScalar(0.7 + 0.3 * sm(u / 0.6)); } };
}

export function createShadowDisc() { const m = new T.Mesh(new T.CircleGeometry(1, 40), new T.MeshBasicMaterial({ color: '#0a0a14', transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); m.rotation.x = -PI / 2; m.position.y = 0.04; m.renderOrder = 5; m.visible = false; return m; }

export function createSmoke(list) {   // soft grey/white smoke columns rising from chimney tops: list = [[x, y, z, scale], ...]
  const g = new T.Group(), mats = [], balls = [], cols = ['#ece7de', '#d9d4cc'];
  for (const [x, y, z, s] of list) for (let i = 0; i < 9; i++) { const m = new T.MeshBasicMaterial({ color: cols[i % 2], transparent: true, opacity: 0.8, depthWrite: false }); const b = new T.Mesh(new T.SphereGeometry(1, 12, 9), m); g.add(b); balls.push({ b, x, y, z, s, ph: i / 9 }); }
  return { group: g, update(t) { for (const k of balls) { const u = (t * 0.12 + k.ph) % 1; k.b.position.set(k.x + u * 3.2 + Math.sin(t * 0.7 + k.ph * 9) * 0.3, k.y + u * 9 * k.s, k.z); const r = (0.6 + u * 2.1) * k.s; k.b.scale.set(r, r * 0.9, r); k.b.material.opacity = 0.75 * Math.sin(PI * Math.min(1, u * 1.05)); } } };
}

export function createBandAid() {   // beige band-aid + brown paint stripe slapped over a seam (hangs on the tank wall; pose it from film.js)
  const g = new T.Group(), strip = new T.Mesh(new T.BoxGeometry(1.8, 0.45, 0.06), toon('#e8c79a')); const ink = new T.Mesh(new T.BoxGeometry(1.9, 0.55, 0.05), new T.MeshBasicMaterial({ color: '#2b1a2a' })); ink.position.z = -0.02; g.add(ink, strip);
  const pad = new T.Mesh(new T.BoxGeometry(0.6, 0.45, 0.08), toon('#c9a37a')); pad.position.z = 0.03; g.add(pad);
  const paint = new T.Mesh(new T.BoxGeometry(2.4, 0.5, 0.05), toon('#6a3a1a')); paint.position.set(0, -0.7, 0); g.add(paint);
  return g;
}
