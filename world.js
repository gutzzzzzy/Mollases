// Great Molasses Flood — 1919 Boston world: street stage, tank, wave, pancakes.
// Same look as the Pear Folk rig: MeshToonMaterial 2-tone ramp + #2b1a2a inverted-hull ink. Everything is a pure function of its setter inputs (no clocks, no Math.random).
import { toon, makeInk, smoothHull, mulberry, clamp } from './engine.js';
const T = window.THREE;
const GRAV = 9.8, PI = Math.PI, sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 2.2);
export const STREET = { halfW: 6, walk: 9.5, tankZ: -70, tankR: 13.7, tankH: 15, tankFront: -56.3 };

/* ---------- helpers ---------- */
const PK = { value: 1 }, matCache = new Map();
const tm = (c, map, side) => { const k = c + '|' + (map ? map.uuid : '') + '|' + (side || 0); let m = matCache.get(k); if (!m) { m = toon(c, map, side); matCache.set(k, m); } return m; };
// prop mesh with ink hull. o: s scale, r rotation, w ink width, ink:false
function P(geo, mat, x = 0, y = 0, z = 0, o = {}) {
  if (o.ink !== false && !geo.attributes.hn && geo.type !== 'SphereGeometry') smoothHull(geo);
  const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (o.s) m.scale.set(...o.s); if (o.r) m.rotation.set(...o.r); m.castShadow = o.ink !== false; m.receiveShadow = true;
  if (o.ink !== false) { const h = new T.Mesh(geo, makeInk(o.w ?? 0.05, !!geo.attributes.hn, PK)); h.userData.hull = 1; m.add(h); }
  return m;
}
const box = (w, h, d) => new T.BoxGeometry(w, h, d), cyl = (a, b, h, n = 24, open = false) => new T.CylinderGeometry(a, b, h, n, 1, open), ball = (r, n = 18) => new T.SphereGeometry(r, n, Math.max(8, n >> 1));
function boxUV(w, h, d, cx = 3, cy = 3.2) {   // box whose UVs are in world metres, so facade cells tile seamlessly
  const g = box(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / cx, uv.getY(k) * dims[f][1] / cy); }
  return g;
}
const rep = (tex, x, y) => { tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(x, y); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4; return tex; };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const INKC = '#2b1a2a';

/* ---------- painted textures (cached, shared) ---------- */
let TEX = null;
function textures() {
  if (TEX) return TEX; const rnd = mulberry(1919); TEX = {};
  { const [c, g] = canvas(128, 128);   // brick wall + 2D painted sash window, tint-able (light base colour)
    g.fillStyle = '#ecddc4'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#cdbb9b'; g.lineWidth = 1.5;
    for (let y = 0; y < 128; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); const o = (y / 8) % 2 ? 8 : 0; for (let x = o; x < 128; x += 16) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 8); g.stroke(); } }
    g.fillStyle = '#cbbb9f'; g.fillRect(28, 20, 72, 9); g.fillRect(28, 102, 72, 8);   // lintel + sill
    g.fillStyle = '#34495e'; g.fillRect(38, 32, 52, 68); g.strokeStyle = INKC; g.lineWidth = 4; g.strokeRect(38, 32, 52, 68);
    g.strokeStyle = '#ecddc4'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 32); g.lineTo(64, 100); g.moveTo(38, 54); g.lineTo(90, 54); g.moveTo(38, 77); g.lineTo(90, 77); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(42, 36, 8, 14);   // glass glint
    g.strokeStyle = INKC; g.lineWidth = 3; g.strokeRect(28, 20, 72, 9); g.strokeRect(28, 102, 72, 8);
    TEX.wall = rep(new T.CanvasTexture(c), 1, 1); }
  { const [c, g] = canvas(128, 128);   // plain brick (firehouse facade; windows are real geometry)
    g.fillStyle = '#ecddc4'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#cdbb9b'; g.lineWidth = 1.5;
    for (let y = 0; y < 128; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); const o = (y / 8) % 2 ? 8 : 0; for (let x = o; x < 128; x += 16) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 8); g.stroke(); } }
    TEX.brick = rep(new T.CanvasTexture(c), 1, 1); }
  { const [c, g] = canvas(256, 256);   // cobblestones
    g.fillStyle = '#5b554d'; g.fillRect(0, 0, 256, 256); const cols = ['#9a9184', '#857d72', '#a39b8c', '#8d8579', '#a8a091'];
    for (let r = 0; r < 8; r++) { let x = -((r % 2) * 16) - rnd() * 8; while (x < 256) { const w = 26 + rnd() * 16; g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.beginPath(); g.roundRect(x + 2, r * 32 + 2, w - 3, 28, 8); g.fill(); x += w; } }
    TEX.cobble = rep(new T.CanvasTexture(c), 3, 60); }
  { const [c, g] = canvas(128, 128);   // sidewalk slabs
    g.fillStyle = '#c9c1b2'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#8f877a'; g.lineWidth = 3; g.strokeRect(1, 1, 126, 126); g.beginPath(); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke();
    TEX.slab = rep(new T.CanvasTexture(c), 1, 30); }
  { const [c, g] = canvas(128, 128);   // plank deck / railway sleepers
    g.fillStyle = '#7a5a3c'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#5a412b'; for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 128, 4); g.strokeStyle = '#4a3320'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { const y = rnd() * 128; g.beginPath(); g.moveTo(0, y); g.lineTo(128, y + rnd() * 6 - 3); g.stroke(); }
    TEX.plank = rep(new T.CanvasTexture(c), 1, 1); }
  { const [c, g] = canvas(256, 192);   // firehouse doors, ENGINE 31
    g.fillStyle = '#f2e6c8'; g.fillRect(0, 0, 256, 192); g.fillStyle = '#9b2f22'; g.beginPath(); g.moveTo(14, 192); g.lineTo(14, 66); g.arc(128, 66, 114, PI, 0); g.lineTo(242, 192); g.closePath(); g.fill(); g.strokeStyle = INKC; g.lineWidth = 7; g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 192); g.stroke(); g.fillStyle = '#d9b650'; for (const x of [40, 80, 150, 190]) g.fillRect(x, 80, 26, 70);
    g.fillStyle = INKC; for (const x of [40, 80, 150, 190]) { g.strokeRect(x, 80, 26, 70); } g.fillStyle = '#f2e6c8'; g.font = 'bold 22px Georgia'; g.textAlign = 'center'; g.fillText('ENGINE 31', 128, 38);
    TEX.fire = new T.CanvasTexture(c); TEX.fire.colorSpace = T.SRGBColorSpace; }
  { const [c, g] = canvas(256, 256);   // firehouse clock, 12:40
    g.fillStyle = INKC; g.beginPath(); g.arc(128, 128, 126, 0, PI * 2); g.fill(); g.fillStyle = '#f4ead0'; g.beginPath(); g.arc(128, 128, 112, 0, PI * 2); g.fill();
    g.strokeStyle = INKC; g.lineWidth = 6; for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; g.beginPath(); g.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); g.lineTo(128 + Math.sin(a) * 106, 128 - Math.cos(a) * 106); g.stroke(); }
    const hand = (deg, len, w) => { const a = deg / 180 * PI; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); g.stroke(); };
    hand(20, 56, 11); hand(240, 86, 7); g.fillStyle = INKC; g.beginPath(); g.arc(128, 128, 10, 0, PI * 2); g.fill();
    TEX.clock = new T.CanvasTexture(c); TEX.clock.colorSpace = T.SRGBColorSpace; }
  { const [c, g] = canvas(256, 256); g.fillStyle = INKC; g.beginPath(); g.arc(128, 128, 126, 0, PI * 2); g.fill(); g.fillStyle = '#f4ead0'; g.beginPath(); g.arc(128, 128, 112, 0, PI * 2); g.fill(); g.strokeStyle = INKC; g.lineWidth = 6; for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; g.beginPath(); g.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); g.lineTo(128 + Math.sin(a) * 106, 128 - Math.cos(a) * 106); g.stroke(); }
    TEX.clockFace = new T.CanvasTexture(c); TEX.clockFace.colorSpace = T.SRGBColorSpace; }
  { const [c, g] = canvas(256, 192);   // warehouse rolling door
    g.fillStyle = '#4b3f36'; g.fillRect(0, 0, 256, 192); g.strokeStyle = '#2b1a2a'; g.lineWidth = 3; for (let y = 0; y < 192; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    TEX.roll = new T.CanvasTexture(c); TEX.roll.colorSpace = T.SRGBColorSpace; }
  { const [c, g] = canvas(256, 128);   // train windows
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#3b5163'; for (let i = 0; i < 4; i++) { g.fillRect(i * 64 + 10, 28, 44, 52); g.strokeStyle = INKC; g.lineWidth = 4; g.strokeRect(i * 64 + 10, 28, 44, 52); g.fillStyle = '#3b5163'; }
    TEX.train = rep(new T.CanvasTexture(c), 3, 1); }
  const skyTex = (top, mid, hor) => { const [c, g] = canvas(1024, 1024), gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, hor); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512); g.fillStyle = hor; g.fillRect(0, 512, 1024, 512); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; return t; };
  TEX.skySun = skyTex('#3f7fc6', '#8cb9e2', '#f7e4c4'); TEX.skyGloom = skyTex('#2e3a50', '#4f5f78', '#8b8e96'); TEX.skySpring = skyTex('#2f86e0', '#86c4f4', '#fdf0cc');
  const cloudTex = (lit, shade, n, big) => { const [c, g] = canvas(1024, 256), r2 = mulberry(n * 7 + 3);   // soft storybook clouds: overlapping round puffs, shaded underside, no flat slabs
    for (let k = 0; k < n; k++) { const cx = r2() * 1024, cy = 70 + r2() * 120, r = (16 + r2() * 16) * big, m = 5 + Math.floor(r2() * 4), puffs = [];
      for (let q = 0; q < m; q++) { const v = q / (m - 1), rr = r * (0.55 + 0.6 * Math.sin(v * PI) + 0.15 * r2()); puffs.push([cx + (v - 0.5) * r * m * 0.85, cy - Math.sin(v * PI) * r * 0.45 + (r2() - 0.5) * r * 0.2, rr]); }
      for (const dx of [-1024, 0]) { g.fillStyle = shade; puffs.forEach(([x, y, rr]) => { g.beginPath(); g.arc(x + dx, y + rr * 0.3, rr, 0, PI * 2); g.fill(); }); g.fillStyle = lit; puffs.forEach(([x, y, rr]) => { g.beginPath(); g.arc(x + dx, y - rr * 0.08, rr * 0.92, 0, PI * 2); g.fill(); }); } }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; return t; };
  TEX.cloud = cloudTex('#ffffff', '#cfdcec', 16, 1); TEX.cloudSpring = cloudTex('#ffffff', '#dfe8f2', 12, 1.1); TEX.cloudDark = cloudTex('#5b6780', '#2f3646', 26, 1.5);
  return TEX;
}

