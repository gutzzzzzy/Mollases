// Impact VFX, mood environments and gag props for the Great Molasses Flood film. Everything is a pure function of the timestamp.
import { toon, makeInk, mulberry, clamp, INK_K } from './engine.js';
const T = window.THREE, PI = Math.PI, GRAV = 9.8, sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, eOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3), eExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(x, 0, 1)));
export { sm, eOut, eExpo };
const HK = { value: 1 };
const cel = (geo, mat, w = 0.04) => { const m = new T.Mesh(geo, mat); m.castShadow = true; if (w) { const h = new T.Mesh(geo, makeInk(w, false, INK_K)); h.userData.hull = 1; m.add(h); } return m; };
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c) => { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };

/* ---------- environment maps (equirect sky incl. lamp glints) for glossy syrup reflections ---------- */
export function makeEnvs(renderer) {
  const mk = (stops, sun, lamp) => { const [c, g] = cv(1024, 512), gr = g.createLinearGradient(0, 0, 0, 512); stops.forEach(([p, col]) => gr.addColorStop(p, col)); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    if (sun) { const r = g.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], 90); r.addColorStop(0, 'rgba(255,250,230,1)'); r.addColorStop(0.2, 'rgba(255,240,200,.8)'); r.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = r; g.fillRect(0, 0, 1024, 512); }
    for (let i = 0; i < 26; i++) { const x = i * 40 + 10, y = 238 + (i % 3) * 5; const r = g.createRadialGradient(x, y, 0, x, y, 14); r.addColorStop(0, lamp); r.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = r; g.fillRect(x - 14, y - 14, 28, 28); }
    g.fillStyle = '#7a6a56'; g.fillRect(0, 262, 1024, 250);
    const t = new T.CanvasTexture(c); t.mapping = T.EquirectangularReflectionMapping; t.colorSpace = T.SRGBColorSpace; const pm = new T.PMREMGenerator(renderer); const e = pm.fromEquirectangular(t).texture; pm.dispose(); return e; };
  return { sun: mk([[0, '#4f7fb5'], [0.45, '#8fb0cc'], [0.5, '#b9c4cc']], [300, 120], 'rgba(255,245,210,1)'), gloom: mk([[0, '#4a5058'], [0.45, '#7a6c60'], [0.5, '#a58a6c']], [620, 90], 'rgba(255,200,120,1)') };
}