/* ---------- one building: brick townhouse / warehouse. facade on local +z. fall(dt) = gravity (dt^2) hinge fall, chunks fly on parabolas ---------- */
const hingeA = (dt, alpha, max) => Math.min(max, 0.5 * alpha * Math.max(0, dt) * Math.max(0, dt));
function chunkField(parent, tint, w, h, d, rnd) {
  const chunks = new T.Group(); chunks.visible = false; parent.add(chunks); const cd = [];
  for (let i = 0; i < 14; i++) { const s = 0.16 + rnd() * 0.3, m = P(box(s, s * 0.7, s * 0.8), tm(['#8a3f2c', '#b9a88a', '#6b4a2e', '#7a2f22'][i % 4]), 0, 0, 0, { w: 0.02 }); chunks.add(m);
    cd.push({ m, x: (rnd() - 0.5) * (w * 0.8), y0: 2 + rnd() * (h * 0.7), vz: 2 + rnd() * 6, vy: 1 + rnd() * 5, r: (rnd() - 0.5) * 8, s }); }
  return { chunks, update(dt) { chunks.visible = dt > 0; if (dt <= 0) return;
    for (const c of cd) { const rest = c.s * 0.35 + 0.2, tl = (c.vy + Math.sqrt(c.vy * c.vy + 2 * GRAV * Math.max(0, c.y0 - rest))) / GRAV, q = Math.min(dt, tl);
      c.m.position.set(c.x, Math.max(rest, c.y0 + c.vy * q - 0.5 * GRAV * q * q), d / 2 + 0.6 + c.vz * q + c.vz * 0.1 * (1 - Math.exp(-Math.max(0, dt - tl) / 0.12))); const k = q / tl; c.m.rotation.set(c.r * k, c.r * 0.5 * k, c.r * 0.3 * k); } } };
}
function createBuilding(o) {
  const tx = textures(), { w, h, d, tint = '#c9744f', kind = 'house' } = o, wall = tm(tint, tx.wall), dark = tm('#6b5a4c'), trim = tm('#d8c9ac');
  if (kind === 'firehouse') return createFirehouse(o);
  const root = new T.Group(), tilt = new T.Group(); root.add(tilt);
  tilt.add(P(boxUV(w, h, d), wall, 0, h / 2, 0, { w: 0.1 }));
  tilt.add(P(box(w + 0.3, 0.55, d + 0.3), dark, 0, h + 0.27, 0, { w: 0.07 }));
  tilt.add(P(box(w + 0.4, 0.32, 0.55), trim, 0, h - 0.2, d / 2 + 0.1, { w: 0.05 }));
  const rnd = mulberry(Math.floor(w * 31 + h * 17 + d * 7));
  for (let i = 0; i < (kind === 'warehouse' ? 1 : 2); i++) { const cx = (rnd() - 0.5) * (w - 3), cz = (rnd() - 0.5) * (d - 3); tilt.add(P(box(0.9, 2.4, 0.9), tm('#8c4a3a'), cx, h + 1.5, cz, { w: 0.05 })); tilt.add(P(box(1.1, 0.25, 1.1), tm('#5b3a30'), cx, h + 2.8, cz, { w: 0.04 })); }
  if (kind === 'warehouse') {
    tilt.add(P(box(4.2, 3.6, 0.22), tm('#ffffff', tx.roll), -w / 4, 1.8, d / 2 + 0.1, { w: 0.06 })); tilt.add(P(box(3.2, 2.6, 0.22), tm('#ffffff', tx.roll), w / 4 + 0.5, 1.3, d / 2 + 0.1, { w: 0.06 }));
  } else {
    const dc = ['#2f4a3a', '#6a2f2a', '#26324f'][Math.floor(rnd() * 3)]; tilt.add(P(box(1.25, 2.4, 0.2), tm(dc), (rnd() - 0.5) * 2, 1.2, d / 2 + 0.1, { w: 0.04 })); tilt.add(P(box(2.0, 0.22, 0.9), tm('#a79f90'), 0, 0.11, d / 2 + 0.45, { w: 0.04, ink: false }));
  }
  const cf = chunkField(tilt, tint, w, h, d, rnd), lean = o.side < 0 ? 1 : -1;
  const api = { group: root, w, h, d, kind,
    fall(dt) { const a = hingeA(dt, 1.25, 1) ; tilt.rotation.set(a * 0.2, 0, lean * a * 0.3); tilt.position.y = -a * 0.5; cf.chunks.rotation.set(-tilt.rotation.x, 0, -tilt.rotation.z); cf.update(dt); } };
  api.damage = (p) => api.fall(p * 2); return api;
}

/* ---------- Engine 31: true 3D firehouse. Arched double bays are real holes (recessed 2.2 m, dark interior, open door leaves), brick pilasters, stone sills/lintels, recessed windows, bracketed cornice, raised block-letter plaque, working 3D clock ---------- */
const GLYPH = { E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], N: ['10001', '11001', '10101', '10101', '10011', '10001', '10001'], G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'], I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'], 3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'] };
function triUV(g) {   // brick UVs by dominant normal so extruded reveals don't smear
  g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let u, v; if (az >= ax && az >= ay) { u = p.getX(i); v = p.getY(i); } else if (ax >= ay) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getZ(i); } uv.setXY(i, u / 3, v / 3.2); }
  return g;
}
function createFirehouse(o) {
  const tx = textures(), { w, h, d, tint = '#c9533d' } = o, brick = tm(tint, tx.brick), stone = tm('#d8c9ac'), dark = tm('#6b5a4c'), red = tm('#9b2f22'), brass = tm('#d9b34a'), glass = tm('#2c3e50'), black = new T.MeshBasicMaterial({ color: '#150d12' });
  const root = new T.Group(), tilt = new T.Group(), face = new T.Group(); root.add(tilt); tilt.add(face);
  const zf = d / 2, DEP = 2.2, FD = 0.8, SPR = 3.2, AW = 4.5, ACX = [-2.85, 2.85];   // facade front plane, recess depth, front-layer depth, arch springline, arch width, arch centres
  face.position.set(0, 0, zf);   // hinge for the facade collapse = bottom front edge; everything in `face` is authored relative to it (z' = z - zf)
  tilt.add(P(boxUV(w, h, d - DEP), tm(tint, tx.brick), 0, h / 2, -DEP / 2, { w: 0.1 }));   // main body (behind the recess)
  tilt.add(P(box(w + 0.3, 0.55, d + 0.3), dark, 0, h + 0.27, 0, { w: 0.07 }));
  const hole = (cx, y0, ww, hh, arch) => { const p = new T.Path(); if (arch) { p.moveTo(cx - ww / 2, y0); p.lineTo(cx - ww / 2, y0 + hh); p.absarc(cx, y0 + hh, ww / 2, PI, 0, true); p.lineTo(cx + ww / 2, y0); p.closePath(); } else { p.moveTo(cx - ww / 2, y0); p.lineTo(cx - ww / 2, y0 + hh); p.lineTo(cx + ww / 2, y0 + hh); p.lineTo(cx + ww / 2, y0); p.closePath(); } return p; };
  const WIN = [-4.2, -2.0, 2.0, 4.2], WY = 8.3, WH = 1.9, WW = 1.15;
  const layer = (depth, withWin, zback) => { const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath(); for (const cx of ACX) s.holes.push(hole(cx, 0, AW, SPR, true)); if (withWin) for (const cx of WIN) s.holes.push(hole(cx, WY, WW, WH, false));
    const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 14 }); triUV(g); return face.add(P(g, brick, 0, 0, zback - zf, { w: 0.09, ink: true })); };
  layer(FD, true, zf - FD + FD); face.children[face.children.length - 1].position.z = -FD; layer(DEP - FD, false, zf - DEP); face.children[face.children.length - 1].position.z = -DEP;
  // dark shadowed interior + engine silhouette + open door leaves
  for (let i = 0; i < 2; i++) { const cx = ACX[i];
    { const bk = new T.Mesh(new T.PlaneGeometry(AW + 0.2, SPR + AW / 2 + 0.2), black); bk.position.set(cx, (SPR + AW / 2) / 2, -DEP - 0.01); face.add(bk); }
    face.add(P(box(AW, 0.1, DEP + 0.4), tm('#2a1d20'), cx, 0.02, -DEP / 2 + 0.2, { ink: false }));
    if (i === 0) { const e = new T.Group(); e.add(P(box(1.9, 1.4, 3.4), tm('#5a1a14'), 0, 1.3, 0, { w: 0.05 })); e.add(P(cyl(0.45, 0.45, 1.2, 14), tm('#6b5a3a'), 0, 2.4, 0.4, { w: 0.04 })); for (const s of [-1, 1]) for (const z of [-1.1, 1.1]) e.add(P(cyl(0.5, 0.5, 0.24, 14), tm('#1d1a1a'), s * 1.0, 0.5, z, { r: [0, 0, PI / 2], w: 0.04 })); e.position.set(cx, 0, -DEP + 1.9); face.add(e); }
    for (const s of [-1, 1]) { const sh = new T.Shape(), hw = AW / 4; sh.moveTo(0, 0); sh.lineTo(hw, 0); sh.lineTo(hw, SPR); sh.absarc(0, SPR, hw, 0, PI / 2, false); sh.lineTo(0, 0);
      const lg = P(new T.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false, curveSegments: 8 }), red, 0, 0, 0, { w: 0.04 }); lg.scale.x = s * 1; const hg = new T.Group(); hg.add(lg); hg.position.set(cx + s * (AW / 2 - 0.05), 0, -0.25 - FD); hg.rotation.y = s * PI / 2 * 0.97; hg.children[0].position.x = -s * hw * 0; face.add(hg); }
    // stone arch ring + keystone
    const rs = new T.Shape(); const R0 = AW / 2 + 0.38, R1 = AW / 2; rs.moveTo(cx - R0, 0); rs.lineTo(cx - R0, SPR); rs.absarc(cx, SPR, R0, PI, 0, true); rs.lineTo(cx + R0, 0); rs.lineTo(cx + R1, 0); rs.lineTo(cx + R1, SPR); rs.absarc(cx, SPR, R1, 0, PI, false); rs.lineTo(cx - R1, 0); rs.closePath();
    face.add(P(new T.ExtrudeGeometry(rs, { depth: 0.22, bevelEnabled: false, curveSegments: 16 }), stone, 0, 0, 0, { w: 0.05 })); face.add(P(box(0.55, 0.8, 0.34), stone, cx, SPR + AW / 2 + 0.3, 0.1, { w: 0.04 }));
  }
  // brick pilasters (outer + centre) with stone bases/capitals
  for (const x of [-w / 2 + 0.55, 0, w / 2 - 0.55]) { const pw = x === 0 ? 0.95 : 0.8; face.add(P(box(pw, h - 0.4, 0.4), brick, x, (h - 0.4) / 2 + 0.5, 0.2, { w: 0.06 })); face.add(P(box(pw + 0.3, 0.5, 0.55), stone, x, 0.25, 0.25, { w: 0.05 })); face.add(P(box(pw + 0.3, 0.35, 0.55), stone, x, 6.05, 0.25, { w: 0.05 })); }
  face.add(P(box(w + 0.5, 0.3, 0.55), stone, 0, 6.2, 0.18, { w: 0.05 }));   // belt course over the arches
  // raised sign plaque + block letters
  face.add(P(box(8.6, 1.5, 0.28), tm('#3a2a24'), 0, 7.2, 0.14, { w: 0.05 }));
  { const txt = 'ENGINE 31', px = 0.14, cell = 6 * px, total = txt.length * cell - px, mx = new T.Matrix4(); let n = 0; for (const ch of txt) for (const r of GLYPH[ch]) for (const c of r) if (c === '1') n++;
    const inst = new T.InstancedMesh(new T.BoxGeometry(px * 0.94, px * 0.94, 0.16), brass, n); let k = 0;
    [...txt].forEach((ch, ci) => GLYPH[ch].forEach((row, ri) => [...row].forEach((c, xi) => { if (c === '1') { mx.makeTranslation(-total / 2 + ci * cell + xi * px + px / 2, 7.2 + 3 * px - ri * px, 0.28 + 0.08); inst.setMatrixAt(k++, mx); } })));
    inst.instanceMatrix.needsUpdate = true; inst.frustumCulled = false; face.add(inst); }
  // recessed windows: dark panes + muntins, stone sills + lintels
  for (const cx of WIN) { face.add(P(box(WW, WH, 0.05), glass, cx, WY + WH / 2, -FD + 0.04, { w: 0.03, ink: false })); for (const [bx, by, bw, bh] of [[cx, WY + WH / 2, 0.06, WH], [cx, WY + WH / 2, WW, 0.06], [cx, WY + WH * 0.75, WW, 0.05]]) face.add(P(box(bw, bh, 0.06), tm('#e8dcc0'), bx, by, -FD + 0.09, { ink: false }));
    face.add(P(box(WW + 0.5, 0.2, 0.6), stone, cx, WY - 0.12, 0.1, { w: 0.04 })); face.add(P(box(WW + 0.5, 0.26, 0.42), stone, cx, WY + WH + 0.15, 0.08, { w: 0.04 })); }
  // bracketed cornice
  face.add(P(box(w + 0.6, 0.42, 0.9), stone, 0, h - 0.2, 0.3, { w: 0.05 })); for (let x = -w / 2 + 0.4; x < w / 2; x += 1.2) face.add(P(box(0.3, 0.4, 0.5), stone, x, h - 0.62, 0.22, { w: 0.03, ink: false }));
  // clock: stone bezel, painted face (no hands) + real 3D hands
  const cz = 0.66, clock = new T.Group(); clock.position.set(0, 9.25, 0); face.add(clock);
  clock.add(P(cyl(1.15, 1.15, 0.2, 32), stone, 0, 0, cz - 0.04, { r: [PI / 2, 0, 0], w: 0.05 })); clock.add(P(cyl(0.95, 0.95, 0.06, 32), [tm('#d8c9ac'), tm('#ffffff', tx.clockFace), tm('#d8c9ac')], 0, 0, cz + 0.08, { r: [PI / 2, 0, 0], w: 0.03 }));
  const mk = (len, wd, z) => { const g = new T.Group(); g.add(P(box(wd, len, 0.05), tm('#2b1a2a'), 0, len / 2 - 0.08, 0, { ink: false })); g.position.z = z; clock.add(g); return g; }, hHand = mk(0.55, 0.12, cz + 0.14), mHand = mk(0.8, 0.08, cz + 0.2);
  clock.add(P(cyl(0.09, 0.09, 0.08, 12), tm('#2b1a2a'), 0, 0, cz + 0.24, { r: [PI / 2, 0, 0], ink: false }));
  tilt.add(P(box(1.4, 2.6, 1.4), tm('#7a2a20'), -w / 2 + 1.2, h + 1.5, -d / 2 + 2, { w: 0.06 }));
  const rnd = mulberry(77), cf = chunkField(tilt, tint, w, h, d, rnd), lean = o.side < 0 ? 1 : -1;
  const api = { group: root, w, h, d, kind: 'firehouse', clock: { hands(minDeg, hourDeg) { mHand.rotation.z = -minDeg * PI / 180; hHand.rotation.z = -hourDeg * PI / 180; } }, clockWorld: () => new T.Vector3(0, 9.25, zf + cz + 0.3),
    fall(dt) {   // facade hinges forward about its bottom edge under gravity (dt^2), caught at ~50 deg by rubble; body settles + leans
      const a = hingeA(dt, 1.1, 0.86); face.rotation.x = a; face.position.y = -0.1 * Math.min(1, a); const b = hingeA(dt - 0.3, 0.9, 0.5) / 0.5; tilt.rotation.set(-0.06 * b, 0, lean * 0.1 * b); tilt.position.y = -0.55 * b; cf.chunks.rotation.set(-tilt.rotation.x, 0, -tilt.rotation.z); cf.update(dt); } };
  api.damage = (p) => api.fall(p * 2.5); api.setClock = api.clock.hands; api.hands = api.clock.hands; api.hands(240, 20); return api;
}

/* ---------- 1919 boxy car; centre of mass at the origin so tumbling spins about the body ---------- */
function createCar(o = {}) {
  const col = o.color || '#23262b', body = tm(col), dark = tm('#15151a'), brass = tm('#c9a24a'), tyre = tm('#1d1a1a'), seat = tm('#5a3a28'), top = tm('#2b2b2b', null, T.DoubleSide);
  const g = new T.Group(), inner = new T.Group(); g.add(inner);
  inner.add(P(box(1.5, 0.35, 3.3), dark, 0, -0.5, 0, { w: 0.04 }));
  inner.add(P(box(1.6, 0.8, 1.5), body, 0, -0.05, -0.65, { w: 0.045 }));        // tub
  inner.add(P(box(1.2, 0.68, 1.05), body, 0, -0.1, 0.95, { w: 0.045 }));        // hood
  inner.add(P(box(1.1, 0.7, 0.08), brass, 0, -0.12, 1.5, { w: 0.03 }));         // radiator
  for (const s of [-1, 1]) { inner.add(P(ball(0.13, 12), brass, s * 0.45, 0.12, 1.5, { w: 0.025 })); inner.add(P(box(0.3, 0.07, 1.0), body, s * 0.78, -0.42, 0.95, { w: 0.03 })); inner.add(P(box(0.3, 0.07, 0.9), body, s * 0.78, -0.42, -0.7, { w: 0.03 })); }
  inner.add(P(box(1.2, 0.35, 0.5), seat, 0, 0.35, -0.5, { w: 0.03 })); inner.add(P(box(1.45, 0.07, 0.07), dark, 0, 0.78, 0.38, { w: 0.03 }));   // seat + windshield bar
  for (const sx of [-1, 1]) inner.add(P(box(0.07, 0.75, 0.07), dark, sx * 0.7, 0.42, 0.38, { w: 0.03 }));
  inner.add(P(box(1.6, 0.09, 1.4), top, 0, 1.02, -0.3, { w: 0.04 }));            // canvas roof
  for (const sx of [-1, 1]) for (const sz of [-0.95, 0.75]) inner.add(P(box(0.06, 0.62, 0.06), dark, sx * 0.72, 0.7, sz, { w: 0.025 }));
  const wheels = [];
  for (const sx of [-1, 1]) for (const sz of [-1.05, 0.95]) { const piv = new T.Group(); piv.position.set(sx * 0.83, -0.68, sz); piv.add(P(cyl(0.38, 0.38, 0.16, 20), tyre, 0, 0, 0, { r: [0, 0, PI / 2], w: 0.035 })); piv.add(P(cyl(0.16, 0.16, 0.18, 12), brass, 0, 0, 0, { r: [0, 0, PI / 2], ink: false })); piv.add(P(box(0.2, 0.05, 0.05), dark, 0, 0.3, 0, { ink: false })); inner.add(piv); wheels.push(piv); }
  g.userData.base = new T.Vector3();
  return { group: g, wheels, drive(x, z, yaw, dist) { g.userData.base.set(x, 0.98, z); g.position.copy(g.userData.base); g.rotation.set(0, yaw, 0); inner.rotation.set(0, 0, 0); this.yaw = yaw; for (const p of wheels) p.rotation.x = dist / 0.38; return this; }, place(x, z, yaw = 0) { g.userData.base.set(x, 0.98, z); g.position.copy(g.userData.base); g.rotation.set(0, yaw, 0); inner.rotation.set(0, 0, 0); this.yaw = yaw; return this; }, yaw: 0,
    flip(dt, floor = 0.98, vx = -1.2, vz = 6.2, vy = 11) {   // ballistic: p0 + v0 dt + g dt^2/2, 1.5 end-over-end turns, lands upside-down, then viscous bob
      const b = g.userData.base; if (dt <= 0) { g.position.copy(b); g.rotation.set(0, this.yaw, 0); inner.rotation.set(0, 0, 0); return; }
      const T0 = 2 * vy / GRAV, q = Math.min(dt, T0), ex = Math.max(0, dt - T0), sl = 1 - Math.exp(-ex / 0.5);
      g.position.set(b.x + vx * q + vx * 0.35 * sl, Math.max(floor, b.y + vy * q - 0.5 * GRAV * q * q) + (ex > 0 ? 0.06 * Math.sin(ex * 1.4) * Math.exp(-ex * 0.5) : 0), b.z + vz * q + vz * 0.3 * sl); g.rotation.y = this.yaw + 0.4 * q / T0;
      inner.rotation.set(3 * PI * Math.pow(q / T0, 1.0), 0, 0.5 * Math.sin(PI * q / T0)); }, T0: 2 * 8.4 / GRAV,
    toss(p, dx = 0.35, dz = 1) { p = clamp(p, 0, 1); const e = sm(p), b = g.userData.base, n = Math.hypot(dx, dz) || 1; g.position.set(b.x + dx / n * 9 * easeOut(p), b.y + 0.15 * e + 6.5 * Math.sin(PI * sm(clamp(p * 1.1, 0, 1))), b.z + dz / n * 9 * easeOut(p)); g.rotation.y = this.yaw; inner.rotation.set(e * 2.6, 0, e * 4.4); } };
}

/* ---------- lamp, crate, barrel ---------- */
function createLamp() { const g = new T.Group(), iron = tm('#24332b'); g.add(P(cyl(0.2, 0.28, 0.5, 12), iron, 0, 0.25, 0, { w: 0.03 })); g.add(P(cyl(0.08, 0.11, 4.6, 12), iron, 0, 2.8, 0, { w: 0.03 })); g.add(P(cyl(0.26, 0.2, 0.55, 8), tm('#f3dc95'), 0, 5.4, 0, { w: 0.03 })); g.add(P(cyl(0.02, 0.36, 0.3, 8), iron, 0, 5.85, 0, { w: 0.03 })); return g; }
export function createCrate(s = 1) { const g = new T.Group(), wood = tm('#9a7448'), band = tm('#6a4a2a'); g.add(P(box(s, s, s), wood, 0, s / 2, 0, { w: 0.03 })); g.add(P(box(s * 1.04, s * 0.12, s * 1.04), band, 0, s * 0.2, 0, { w: 0.02, ink: false })); g.add(P(box(s * 1.04, s * 0.12, s * 1.04), band, 0, s * 0.8, 0, { w: 0.02, ink: false })); return g; }
function createBarrel() { const g = new T.Group(), wood = tm('#8a6238'), hoop = tm('#3a3a40'); g.add(P(cyl(0.42, 0.42, 0.95, 18), wood, 0, 0.48, 0, { s: [1, 1, 1], w: 0.03 })); for (const y of [0.2, 0.76]) g.add(P(new T.TorusGeometry(0.43, 0.03, 8, 20), hoop, 0, y, 0, { r: [PI / 2, 0, 0], ink: false })); return g; }