/* ---------- VFX: cel dust puffs, sparks, shockwave rings, steam ---------- */
export function createVFX(scene) {
  const grp = new T.Group(); scene.add(grp); const rnd = mulberry(404);
  const dustM = toon('#e3d7c0'), dustD = toon('#cbbda2'), sparkM = new T.MeshBasicMaterial({ color: '#ffd46a' }), steamM = toon('#ffffff');
  const puffs = [], sparks = [];
  const api = { group: grp,
    puff(t0, x, y, z, size = 2.4, dur = 1.5) { puffs.push({ t0, x, y, z, size, dur, balls: null }); },
    spark(t0, x, y, z, n = 10) { sparks.push({ t0, x, y, z, n, bits: null }); },
    build() { for (const p of puffs) { p.balls = []; for (let j = 0; j < 9; j++) { const m = cel(new T.SphereGeometry(1, 12, 9), j % 2 ? dustM : dustD, 0.05); m.visible = false; grp.add(m); p.balls.push({ m, a: rnd() * PI * 2, sp: 0.8 + rnd() * 1.6, rs: 0.22 + rnd() * 0.3, up: 0.3 + rnd() * 1.1 }); } }
      for (const s of sparks) { s.bits = []; for (let j = 0; j < s.n; j++) { const m = new T.Mesh(new T.BoxGeometry(0.12, 0.12, 0.12), sparkM); m.visible = false; grp.add(m); s.bits.push({ m, a: rnd() * PI * 2, v: 3 + rnd() * 5, vy: 3 + rnd() * 5 }); } } },
    update(t) {
      for (const p of puffs) { const u = (t - p.t0) / p.dur, on = u >= 0 && u <= 1; for (const b of p.balls) { b.m.visible = on; if (!on) continue; const r = p.size * b.sp * (1 - Math.exp(-u * 4)) * 0.9, up = p.size * b.up * eOut(u) * 0.9;
        const rr = Math.min(r, 2.0) * 0.8; b.m.position.set(p.x + Math.cos(b.a) * rr, clamp(p.y + 0.3 + up * 0.45, 0.2, 1.6), p.z + Math.sin(b.a) * rr); b.m.scale.setScalar(Math.max(0.001, Math.min(0.6, p.size * 0.3 * b.rs * (0.35 + 0.75 * eOut(u * 1.3))) * (1 - sm((u - 0.6) / 0.4)))); } }
      for (const s of sparks) { const q = t - s.t0, on = q >= 0 && q < 0.9; for (const b of s.bits) { b.m.visible = on; if (on) b.m.position.set(s.x + Math.cos(b.a) * b.v * q, Math.max(0.05, s.y + b.vy * q - 0.5 * GRAV * q * q), s.z + Math.sin(b.a) * b.v * q); } } } };
  // shockwave: flat expanding ring + thin second ring
  const rm = new T.MeshBasicMaterial({ color: '#fff3d6', transparent: true, depthWrite: false, side: T.DoubleSide }), ring = new T.Mesh(new T.RingGeometry(0.86, 1, 72, 1), rm), ring2 = new T.Mesh(new T.RingGeometry(0.93, 1, 72, 1), rm.clone());
  for (const r of [ring, ring2]) { r.rotation.x = -PI / 2; r.position.y = 0.15; r.visible = false; r.frustumCulled = false; grp.add(r); }
  api.shock = (t, t0, x, z) => { const u = (t - t0) / 1.4, on = u >= 0 && u <= 1; ring.visible = ring2.visible = on; if (!on) return; const R = 3 + 52 * eExpo(u); ring.position.set(x, 0.15, z); ring2.position.set(x, 0.18, z); ring.scale.setScalar(R); ring2.scale.setScalar(R * 0.82); ring.material.opacity = 0.9 * (1 - u); ring2.material.opacity = 0.7 * (1 - u); };
  // cartoon steam from two anchors
  const steam = []; for (let k = 0; k < 12; k++) { const m = cel(new T.SphereGeometry(1, 10, 8), steamM, 0.012); m.visible = false; grp.add(m); steam.push(m); }
  api.steam = (t, t0, t1, anchors) => { steam.forEach((m, k) => { const side = k % 2, i = k >> 1, on = t >= t0 && t <= t1 && anchors; m.visible = !!on; if (!on) return; const u = ((t * 1.7 + i / 6) % 1), a = anchors[side]; m.position.set(a.x + (side ? 1 : -1) * (0.04 + u * 0.28), a.y + u * 0.34, a.z + 0.04 * Math.sin(u * 9 + i)); m.scale.setScalar(Math.max(0.001, 0.032 * Math.sin(PI * Math.min(1, u * 1.15)) + 0.004)); }); };
  return api;
}

/* ---------- full-screen impact flash (camera child) ---------- */
export function createFlash(camera) { const m = new T.Mesh(new T.PlaneGeometry(4, 4), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthTest: false, depthWrite: false, toneMapped: false })); m.renderOrder = 998; m.position.z = -0.5; m.frustumCulled = false; m.visible = false; camera.add(m); return { set(op) { m.visible = op > 0.01; m.material.opacity = op; } }; }