/* ---------- elevated railway: trestle bents + girder decks + train car. damage(dt): bent c hinge-falls (dt^2), its deck tilts down holding the tilted green car ---------- */
function createElevatedRailway(o = {}) {
  const z0 = o.z0 ?? -52, z1 = o.z1 ?? 50, X = o.x ?? 6.9, Y = 6.6, span = 9, n = Math.round((z1 - z0) / span), c = o.buckle ?? 6, tx = textures();
  const steel = tm('#2f353b'), rail = tm('#555a60'), deckM = tm('#ffffff', tx.plank);
  const root = new T.Group(), bents = [], segs = [];
  for (let i = 0; i <= n; i++) {
    const b = new T.Group(); b.position.set(X, 0, z0 + i * span);
    for (const s of [-1, 1]) b.add(P(cyl(0.22, 0.28, Y, 12), steel, s * 1.9, Y / 2, 0, { w: 0.05 }));
    b.add(P(box(4.6, 0.45, 0.5), steel, 0, Y - 0.1, 0, { w: 0.05 }));
    for (const s of [-1, 1]) b.add(P(box(0.14, Y * 0.75, 0.14), steel, s * 0.95, Y * 0.5, 0, { r: [0, 0, -s * 0.52], w: 0.03 }));
    root.add(b); bents.push(b);
  }
  for (let i = 0; i < n; i++) {
    const s = new T.Group(); s.position.set(X, Y + 0.28, z0 + (i + 0.5) * span);
    s.add(P(box(4.2, 0.5, span + 0.05), steel, 0, 0, 0, { w: 0.05 })); s.add(P(box(3.6, 0.1, span), deckM, 0, 0.3, 0, { ink: false }));
    for (const sx of [-1, 1]) s.add(P(box(0.14, 0.16, span), rail, sx * 0.72, 0.4, 0, { w: 0.02 }));
    for (const sx of [-1, 1]) s.add(P(box(0.1, 0.8, span), steel, sx * 2.05, 0.65, 0, { w: 0.03 }));
    root.add(s); segs.push(s);
  }
  const car = new T.Group(), body = tm('#3d5a45'), win = tm('#ffffff', tx.train);
  car.add(P(box(2.9, 2.5, 11.4), body, 0, 1.45, 0, { w: 0.06 })); car.add(P(box(3.0, 0.2, 11.6), tm('#222a26'), 0, 2.78, 0, { w: 0.04 }));
  for (const s of [-1, 1]) car.add(P(box(0.05, 1.1, 10.4), win, s * 1.46, 1.65, 0, { ink: false })); car.add(P(box(0.9, 0.6, 0.1), tm('#f3dc95'), 0, 1.0, 5.75, { w: 0.03 })); car.add(P(box(3.0, 0.6, 11.6), tm('#2a2f2c'), 0, 0.3, 0, { w: 0.04 }));
  car.position.y = 0.45; segs[c].add(car);
  const zc = z0 + c * span, L = span / 2;
  return { group: root, trainSegment: c, breakPoint: new T.Vector3(X - 1, Y, zc),
    damage(dt) { dt = Math.max(0, dt); const th = hingeA(dt, 1.5, 0.52), ph = hingeA(dt - 0.1, 1.2, 0.34);
      bents.forEach((b, i) => { b.rotation.set(0, 0, 0); b.position.set(X, 0, z0 + i * span); }); segs.forEach((s, i) => { s.rotation.set(0, 0, 0); s.position.set(X, Y + 0.28, z0 + (i + 0.5) * span); });
      const B = bents[c]; B.rotation.z = th; B.position.set(X - th * 0.9, -th * 0.5, zc);
      const S = segs[c], zEnd = z0 + (c + 1) * span; S.rotation.set(-ph, 0, -ph * 0.3); S.position.set(X - 1.2 * ph, Y + 0.28 - L * Math.sin(ph), zEnd - L * Math.cos(ph));
      const P2 = segs[c - 1], zS = z0 + (c - 1) * span, f = ph * 0.4; P2.rotation.set(f, 0, 0); P2.position.set(X, Y + 0.28 - L * Math.sin(f), zS + L * Math.cos(f)); } };
}

/* ---------- Boston Commercial Street stage ---------- */
/* ---------- lite 1919 buildings (no ink hulls: cheap, for the deeper blocks), harbour ships, far skyline ---------- */
const ROOFS = ['#5a4a46', '#6b5a50', '#3f4a52', '#7a4a3a'];
const side0 = (r) => (r() < 0.5 ? -1 : 1);
function createLite(o) {
  const tx = textures(), { w, h, d, tint, roof = 'flat', seed = 1 } = o, rnd = mulberry(seed * 977 + 13), g = new T.Group(), wall = tm(tint, tx.wall), N = { ink: false };
  g.add(P(boxUV(w, h, d), wall, 0, h / 2, 0, N));
  const rc = tm(ROOFS[Math.floor(rnd() * ROOFS.length)]), trim = tm('#d8c9ac'), dark = tm('#5b4638');
  if (roof === 'gable') {
    const rh = Math.min(w, d) * 0.28 + 1.2, sh = new T.Shape(); sh.moveTo(-d / 2 - 0.3, 0); sh.lineTo(d / 2 + 0.3, 0); sh.lineTo(0, rh); sh.closePath();
    const gg = new T.ExtrudeGeometry(sh, { depth: w + 0.4, bevelEnabled: false }); gg.translate(0, 0, -(w + 0.4) / 2); const r = P(gg, rc, 0, h, 0, N); r.rotation.y = Math.PI / 2; g.add(r);
    g.add(P(box(0.9, 2.2, 0.9), tm('#8c4a3a'), (rnd() - 0.5) * w * 0.6, h + rh + 0.4, (rnd() - 0.5) * d * 0.3, N));
  } else if (roof === 'mansard') {
    g.add(P(cyl(Math.min(w, d) * 0.55, Math.min(w, d) * 0.78, 1.8, 4), rc, 0, h + 0.9, 0, { ...N, r: [0, Math.PI / 4, 0], s: [w / Math.min(w, d) * 1.0, 1, d / Math.min(w, d) * 1.0] }));
    g.add(P(box(1.0, 2.4, 1.0), tm('#8c4a3a'), w * 0.25, h + 2.4, 0, N));
  } else {
    g.add(P(box(w + 0.3, 0.55, d + 0.3), dark, 0, h + 0.27, 0, N)); g.add(P(box(w + 0.4, 0.3, 0.5), trim, 0, h - 0.2, d / 2 + 0.1, N));
    const nc = 1 + Math.floor(rnd() * 2); for (let i = 0; i < nc; i++) { const cx = (rnd() - 0.5) * (w - 2), cz = (rnd() - 0.5) * (d - 2); g.add(P(box(0.9, 2.2, 0.9), tm('#8c4a3a'), cx, h + 1.5, cz, N)); }
    if (rnd() < 0.35) { const x = (rnd() - 0.5) * (w - 4), z = (rnd() - 0.5) * (d - 4), wd = tm('#7a5a3c'); for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) g.add(P(box(0.14, 2.2, 0.14), wd, x + dx, h + 1.4, z + dz, N)); g.add(P(cyl(1.1, 1.1, 1.8, 14), wd, x, h + 3.5, z, N)); g.add(P(cyl(0.05, 1.3, 0.9, 14), tm('#4a3a30'), x, h + 4.85, z, N)); }
    if (rnd() < 0.4) g.add(P(box(1.6, 0.25, 1.6), tm('#5a7a8a'), (rnd() - 0.5) * (w - 3), h + 0.7, (rnd() - 0.5) * (d - 3), N));   // skylight
  }
  // painted door + wooden stoop + awning on some, iron fire escape on others
  g.add(P(box(1.2, 2.3, 0.2), tm(['#2f4a3a', '#6a2f2a', '#26324f', '#5a3a28'][Math.floor(rnd() * 4)]), (rnd() - 0.5) * (w - 4), 1.15, d / 2 + 0.1, N));
  g.add(P(box(2.2, 0.4, 1.0), tm('#9a7448'), 0, 0.2, d / 2 + 0.5, N));
  if (rnd() < 0.3) g.add(P(box(w * 0.5, 0.18, 1.6), tm(['#7a2f2f', '#2f5a4a', '#8a6a2a'][Math.floor(rnd() * 3)]), 0, 3.0, d / 2 + 0.8, { ...N, r: [0.25, 0, 0] }));
  if (h > 9 && rnd() < 0.7) { const iron = tm('#23252b'), x0 = w * 0.3; for (let y = 3.4; y < h - 1; y += 3.2) { g.add(P(box(2.4, 0.1, 1.0), iron, x0, y, d / 2 + 0.55, N)); g.add(P(box(0.08, 3.3, 0.08), iron, x0 + 1.1, y + 1.55, d / 2 + 1.0, N)); g.add(P(box(0.5, 0.1, 3.6), iron, x0 - 0.8, y + 1.6, d / 2 + 0.55, { ...N, r: [-0.74, 0, 0] })); } }
  g.userData.h = h; return g;
}
function createShip(len, kind) {   // cel-shaded 1919 wooden cargo ship / tug, bow toward -z
  const g = new T.Group(), hull = tm(kind === 'tug' ? '#2a3a44' : '#4a2f26'), wood = tm('#9a7448'), cream = tm('#e9dcc0'), red = tm('#9b2f22'), blk = tm('#1b1b20'), w = len * 0.27, sh = new T.Shape();
  sh.moveTo(-w / 2, len / 2); sh.lineTo(w / 2, len / 2); sh.lineTo(w / 2, -len * 0.2); sh.quadraticCurveTo(w * 0.35, -len / 2 + 1, 0, -len / 2); sh.quadraticCurveTo(-w * 0.35, -len / 2 + 1, -w / 2, -len * 0.2); sh.closePath();
  const hg = new T.ExtrudeGeometry(sh, { depth: len * 0.12 + 1.4, bevelEnabled: false }); hg.rotateX(Math.PI / 2); hg.translate(0, len * 0.12 + 0.7, 0); g.add(P(hg, hull, 0, 0, 0, { w: 0.08 }));
  g.add(P(box(w * 0.92, 0.15, len * 0.9), wood, 0, len * 0.12 + 0.7, 0.2, { w: 0.04 }));
  g.add(P(box(w * 0.7, len * 0.1 + 0.8, len * 0.22), cream, 0, len * 0.12 + 1.5, len * 0.22, { w: 0.05 })); g.add(P(box(w * 0.74, 0.18, len * 0.26), red, 0, len * 0.12 + 2.2 + len * 0.05, len * 0.22, { w: 0.04 }));
  g.add(P(cyl(w * 0.14, w * 0.18, len * 0.22, 14), kind === 'tug' ? red : blk, 0, len * 0.12 + 3.2 + len * 0.05, len * 0.3, { w: 0.05 }));
  if (kind !== 'tug') { for (const z of [-len * 0.2, len * 0.05]) { g.add(P(cyl(0.12, 0.16, len * 0.5, 8), wood, 0, len * 0.12 + len * 0.25, z, { w: 0.04 })); g.add(P(box(w * 0.7, 0.1, 0.1), wood, 0, len * 0.12 + len * 0.42, z, { w: 0.03 })); } for (let i = 0; i < 4; i++) g.add(P(box(1.1, 1.0, 1.1), tm('#9a7448'), (i % 2 - 0.5) * 1.4, len * 0.12 + 1.3, -len * 0.18 + (i >> 1) * 1.3, { w: 0.04 })); }
  return g;
}
function createSkyline(root) {   // two hazy rings of far brick mills, steeples, stacks and rooftops: real 3D, no flat grey slabs
  const rnd = mulberry(1919), N = { ink: false }, rings = [[105, '#b88a74', 0.55], [128, '#a8a2a6', 0.8], [150, '#a0a8b6', 1.0]];
  for (const [R, col, hz] of rings) { const n = Math.round(R * 0.36); for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + rnd() * 0.05, x = Math.sin(a) * R, z = -12 + Math.cos(a) * R, w = 7 + rnd() * 14, d = 7 + rnd() * 9, h = 8 + rnd() * 20, k = rnd(), g = new T.Group(), c = new T.Color(col).offsetHSL(0, 0, (rnd() - 0.5) * 0.06);
    g.add(P(boxUV(w, h, d), tm('#' + c.getHexString(), textures().wall), 0, h / 2, 0, N));
    if (k < 0.18) { const sh = tm('#4a4650'); g.add(P(box(3, 14, 3), tm('#' + c.getHexString()), 0, h + 7, 0, N)); const cone = P(cyl(0.01, 2.6, 9, 4), sh, 0, h + 18.5, 0, N); g.add(cone); }
    else if (k < 0.38) { g.add(P(cyl(1.1, 1.5, 24 + rnd() * 14, 10), tm('#8a5a4a'), w * 0.25, h + 12, 0, N)); g.add(P(cyl(1.15, 1.15, 1.4, 10), tm('#2b2b30'), w * 0.25, h + 24, 0, N)); }
    else if (k < 0.6) { const sh2 = new T.Shape(); sh2.moveTo(-d / 2, 0); sh2.lineTo(d / 2, 0); sh2.lineTo(0, 4 + rnd() * 3); sh2.closePath(); const gg = new T.ExtrudeGeometry(sh2, { depth: w, bevelEnabled: false }); gg.translate(0, 0, -w / 2); const r = P(gg, tm('#5a4a46'), 0, h, 0, N); r.rotation.y = Math.PI / 2; g.add(r); }
    g.position.set(x, 0, z); g.rotation.y = -a; root.add(g); } }
}
export function createBostonStage() {
  const tx = textures(), root = new T.Group();
  // ground: dirt, cobbled street, stone walks + curbs, winter dirt/snow patches
  root.add(P(new T.PlaneGeometry(600, 600), tm('#8f8372'), 0, -0.03, 0, { r: [-PI / 2, 0, 0], ink: false }));
  root.add(P(new T.PlaneGeometry(STREET.halfW * 2, 260), tm('#ffffff', tx.cobble), 0, 0, -20, { r: [-PI / 2, 0, 0], ink: false }));
  for (const s of [-1, 1]) {
    root.add(P(box(STREET.walk - STREET.halfW, 0.2, 260), tm('#ffffff', tx.slab), s * (STREET.halfW + STREET.walk) / 2, 0.1, -20, { w: 0.05 }));
    root.add(P(box(0.35, 0.24, 260), tm('#a8a092'), s * (STREET.halfW + 0.145), 0.13, -20, { w: 0.04, ink: false }));
  }

  // sky dome (no rim to show) + drifting cloud layer; textures swap with the mood
  const sky = new T.Mesh(new T.SphereGeometry(150, 48, 24), new T.MeshBasicMaterial({ map: tx.skySun, side: T.BackSide, fog: false, depthWrite: false })); sky.renderOrder = -2; sky.frustumCulled = false; tx.skySun.repeat.set(1, 1); root.add(sky);
  const clouds = new T.Mesh(new T.SphereGeometry(146, 32, 12, 0, PI * 2, 0.15, 0.95), new T.MeshBasicMaterial({ map: tx.cloud, side: T.BackSide, transparent: true, opacity: 0.8, fog: false, depthWrite: false })); clouds.renderOrder = -1; clouds.frustumCulled = false; root.add(clouds);
  // buildings
  const L = [[-46, 12, 9.6, 10, '#c9744f', 'house'], [-34, 9, 9.6, 9, '#b98a62', 'house'], [-25, 12, 12.8, 11, '#a85d46', 'house'], [-12, 12, 11.4, 10, '#c9533d', 'firehouse'], [3, 9, 12.8, 10, '#d08a5b', 'house'], [13, 12, 9.6, 10, '#bd5f45', 'house'], [26, 15, 12.8, 11, '#9a8c78', 'warehouse'], [41, 9, 9.6, 10, '#c9855c', 'house'], [52, 12, 9.6, 10, '#b4694c', 'house']];
  const R = [[-44, 12, 9.6, 10, '#bf6a4a', 'house'], [-32, 15, 12.8, 11, '#9c9a86', 'warehouse'], [-17, 9, 9.6, 9, '#c88a5e', 'house'], [-7, 15, 9.6, 12, '#8e8a7c', 'warehouse'], [7, 9, 9.6, 10, '#a86a4a', 'house'], [18, 12, 12.8, 11, '#c07a52', 'house'], [32, 15, 9.6, 12, '#8e8472', 'warehouse'], [46, 12, 9.6, 10, '#b86c4e', 'house']];
  const buildings = [];
  const add = (a, side) => { const [z, w, h, d, tint, kind] = a, b = createBuilding({ w, h, d, tint, kind, side }); b.group.position.set(side * (STREET.walk + d / 2), 0, z); b.group.rotation.y = side < 0 ? PI / 2 : -PI / 2; b.side = side; buildings.push(b); root.add(b.group); return b; };
  L.forEach((a) => add(a, -1)); R.forEach((a) => add(a, 1));
  // ---- deeper blocks: left side rows 2-4, wharf warehouses, flanks + back of the tank (lite, no ink) ----
  { const rr = mulberry(31), cols = ['#c9744f', '#b98a62', '#a85d46', '#c9533d', '#d08a5b', '#bd5f45', '#9a8c78', '#c9855c', '#b4694c', '#8e8472', '#a86a4a', '#c07a52'], roofs = ['gable', 'flat', 'mansard', 'gable', 'flat'];
    const full = (x, z, w, d, h, face, k) => { const g = createBuilding({ w, h, d, tint: cols[Math.floor(rr() * cols.length)], kind: rr() < 0.25 ? 'warehouse' : 'house', side: x < 0 ? -1 : 1 }).group; g.position.set(x, 0, z); g.rotation.y = face; root.add(g); return g; };
    const lite = (x, z, w, d, h, face, k) => { const g = createLite({ w, h, d, tint: cols[Math.floor(rr() * cols.length)], roof: roofs[Math.floor(rr() * roofs.length)], seed: k }); g.position.set(x, 0, z); g.rotation.y = face; root.add(g); return g; };
    let k = 1;
    for (const bx of [-30, -45, -60]) for (let z = -52 + (bx === -45 ? 5 : bx === -60 ? 9 : 0); z < 80;) { const w = 9 + rr() * 6, d = 9 + rr() * 5, h = 8 + Math.floor(rr() * 3) * 3 + (rr() < 0.2 ? 3 : 0); (bx === -30 ? full : lite)(bx + (rr() - 0.5) * 2, z + w / 2, w, d, h, PI / 2, k++); z += w + 1 + rr() * 2.5; }
    // flanking and back-of-tank blocks, all facing the tank
    for (const [x, z] of [[-30, -60], [-34, -76], [-30, -92], [-12, -104], [8, -106], [28, -100], [34, -84], [34, -64], [-52, -70], [-50, -90], [-40, -112], [14, -124], [-8, -126]]) { const w = 10 + rr() * 4, d = 9 + rr() * 4, h = 8 + Math.floor(rr() * 3) * 3; full(x, z, w, d, h, Math.atan2(-x, -70 - z), k++); }
    // wharf-side warehouses on the dock (right of the street, past the front row)
    for (const z of [-64, 62, 76]) lite(25.5, z, 12, 8, 8, -PI / 2, k++);
  }
  // ---- boston harbour: piers, pilings, cargo, moored ships ----
  { const wood = tm('#7a5a3c'), dk = tm('#3f2f22'); for (const pz of [-46, -12, 22, 52]) { root.add(P(box(15, 0.35, 3.4), wood, 36, 0.05, pz, { w: 0.05 })); for (let x = 30; x <= 42; x += 4) for (const dz of [-1.5, 1.5]) root.add(P(cyl(0.2, 0.2, 2.4, 8), dk, x, -0.6, pz + dz, { w: 0.04 })); for (let i = 0; i < 3; i++) { const c = createCrate(0.9 + (i % 2) * 0.3); c.position.set(33 + i * 3.2, 0.3, pz + (i % 2 ? 0.7 : -0.7)); c.rotation.y = i + pz; root.add(c); } const b = createBarrel(); b.position.set(41, 0.25, pz); root.add(b); }
    [[40.5, -29, 26, 'cargo'], [37.5, 5, 13, 'tug'], [40.5, 37, 24, 'cargo']].forEach(([x, z, len, kind], i) => { const sp = createShip(len, kind); sp.position.set(x, 0, z); sp.rotation.y = i ? 0 : PI; root.add(sp); });
    for (const z of [-70, 80]) { const sp = createShip(20, 'cargo'); sp.position.set(46, 0, z); root.add(sp); } }
  // ---- lived-in street props: handcarts, fences, extra parked cars, alley crates ----
  { const wood = tm('#8a6238'), iron = tm('#24252a');
    const cart = (x, z, r) => { const g = new T.Group(); g.add(P(box(1.1, 0.12, 1.9), wood, 0, 0.7, 0, { w: 0.04 })); for (const s of [-1, 1]) g.add(P(box(0.08, 0.45, 1.9), wood, s * 0.55, 0.95, 0, { w: 0.03 })); g.add(P(box(1.1, 0.45, 0.08), wood, 0, 0.95, 0.95, { w: 0.03 })); g.add(P(box(0.08, 0.08, 1.6), wood, 0, 0.7, -1.7, { w: 0.03 })); for (const s of [-1, 1]) { const w = P(new T.TorusGeometry(0.42, 0.06, 6, 16), iron, s * 0.62, 0.45, 0, { w: 0.03 }); w.rotation.y = PI / 2; g.add(w); } g.position.set(x, 0.1, z); g.rotation.y = r; root.add(g); };
    [[-8.4, -34, 0.3], [8.2, -20, -0.2], [-8.3, 24, 0.1], [8.3, 44, 0.5], [-8.5, 52, -0.3]].forEach(([x, z, r]) => cart(x, z, r));
    for (const [x0, z0, z1] of [[-19.8, -36, -22], [-20, 24, 36], [14.6, -30, -22]]) for (let z = z0; z < z1; z += 1.2) root.add(P(box(0.1, 1.1, 0.7), wood, x0, 0.6, z, { w: 0.03, ink: false }));
    [[-2.8, 26, PI / 2], [3.6, 50, -PI / 2], [-3.0, -28, 0]].forEach(([x, z, r], i) => { const c = createCar({ color: ['#6a5a2a', '#3a3a4a', '#4a2a2a'][i] }).place(x > 0 ? 7.2 : -7.2, z, r * 0.1); c.group.scale.setScalar(0.96); root.add(c.group); });
    for (const [x, z] of [[-9, -40], [-8.8, 30], [8.8, 12], [9, 36], [-9, 60]]) { for (let i = 0; i < 3; i++) { const c = createCrate(0.8 + i * 0.12); c.position.set(x + (x < 0 ? -0.6 : 0.6) * i, 0.2 + (i === 2 ? 0.9 : 0), z + i * 0.2); c.rotation.y = i * 0.7 + z; root.add(c); } }
  }
  createSkyline(root);
  const stains = new T.Group(); { const sm0 = new T.MeshBasicMaterial({ color: '#2a1608', transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), rs = mulberry(88); for (let i = 0; i < 46; i++) { const z = -64 + rs() * 100, x = (rs() - 0.5) * 11, m = new T.Mesh(new T.CircleGeometry(0.5 + rs() * 1.3, 18), sm0); m.rotation.x = -PI / 2; m.position.set(x, 0.015 + i * 0.0002, z); m.scale.set(1 + rs() * 1.4, 1 + rs() * 0.8, 1); m.rotation.z = rs() * 3; stains.add(m); } for (let i = 0; i < 14; i++) { const z = -60 + rs() * 70, m = new T.Mesh(new T.CircleGeometry(0.9 + rs() * 0.9, 18), sm0); m.rotation.x = -PI / 2; m.position.set(side0(rs) * (7 + rs() * 2), 0.21, z); m.scale.set(1.2, 1.6, 1); stains.add(m); } stains.visible = false; root.add(stains); }
  const tiltable = [buildings[L.length + 3], buildings[3]];   // left warehouse + Engine 31 firehouse (collapse trigger)
  // waterfront: dock strip + flat harbour water on the right
  root.add(P(box(7, 0.5, 220), tm('#7a5a3c'), 24.8, -0.1, -10, { w: 0.06 })); const sea = new T.Mesh(new T.PlaneGeometry(400, 500), tm('#1f566a')); sea.rotation.x = -PI / 2; sea.position.set(230, -0.7, -20); root.add(sea); const sea2 = new T.Mesh(new T.PlaneGeometry(60, 500), tm('#2c7a8a')); sea2.rotation.x = -PI / 2; sea2.position.set(60, -0.69, -20); root.add(sea2);
  for (let z = -50; z < 60; z += 9) root.add(P(cyl(0.22, 0.22, 2, 8), tm('#4a3a2a'), 28.2, 0, z, { w: 0.04 }));
  [[22.5, -30, 1.3], [22.8, -28.6, 1], [23.4, -30.2, 0.9], [22.4, 10, 1.4], [23.0, 11.4, 1.0], [23.6, 24, 1.2]].forEach(([x, z, s]) => { const c = createCrate(s); c.position.set(x, 0.15, z); c.rotation.y = x * 0.7; root.add(c); });
  [[22, -34], [23.4, -33], [22.6, 16], [23.6, 17.2], [22.0, 30]].forEach(([x, z]) => { const b = createBarrel(); b.position.set(x, 0.15, z); root.add(b); });
  [[-8.3, -20], [-8.4, 6], [8.3, 22], [-8.2, 38]].forEach(([x, z], i) => { const c = createCrate(1.1 - i * 0.1); c.position.set(x, 0.2, z); c.rotation.y = i; root.add(c); const b = createBarrel(); b.position.set(x + (x < 0 ? 1 : -1) * 1.2, 0.2, z + 0.4); root.add(b); });
  // lamps
  const lamps = []; for (let z = -42; z <= 60; z += 17) for (const s of [-1, 1]) { const l = createLamp(); l.position.set(s * 8.4, 0.2, z + (s > 0 ? 8 : 0)); root.add(l); lamps.push({ obj: l, x: s * 8.4, z: z + (s > 0 ? 8 : 0), s }); }
  // cars
  // extra hinge-fallers: 4 buildings along the wave path + 2 flanking the tank (built with full ink so they can fall)
  const exb = []; { const mk = (x, z, w, d, h, tint, kind, face, side) => { const b = createBuilding({ w, h, d, tint, kind, side }); b.group.position.set(x, 0, z); b.group.rotation.y = face; root.add(b.group); exb.push(b); }; [4, 5].forEach((i) => exb.push(buildings[i])); [13, 14].forEach((i) => exb.push(buildings[i])); mk(-27, -66, 12, 10, 12, '#b4694c', 'house', Math.atan2(27, -4), -1); mk(27, -74, 12, 10, 12, '#9a8c78', 'warehouse', Math.atan2(-27, 4), 1); }
  const cars = [createCar({ color: '#23262b' }).place(-2.6, 12, 0.05), createCar({ color: '#5e2a2a' }).place(3.0, -10, -0.08), createCar({ color: '#2f4538' }).place(-3.2, 34, PI), createCar({ color: '#3a4a6a' }), createCar({ color: '#7a6a3a' })];
  cars.forEach((c) => root.add(c.group));
  const el = createElevatedRailway({ z0: -52, z1: 50, x: 6.9, buckle: 6 }); root.add(el.group);
  return { group: root, sky, clouds, lamps, firehouse: buildings[3], buildings, tiltable, cars, el, railway: el, stains, exb, setDamage({ a = 0, b = 0, rail = 0, ex = [] } = {}) { tiltable[0].fall(a); tiltable[1].fall(b); el.damage(rail); ex.forEach((dt, i) => exb[i] && exb[i].fall(dt)); }, skyTex: { sun: tx.skySun, gloom: tx.skyGloom, spring: tx.skySpring }, cloudTex: { sun: tx.cloud, gloom: tx.cloudDark, spring: tx.cloudSpring } };
}

/* ---------- glossy syrup material (env map swapped per mood by the film) ---------- */
export const SYR_MATS = [];
export const syrMat = (o = {}) => { const m = new T.MeshStandardMaterial({ color: '#1b0b04', roughness: 0.14, metalness: 0.08, envMapIntensity: 0.9, emissive: '#1c0b05', emissiveIntensity: 0.5, ...o }); SYR_MATS.push(m); return m; };
const inkOf = (geo, w = 0.04) => { const h = new T.Mesh(geo, makeInk(w, false, PK)); h.userData.hull = 1; return h; };
function glossy(geo, x, y, z, w = 0.04, mat) { const m = new T.Mesh(geo, mat || syrMat()); m.position.set(x, y, z); if (w) m.add(inkOf(geo, w)); return m; }

/* ---------- 50-foot molasses tank: 8 plates, 3D oozing leaks, seam pulses, crack, deterministic ballistic burst (p0 + v0 dt + g dt^2/2, clamped at rest, no bounce) ---------- */
export function createMolassesTank(o = {}) {
  const R = o.radius || STREET.tankR, H = o.height || STREET.tankH, N = 8, th = 0.3, Y0 = 0.9;
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const rust = tm('#7b4a35'), rust2 = tm('#6c3f2d'), conc = tm('#928c80'), steel = tm('#3a3d42');
  const bandM = toon('#3f3a38'); bandM.emissive = new T.Color('#000000');
  const base = P(cyl(R + 1.2, R + 1.5, Y0, 64), conc, 0, Y0 / 2, 0, { w: 0.22 }); root.add(base);
  const fill = new T.Mesh(new T.CylinderGeometry(R - 0.12, R - 0.12, H, 56), syrMat()); fill.position.y = Y0 + H / 2; fill.visible = false; body.add(fill);
  const rnd = mulberry(1915), plates = [], rivetM = tm('#9a6248');
  for (let i = 0; i < N; i++) {
    const a0 = i / N * PI * 2, a1 = a0 + PI * 2 / N - 0.008, am = (a0 + a1) / 2, rm = R + th / 2, ph = H - 0.07;
    const arc = (r0, r1, aa, bb) => { const sh = new T.Shape(); sh.moveTo(Math.cos(aa) * r1, Math.sin(aa) * r1); sh.absarc(0, 0, r1, aa, bb, false); sh.lineTo(Math.cos(bb) * r0, Math.sin(bb) * r0); sh.absarc(0, 0, r0, bb, aa, true); sh.closePath(); return sh; };
    const cx = Math.cos(am) * rm, cz = -Math.sin(am) * rm;
    const g = new T.ExtrudeGeometry(arc(R, R + th, a0, a1), { depth: ph, bevelEnabled: false, curveSegments: 6 }); g.rotateX(-PI / 2); g.translate(-cx, -ph / 2, -cz);
    const m = P(g, i % 2 ? rust : rust2, cx, Y0 + 0.035 + ph / 2, cz, { w: 0.16 }); body.add(m);
    for (const yb of [0.0, H / 3, 2 * H / 3, H - 0.4]) { const bg = new T.ExtrudeGeometry(arc(R, R + th + 0.06, a0 + 0.004, a1 - 0.004), { depth: 0.4, bevelEnabled: false, curveSegments: 6 }); bg.rotateX(-PI / 2); bg.translate(-cx, yb + 0.02 - ph / 2, -cz); m.add(P(bg, bandM, 0, 0, 0, { w: 0.05, ink: false })); }
    const rows = [0.5, H / 3 + 0.6, H / 3 - 0.6, 2 * H / 3 + 0.6, 2 * H / 3 - 0.6, H - 0.7], per = 11, inst = new T.InstancedMesh(new T.SphereGeometry(0.09, 8, 6), rivetM, rows.length * per), mx = new T.Matrix4();
    rows.forEach((yy, ri) => { for (let k = 0; k < per; k++) { const a = a0 + 0.03 + (a1 - a0 - 0.06) * k / (per - 1), rr = R + th + 0.07; mx.makeTranslation(Math.cos(a) * rr - cx, yy - ph / 2 + 0.02, -Math.sin(a) * rr - cz); inst.setMatrixAt(ri * per + k, mx); } });
    inst.instanceMatrix.needsUpdate = true; inst.frustumCulled = false; m.add(inst);
    const dir = new T.Vector3(Math.cos(am), 0, -Math.sin(am)), back = dir.z < -0.6, vy0 = 4 + rnd() * 4;
    const spd = back ? 0 : 7 + rnd() * 5 + Math.max(0, dir.z) * 3, y0 = Y0 + 0.035 + ph / 2, yR = 0.5, tl = (vy0 + Math.sqrt(vy0 * vy0 + 2 * GRAV * (y0 - yR))) / GRAV;
    plates.push({ m, dir, base: m.position.clone(), back, spd, vy0, tl, ph, y0, yR, lat: (rnd() - 0.5) * 3, spin: (rnd() - 0.5) * 0.9, tilt: PI / 2 - 0.06 + rnd() * 0.05, delay: 0.04 * i });
  }
  const hD = 2.2, Rs = (R * R + hD * hD) / (2 * hD), dome = new T.Group(); body.add(dome);
  const DRX = -0.17, DRZ = 0.27, DY = (() => { const e = new T.Euler(DRX, 0, DRZ), v = new T.Vector3(); let m = 1e9; for (let k = 0; k < 96; k++) { const a = k / 96 * PI * 2; v.set(Math.cos(a) * (R + 0.1), Y0 + H + 0.05, Math.sin(a) * (R + 0.1)).applyEuler(e); m = Math.min(m, v.y); } return 0.12 - m; })();   // roof falls until its lowest rim point sits at y = 0.12 (on the cobbles), tilted ~18 deg
  dome.add(P(new T.SphereGeometry(Rs, 64, 10, 0, PI * 2, 0, Math.asin(R / Rs)), tm('#7b4a35', null, T.DoubleSide), 0, Y0 + H + hD - Rs, 0, { w: 0.18 })); dome.add(P(cyl(1.1, 1.1, 0.9, 20), steel, 0, Y0 + H + hD + 0.3, 0, { w: 0.08 })); dome.add(P(new T.TorusGeometry(R + 0.1, 0.16, 8, 64), steel, 0, Y0 + H + 0.05, 0, { r: [PI / 2, 0, 0], w: 0.08 }));
  const lad = new T.Group(); for (const s of [-0.35, 0.35]) lad.add(P(box(0.1, H + 0.6, 0.1), steel, s, (H + 0.6) / 2, 0, { w: 0.04 })); for (let y = 0.6; y < H; y += 0.7) lad.add(P(box(0.7, 0.07, 0.07), steel, 0, y, 0, { w: 0.03, ink: false }));
  lad.position.set(R + th + 0.12, Y0, -2.5); lad.rotation.y = PI / 2; body.add(lad);
  for (const [a, y] of [[0.5, 3.4], [PI + 0.4, 2.6]]) { const pg = new T.Group(); pg.add(P(cyl(0.38, 0.38, 3.2, 14), steel, 0, 0, 1.6, { r: [PI / 2, 0, 0], w: 0.06 })); pg.add(P(ball(0.5, 14), steel, 0, 0, 3.3, { w: 0.06 })); pg.add(P(cyl(0.38, 0.38, 3, 14), steel, 0, -1.5, 3.3, { w: 0.06 })); pg.position.set(Math.cos(a) * (R + 0.2), y, -Math.sin(a) * (R + 0.2)); pg.rotation.y = a - PI / 2 + PI; body.add(pg); }
  // ---- 3D leaks: bulging glossy streams hugging the wall + hanging/falling drops + glossy puddles ----
  const LEAKM = new T.MeshStandardMaterial({ color: '#2a1105', roughness: 0.3, metalness: 0, envMapIntensity: 0.12 }), leaks = [], RS = R + th + 0.04, LA = [[-PI / 2, 4.1, 2.6, 0.55], [-PI / 2 + 0.3, 7.0, 4.4, 0.12], [-PI / 2 - 0.32, 6.2, 3.6, 0.12]];
  for (let i = 0; i < 11; i++) LA.push(i < 0 ? null : [-PI / 2 + (rnd() - 0.5) * 2.4, Y0 + 4 + rnd() * (H - 5), 2.5 + rnd() * 6, 0.12]);
  LA.forEach(([a, top, len, floorY], i) => {
    const x = Math.cos(a) * RS, z = -Math.sin(a) * RS, grp = new T.Group(); grp.position.set(x, top, z); grp.rotation.y = Math.atan2(Math.cos(a), -Math.sin(a)); body.add(grp);
    const rad = 0.03 + rnd() * 0.016, geo = new T.CapsuleGeometry(rad, 1, 6, 10), st = glossy(geo, 0, -0.5, 0.0, 0, LEAKM); st.scale.set(1, 1, 1.2); grp.add(st);
    const bl = glossy(new T.SphereGeometry(0.11, 12, 9), 0, 0, 0.0, 0, LEAKM); bl.scale.set(1.2, 0.8, 0.6); grp.add(bl);
    const drops = [0, 1].map((k) => { const d = glossy(new T.SphereGeometry(0.06, 12, 9), 0, 0, 0.03, 0, LEAKM); grp.add(d); return { m: d, ph: i * 0.37 + k * 0.55 }; });
    const pd = glossy(new T.CylinderGeometry(1, 1, 0.05, 20), 0, 0, 0, 0.0, LEAKM); pd.userData.ink = 1; pd.visible = false; root.add(pd); pd.position.set(x * 1.0, floorY > 0.3 ? 0.07 : 0.06, z + 0.6);
    leaks.push({ grp, st, bl, drops, pd, top, len, floorY, i, x, z, wx: x, wz: z + STREET.tankZ });
  });
  const puddle = glossy(new T.CylinderGeometry(1, 1, 0.07, 30), 0, 0.04, R + 3.4, 0, LEAKM); puddle.scale.set(0.001, 1, 0.001); root.add(puddle);
  // crack across the front wall (reveals via drawRange)
  const crackPts = []; { const cr = RS + 0.02; for (let k = 0; k <= 26; k++) { const v = k / 26, y = Y0 + 1.2 + v * 9.5, a = -PI / 2 + 0.12 + Math.sin(v * 17) * 0.035 + Math.sin(v * 41) * 0.015 + v * 0.05; crackPts.push(new T.Vector3(Math.cos(a) * cr, y, -Math.sin(a) * cr)); } }
  const crackGeo = new T.TubeGeometry(new T.CatmullRomCurve3(crackPts), 90, 0.13, 6, false), crack = new T.Mesh(crackGeo, new T.MeshBasicMaterial({ color: '#0b0304' })); crack.frustumCulled = false; body.add(crack); const crackN = crackGeo.index.count; crack.visible = false;
  const ooze = glossy(new T.TubeGeometry(new T.CatmullRomCurve3(crackPts.map((p) => p.clone().multiplyScalar(1.0).add(new T.Vector3(0, 0, 0.0)))), 90, 0.07, 6, false), 0, 0, 0.0, 0); ooze.visible = false; ooze.position.z = 0.04; body.add(ooze);
  // rivets that ping off like bullets
  const pings = [0, 1, 2].map((k) => { const m = P(ball(0.2, 10), tm('#d99a66'), 0, 0, 0, { w: 0.04 }); m.visible = false; body.add(m); const a = -PI / 2 + (k - 1) * 0.16; return { m, a, y: Y0 + H / 3 + 0.6 * (k - 1), v: 16 + k * 3, vy: 3 + k * 1.5, vx: (k - 1) * 3 }; });
  // vibration lines
  const vib = []; { const vm = new T.MeshBasicMaterial({ color: '#fff2c8' }); for (let k = 0; k < 22; k++) { const a = -PI / 2 + (k - 6.5) * 0.075, y = Y0 + H / 3 + ((k % 3) - 1) * 0.55, m = new T.Mesh(new T.BoxGeometry(0.1, 0.8, 0.06), vm), rr = R + th + 0.5 + (k % 2) * 0.25; m.position.set(Math.cos(a) * rr, y, -Math.sin(a) * rr); m.rotation.set(0, Math.atan2(Math.cos(a), -Math.sin(a)), (k % 2 ? 0.5 : -0.5)); m.visible = false; body.add(m); vib.push(m); } }
  const seamCrack = (() => { const pts = [], cr = R + th + 0.018; for (let k = 0; k <= 40; k++) { const v = k / 40, a = -PI / 2 - 0.42 + v * 0.84; pts.push(new T.Vector3(Math.cos(a) * cr, Y0 + H / 3 + 0.04 + (k % 2 ? 0.025 : -0.025) * Math.sin(v * 30), -Math.sin(a) * cr)); } const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 80, 0.014, 5, false), new T.MeshBasicMaterial({ color: '#ff8a30' })); m.visible = false; m.frustumCulled = false; body.add(m); return m; })();
  const api = { group: root, body, plates, leaks, radius: R, height: H, _leak: 0, tankZ: STREET.tankZ,
    setLeak(a) { api._leak = clamp(a, 0, 1); for (const L of leaks) { const k = L.i < 3 ? 0.88 + 0.12 * a : a, l = Math.max(0.001, L.len * k); L.st.scale.y = l; L.st.position.y = -l / 2; L.bl.visible = k > 0.02; L.curLen = l; } puddle.scale.set(0.001 + a * 2.2, 1, 0.001 + a * 2.2 * 0.6); },
    leakEnd(i = 0) { const L = leaks[i]; return new T.Vector3(L.wx, L.top - (L.curLen || L.len), L.wz); },
    shake(intensity = 0, time = 0) { const k = intensity; body.position.set(k * 0.45 * (Math.sin(time * 53.1) + 0.6 * Math.sin(time * 87.3 + 1.1)), k * 0.12 * Math.sin(time * 61.7 + 0.4), k * 0.45 * (Math.sin(time * 47.9 + 2.0) + 0.6 * Math.sin(time * 73.7))); body.rotation.set(k * 0.01 * Math.sin(time * 41.3), 0, k * 0.01 * Math.sin(time * 53.3)); },
    // leak animation (drops hang, swell, fall under gravity into the puddle). Pure function of t.
    animate(t, burst) {
      for (const L of leaks) { const on = burst < 0 && (L.i < 3 || api._leak > 0.15); L.grp.visible = on; L.pd.visible = on && L.i < 3; if (!on) continue; const endY = L.top - L.curLen, drop = Math.max(0.05, endY - L.floorY), tf = Math.sqrt(2 * drop / GRAV), hold = 0.7, per = hold + tf + 0.25;
        L.pd.scale.set(0.35 + 0.1 * Math.sin(t * 0.7 + L.i), 1, 0.25); L.pd.position.y = L.floorY > 0.3 ? 0.07 : 0.06; if (L.floorY > 0.3) L.pd.visible = false;
        L.drops.forEach((d, k) => { const u = ((t * (0.9 + 0.05 * L.i) + d.ph) % per + per) % per; let y, sc = 1, sx = 1;
          if (u < hold) { const s = u / hold; y = -L.curLen - 0.05 - 0.1 * s * s; sc = 0.35 + 0.65 * s; } else if (u < hold + tf) { const q = u - hold; y = -L.curLen - 0.15 - 0.5 * GRAV * q * q; sc = 1; } else { const q = (u - hold - tf) / 0.25; y = -(endY - L.floorY) - L.curLen; sc = 0.0001; sx = 0; if (q < 1 && L.i < 3) { y = -(endY - L.floorY) - L.curLen + 0.03; sc = 0.5 * (1 - q); sx = 1 + 2.2 * q; } }
          if (y < -(L.top - L.floorY) + 0.02) y = -(L.top - L.floorY) + 0.02; d.m.position.y = y; d.m.scale.set(sc * sx, sc * 1.35 / Math.max(1, sx * 0.8), sc * sx); d.m.visible = sc > 0.01; }); } },
    seamFx(t, t0) {   // 8s -> pulse red-orange + vibration lines + 3 rivet pings (t0 = ping time)
      const u = t - (t0 - 2.0), on = u > 0 && t < t0 + 1.6, pulse = on ? (0.5 + 0.5 * Math.sin(t * 17)) * Math.min(1, u * 2) : 0; bandM.emissive.set(pulse > 0 ? new T.Color('#ff4a12').multiplyScalar(pulse * 0.14) : 0x000000); seamCrack.visible = on; seamCrack.material.color.set('#ff8a30').multiplyScalar(0.6 + 0.6 * pulse);
      vib.forEach((m) => { m.visible = false; });
      for (const p of pings) { const q = t - t0; p.m.visible = q > 0 && q < 1.6; if (!p.m.visible) continue; const rr = R + th + 0.1; p.m.position.set(Math.cos(p.a) * rr + p.vx * q * 0.2, Math.max(0.2, p.y + p.vy * q - 0.5 * GRAV * q * q), -Math.sin(p.a) * rr + p.v * q); } },
    setCrack(p) { p = clamp(p, 0, 1); crack.visible = ooze.visible = p > 0.01; crackGeo.setDrawRange(0, Math.floor(crackN * p / 3) * 3); },
    // ballistic burst: dt = seconds since BOOM (<=0: intact)
    burst(dt) { const on = dt > 0; fill.visible = on; if (on) { const k = 1 - Math.exp(-dt / 0.7); fill.scale.y = Math.max(0.03, 1 - 0.97 * k); fill.position.y = Y0 + H * fill.scale.y / 2; fill.scale.x = fill.scale.z = 1 + 0.06 * Math.sin(dt * 10) * Math.exp(-dt * 2); crack.visible = crack.visible && !on; ooze.visible = ooze.visible && !on; }
      for (const q of plates) { const m = q.m; if (!on) { m.position.copy(q.base); m.quaternion.identity(); m.scale.set(1, 1, 1); continue; }
        const d = Math.max(0, dt - q.delay);
        if (q.back) {   // buckle: hinge-falls outward (dt^2) then crumples onto the foundation
          const a = Math.min(1.42, 0.5 * (1.3 + q.spin) * d * d), cr = clamp((a - 0.9) / 0.5, 0, 1), ax = new T.Vector3(q.dir.z, 0, -q.dir.x), qa = new T.Quaternion().setFromAxisAngle(ax, a);
          const up = new T.Vector3(0, q.ph / 2 * (1 - 0.4 * cr), 0).applyQuaternion(qa); m.position.set(q.base.x + up.x, q.base.y - q.ph / 2 + up.y - 0.78 * cr, q.base.z + up.z); m.quaternion.copy(qa); m.scale.set(1, 1 - 0.4 * cr, 1); continue; }
        const tq = Math.min(d, q.tl), ex = d - q.tl, sl = ex > 0 ? 0.12 * (1 - Math.exp(-ex / 0.12)) : 0, tan = new T.Vector3(-q.dir.z, 0, q.dir.x);
        m.position.set(q.base.x + q.dir.x * q.spd * (tq + sl) + tan.x * q.lat * tq / q.tl, Math.max(q.yR, q.y0 + q.vy0 * tq - 0.5 * GRAV * tq * tq), q.base.z + q.dir.z * q.spd * (tq + sl) + tan.z * q.lat * tq / q.tl);
        const k = tq / q.tl, qa = new T.Quaternion().setFromAxisAngle(new T.Vector3(q.dir.z, 0, -q.dir.x), q.tilt * k * k), qb = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), q.spin * tq); m.quaternion.copy(qb).multiply(qa); m.scale.set(1, 1, 1); }
      const df = Math.max(0, dt - 0.3), tf = Math.sqrt(2 * Math.abs(DY) / GRAV), qd = Math.min(df, tf), kk = (qd / tf) ** 2; dome.position.y = on ? -0.5 * GRAV * qd * qd : 0; dome.rotation.set(on ? DRX * kk : 0, 0, on ? DRZ * kk : 0); base.scale.y = on ? 0.14 : 1; base.position.y = on ? Y0 * 0.07 : Y0 / 2;
      lad.visible = !on; },
    landings(boom) { const out = []; for (const q of plates) { if (q.back) out.push({ t: boom + q.delay + 1.0, x: q.base.x + q.dir.x * 3, z: q.base.z + q.dir.z * 3 + STREET.tankZ, s: 2.6 }); else { const d = q.delay + q.tl; out.push({ t: boom + d, x: q.base.x + q.dir.x * q.spd * q.tl, z: q.base.z + q.dir.z * q.spd * q.tl + STREET.tankZ, s: 3.2 }); } } out.push({ t: boom + 0.3 + Math.sqrt(2 * (H - 0.2) / GRAV), x: 0, z: STREET.tankZ, s: 4.6 }); return out; } };
  api.setLeak(0); api.burst(0); root.position.set(0, 0, STREET.tankZ); return api;
}