/* ---------- gag props ---------- */
export function createNewspaper(camera) {   // 1919 complaint sheet that pops in and spins toward the lens
  const [c, g] = cv(512, 680); g.fillStyle = '#e9dfc2'; g.fillRect(0, 0, 512, 680); g.fillStyle = '#2b1a2a'; g.font = '900 54px Georgia'; g.textAlign = 'center'; g.fillText('BOSTON POST', 256, 70); g.fillRect(30, 84, 452, 5); g.fillRect(30, 94, 452, 2);
  g.font = '900 64px Georgia'; g.fillText('TANK LEAKS', 256, 180); g.fillText('AGAIN!', 256, 250); g.font = 'bold 26px Georgia'; g.fillText('RESIDENTS COMPLAIN TO CITY', 256, 305); g.fillStyle = '#6a5a4a'; for (let y = 340; y < 640; y += 22) g.fillRect(40, y, y % 3 ? 430 : 300, 8);
  g.fillStyle = '#9b2f22'; g.font = '900 34px Georgia'; g.save(); g.translate(380, 560); g.rotate(-0.25); g.strokeStyle = '#9b2f22'; g.lineWidth = 4; g.strokeRect(-110, -34, 220, 56); g.fillText('COMPLAINT', 0, 4); g.restore();
  const m = new T.Mesh(new T.PlaneGeometry(1.5, 1.99), new T.MeshBasicMaterial({ map: tex(c), side: T.DoubleSide })); m.visible = false; m.renderOrder = 900; m.material.depthTest = false; camera.add(m);
  return { set(t, t0, dur = 1.7) { const u = (t - t0) / dur; const vw = 2 * Math.tan(camera.fov * PI / 360) * 2.3 * camera.aspect, fit = Math.min(1, 0.36 * vw / 1.5); m.visible = u > 0 && u < 1; if (!m.visible) return; const a = eOut(u * 2.2), sc = (u < 0.15 ? sm(u / 0.15) * 1.15 : 1.15 - 0.15 * sm((u - 0.15) / 0.1)) * (1 - sm((u - 0.85) / 0.15)); m.position.set(0.03 * vw * eOut(Math.min(1, u * 3)) + 0.02 * Math.sin(u * 6), 0.12 + 0.03 * Math.sin(u * 9), -2.3 + 0.4 * eOut(u)); m.rotation.set(0.1, a * PI * 4 - 0.15, -0.12 + 0.2 * Math.sin(u * 5)); m.scale.setScalar(Math.max(0.001, sc * fit)); } };
}
export function createMagnifier() {
  const g = new T.Group(), brass = toon('#d9b34a'); g.add(cel(new T.TorusGeometry(0.42, 0.05, 10, 36), brass, 0.02));
  const lens = new T.Mesh(new T.CircleGeometry(0.4, 32), new T.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false })); g.add(lens);
  const h = cel(new T.CylinderGeometry(0.055, 0.07, 0.7, 10), toon('#4a2f1c'), 0.02); h.position.set(0.0, -0.8, 0); g.add(h);
  // magnified patch of the fallen plate seen THROUGH the lens: rust-brown steel, 3 intact domed rivets and 2 sheared stubs
  const disc = new T.Mesh(new T.CircleGeometry(0.385, 36), toon('#6c3f2d')); disc.position.z = -0.012; g.add(disc);
  const seam = new T.Mesh(new T.PlaneGeometry(0.78, 0.035), toon('#2f1a12')); seam.position.set(0, -0.02, -0.008); g.add(seam);
  [[-0.12, 0.1, 0.3], [0.1, -0.06, -0.5], [0.0, -0.17, 0.9]].forEach(([px, py, rz]) => { const j = new T.Mesh(new T.ShapeGeometry((() => { const s = new T.Shape(); s.moveTo(-0.07, 0); s.lineTo(0.0, 0.1); s.lineTo(0.07, 0); s.lineTo(0.02, -0.04); s.closePath(); return s; })()), toon('#24140d')); j.position.set(px, py, 0.01); j.rotation.z = rz; g.add(j); });   // jagged shear marks, no round heads
  return g;
}
export function createEvidencePlate(bare) {   // fallen rusty plate with snapped rivets
  const g = new T.Group(), R = 3.2, th = 0.16, sh = new T.Shape(), a0 = -0.28, a1 = 0.28; sh.moveTo(Math.cos(a0) * (R + th), Math.sin(a0) * (R + th)); sh.absarc(0, 0, R + th, a0, a1, false); sh.lineTo(Math.cos(a1) * R, Math.sin(a1) * R); sh.absarc(0, 0, R, a1, a0, true); sh.closePath();
  const geo = new T.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: false, curveSegments: 10 }); geo.rotateX(-PI / 2); geo.translate(-R, 0, 0); const plate = cel(geo, toon('#6c3f2d'), 0.04); g.add(plate);
  const rv = toon('#a8683f'), stub = toon('#3a2218'); for (let r = 0; r < (bare ? 0 : 3); r++) for (let k = 0; k < 6; k++) { const a = a0 + 0.07 + k * 0.083, y = 0.35 + r * 0.45, snapped = (k * 3 + r * 5) % 4 === 1; const x = Math.cos(a) * (R + th) - R, z = 0.0; const m = snapped ? cel(new T.CylinderGeometry(0.05, 0.08, 0.05, 8), stub, 0.015) : cel(new T.SphereGeometry(0.09, 8, 6), rv, 0.015); m.position.set(x + 0.01, y, Math.sin(a) * (R + th)); m.rotation.x = PI / 2; g.add(m); if (snapped) { const s2 = cel(new T.CylinderGeometry(0.03, 0.05, 0.04, 6), toon('#d9a066'), 0.01); s2.position.set(x + 0.02, y, Math.sin(a) * (R + th) + 0.04); s2.rotation.x = PI / 2; g.add(s2); } }
  g.rotation.y = -PI / 2; return g;
}
export function createStampDoc() {
  const mk = (stamp) => { const [c, g] = cv(400, 520); g.fillStyle = '#efe5c8'; g.fillRect(0, 0, 400, 520); g.fillStyle = '#2b1a2a'; g.font = 'bold 30px Georgia'; g.textAlign = 'center'; g.fillText('FINDINGS OF THE COURT', 200, 56); g.fillRect(30, 70, 340, 3); g.fillStyle = '#6a5a4a'; for (let y = 100; y < 330; y += 22) g.fillRect(34, y, y % 3 ? 330 : 240, 8); g.fillStyle = '#2b1a2a'; g.font = 'bold 22px Georgia'; g.fillText('RE: DAMAGES — US INDUSTRIAL ALCOHOL', 200, 372);
    if (stamp) { g.save(); g.translate(200, 420); g.rotate(-0.28); g.strokeStyle = '#c4262e'; g.fillStyle = '#c4262e'; g.lineWidth = 12; g.strokeRect(-178, -62, 356, 124); g.font = '900 88px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.fillText('LIABLE', 0, 32); g.restore(); } return tex(c); };
  const g = new T.Group(), paperM = new T.MeshBasicMaterial({ map: mk(false) }), stampT = mk(true), plain = paperM.map;
  const paper = new T.Mesh(new T.PlaneGeometry(1.0, 1.3), paperM); paper.rotation.x = -PI / 2 + 0.2; paper.position.y = 0.16; g.add(paper); g.scale.setScalar(0.8); const st = new T.Group(); st.add(cel(new T.CylinderGeometry(0.2, 0.22, 0.12, 14), toon('#3a2a1c'), 0.02)); const hd = cel(new T.CylinderGeometry(0.06, 0.06, 0.4, 10), toon('#6a4a2a'), 0.02); hd.position.y = 0.26; st.add(hd); const kn = cel(new T.SphereGeometry(0.13, 10, 8), toon('#6a4a2a'), 0.02); kn.position.y = 0.5; st.add(kn); g.add(st);
  // 1919 bills stack + $628,000 DAMAGES badge (local coords, right of the paper)
  const billT = (() => { const [c, q] = cv(256, 128); q.fillStyle = '#b9d6a6'; q.fillRect(0, 0, 256, 128); q.strokeStyle = '#2b1a2a'; q.lineWidth = 8; q.strokeRect(6, 6, 244, 116); q.fillStyle = '#2b1a2a'; q.font = '900 60px Georgia'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('$ 1919', 128, 64); return tex(c); })();
  const bills = new T.Group(); bills.position.set(1.45, 0.03, -0.1); g.add(bills); const bl = [];
  for (let k = 0; k < 8; k++) { const b = cel(new T.BoxGeometry(0.9, 0.04, 0.42), toon('#a8c796'), 0.012); b.rotation.y = 0.07 * Math.sin(k * 2.3); b.position.x = 0.02 * Math.sin(k * 1.7); if (k === 7) { const tp = new T.Mesh(new T.PlaneGeometry(0.86, 0.38), new T.MeshBasicMaterial({ map: billT, toneMapped: false })); tp.rotation.x = -PI / 2; tp.position.y = 0.022; b.add(tp); } bills.add(b); bl.push(b); }
  const [bc, bq] = cv(512, 256); bq.fillStyle = '#c4262e'; bq.strokeStyle = '#2b1a2a'; bq.lineWidth = 14; bq.beginPath(); bq.roundRect(10, 10, 492, 236, 40); bq.fill(); bq.stroke(); bq.fillStyle = '#fffdf4'; bq.textAlign = 'center'; bq.textBaseline = 'middle'; bq.font = '900 112px Arial Black, Impact, sans-serif'; bq.fillText('$628,000', 256, 96); bq.font = '900 70px Arial Black, Impact, sans-serif'; bq.fillText('DAMAGES', 256, 190);
  const badge = new T.Mesh(new T.PlaneGeometry(0.9, 0.45), new T.MeshBasicMaterial({ map: tex(bc), transparent: true, toneMapped: false })); badge.rotation.x = -PI / 2 + 0.5; badge.position.set(1.3, 0.1, 0.8); g.add(badge);
  g.userData.set = (t, t0) => { const q = t - t0; const hit = q >= 0.35; paperM.map = hit ? stampT : plain; const lift = q < 0 ? 1.4 : q < 0.35 ? 1.4 * (1 - sm(q / 0.35)) + 0.07 : q < 0.5 ? 0.07 : q < 1.1 ? 0.07 + 0.9 * sm((q - 0.5) / 0.6) : 0.97; st.position.set(0.1, lift, -0.25); st.rotation.z = 0.1; st.visible = lift < 0.95; paperM.needsUpdate = true;
    bl.forEach((b, k) => { const s0 = t0 + 1.3 + k * 0.07, u = (t - s0) / 0.28; b.visible = u >= 0; const y = 0.03 + k * 0.042; b.position.y = u < 0 ? 3 : u < 1 ? y + 2.2 * (1 - u) * (1 - u) : y + 0.05 * Math.exp(-(u - 1) * 9) * Math.abs(Math.sin((u - 1) * 14)); }); const bu = (t - (t0 + 1.7)) / 0.35; badge.visible = bu >= 0; badge.scale.setScalar(Math.max(0.001, bu < 1 ? sm(bu) * 1.15 - 0.15 * sm((bu - 0.6) / 0.4) : 1)); };
  return g;
}
export function createSyrupBottle(mat) {   // glossy amber squeeze bottle, mouth at the origin, body trailing along local -y
  const pts = [[0, 0], [0.32, 0], [0.34, 0.05], [0.34, 0.9], [0.28, 1.1], [0.14, 1.3], [0.13, 1.5], [0, 1.5]].map(([x, y]) => new T.Vector2(x, y)), geo = new T.LatheGeometry(pts, 28); geo.translate(0, -1.5, 0); geo.rotateX(PI); geo.translate(0, 0, 0);
  const g = new T.Group(); const body = new T.Mesh(geo, mat); body.castShadow = true; g.add(body); const hull = new T.Mesh(geo, makeInk(0.03, false, INK_K)); hull.userData.hull = 1; body.add(hull);
  const cap = cel(new T.CylinderGeometry(0.15, 0.17, 0.16, 18), toon('#d8362a'), 0.02); cap.position.y = 0.06; g.add(cap); return g;
}
export function createFirewood() { const g = new T.Group(), wood = toon('#8a5a32'), wood2 = toon('#a8743f'); for (let i = 0; i < 8; i++) { const m = cel(new T.CylinderGeometry(0.045, 0.05, 0.75, 8), i % 2 ? wood : wood2, 0.015); m.rotation.z = PI / 2 + (i - 3.5) * 0.04; m.position.set(0, (i % 3) * 0.08 - 0.06, (i - 3.5) * 0.065); g.add(m); } const rope = cel(new T.TorusGeometry(0.28, 0.015, 6, 16), toon('#d9c28a'), 0.01); rope.rotation.y = PI / 2; g.add(rope); return g; }
export function createCardTable() {
  const g = new T.Group(), wood = toon('#9a7448'), seat = toon('#7a5a38'); const tb = cel(new T.BoxGeometry(0.9, 0.7, 0.9), wood, 0.03); tb.position.y = 0.35; g.add(tb);
  for (const [x, z] of [[0, 0.95], [0, -0.95], [0.95, 0]]) { const s = cel(new T.BoxGeometry(0.55, 0.42, 0.55), seat, 0.025); s.position.set(x, 0.21, z); g.add(s); }
  const cm = toon('#f6f0e0'); for (let i = 0; i < 6; i++) { const c = cel(new T.BoxGeometry(0.13, 0.008, 0.19), cm, 0.008); c.position.set(-0.22 + i * 0.1, 0.71, -0.1 + (i % 2) * 0.2); c.rotation.y = (i - 2.5) * 0.3; g.add(c); const pip = new T.Mesh(new T.CircleGeometry(0.03, 8), new T.MeshBasicMaterial({ color: i % 2 ? '#c4262e' : '#2b1a2a' })); pip.rotation.x = -PI / 2; pip.position.set(c.position.x, 0.717, c.position.z); g.add(pip); }
  return g;
}
export function createScentField() {   // soft translucent amber wisps, rising only ~1.5-2.5 m
  const g = new T.Group(), mat = new T.MeshBasicMaterial({ color: '#e8b45a', transparent: true, opacity: 0.22, depthWrite: false }), rnd = mulberry(909), items = [];
  for (let i = 0; i < 22; i++) { const pts = []; for (let k = 0; k <= 16; k++) { const v = k / 16; pts.push(new T.Vector3(Math.sin(v * PI * 2.4) * 0.2, v * 2.2, Math.cos(v * 3) * 0.06)); } const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 32, 0.05, 5, false), mat); m.position.set((rnd() - 0.5) * 12, 0, -20 - rnd() * 14); m.frustumCulled = false; g.add(m); items.push({ m, ph: rnd(), x: m.position.x, z: m.position.z, h: 0.7 + 0.3 * rnd() }); }
  return { group: g, update(t, k) { g.visible = k > 0.01; items.forEach((s, i) => { const u = ((t * 0.22 + s.ph) % 1), e = Math.sin(PI * u); s.m.scale.set(1, Math.max(0.001, e * k * s.h), 1); s.m.position.set(s.x + Math.sin(t * 0.8 + i) * 0.25, 0.15 + u * 0.3, s.z); }); } };
}
export function createStudio() {   // golden commercial set, high above the street
  const g = new T.Group(), [c, ctx] = cv(512, 512), gr = ctx.createRadialGradient(256, 230, 20, 256, 256, 400); gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.5, '#f7c85a'); gr.addColorStop(1, '#c9822a'); ctx.fillStyle = gr; ctx.fillRect(0, 0, 512, 512);
  const back = new T.Mesh(new T.PlaneGeometry(60, 40), new T.MeshBasicMaterial({ map: tex(c), depthWrite: false })); back.position.set(0, 4, -9); g.add(back);
  const floor = new T.Mesh(new T.CircleGeometry(14, 40), toon('#f1d58b')); floor.rotation.x = -PI / 2; floor.receiveShadow = true; g.add(floor);
  const table = cel(new T.CylinderGeometry(2.2, 2.2, 0.22, 40), toon('#a8743f'), 0.05); table.position.y = 0.11; g.add(table);
  const ring = new T.Mesh(new T.TorusGeometry(5, 0.05, 6, 48), new T.MeshBasicMaterial({ color: '#fff7d8' })); ring.position.set(0, 6, -8.8); g.add(ring);
  return g;
}