/* ---------- 25-foot molasses wave: one parametric sheet — rounded curling crest with overlapping animated lobes — plus a rippling flood surface ---------- */
export function createMolassesWave(o = {}) {
  const W = o.width || 20, zStart = o.zStart ?? STREET.tankFront, root = new T.Group(), mat = syrMat({ side: T.DoubleSide, roughness: 0.35, metalness: 0.02 });
  const prof = [[-4, 0.0], [-3, 0.04], [-1.9, 0.24], [-0.9, 0.64], [0.2, 1.0], [1.3, 0.99], [2.0, 0.82], [1.95, 0.6], [1.45, 0.62], [1.0, 0.5], [0.5, 0.2], [0.25, 0.0]];   // normalised crest profile (z,y); y relative to flood level, last points drop to the street
  const curve = new T.CatmullRomCurve3(prof.map(([z, y]) => new T.Vector3(z, y, 0)), false, 'centripetal'); const M = 48, NX = 52, cp = curve.getSpacedPoints(M).map((p) => [p.x, p.y]);
  const geo = new T.BufferGeometry(), pos = new Float32Array((NX + 1) * (M + 1) * 3); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(pos.length), 3));
  const idx = []; for (let i = 0; i < NX; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); } geo.setIndex(idx);
  const sheet = new T.Mesh(geo, mat); sheet.frustumCulled = false; sheet.add(new T.Mesh(geo, makeInk(0.1, false, PK))); sheet.children[0].frustumCulled = false; root.add(sheet);
  const NF = 28, NZ = 60, fg = new T.PlaneGeometry(1, 1, NF, NZ); fg.rotateX(-PI / 2); const fmat = new T.MeshPhysicalMaterial({ color: '#1c0903', roughness: 0.35, metalness: 0.02, envMapIntensity: 0.2, emissive: '#2a1105', emissiveIntensity: 0.4, specularColor: new T.Color('#331407'), specularIntensity: 0.08, side: T.DoubleSide }); SYR_MATS.push(fmat); const flood = new T.Mesh(fg, fmat); flood.frustumCulled = false; root.add(flood);
  const rnd = mulberry(25), blobs = []; for (let i = 0; i < 9; i++) { const m = glossy(new T.SphereGeometry(0.5, 12, 9), 0, 0, 0, 0.05); root.add(m); blobs.push({ m, x: (rnd() - 0.5) * (W - 6), ph: rnd() * 6 }); }
  const lobe = (x, t) => 1 + 0.08 * Math.sin(x * 0.55 + t * 0.64) + 0.045 * Math.sin(x * 1.05 - t * 0.84 + 1) + 0.012 * Math.sin(x * 1.9 + t * 1.3), adv = (x, t) => 0.3 * (Math.sin(x * 0.6 - t * 0.5) + 0.3 * Math.sin(x * 1.2 + t * 0.76));
  const edge = (x) => { const e = clamp((W / 2 - Math.abs(x)) / 3, 0, 1); return 0.25 + 0.75 * e * e * (3 - 2 * e); };
  const api = { group: root, pos: zStart, height: 0, crestK: 1, time: 0,
    setLook(k) { const wt = k === 'water'; mat.color.set(wt ? '#14c8da' : '#1b0b04'); mat.emissive.set(wt ? '#0a7f95' : '#1c0b05'); mat.roughness = wt ? 0.25 : 0.35; fmat.color.set(wt ? '#18bccf' : '#1c0903'); fmat.emissive.set(wt ? '#0b7a90' : '#2a1105'); fmat.roughness = wt ? 0.3 : 0.35; },
    setWavePos(z) { api.pos = z; api._u(); }, setFloodHeight(y) { api.height = y; api._u(); }, setCrest(k) { api.crestK = clamp(k, 0, 1); api._u(); }, update(t) { api.time = t; api._u(); },
    _u() { const z = api.pos, len = z - zStart, h = api.height, t = api.time; root.visible = len > 0.05 && h > 0.01; if (!root.visible) return; root.position.set(0, 0, z);
      const ch = Math.max(0.0001, h * 1.25 * api.crestK), p = geo.attributes.position.array, amp = Math.min(0.08, h * 0.35);
      for (let i = 0; i <= NX; i++) { const x = -W / 2 + W * i / NX, lb = lobe(x, t) * edge(x), ad = adv(x, t) * ch * 0.45;
        for (let j = 0; j <= M; j++) { const [zn, yn] = cp[j], k = (i * (M + 1) + j) * 3; let yy, zz;
          if (yn <= 0.0001 && zn > 0) { yy = 0.0; zz = 0.0; } else { yy = h + yn * ch * lb; zz = zn * ch + (zn > 0.3 ? ad : 0); if (zn >= 0.2 && yn < 0.3) { const f = clamp(yn / 0.3, 0, 1); yy = h * f + yn * ch * lb * f; zz = zn * ch * f + (1 - f) * 0.0; } }
          if (zn > 0.2 || yn > 0.01) yy += 0.012 * ch * Math.sin(zn * 4 + x * 1.1 - t * 1.8) * (yn > 0.3 ? 1 : 0.3);
          p[k] = x; p[k + 1] = Math.max(0, yy); p[k + 2] = zz; } }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
      const back = -4 * ch - 0.2, L = Math.max(0.5, -back + (len - 0) ), fp = fg.attributes.position.array; flood.position.set(0, 0, 0);
      for (let i = 0, kk = 0; i <= NZ; i++) { const v = i / NZ, zz = back - Math.pow(v, 1.7) * Math.min(L, 140); for (let j = 0; j <= NF; j++, kk += 3) { const x = -W / 2 + W * j / NF; fp[kk] = x; fp[kk + 2] = Math.max(zz, -len - 1); fp[kk + 1] = h + amp * (Math.sin(zz * 0.9 + x * 0.6 - t * 2.2) + 0.6 * Math.sin(zz * 1.7 - x * 1.1 + t * 1.6)); } }
      fg.attributes.position.needsUpdate = true; fg.computeVertexNormals(); flood.visible = len > 1;
      for (const b of blobs) { b.m.visible = false; if (1) continue; const lb = lobe(b.x, t) * edge(b.x); b.m.position.set(b.x, h + ch * (0.7 + 0.1 * Math.sin(t * 3 + b.ph)) * lb, ch * (1.95 + 0.1 * Math.sin(t * 4 + b.ph)) + adv(b.x, t) * ch * 0.45); b.m.scale.setScalar(Math.max(0.05, ch * 0.09)); } } };
  api._u(); return api;
}