/* ---------- Session 3 props ---------- */
export function createSoftSteam() {   // soft drifting white ear steam (translucent, no ink)
  const g = new T.Group(), puffs = [];
  for (let s = 0; s < 2; s++) for (let i = 0; i < 8; i++) { const m = new T.Mesh(new T.SphereGeometry(1, 12, 9), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); m.visible = false; g.add(m); puffs.push({ m, s, i }); }
  return { group: g, update(t, t0, t1, anc) { for (const p of puffs) { const on = !!anc && t >= t0 && t <= t1; p.m.visible = on; if (!on) continue; const u = (t * 0.45 + p.i / 8 + p.s * 0.37) % 1, a = anc[p.s], d = p.s ? 1 : -1, fade = sm((t - t0) / 0.5) * (1 - sm((t - t1 + 0.4) / 0.4)); p.m.position.set(a.x + d * (0.05 + u * 0.3) + Math.sin(t * 2 + p.i) * 0.03, a.y + u * 0.55, a.z + 0.05); p.m.scale.setScalar(0.035 + u * 0.1); p.m.material.opacity = 0.5 * Math.sin(PI * u) * fade; } } };
}

export function createThoughtBubble(camera) {   // comic thought bubble: sneaky villain silhouette + round bomb "SABOTAGE?"
  const [c, g] = cv(480, 600), ink = '#2b1a2a';
  const circ = (x, y, r, f) => { g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fillStyle = f; g.fill(); };
  const cloud = [[240, 70, 70], [345, 100, 66], [415, 200, 64], [420, 310, 66], [350, 410, 66], [240, 440, 70], [130, 410, 66], [62, 310, 66], [62, 200, 64], [135, 100, 66]];
  for (const [x, y, r] of cloud) circ(x, y, r + 9, ink); g.fillStyle = ink; g.fillRect(100, 100, 280, 330);
  for (const [x, y, r] of [[110, 520, 33], [66, 570, 20]]) circ(x, y, r + 8, ink);
  for (const [x, y, r] of cloud) circ(x, y, r, '#fffdf4'); g.fillStyle = '#fffdf4'; g.fillRect(100, 100, 280, 330); for (const [x, y, r] of [[110, 520, 33], [66, 570, 20]]) circ(x, y, r, '#fffdf4');
  // villain silhouette (left), arm reaching out to the bomb
  g.fillStyle = ink; g.beginPath(); g.moveTo(80, 430); g.lineTo(100, 290); g.quadraticCurveTo(150, 255, 200, 290); g.lineTo(225, 430); g.closePath(); g.fill();
  circ(150, 220, 46, ink); g.fillRect(98, 195, 104, 14); g.beginPath(); g.moveTo(104, 196); g.lineTo(150, 140); g.lineTo(196, 196); g.fill();   // beanie
  g.fillStyle = '#fffdf4'; g.save(); g.translate(132, 228); g.rotate(0.3); g.fillRect(-16, -5, 30, 9); g.restore(); g.save(); g.translate(168, 228); g.rotate(-0.3); g.fillRect(-14, -5, 30, 9); g.restore();   // slit eyes
  g.strokeStyle = '#fffdf4'; g.lineWidth = 5; g.beginPath(); g.arc(150, 240, 22, 0.15, PI - 0.15); g.stroke();
  g.strokeStyle = ink; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath(); g.moveTo(190, 310); g.lineTo(255, 330); g.stroke();
  // round cartoon bomb + fuse + label
  circ(300, 345, 84, ink); circ(280, 320, 14, '#6a5a78'); g.strokeStyle = ink; g.lineWidth = 12; g.beginPath(); g.moveTo(330, 270); g.quadraticCurveTo(350, 235, 380, 245); g.stroke();
  g.fillStyle = '#ffb21a'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * PI / 4, r = k % 2 ? 11 : 24; g.lineTo(386 + Math.cos(a) * r, 245 + Math.sin(a) * r); } g.closePath(); g.fill();
  g.fillStyle = '#fffdf4'; g.font = '900 25px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SABOTAGE?', 300, 350);
  const t0 = tex(c), m = new T.Mesh(new T.PlaneGeometry(0.24, 0.3), new T.MeshBasicMaterial({ map: t0, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  m.position.set(0.085, 0.19, -1.1); m.renderOrder = 998; m.visible = false; camera.add(m);
  return { set(u) { m.visible = u > 0; if (!m.visible) return; const p = u < 1 ? sm(u) * 1.12 - 0.12 * sm((u - 0.6) / 0.4) : 1; m.scale.setScalar(Math.max(0.001, p)); m.rotation.z = 0.03 * Math.sin(u * 6); } };
}

export function createGagCard(camera) {   // full-frame gag cards (goofy monster shadow / spinning tornado), drawn per frame
  const [c, g] = cv(450, 800), tx = tex(c), ink = '#2b1a2a';
  const m = new T.Mesh(new T.PlaneGeometry(0.95, 1.69), new T.MeshBasicMaterial({ map: tx, depthTest: false, depthWrite: false, toneMapped: false })); m.position.z = -1.0; m.renderOrder = 997; m.visible = false; camera.add(m);
  const el = (x, y, rx, ry, f) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, PI * 2); g.fillStyle = f; g.fill(); };
  return { set(kind, t) { m.visible = kind >= 0; if (!m.visible) return; g.clearRect(0, 0, 450, 800);
    if (kind === 0) { const bg = g.createLinearGradient(0, 0, 0, 800); bg.addColorStop(0, '#f7e2b0'); bg.addColorStop(1, '#e2b97a'); g.fillStyle = bg; g.fillRect(0, 0, 450, 800); const sp = g.createRadialGradient(225, 400, 20, 225, 400, 380); sp.addColorStop(0, 'rgba(255,255,230,0.9)'); sp.addColorStop(1, 'rgba(255,255,230,0)'); g.fillStyle = sp; g.fillRect(0, 0, 450, 800);
      const w = Math.sin(t * 7), a = 'rgba(43,26,42,0.9)'; g.save(); g.translate(225, 430); g.rotate(0.05 * w); el(0, 40, 130, 170, a); el(0, -140, 105, 95, a); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 70, -200); g.lineTo(s * 105, -285); g.lineTo(s * 30, -225); g.fillStyle = a; g.fill(); g.lineWidth = 34; g.lineCap = 'round'; g.strokeStyle = a; g.beginPath(); g.moveTo(s * 110, 0); g.lineTo(s * 190, -60 - 30 * Math.sin(t * 9 + s)); g.stroke(); }
      for (const s of [-1, 1]) { el(s * 42, -150, 28, 34, '#fffdf4'); el(s * 42 + 6 * Math.sin(t * 5), -145, 10, 12, ink); }
      g.beginPath(); g.moveTo(-60, -90); for (let k = 0; k <= 8; k++) g.lineTo(-60 + k * 15, -90 + (k % 2 ? 22 : -4)); g.lineTo(60, -85); g.quadraticCurveTo(0, -40, -60, -90); g.fillStyle = '#fffdf4'; g.fill(); g.restore(); }
    else { const bg = g.createLinearGradient(0, 0, 0, 800); bg.addColorStop(0, '#6f8fb0'); bg.addColorStop(1, '#bfe0f2'); g.fillStyle = bg; g.fillRect(0, 0, 450, 800); el(225, 130, 230, 80, '#7b8794'); el(120, 150, 120, 60, '#8e99a5'); el(340, 150, 120, 60, '#8e99a5');
      for (let k = 0; k < 9; k++) { const v = k / 8, y = 180 + v * 520, rx = 190 - v * 165, cx = 225 + Math.sin(t * 6 + v * 5) * (30 + 22 * v); el(cx, y, rx, 36, k % 2 ? '#5b636e' : '#737d89'); g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.ellipse(cx, y, rx, 36, 0, 0, PI * 2); g.stroke(); }
      for (let k = 0; k < 6; k++) { const a = t * 9 + k * 1.05, v = (k * 0.17 + t * 0.4) % 1; el(225 + Math.cos(a) * (150 - 110 * v), 200 + v * 480, 9, 9, '#f3d9a4'); }
      el(225 + Math.sin(t * 6 + 3.2) * 40, 540, 18, 22, '#fffdf4'); el(255 + Math.sin(t * 6 + 3.2) * 40, 540, 18, 22, '#fffdf4'); el(225 + Math.sin(t * 6 + 3.2) * 40, 545, 6, 8, ink); el(255 + Math.sin(t * 6 + 3.2) * 40, 545, 6, 8, ink); }
    tx.needsUpdate = true; } };
}