/* ---------- finale gag: pancake stack with syrup and wavy scent lines ---------- */
export function createPancakes() {
  const g = new T.Group(), cake = tm('#e0a85a'), edge = tm('#c58a3c'), syr = tm('#4a2410'), plate = tm('#f5efe2'), butter = tm('#f7e08a'), rnd = mulberry(11);
  g.add(P(cyl(1.0, 0.78, 0.1, 40), plate, 0, 0.05, 0, { w: 0.03 })); g.add(P(new T.TorusGeometry(0.98, 0.05, 8, 40), plate, 0, 0.1, 0, { r: [PI / 2, 0, 0], w: 0.025 }));
  let y = 0.1; for (let i = 0; i < 5; i++) { const r = 0.7 + (rnd() - 0.5) * 0.06, h = 0.17; g.add(P(cyl(r, r, h, 36), i % 2 ? edge : cake, (rnd() - 0.5) * 0.05, y + h / 2, (rnd() - 0.5) * 0.05, { w: 0.022 })); y += h * 0.94; }
  g.add(P(cyl(0.56, 0.6, 0.045, 30), syr, 0, y + 0.02, 0, { w: 0.015 }));
  for (const [a, l, w] of [[0.3, 0.55, 0.09], [1.9, 0.38, 0.08], [3.3, 0.7, 0.1], [4.5, 0.42, 0.08], [5.5, 0.6, 0.085]]) { const r = 0.62; g.add(P(new T.CapsuleGeometry(w, l, 4, 10), syr, Math.cos(a) * r, y - l / 2 - 0.02, Math.sin(a) * r, { w: 0.012 })); }
  g.add(P(box(0.26, 0.1, 0.26), butter, 0.04, y + 0.1, 0.02, { r: [0, 0.4, 0], w: 0.015 }));
  g.add(P(cyl(0.9, 0.9, 0.12, 36), tm('#8a6238'), 0, -0.08, 0, { w: 0.03 }));   // little table top
  const lines = [];
  for (let i = 0; i < 2; i++) { const pts = []; for (let k = 0; k <= 24; k++) { const v = k / 24; pts.push(new T.Vector3(Math.sin(v * PI * 3 + i) * 0.08, v * 0.9, 0)); } const m = P(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 36, 0.016, 6, false), tm('#fff6df'), (i - 0.5) * 0.36, y + 0.5, 0, { w: 0.006 }); g.add(m); lines.push({ m, x: (i - 0.5) * 0.36, ph: i / 3 }); }
  g.userData.top = y;
  return { group: g, top: y, lines, update(t) { for (const l of lines) { const u = (t * 0.32 + l.ph) % 1, s = Math.max(0.001, Math.sin(PI * u)); l.m.scale.set(s, s, s); l.m.position.set(l.x + Math.sin(t * 2 + l.ph * 6) * 0.04, y + 0.28 + u * 0.9, 0); } } };
}

/* ---------- bucket full of syrup (kids catching leaks) ---------- */
export function createBucket() {
  const g = new T.Group(), tin = tm('#8d9296'), syr = tm('#2a1409');
  g.add(P(cyl(0.2, 0.15, 0.32, 18, true), tin, 0, 0.16, 0, { w: 0.02 }));
  g.add(P(cyl(0.15, 0.15, 0.03, 18), tin, 0, 0.015, 0, { w: 0.015, ink: false }));
  g.add(P(cyl(0.185, 0.185, 0.02, 18), syr, 0, 0.24, 0, { ink: false }));
  g.add(P(new T.TorusGeometry(0.2, 0.012, 6, 18, PI), tin, 0, 0.32, 0, { w: 0.012, ink: false }));
  return g;
}