export function createFlipCalendar() {   // standing flip calendar: JAN -> MAY
  const g = new T.Group(), M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY'], wood = toon('#6a4a2a');
  const board = cel(new T.BoxGeometry(1.0, 1.2, 0.08), wood, 0.03); board.position.y = 1.15; g.add(board);
  for (const s of [-1, 1]) { const l = cel(new T.BoxGeometry(0.08, 0.6, 0.08), wood, 0.02); l.position.set(s * 0.38, 0.3, 0); g.add(l); }
  const mkPage = () => { const [c, cg] = cv(256, 280); return { c, cg, tx: tex(c), key: -1 }; }, draw = (p, i) => { if (p.key === i) return; p.key = i; const q = p.cg; q.fillStyle = '#fff7e2'; q.fillRect(0, 0, 256, 280); q.fillStyle = '#c4262e'; q.fillRect(0, 0, 256, 96); q.fillStyle = '#fffdf4'; q.font = '900 70px Georgia'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(M[i], 128, 52); q.fillStyle = '#6a5a4a'; for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) q.fillRect(22 + k * 32, 118 + r * 38, 20, 20); q.strokeStyle = '#2b1a2a'; q.lineWidth = 6; q.strokeRect(3, 3, 250, 274); p.tx.needsUpdate = true; };
  const pg = mkPage(), hinge = new T.Group(); hinge.position.set(0, 1.68, 0.06); g.add(hinge);
  const page = new T.Mesh(new T.PlaneGeometry(0.86, 0.94), new T.MeshBasicMaterial({ map: pg.tx, toneMapped: false })); page.position.y = -0.5; hinge.add(page);
  for (let k = 0; k < 6; k++) { const r = new T.Mesh(new T.TorusGeometry(0.035, 0.012, 6, 10), new T.MeshBasicMaterial({ color: '#2b1a2a' })); r.position.set(-0.36 + k * 0.144, 1.68, 0.07); g.add(r); }
  return { group: g, update(t, t0, step) { const f = (t - t0) / step, idx = Math.max(0, Math.min(4, Math.floor(f))), ph = f - Math.floor(f), fl = idx > 0 && f < 5 && ph < 0.25 ? ph / 0.25 : 1; draw(pg, fl < 0.5 ? Math.max(0, idx - 1) : idx); hinge.scale.y = Math.max(0.02, Math.abs(Math.cos(PI * fl))); if (fl >= 1) hinge.scale.y = 1; } };
}
