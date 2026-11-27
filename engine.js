// Pear Folk 3D — primitive rig (v6). Only smooth Three.js primitives (Sphere, Capsule, Cylinder, Torus): no lofted vertex rings.
// ~5.5 heads tall (1.8 units), feet at y = 0. 2-tone MeshToonMaterial + #2b1a2a inverted-hull outlines (view-space normal extrusion, so non-uniform scales stay even).
// Faces, buttons, lapels, vest seams are painted on canvas textures. Same API: createCharacter(spec) / makeSpec / createStage, clips Idle|Walk|Run|Wave.
const T = window.THREE;
export const INK = '#2b1a2a';
export const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const hashSeed = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), D = Math.PI / 180;
export const mix = (a, b, k) => new T.Color(a).lerp(new T.Color(b), k).getStyle();

/* ---------------- data ---------------- */
export const HERITAGE = {
  'south-asian': { skin: ['#bf865c', '#b07a52', '#c48f66'], hair: ['#14100e', '#1d1511', '#2b1b14'], eye: 0 },
  'middle-eastern': { skin: ['#cf9c70', '#c58f64', '#d8a77c'], hair: ['#14100e', '#2b1b14', '#472d1f'], eye: 0 },
  'african': { skin: ['#53311f', '#6a4129', '#7b4d31'], hair: ['#0f0c0b', '#14100e', '#1d1511'], eye: 0 },
  'east-asian': { skin: ['#f1cba6', '#e9c19a', '#f7d2b0'], hair: ['#14100e', '#1a1a1a', '#221811'], eye: 1 },
  'european': { skin: ['#fcdcc2', '#f3cfb1', '#eec4a4'], hair: ['#472d1f', '#78381b', '#c28b42', '#2b1b14', '#8a8a8a'], eye: 0 },
  'latin-american': { skin: ['#bd8057', '#c98f65', '#b2744d'], hair: ['#14100e', '#2b1b14', '#472d1f'], eye: 0 },
};
export const HERITAGE_IDS = Object.keys(HERITAGE);
// body archetypes: clamped ratios. sx shoulders, hip hips, gir belly girth, h overall height, limb limb thickness
export const BODY = {
  default: { sx: 1, hip: 1, gir: 1, h: 1, limb: 1 }, pear: { sx: .88, hip: 1.22, gir: 1.08, h: .98, limb: 1.04 },
  broad: { sx: 1.2, hip: .94, gir: 1, h: 1.02, limb: 1.1 }, slim: { sx: .92, hip: .9, gir: .88, h: 1, limb: .88 },
  tall: { sx: .95, hip: .94, gir: .94, h: 1.07, limb: .94 }, stocky: { sx: 1.1, hip: 1.1, gir: 1.16, h: .94, limb: 1.15 },
};
export const BODY_IDS = Object.keys(BODY);
export const HAIR = { male: ['short_part', 'swept_back', 'low_bun', 'bob', 'none', 'twin_buns'], female: ['short_part', 'swept_back', 'low_bun', 'bob', 'none', 'twin_buns'] };
export const HEADWEAR = ['none', 'flat_cap', 'bowler_hat', 'top_hat', 'cloche_hat', 'fire_helmet'];
export const FACIAL = ['none', 'mustache', 'beard', 'sideburns', 'goatee'];
export const OUTFITS = ['overcoat', 'jacket', 'aline', 'turnout', 'knickers', 'pinafore'];   // turnout = 1919 firefighter coat; knickers / pinafore = children
// 1919 Boston earth tones
const COAT = ['#3a3a40', '#5b3d28', '#5a5d33', '#26324f', '#6a5a46'], VEST = ['#7a6a4a', '#43505f', '#6b3a32', '#3f4a38', '#8a7a5a'], SHIRT = ['#efe6d2', '#e6dcc4', '#f3eddc'];
const PANTS = ['#2f2f35', '#4a3524', '#4a4d2c', '#202a44', '#6a5a44'], BOOT = ['#2a1c14', '#3d2616', '#1f1a1a'], SCARF = ['#8c3b2e', '#3d5a4a', '#c9a24a', '#4a3b5c', '#d9ccae'];
const CAP = ['#3a3a40', '#5b3d28', '#5a5d33', '#26324f', '#6a5a46'], CLOCHE = ['#6a4a52', '#2f4a45', '#8a6a4a', '#d9ccae', '#26324f'];

export function makeSpec(seed, o = {}) {
  const r = mulberry(hashSeed(seed)), pick = (a) => a[Math.floor(r() * a.length)];
  const sex = o.sex || pick(['male', 'female']), heritage = o.heritage || pick(HERITAGE_IDS), H = HERITAGE[heritage], f = sex === 'female';
  const hairStyle = o.hair && HAIR[sex].includes(o.hair) ? o.hair : pick(f ? ['low_bun', 'bob', 'low_bun', 'bob', 'swept_back'] : ['short_part', 'short_part', 'swept_back', 'none']);
  const headwear = o.headwear && HEADWEAR.includes(o.headwear) ? o.headwear : pick(f ? ['cloche_hat', 'none', 'cloche_hat'] : ['flat_cap', 'bowler_hat', 'top_hat', 'none', 'flat_cap']);
  const outfit = o.outfit && OUTFITS.includes(o.outfit) ? o.outfit : pick(f ? ['aline', 'aline', 'jacket'] : ['overcoat', 'jacket', 'overcoat']);
  const kid = !!o.isChild, ff = o.role === 'firefighter';
  const spec = { seed, sex, heritage, type: o.type || pick(BODY_IDS), hairStyle, headwear, outfit, skin: pick(H.skin), hairColor: o.hairColor || pick(H.hair), eyeShape: H.eye, smile: 0.6 + r() * 0.5,
    facialHair: f ? 'none' : (o.facialHair || pick(['none', 'none', 'mustache', 'beard', 'goatee', 'sideburns'])),
    coat: pick(COAT), vest: pick(VEST), shirt: pick(SHIRT), pants: pick(PANTS), boots: pick(BOOT), scarf: r() < 0.55 ? pick(SCARF) : null, hat: f ? pick(CLOCHE) : pick(CAP) };
  if (spec.vest === spec.coat) spec.vest = VEST[0];
  spec.isChild = kid; spec.role = o.role || null; spec.sock = '#d9ccae'; spec.suspender = '#6b3a2a';
  if (ff) { spec.sex = 'male'; spec.outfit = 'turnout'; spec.headwear = 'fire_helmet'; spec.coat = '#1b2233'; spec.vest = '#1b2233'; spec.pants = '#15181f'; spec.boots = '#2a1a10'; spec.hat = '#1a1411'; spec.scarf = null; if (!o.facialHair) spec.facialHair = 'mustache'; if (!o.hair) spec.hairStyle = 'short_part'; }
  if (kid && !ff) {
    spec.outfit = f ? 'pinafore' : 'knickers'; spec.scarf = null; spec.shirt = '#f3eddc'; spec.facialHair = 'none';
    if (f) { spec.hairStyle = o.hair && HAIR.female.includes(o.hair) ? o.hair : 'twin_buns'; spec.headwear = o.headwear && HEADWEAR.includes(o.headwear) ? o.headwear : 'none'; spec.coat = pick(['#3d4a63', '#6a4a52', '#4a5d4a']); spec.sock = '#22222a'; }
    else { spec.headwear = o.headwear && HEADWEAR.includes(o.headwear) ? o.headwear : 'flat_cap'; spec.pants = pick(['#5a4a38', '#4a4d2c', '#3a3a40']); spec.sock = pick(['#d9ccae', '#8a8a82']); spec.hat = pick(CAP); }
  }
  spec.faceStyle = o.faceStyle && FACE_STYLES[o.faceStyle] ? o.faceStyle : pick(FACE_IDS);
  return spec;
}

/* ---------------- shading ---------------- */
export const ramp = (() => { const d = new Uint8Array([158, 150, 168, 255, 255, 255, 255, 255]); const t = new T.DataTexture(d, 2, 1, T.RGBAFormat); t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t; })();   // 2 tones: shade + lit
export const toon = (color, map, side) => new T.MeshToonMaterial({ color: new T.Color(color), gradientMap: ramp, map: map || null, side: side || T.FrontSide });
const OUT_W = 0.0115;
export const INK_K = { value: 1 };   // global outline scale (film raises it with camera distance so lines stay readable)
const inkCache = new Map();
export function makeInk(w = OUT_W, smooth = false, k = INK_K) {   // shared inverted-hull ink material factory (props use their own widths)
  const key = w + '|' + smooth + '|' + (k === INK_K); let m = inkCache.get(key); if (m) return m;
  m = new T.ShaderMaterial({ side: T.BackSide, uniforms: { uW: { value: w }, uK: k },
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nuniform float uW; uniform float uK; ' + (smooth ? 'attribute vec3 hn; ' : '') + 'void main(){ vec3 n = normalize(normalMatrix * ' + (smooth ? 'hn' : 'normal') + '); vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xyz += n * uW * uK; gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: '#include <logdepthbuf_pars_fragment>\nvoid main(){\n#include <logdepthbuf_fragment>\ngl_FragColor = vec4(0.169, 0.102, 0.165, 1.0); }' });   // log-depth chunks keep hull + mesh depth consistent when logarithmicDepthBuffer is on
  inkCache.set(key, m); return m;
}
const inkMat = makeInk(OUT_W, false), inkMatS = makeInk(OUT_W, true);
export function smoothHull(geo) {   // averaged normals per position: continuous ink outline on flat-shaded extrusions
  const p = geo.attributes.position, n = geo.attributes.normal, key = (i) => Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4), acc = new Map();
  for (let i = 0; i < p.count; i++) { const k = key(i); let a = acc.get(k); if (!a) acc.set(k, a = [0, 0, 0]); a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); }
  const hn = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; hn[3 * i] = a[0] / l; hn[3 * i + 1] = a[1] / l; hn[3 * i + 2] = a[2] / l; }
  geo.setAttribute('hn', new T.BufferAttribute(hn, 3)); return geo;
}
// mesh with ink hull child. o: s scale[3], r rotation[3], ink false to skip the outline
export const M = (geo, mat, x = 0, y = 0, z = 0, o = {}) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (o.s) m.scale.set(...o.s); if (o.r) m.rotation.set(...o.r); if (o.ink !== false) { const h = new T.Mesh(geo, geo.attributes.hn ? inkMatS : inkMat); h.userData.hull = 1; m.add(h); } return m; };
export const sph = (r, ws = 32, hs = 20, ps = 0, pl = Math.PI * 2, ts = 0, tl = Math.PI) => new T.SphereGeometry(r, ws, hs, ps, pl, ts, tl);
const FRONT = Math.PI / 2;   // sphere azimuth (phi) that faces +z
const cap = (r, th0, th1, center, half) => sph(r, 40, 18, center - half, half * 2, th0 * D, (th1 - th0) * D);
const onHead = (theta, dphi, rad = 0.16) => new T.Vector3(Math.sin(theta * D) * Math.sin(dphi), Math.cos(theta * D), Math.sin(theta * D) * Math.cos(dphi)).multiplyScalar(rad);

/* ---------------- painted textures ---------------- */
/* ---------------- 2D face system: drawFace(g, spec, faceStyle, expression, phase) repaints the head canvas live ---------------- */
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const FACE_STYLES = {
  classic: { rx: 28, ry: 19, iris: 14.5, pup: 7.5, bw: 10, arch: 52, bt: 0, nose: 'curve', age: 0 },
  stern: { rx: 27, ry: 15, iris: 13.5, pup: 7.5, bw: 14, arch: 44, bt: -9, nose: 'long', age: 1 },
  young: { rx: 30, ry: 23, iris: 16, pup: 8, bw: 7, arch: 57, bt: 0, nose: 'dot', age: 0 },
  older: { rx: 27, ry: 16, iris: 13.5, pup: 7, bw: 12, arch: 49, bt: 4, nose: 'curve', age: 2 },
  wide_eyed: { rx: 32, ry: 25, iris: 17, pup: 6.5, bw: 7, arch: 66, bt: 5, nose: 'dot', age: 0 },
};
export const FACE_IDS = Object.keys(FACE_STYLES);
export const EXPRESSIONS = ['neutral', 'happy', 'worried', 'shocked', 'panic', 'angry', 'talking'];
const EXPR = {   // dy brow lift (neg = up), tilt inner-brow raise, eye openness, pup pupil scale, lift smiling cheek squint
  neutral: { dy: 0, tilt: 0, eye: 1, pup: 1, lift: 0, mouth: 'smile', amt: 0.35 }, happy: { dy: -4, tilt: -3, eye: 0.95, pup: 1, lift: 0.55, mouth: 'open_smile', amt: 0.6 },
  worried: { dy: -6, tilt: 15, eye: 1.02, pup: 0.9, lift: 0, mouth: 'tense', amt: 0 }, shocked: { dy: -17, tilt: 2, eye: 1.4, pup: 0.5, lift: 0, mouth: 'O', amt: 0 },
  panic: { dy: -12, tilt: 13, eye: 1.4, pup: 0.38, lift: 0, mouth: 'scream', amt: 0, sweat: 1 }, angry: { dy: 3, tilt: -17, eye: 0.82, pup: 1, lift: 0, mouth: 'frown', amt: 0 },
  talking: { dy: -1, tilt: 0, eye: 1, pup: 1, lift: 0, mouth: 'talk', amt: 0.3 },
};
const AUTO = { idle: 'neutral', walk: 'neutral', run_panic: 'panic', shock: 'shocked', look_up: 'worried', talk: 'talking', sit_cards: 'neutral', collect_bucket: 'happy', trapped_struggle: 'panic', wade_slow: 'worried' }, TALK = [0, 1, 2, 1, 0, 2, 3, 1];
export function drawFace(g, spec, faceStyle = 'classic', expression = 'neutral', phase = 0) {
  const W = 1024, H = 512, S = FACE_STYLES[faceStyle] || FACE_STYLES.classic, E = EXPR[expression] || EXPR.neutral, f = spec.sex === 'female', FH = f ? 'none' : spec.facialHair, hc = spec.hairColor;
  const X = (d) => 512 + d * 163, Y = (th) => th / 180 * H, line = (w, col = INK) => { g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; };
  const blob = (pts) => { const P = pts.map(([d, th]) => [X(d), Y(th)]), n = P.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; g.beginPath(); g.moveTo(...mid(P[0], P[1])); for (let i = 1; i <= n; i++) { const p = P[i % n], m = mid(p, P[(i + 1) % n]); g.quadraticCurveTo(p[0], p[1], m[0], m[1]); } g.closePath(); };
  const dark = mix(spec.skin, INK, 0.28), my = Y(127), mw = 36 * (0.8 + spec.smile * 0.3) / 0.8, DK = '#4a1824';
  g.globalAlpha = 1; g.fillStyle = spec.skin; g.fillRect(0, 0, W, H);
  for (const s of [-1, 1]) { const gr = g.createRadialGradient(X(s * 0.52), Y(113), 4, X(s * 0.52), Y(113), 46); gr.addColorStop(0, 'rgba(214,96,100,.21)'); gr.addColorStop(1, 'rgba(214,96,100,0)'); g.fillStyle = gr; g.fillRect(X(s * 0.52) - 50, Y(113) - 50, 100, 100); }
  // painted facial hair: sideburns, a rounded U-shaped beard with a mouth opening, goatee
  g.fillStyle = hc;
  if (FH === 'sideburns' || FH === 'beard') for (const s of [-1, 1]) { blob([[s * 1.0, 80], [s * 1.28, 78], [s * 1.37, 102], [s * 1.24, 114], [s * 1.05, 104]]); g.fill(); }
  if (FH === 'beard') {
    blob([[1.04, 98], [1.38, 118], [1.3, 144], [0.9, 166], [0.4, 176], [0, 178], [-0.4, 176], [-0.9, 166], [-1.3, 144], [-1.38, 118], [-1.04, 98], [-0.9, 110], [-0.5, 116], [-0.22, 118.6], [0, 119.2], [0.22, 118.6], [0.5, 116], [0.9, 110]]); g.fill();
    g.fillStyle = spec.skin; g.beginPath(); g.ellipse(512, Y(127.4), 56, 25, 0, 0, Math.PI * 2); g.fill();   // mouth opening
  }
  if (FH === 'goatee') { blob([[-0.26, 140], [-0.2, 153], [0, 162], [0.2, 153], [0.26, 140], [0, 138]]); g.fill(); }
  if (S.nose === 'curve') { line(5, dark); g.beginPath(); g.moveTo(509, Y(97)); g.quadraticCurveTo(504, Y(104), 499, Y(107)); g.quadraticCurveTo(512, Y(110.5), 525, Y(107)); g.stroke(); }
  else if (S.nose === 'long') { line(5, dark); g.beginPath(); g.moveTo(508, Y(92)); g.quadraticCurveTo(503, Y(104), 497, Y(108)); g.quadraticCurveTo(512, Y(111.5), 527, Y(108)); g.stroke(); }
  else { g.fillStyle = dark; g.beginPath(); g.ellipse(512, Y(107), 10, 6, 0, 0, Math.PI * 2); g.fill(); }
  if (S.age) { line(3, dark); g.globalAlpha = S.age > 1 ? 0.55 : 0.3; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(s * 0.17), Y(109)); g.quadraticCurveTo(X(s * 0.33), Y(116), X(s * 0.37), Y(125)); g.stroke(); } g.globalAlpha = 1; }
  const ry = S.ry * E.eye * (spec.eyeShape ? 0.8 : 1), rx = S.rx * (E.eye > 1.2 ? 1.06 : 1);
  for (const s of [-1, 1]) {
    const cx = X(s * 0.31), cy = Y(95);
    g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, s * -0.06, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#fbf6ec'; g.fillRect(cx - 45, cy - 36, 90, 72);
    g.fillStyle = '#3b2415'; g.beginPath(); g.arc(cx - s * 2, cy + 1, S.iris * (E.eye > 1.2 ? 0.92 : 1), 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0d0810'; g.beginPath(); g.arc(cx - s * 2, cy + 1, S.pup * E.pup, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - s * 2 - 5, cy - 5, 4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(cx - s * 2 + 5, cy + 6, 2, 0, Math.PI * 2); g.fill();
    if (E.eye < 1.2) { g.fillStyle = 'rgba(43,26,42,.28)'; g.fillRect(cx - 45, cy - 36, 90, 12); }
    g.restore();
    if (E.lift) { g.fillStyle = spec.skin; g.beginPath(); g.ellipse(cx, cy + ry * (1.5 - 0.75 * E.lift), rx * 1.12, ry, 0, 0, Math.PI * 2); g.fill(); line(3, mix(spec.skin, INK, 0.55)); g.beginPath(); g.ellipse(cx, cy + ry * (1.5 - 0.75 * E.lift), rx * 1.12, ry, 0, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); }
    else { line(2.4, mix(spec.skin, INK, 0.6)); g.beginPath(); g.ellipse(cx, cy, rx, ry, s * -0.06, Math.PI * 0.08, Math.PI * 0.92); g.stroke(); }
    line(E.eye > 1.2 ? 5.5 : 8); g.beginPath(); g.ellipse(cx, cy, rx, ry, s * -0.06, Math.PI * 1.04, Math.PI * 1.96); g.stroke();
    if (E.eye <= 1.2) { line(3.2); g.beginPath(); g.moveTo(cx + s * (rx - 3), cy - 5); g.lineTo(cx + s * (rx + 6), cy - 11); g.stroke(); }
    if (S.age) { line(2.6, dark); g.globalAlpha = 0.5; g.beginPath(); g.ellipse(cx, cy + ry + 9, rx * 0.75, 6, 0, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); if (S.age > 1) for (const k of [-8, 0, 8]) { g.beginPath(); g.moveTo(cx + s * (rx + 6), cy + k * 0.7); g.lineTo(cx + s * (rx + 20), cy + k * 1.5 - 2); g.stroke(); } g.globalAlpha = 1; }
    const bc = S.age > 1 ? mix(hc, '#c8c8c8', 0.45) : hc, tl = (E.tilt + S.bt) * 0.7, by = cy - 36 + E.dy;
    line((f ? 0.85 : 1) * S.bw, bc); g.beginPath(); g.moveTo(cx - s * 30, by - tl); g.quadraticCurveTo(cx - s * 2, cy - S.arch + E.dy, cx + s * 32, by + 4 + tl * 0.4); g.stroke();
  }
  if (E.sweat) for (const [d, th, k] of [[0.8, 80, 1], [-0.86, 68, 0.75]]) { g.fillStyle = '#bfe3f5'; line(3); g.beginPath(); const x = X(d), y = Y(th); g.moveTo(x, y - 20 * k); g.quadraticCurveTo(x + 14 * k, y + 2 * k, x, y + 12 * k); g.quadraticCurveTo(x - 14 * k, y + 2 * k, x, y - 20 * k); g.fill(); g.stroke(); }
  // mouth
  const oval = (rx2, ry2, teeth, tongue) => { const cy2 = my + ry2 * 0.4; g.beginPath(); g.ellipse(512, cy2, rx2, ry2, 0, 0, Math.PI * 2); g.fillStyle = DK; g.fill(); g.save(); g.clip(); if (teeth) { g.fillStyle = '#fbf6ec'; g.fillRect(512 - rx2, cy2 - ry2, rx2 * 2, ry2 * 0.55); } if (tongue) { g.fillStyle = '#c0505a'; g.beginPath(); g.ellipse(512, cy2 + ry2 * 0.9, rx2 * 0.6, ry2 * 0.5, 0, 0, Math.PI * 2); g.fill(); } g.restore(); line(5); g.beginPath(); g.ellipse(512, cy2, rx2, ry2, 0, 0, Math.PI * 2); g.stroke(); };
  const smile = (amt) => { if (f) { g.fillStyle = '#b4414f'; g.beginPath(); g.ellipse(512, my + 4, mw * 0.7, 9, 0, 0, Math.PI * 2); g.fill(); } line(6); g.beginPath(); g.moveTo(512 - mw, my - 2); g.quadraticCurveTo(512, my + 2 + amt * 30 * spec.smile, 512 + mw, my - 2); g.stroke(); line(3.5); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(512 + s * mw, my - 2); g.lineTo(512 + s * (mw + 7), my - 8); g.stroke(); } };
  const m = E.mouth;
  if (m === 'smile') smile(E.amt);
  else if (m === 'open_smile') { g.beginPath(); g.moveTo(512 - mw, my - 4); g.quadraticCurveTo(512, my + 6, 512 + mw, my - 4); g.quadraticCurveTo(512, my + 44, 512 - mw, my - 4); g.closePath(); g.fillStyle = DK; g.fill(); g.save(); g.clip(); g.fillStyle = '#fbf6ec'; g.fillRect(512 - mw, my - 6, mw * 2, 11); g.restore(); line(5); g.stroke(); }
  else if (m === 'tense') { line(5); g.beginPath(); g.moveTo(512 - mw * 0.55, my + 6); g.lineTo(512 - mw * 0.28, my); g.lineTo(512, my + 3); g.lineTo(512 + mw * 0.28, my); g.lineTo(512 + mw * 0.55, my + 6); g.stroke(); }
  else if (m === 'O') oval(13, 17, false, false);
  else if (m === 'scream') oval(mw * 0.8, 25, true, true);
  else if (m === 'frown') { line(7); g.beginPath(); g.moveTo(512 - mw * 0.8, my + 8); g.quadraticCurveTo(512, my - 8, 512 + mw * 0.8, my + 8); g.stroke(); }
  else if (m === 'talk') { if (phase === 0) smile(0.2); else if (phase === 1) oval(mw * 0.42, 7, false, false); else if (phase === 2) oval(mw * 0.5, 15, false, true); else oval(11, 12, false, false); }
  // mustache: slim, tapered, above the upper lip with clear gaps to nose and mouth
  if (FH === 'mustache' || FH === 'beard') { g.fillStyle = hc; for (const s of [-1, 1]) { blob([[0, 117.2], [s * 0.22, 116.8], [s * 0.45, 118], [s * 0.66, 115.2], [s * 0.6, 118.4], [s * 0.42, 121.6], [s * 0.2, 122.8], [0, 122.4]]); g.fill(); } }
}
function makeFace(spec) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d'), tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  const face = { style: spec.faceStyle || 'classic', expr: 'neutral', phase: 0, manual: null, tex, draw() { drawFace(g, spec, face.style, face.expr, face.phase); tex.needsUpdate = true; } }; face.draw(); return face;
}
function bootGeo() {   // ONE extrusion of a crisp side profile: flat heel -> arch indent -> flat sole -> low rounded toe -> sloped instep -> slim ankle shaft
  const e = 0.01, sh = new T.Shape();   // profile in (forward, up); the bevel grows it by e, so it is drawn inset by e
  sh.moveTo(-0.055, e); sh.lineTo(-0.03, e); sh.quadraticCurveTo(-0.012, e + 0.02, 0.03, e + 0.018); sh.quadraticCurveTo(0.05, e + 0.016, 0.062, e);   // heel, arch indent, ball of foot
  sh.lineTo(0.12, e); sh.bezierCurveTo(0.158, e, 0.175, e + 0.012, 0.175, e + 0.03);   // flat sole to a low rounded toe
  sh.bezierCurveTo(0.175, e + 0.046, 0.15, e + 0.054, 0.12, e + 0.058); sh.quadraticCurveTo(0.07, e + 0.068, 0.034, e + 0.105);   // instep rises into the shaft
  sh.lineTo(0.032, 0.13); sh.lineTo(-0.032, 0.13); sh.lineTo(-0.034, e + 0.08); sh.quadraticCurveTo(-0.055, e + 0.06, -0.055, e + 0.03); sh.lineTo(-0.055, e);
  const w = 0.06, g = new T.ExtrudeGeometry(sh, { depth: w, bevelEnabled: true, bevelThickness: 0.01, bevelSize: e, bevelSegments: 3, curveSegments: 14 });
  g.translate(0, -0.09, -w / 2); g.rotateY(-Math.PI / 2); return smoothHull(g);   // flat sole lands on y = 0 (ankle joint sits at y = 0.09)
}
function visorGeo() {   // solid crescent bill, ~0.014 thick; its back edge sits ~0.04 inside the crown
  const sh = new T.Shape(); sh.moveTo(-0.108, 0.12); sh.bezierCurveTo(-0.118, 0.235, -0.065, 0.272, 0, 0.272); sh.bezierCurveTo(0.065, 0.272, 0.118, 0.235, 0.108, 0.12); sh.quadraticCurveTo(0, 0.19, -0.108, 0.12);
  const g = new T.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.003, bevelSegments: 2, curveSegments: 18 });
  g.rotateX(Math.PI / 2); g.translate(0, 0.007, 0); return smoothHull(g);
}
function hairShell(rad, P) {   // sphere whose lower edge follows a per-azimuth hairline (back / ear / temple / forehead), so the rim tapers around the ears
  const g = new T.SphereGeometry(rad, 72, 48), pos = g.attributes.position, nor = g.attributes.normal, v = new T.Vector3();
  const prof = (a) => { let L = P[0] + (P[1] - P[0]) * sstep(20, 90, a); L += (P[2] - L) * sstep(90, 115, a); L += (P[3] - L) * sstep(135, 170, a); return L * D; };
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); let th = Math.acos(clamp(v.y / rad, -1, 1)); const az = Math.atan2(v.x, v.z), L = prof(180 - Math.abs(az) / D);
    if (th > L) { th = L; pos.setXYZ(i, rad * Math.sin(th) * Math.sin(az), rad * Math.cos(th), rad * Math.sin(th) * Math.cos(az)); }
    v.fromBufferAttribute(pos, i).normalize(); nor.setXYZ(i, v.x, v.y, v.z); }
  return g;
}

function vestTex(spec) {   // inner torso: shirt + waistcoat. u = .5 faces front
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), U = (u) => u * W, V = (v) => v * H;
  if (spec.outfit === 'knickers' || spec.outfit === 'pinafore') {   // children: collared shirt / blouse (+ suspenders for boys)
    g.fillStyle = spec.shirt; g.fillRect(0, 0, W, H); g.strokeStyle = INK; g.lineJoin = 'round';
    if (spec.outfit === 'knickers') for (const q of [-1, 1]) { g.fillStyle = spec.suspender; g.fillRect(U(0.5 + q * 0.065) - 9, 0, 18, H); g.lineWidth = 2; g.strokeRect(U(0.5 + q * 0.065) - 9, -2, 18, H + 4); g.fillStyle = '#d9c28a'; g.beginPath(); g.arc(U(0.5 + q * 0.065), V(0.86), 5, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.fillStyle = spec.shirt; g.lineWidth = 2.5; for (const q of [-1, 1]) { g.beginPath(); g.moveTo(U(0.5 + q * 0.012), V(0.01)); g.lineTo(U(0.5 + q * 0.09), V(0.0)); g.lineTo(U(0.5 + q * 0.055), V(0.18)); g.lineTo(U(0.5 + q * 0.008), V(0.1)); g.closePath(); g.fill(); g.stroke(); }
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(U(0.5), V(0.1)); g.lineTo(U(0.5), H); g.stroke(); for (const v of [0.3, 0.5, 0.7]) { g.fillStyle = '#c9c2b0'; g.beginPath(); g.arc(U(0.5) + 6, V(v), 3.5, 0, Math.PI * 2); g.fill(); g.stroke(); }
    const t0 = new T.CanvasTexture(c); t0.colorSpace = T.SRGBColorSpace; t0.anisotropy = 8; return t0;
  }
  g.fillStyle = spec.vest; g.fillRect(0, 0, W, H);
  g.fillStyle = spec.shirt; g.beginPath(); g.moveTo(U(0.5 - 0.075), 0); g.lineTo(U(0.5), V(0.4)); g.lineTo(U(0.5 + 0.075), 0); g.closePath(); g.fill();
  g.strokeStyle = INK; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath(); g.moveTo(U(0.5 - 0.075), 0); g.lineTo(U(0.5), V(0.4)); g.lineTo(U(0.5 + 0.075), 0); g.stroke();
  g.fillStyle = spec.shirt; g.strokeStyle = INK; g.lineWidth = 2.5; for (const q of [-1, 1]) { g.beginPath(); g.moveTo(U(0.5 + q * 0.012), V(0.01)); g.lineTo(U(0.5 + q * 0.085), V(0.0)); g.lineTo(U(0.5 + q * 0.05), V(0.17)); g.lineTo(U(0.5 + q * 0.008), V(0.09)); g.closePath(); g.fill(); g.stroke(); }   // painted collar wings
  if (!spec.scarf) { g.fillStyle = '#6b2a2a'; g.beginPath(); g.moveTo(U(0.5 - 0.012), V(0.02)); g.lineTo(U(0.5 + 0.012), V(0.02)); g.lineTo(U(0.5 + 0.02), V(0.3)); g.lineTo(U(0.5), V(0.36)); g.lineTo(U(0.5 - 0.02), V(0.3)); g.closePath(); g.fill(); g.stroke(); }
  g.strokeStyle = mix(spec.vest, INK, 0.45); g.lineWidth = 2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(U(0.5 + s * 0.045), V(0.18)); g.lineTo(U(0.5 + s * 0.05), V(0.9)); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(U(0.5), V(0.4)); g.lineTo(U(0.5), H); g.stroke();
  for (const v of [0.5, 0.62, 0.74, 0.86]) { g.fillStyle = '#d9c28a'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(U(0.5), V(v), 5.5, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 3; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(U(0.5 + s * 0.035), V(0.68)); g.lineTo(U(0.5 + s * 0.075), V(0.66)); g.stroke(); }   // welt pockets
  g.strokeStyle = '#c9a24a'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(U(0.5), V(0.5)); g.quadraticCurveTo(U(0.5 + 0.03), V(0.72), U(0.5 + 0.075), V(0.66)); g.stroke();   // watch chain
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
function coatTex(spec, long) {   // open coat shell: u = 0 / 1 are the front edges, .5 is centre back
  const W = 512, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), U = (u) => u * W, V = (v) => v * H;
  g.fillStyle = spec.coat; g.fillRect(0, 0, W, H);
  const rnd = mulberry(hashSeed(spec.seed + 'w')); for (let i = 0; i < 900; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)'; g.fillRect(rnd() * W, rnd() * H, 2, 2); }
  const lap = mix(spec.coat, '#000000', 0.2); g.lineJoin = 'round';
  if (spec.outfit === 'turnout') {   // 1919 firefighter: double-breasted wool turnout coat, twin vertical brass button rows
    for (const s of [0, 1]) { const e = s ? W : 0, d = s ? -1 : 1;
      g.fillStyle = lap; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(e, 0); g.lineTo(e + d * U(0.13), 0); g.lineTo(e + d * U(0.07), V(0.22)); g.lineTo(e + d * U(0.1), V(0.34)); g.lineTo(e, V(0.35)); g.closePath(); g.fill(); g.stroke();
      for (const col of [0.035, 0.1]) for (const v of [0.18, 0.31, 0.44, 0.57, 0.7]) { g.fillStyle = '#d9b34a'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(e + d * U(col), V(v), 7.5, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(e + d * U(col) - 2, V(v) - 2, 2.4, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = 'rgba(43,26,42,.7)'; g.lineWidth = 3; g.strokeRect(s ? U(0.8) : U(0.12), V(0.68), U(0.09), V(0.05)); }
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(U(0.5), V(0.5)); g.lineTo(U(0.5), H); g.stroke(); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, V(0.965), W, V(0.035));
    const tt = new T.CanvasTexture(c); tt.colorSpace = T.SRGBColorSpace; tt.anisotropy = 8; return tt;
  }
  if (spec.outfit === 'pinafore') {   // pleated pinafore: vertical pleat lines, bib + straps
    g.strokeStyle = mix(spec.coat, '#000000', 0.35); g.lineWidth = 2.5; for (let i = 1; i < 28; i++) { g.beginPath(); g.moveTo(U(i / 28), V(0.28)); g.lineTo(U(i / 28), H); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(2, 0); g.lineTo(2, H); g.moveTo(W - 2, 0); g.lineTo(W - 2, H); g.stroke(); g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, V(0.94), W, V(0.06));
    for (const s of [0, 1]) { const e = s ? W : 0, d = s ? -1 : 1; g.fillStyle = '#d9c28a'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(e + d * U(0.06), V(0.3), 6, 0, Math.PI * 2); g.fill(); g.stroke(); }
    const tp = new T.CanvasTexture(c); tp.colorSpace = T.SRGBColorSpace; tp.anisotropy = 8; return tp;
  }
  for (const s of [0, 1]) {
    const e = s ? W : 0, d = s ? -1 : 1;
    g.fillStyle = lap; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(e, 0); g.lineTo(e + d * U(0.1), 0); g.lineTo(e + d * U(0.03), V(0.2)); g.lineTo(e + d * U(0.075), V(0.3)); g.lineTo(e, V(0.31)); g.closePath(); g.fill(); g.stroke();
    for (const v of long ? [0.42, 0.55] : [0.4, 0.58]) { g.fillStyle = '#2a1c14'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(e + d * U(0.035), V(v), 7, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(e + d * U(0.035) - 2, V(v) - 2, 2, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(43,26,42,.7)'; g.lineWidth = 3; g.strokeRect(s ? U(0.82) : U(0.1), V(long ? 0.6 : 0.64), U(0.08), V(0.045));   // pocket flaps
  }
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(2, 0); g.lineTo(2, H); g.moveTo(W - 2, 0); g.lineTo(W - 2, H); g.stroke();   // open edges
  g.beginPath(); g.moveTo(U(0.5), V(0.55)); g.lineTo(U(0.5), H); g.stroke();   // back vent
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, V(0.965), W, V(0.035));
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}

/* ---------------- character ---------------- */
const BONES = ['pelvis', 'chest', 'neck', 'head', 'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR', 'hipL', 'kneeL', 'ankleL', 'hipR', 'kneeR', 'ankleR'];
export const CLIPS = ['idle', 'walk', 'run_panic', 'talk', 'look_up', 'shock', 'sit_cards', 'collect_bucket', 'trapped_struggle', 'wade_slow'];
const LEGACY = { Idle: 'idle', Walk: 'walk', Run: 'run_panic', run: 'run_panic', Wave: 'talk' }, normClip = (n) => CLIPS.includes(n) ? n : LEGACY[n] || null;
export function createCharacter(spec) {
  const f = spec.sex === 'female', B0 = BODY[spec.type] || BODY.default;
  const B = { sx: B0.sx * (f ? 0.9 : 1), hip: B0.hip * (f ? 1.1 : 1), gir: B0.gir, h: B0.h, limb: B0.limb * (f ? 0.92 : 1) };
  for (const k in B) B[k] = clamp(B[k], 0.8, 1.3);
  const KS = spec.isChild ? 0.62 : 1, G = new T.Group(), root = new T.Group(); G.add(root); root.scale.setScalar(B.h * KS);   // children: ~0.62x height, bigger head ratio (below)
  const bones = {}, bone = (name, parent, x, y, z) => { const o = new T.Object3D(); o.name = name; o.position.set(x, y, z); parent.add(o); bones[name] = o; return o; };
  const face = makeFace(spec), setExpr = (n) => { if (face.expr !== n) { face.expr = n; face.draw(); } };
  const mats = { skin: toon(spec.skin), coat: toon('#ffffff', coatTex(spec, spec.outfit !== 'jacket'), T.DoubleSide), coatFlat: toon(spec.coat), coatDark: toon(mix(spec.coat, '#000000', 0.25)), vest: toon('#ffffff', vestTex(spec)), shirt: toon(spec.shirt), pants: toon(spec.pants), boot: toon(spec.boots), hair: toon(spec.hairColor), head: toon('#ffffff', face.tex),
    sock: toon(spec.sock || spec.pants), belt: toon('#4a2f1c'), brass: toon('#d9b34a'), scarf: toon(spec.scarf || '#000000'), heel: toon(mix(spec.boots, '#000000', 0.35)), hat: toon(spec.hat, null, T.DoubleSide), visor: toon(mix(spec.hat, '#000000', 0.13), null, T.DoubleSide), hatBand: toon(mix(spec.hat, '#000000', 0.55)) };
  mats.boot.onBeforeCompile = (sh) => {   // darker sole strip along the bottom, crisp 2-tone edge
    sh.vertexShader = 'varying float vBY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vBY = position.y;');
    sh.fragmentShader = 'varying float vBY;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n if (vBY < -0.0615) diffuseColor.rgb *= 0.55;');
  };
  const HIP = 0.88, SH_TOP = 1.40, NECK_TOP = 1.48, XS = 1.18, ZS = 0.8, TH = SH_TOP - HIP + 0.04;
  const rTop = 0.15 * B.sx, rBot = 0.14 * B.hip * B.gir, cOff = 0.022;
  const pelvis = bone('pelvis', root, 0, HIP, 0), chest = bone('chest', pelvis, 0, 0, 0);
  pelvis.add(M(sph(1, 28, 16), mats.pants, 0, -0.01, 0, { s: [rBot * XS * 1.04, 0.115, rBot * ZS * 1.12], ink: false }));
  const inner = new T.Group(); inner.scale.set(XS, 1, ZS); inner.position.y = (SH_TOP + HIP) / 2 - HIP - 0.02;
  inner.add(M(new T.CylinderGeometry(rTop, rBot, TH, 48, 1, false, Math.PI), mats.vest, 0, 0, 0, { ink: false }));
  inner.add(M(sph(rTop, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.shirt, 0, TH / 2, 0, { s: [1, 0.38, 1], ink: false })); chest.add(inner);
  const neck = bone('neck', chest, 0, NECK_TOP - HIP, 0); chest.add(M(new T.CylinderGeometry(0.055, 0.06, 0.1, 20), mats.skin, 0, SH_TOP + 0.03 - HIP, 0, { ink: false }));
  if (spec.scarf) chest.add(M(new T.TorusGeometry(0.068, 0.024, 12, 36), mats.scarf, 0, SH_TOP + 0.058 - HIP, 0, { r: [Math.PI / 2, 0, 0] }));   // snug ring, no hanging parts
  // coat / jacket / A-line coat: open-front shell, slightly wider than the torso, with yoke + collar
  const longLen = { overcoat: 0.56, jacket: 0.8, aline: 0.3, turnout: 0.26, pinafore: 0.5, knickers: 0.56 }[spec.outfit] ?? 0.56, flare = { overcoat: 0.09, jacket: 0.04, aline: 0.12, turnout: 0.03, pinafore: 0.12, knickers: 0.09 }[spec.outfit] ?? 0.09, gap = ({ aline: 46, turnout: 20, pinafore: 40 }[spec.outfit] ?? 58) * D, noCoat = spec.outfit === 'knickers', slv = noCoat || spec.outfit === 'pinafore' ? mats.shirt : mats.coatFlat;
  const cTopR = rTop + cOff, cBotR = rBot + flare + cOff, Hc = SH_TOP - longLen + 0.005, profR = (y) => cTopR + (cBotR - cTopR) * clamp((SH_TOP - y) / Hc, 0, 1);
  const a0 = gap / 2, a1 = Math.PI * 2 - gap / 2, SPLIT = HIP - 0.02, upBot = Math.max(longLen, SPLIT);
  // coat = upper body on the chest (tilts 1:1 with the torso) + lower skirt flaps on the pelvis that swing with the legs
  const piece = (t0, t1, yT, yB, k = 1, hs = 1) => { const g = new T.CylinderGeometry(profR(yT) * k, profR(yB) * k, yT - yB, 40, hs, true, t0, t1 - t0), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setX(i, (t0 + u * (t1 - t0) - a0) / (a1 - a0)); uv.setY(i, 1 - (SH_TOP - (yB + v * (yT - yB))) / Hc); } g.translate(0, (yT + yB) / 2, 0); return g; };
  const shell = (parent, geos) => { const grp = new T.Group(); grp.scale.set(XS, 1, ZS); grp.position.y = -HIP; for (const g of geos) grp.add(M(g, mats.coat)); parent.add(grp); };
  const coatGeo = piece(a0, a1, SH_TOP, longLen, 1, 18); if (!noCoat) shell(chest, [coatGeo]);   // ONE continuous multi-segment coat on the chest pivot (the ink hull shares this geometry, so it stretches identically)
  if (!noCoat) chest.add(M(sph(cTopR, 44, 10, FRONT + gap / 2, Math.PI * 2 - gap, 0, Math.PI / 2), mats.coatFlat, 0, SH_TOP - HIP, 0, { s: [XS, 0.38, ZS] }));
  const cpos = coatGeo.attributes.position, cbase = cpos.array.slice(), cdist = SPLIT - longLen;
  const coatStretch = (stride) => {   // below the hip line: hem pushes +Z at the front, -Z at the back (quadratic falloff), sides flare a little
    if (cdist <= 0.01) return; const st = Math.min(stride, 1.2), arr = cpos.array, push = cdist * 0.85 * st / ZS;
    for (let i = 0; i < cpos.count; i++) { const y = cbase[3 * i + 1], t = clamp((SPLIT - y) / cdist, 0, 1), k = t * t, x = cbase[3 * i], z = cbase[3 * i + 2], r = Math.hypot(x, z) || 1; arr[3 * i] = x * (1 + 0.14 * st * k); arr[3 * i + 2] = z + push * k * (z / r); }
    cpos.needsUpdate = true;
  };
  const col = new T.TorusGeometry(0.078, 0.026, 10, 36, Math.PI * 2 - gap); col.rotateZ(FRONT + gap / 2); col.rotateX(Math.PI / 2);
  if (!noCoat) chest.add(M(col, mats.coatFlat, 0, SH_TOP + 0.035 - HIP, 0));
  if (spec.outfit === 'turnout') { const belt = new T.Group(); belt.scale.set(XS, 1, ZS); belt.position.y = 1.0 - HIP; belt.add(M(new T.TorusGeometry(profR(1.0) + 0.008, 0.02, 10, 44), mats.belt, 0, 0, 0, { r: [Math.PI / 2, 0, 0] })); belt.add(M(new T.BoxGeometry(0.05, 0.05, 0.016), mats.brass, 0, 0, profR(1.0) + 0.03)); chest.add(belt); }   // thick leather belt + brass buckle
  // head: smooth oval sphere; everything on it shares the oval scale so caps/hats hug it
  const head = bone('head', neck, 0, 0, 0), HG = new T.Group(), HK = spec.isChild ? 1.3 : 1; HG.position.y = 0.148 + (spec.isChild ? 0.03 : 0); HG.scale.set(0.95 * HK, 1.05 * HK, 0.96 * HK); head.add(HG);
  HG.add(M(sph(0.16, 56, 36, -Math.PI / 2), mats.head));
  for (const s of [-1, 1]) HG.add(M(sph(0.034, 14, 10), mats.skin, s * 0.158, -0.028, -0.01, { s: [0.5, 1, 0.8] }));
  const R = 0.16, hs0 = spec.hairStyle === 'none' && spec.headwear !== 'none' ? 'short_part' : spec.hairStyle;   // a hat never leaves the head shaved
  const HP = { short_part: [106, 88, 80, 62, 1.05], swept_back: [112, 90, 78, 50, 1.07], low_bun: [104, 88, 80, 60, 1.05], bob: [128, 120, 108, 62, 1.09], twin_buns: [104, 88, 80, 60, 1.05] }[hs0];
  if (HP) HG.add(M(hairShell(R * HP[4], HP), mats.hair));
  if (hs0 === 'short_part' && spec.headwear === 'none') HG.add(M(sph(0.07, 20, 14), mats.hair, -0.05, 0.118, 0.085, { s: [1.25, 0.6, 1], r: [0, 0, 0.35] }));
  if (hs0 === 'swept_back' && spec.headwear === 'none') HG.add(M(sph(0.09, 20, 14), mats.hair, 0, 0.12, -0.04, { s: [1.3, 0.75, 1.4] }));
  if (hs0 === 'low_bun') HG.add(M(sph(0.062, 20, 14), mats.hair, 0, -0.02, -0.165));
  if (hs0 === 'twin_buns') for (const sx of [-1, 1]) { HG.add(M(sph(0.058, 18, 12), mats.hair, sx * 0.125, 0.105, -0.075)); HG.add(M(sph(0.022, 10, 8), mats.brass, sx * 0.14, 0.14, -0.04, { s: [1.4, 0.7, 0.7] })); HG.add(M(sph(0.022, 10, 8), mats.brass, sx * 0.11, 0.14, -0.05, { s: [1.4, 0.7, 0.7] })); }   // buns + ribbon bows
  // facial hair (sideburns, beard, mustache, goatee) is painted on the face canvas: see drawFace
  const hw = spec.headwear;
  if (hw === 'flat_cap') {   // soft squashed crown leaning forward + a solid darker visor fused into its front
    HG.add(M(sph(0.17, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), mats.hat, 0, 0.04, 0.012, { s: [1.05, 0.78, 1.08], r: [-0.06, 0, 0.03] }));
    HG.add(M(visorGeo(), mats.visor, 0, 0.058, 0.012, { r: [0.06, 0, 0.03] }));
  }
  if (hw === 'bowler_hat') { HG.add(M(sph(0.172, 44, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.hat, 0, 0.055, 0)); HG.add(M(new T.CylinderGeometry(0.174, 0.176, 0.034, 40, 1, true), mats.hatBand, 0, 0.07, 0, { s: [1, 1, 1.04], ink: false })); HG.add(M(sph(0.2, 40, 10), mats.hat, 0, 0.056, 0.01, { s: [1.1, 0.07, 1.14] })); }
  if (hw === 'top_hat') { HG.add(M(new T.CylinderGeometry(R * 1.0, R * 1.04, 0.27, 48), mats.hat, 0, 0.18, 0, { s: [0.95, 1, 0.96] })); HG.add(M(new T.CylinderGeometry(R * 1.04 + 0.002, R * 1.04 + 0.003, 0.05, 48, 1, true), mats.hatBand, 0, 0.07, 0, { s: [0.95, 1, 0.96], ink: false })); HG.add(M(sph(0.2, 40, 10), mats.hat, 0, 0.046, 0.008, { s: [1.05, 0.065, 1.08] })); }
  if (hw === 'cloche_hat') { HG.add(M(cap(R * 1.15, 0, 83, FRONT, Math.PI), mats.hat)); HG.add(M(new T.TorusGeometry(R * 1.15 * Math.sin(83 * D) + 0.004, 0.012, 10, 44), mats.hat, 0, R * 1.15 * Math.cos(83 * D), 0, { r: [Math.PI / 2, 0, 0] })); HG.add(M(new T.TorusGeometry(R * 1.15 * Math.sin(66 * D) + 0.002, 0.011, 8, 44), mats.hatBand, 0, R * 1.15 * Math.cos(66 * D), 0, { r: [Math.PI / 2, 0, 0], ink: false })); }
  if (hw === 'fire_helmet') {   // 1919 leather fire helmet: tall ridged crown, comb, sloped back neck-brim, brass front shield
    HG.add(M(sph(0.178, 44, 18, 0, Math.PI * 2, 0, Math.PI / 2), mats.hat, 0, 0.04, 0.004, { s: [1.04, 1.2, 1.08] }));
    const comb = new T.TorusGeometry(0.2, 0.017, 8, 36, Math.PI * 0.82); comb.rotateZ(Math.PI / 2 - Math.PI * 0.41); comb.rotateY(Math.PI / 2); HG.add(M(comb, mats.hat, 0, 0.04, 0.004, { s: [1, 1.1, 1] }));
    HG.add(M(sph(0.2, 40, 10), mats.hat, 0, 0.05, 0.01, { s: [1.0, 0.05, 1.04] }));   // round rim
    HG.add(M(new T.CylinderGeometry(0.2, 0.27, 0.12, 40, 1, true, Math.PI - 0.95, 1.9), mats.hat, 0, 0.0, -0.03, { r: [0.3, 0, 0] }));   // long sloped back brim
    const sh = new T.Shape(); sh.moveTo(-0.046, 0.06); sh.lineTo(0.046, 0.06); sh.lineTo(0.046, 0.0); sh.quadraticCurveTo(0.046, -0.05, 0, -0.08); sh.quadraticCurveTo(-0.046, -0.05, -0.046, 0.0); sh.closePath();
    const sg = new T.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 10 }); HG.add(M(smoothHull(sg), mats.brass, 0, 0.19, 0.196, { r: [-0.32, 0, 0] }));   // brass shield
  }
  // arms: coat sleeves, shirt cuffs, rounded mitten hands
  const L = B.limb, aR = 0.05 * L, armX = cTopR * XS * 0.9 + 0.012 + aR * 0.5;
  for (const s of [-1, 1]) {
    const n = s < 0 ? 'L' : 'R', sh = bone('shoulder' + n, chest, s * armX, 1.355 - HIP, 0), el = bone('elbow' + n, sh, 0, -0.3, 0), wr = bone('wrist' + n, el, 0, -0.27, 0);
    const r0 = aR + 0.008, r1 = aR + 0.002;
    sh.add(M(new T.CylinderGeometry(r0, r1, 0.3, 24), slv, 0, -0.15, 0)); sh.add(M(sph(r0, 24, 16), slv, 0, 0, 0));   // upper sleeve + shoulder ball
    el.add(M(sph(r1 + 0.0005, 24, 16), slv, 0, 0, 0));   // elbow ball bridges the sleeve
    el.add(M(new T.CylinderGeometry(r1 + 0.0005, aR * 0.8, 0.27, 24), slv, 0, -0.135, 0));
    wr.add(M(new T.CylinderGeometry(aR * 0.8 + 0.006, aR * 0.8 + 0.006, 0.034, 20), mats.shirt, 0, -0.004, 0, { ink: false }));   // cuff
    wr.add(M(sph(0.041 * Math.sqrt(L), 24, 16), mats.skin, 0, -0.036, 0, { s: [0.88, 1.05, 0.64] }));   // flat mitten tucked into the cuff
    sh.rotation.z = s * (spec.outfit === 'aline' ? 0.24 : 0.14); el.rotation.x = -0.12;
  }
  // legs and pill boots with a heel block
  const lr = 0.07 * L, hipX = 0.075 + 0.02 * B.hip;
  for (const s of [-1, 1]) {
    const n = s < 0 ? 'L' : 'R', hp = bone('hip' + n, pelvis, s * hipX, 0, 0), kn = bone('knee' + n, hp, 0, -0.4, 0), an = bone('ankle' + n, kn, 0, -0.39, 0);
    hp.add(M(new T.CylinderGeometry(lr, lr * 0.86, 0.4, 24), mats.pants, 0, -0.2, 0)); kn.add(M(sph(lr * 0.87, 20, 14), mats.pants, 0, 0, 0, { ink: false }));
    const sock = spec.isChild || spec.outfit === 'pinafore';   // knee socks / dark tights for children
    kn.add(M(new T.CylinderGeometry(lr * 0.86, lr * 0.56, 0.39, 24), sock ? mats.sock : mats.pants, 0, -0.195, 0));
    if (spec.outfit === 'knickers') hp.add(M(new T.TorusGeometry(lr * 0.88, 0.016, 8, 24), mats.pants, 0, -0.4, 0, { r: [Math.PI / 2, 0, 0] }));   // knicker cuff
    if (spec.outfit === 'turnout') { kn.add(M(new T.CylinderGeometry(lr * 0.92, lr * 0.66, 0.34, 24), mats.boot, 0, -0.2, 0)); kn.add(M(new T.TorusGeometry(lr * 0.93, 0.016, 8, 24), mats.belt, 0, -0.03, 0, { r: [Math.PI / 2, 0, 0] })); }   // tall leather boots
    an.add(M(bootGeo(), mats.boot, 0, 0, 0));   // one solid extruded boot, slim shaft hugging the trouser leg
  }
  const rest = {}; for (const k of BONES) rest[k] = bones[k].rotation.clone();
  pelvis.userData.y0 = HIP;
  const ch = { group: G, bn: (k) => bones[k], rest, height: 1.8 * B.h * KS, skirt: spec.outfit === 'aline', clip: 'idle', clips: CLIPS, spec, _from: null, _fs: null, _t0: null,
    play(name) { const n = normClip(name); if (!n || n === ch.clip) return ch; ch._from = {}; for (const k of BONES) ch._from[k] = bones[k].rotation.clone(); ch._fy = bones.pelvis.position.y; ch._fz = bones.pelvis.position.z; ch._fs = null; ch._t0 = null; ch.clip = n; if (!face.manual) setExpr(AUTO[n]); return ch; }, setAnimation(name) { return ch.play(name); },
    face, coatStretch, get expression() { return face.expr; }, mats,
    setFlush(k) { k = Math.round(clamp(k, 0, 1) * 8) / 8; if (ch._fl === k) return ch; ch._fl = k; ch._skin0 = ch._skin0 || spec.skin; const c = new T.Color(ch._skin0).lerp(new T.Color('#c8284a'), k * 0.8); spec.skin = c.getStyle(); mats.skin.color.copy(c); face.draw(); return ch; },
    setExpression(n) { if (!n || n === 'auto') { face.manual = null; setExpr(AUTO[ch.clip]); } else if (EXPRESSIONS.includes(n)) { face.manual = n; setExpr(n); } return ch; },
    setFaceStyle(n) { if (FACE_STYLES[n]) { face.style = n; face.draw(); } return ch; },
    tickFace(t) { if (face.expr === 'talking') { const ph = TALK[Math.floor(t * 9) % TALK.length]; if (ph !== face.phase) { face.phase = ph; face.draw(); } } else if (face.phase) { face.phase = 0; face.draw(); } },
    dispose() { G.traverse((o) => { if (o.geometry && !o.userData.hull) o.geometry.dispose(); }); Object.values(mats).forEach((m) => { m.map && m.map.dispose(); m.dispose(); }); } };
  return ch;
}
export const buildCharacter = createCharacter;

/* ---------------- documentary animation pack: procedural, eased, cross-faded ---------------- */
const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, mixv = (a, b, k) => a + (b - a) * k;
export function applyPose(ch, t, clip) {
  clip = normClip(clip === true ? 'walk' : clip) || ch.clip || 'idle'; if (ch.clip !== clip) ch.play(clip);
  const { bn, rest } = ch; for (const k in rest) bn(k).rotation.copy(rest[k]);
  const pel = bn('pelvis'), y0 = pel.userData.y0; pel.position.set(0, y0, 0);
  if (ch._t0 == null) ch._t0 = t; const tt = t - ch._t0, A = (n, x = 0, y = 0, z = 0) => { const r = bn(n).rotation; r.x += x; r.y += y; r.z += z; }, sk = ch.skirt ? 0.65 : 1;
  if (clip === 'walk' || clip === 'run_panic') {
    const run = clip === 'run_panic', p = t * (run ? 10.5 : 5.5), a = Math.sin(p), c = Math.cos(p), sw = (run ? 1.0 : 0.5) * sk, kn = (run ? 1.5 : 0.85) * sk;
    A('hipL', -a * sw); A('hipR', a * sw); A('kneeL', (run ? 0.2 : 0.1) + kn * Math.pow(Math.max(0, c), 1.3)); A('kneeR', (run ? 0.2 : 0.1) + kn * Math.pow(Math.max(0, -c), 1.3));
    A('shoulderL', a * (run ? 1.0 : 0.5)); A('shoulderR', -a * (run ? 1.0 : 0.5));
    A('elbowL', -(run ? 1.3 : 0.15) - (run ? 0.2 : 0.35) * Math.max(0, -a)); A('elbowR', -(run ? 1.3 : 0.15) - (run ? 0.2 : 0.35) * Math.max(0, a));
    A('chest', run ? 0.28 : 0.035, a * (run ? 0.14 : 0.1)); A('pelvis', 0, -a * (run ? 0.12 : 0.07)); A('shoulderL', 0, 0, 0);
    if (run) { A('head', -0.2 + Math.sin(p * 2) * 0.05, Math.sin(p * 0.7 + 1) * 0.38, Math.sin(p * 1.3) * 0.09); A('shoulderL', 0, 0, -0.1); A('shoulderR', 0, 0, 0.1); }
    else { A('head', Math.sin(p * 2) * 0.02 - 0.02, -a * 0.04, 0); A('shoulderL', 0, 0, Math.sin(p) * 0.02); }
    pel.position.y = y0 + (run ? 0.065 : 0.02) * (1 - Math.abs(a)) - (run ? 0.03 : 0.006);
  } else if (clip === 'talk') {
    const u = Math.sin(t * 1.8), r = sm(Math.max(0, u) * 1.4), l = sm(Math.max(0, -u) * 1.4), w = Math.sin(t * 7.5);
    A('shoulderR', -0.5 * r, 0, 0.1 * r); A('elbowR', -0.95 * r + 0.18 * r * w); A('shoulderL', -0.5 * l, 0, -0.1 * l); A('elbowL', -0.95 * l + 0.18 * l * w);
    A('head', 0.045 * Math.sin(t * 3.1) + 0.02, 0.14 * Math.sin(t * 0.9), 0.03 * Math.sin(t * 0.9 + 1)); A('chest', Math.sin(t * 1.6) * 0.012, 0.07 * Math.sin(t * 0.9)); pel.position.y = y0 + Math.sin(t * 1.6) * 0.003;
  } else if (clip === 'look_up') {
    const b = Math.sin(t * 1.5); A('chest', -0.2 + b * 0.01); A('head', -0.36 + Math.sin(t * 0.7) * 0.02, Math.sin(t * 0.4) * 0.06); A('pelvis', 0.04); A('shoulderL', 0, 0, -0.05); A('shoulderR', 0, 0, 0.05); A('elbowL', -0.1); A('elbowR', -0.1); pel.position.y = y0 + b * 0.003;
  } else if (clip === 'shock') {
    const k = sm(tt / 0.22) * (1 + 0.12 * Math.sin(clamp(tt / 0.22, 0, 1) * Math.PI)), tr = Math.sin(t * 38) * 0.012 * sm((tt - 0.2) / 0.1);
    pel.position.z = -0.09 * k; A('hipL', 0.42 * k * sk); A('kneeL', 0.2 * k); A('hipR', -0.12 * k * sk); A('kneeR', 0.1 * k); A('chest', -0.14 * k); A('head', -0.1 * k + tr, tr * 2); pel.position.y = y0 - 0.02 * k;
    for (const n of ['L', 'R']) { A('shoulder' + n, -0.95 * k, 0, (n === 'L' ? -1 : 1) * -0.05 * k); A('elbow' + n, -1.65 * k + tr); }
  } else if (clip === 'sit_cards') {   // seated on a crate (pelvis dropped to seat height), head down over the hand, one hand flicking a card
    const b = Math.sin(t * 1.3), pl = Math.max(0, Math.sin(t * 1.1)); pel.position.y = y0 - 0.46; pel.position.z = -0.04;
    A('hipL', -1.5 * sk); A('hipR', -1.5 * sk); A('kneeL', 1.45); A('kneeR', 1.45); A('chest', 0.12 + b * 0.01); A('head', 0.3 + Math.sin(t * 0.7) * 0.03, 0.22 * Math.sin(t * 0.45));
    A('shoulderL', -0.85, 0, 0.12); A('elbowL', -1.55); A('shoulderR', -0.8 + 0.14 * pl, 0, -0.12); A('elbowR', -1.5 - 0.25 * pl);
  } else if (clip === 'collect_bucket') {   // slight crouch, both hands out holding a bucket low, watching it fill
    const b = Math.sin(t * 1.4); pel.position.y = y0 - 0.035; A('hipL', -0.3 * sk); A('hipR', -0.3 * sk); A('kneeL', 0.6); A('kneeR', 0.6); A('chest', 0.2 + b * 0.01); A('head', -0.05 + Math.sin(t * 0.8) * 0.03, Math.sin(t * 0.5) * 0.05);
    A('shoulderL', -0.75, 0, 0.1); A('shoulderR', -0.75, 0, -0.1); A('elbowL', -0.7 + b * 0.02); A('elbowR', -0.7 - b * 0.02);
  } else if (clip === 'trapped_struggle') {   // stuck from the waist down: flailing arms, twisting torso, wild head
    const w = Math.sin(t * 5.5), w2 = Math.sin(t * 5.5 + 2.2); pel.position.y = y0 - 0.03 + 0.02 * Math.sin(t * 4);
    A('shoulderL', -2.4 + 0.5 * w, 0, -0.5); A('shoulderR', -2.2 + 0.5 * w2, 0, 0.5); A('elbowL', -0.4 + 0.5 * w2); A('elbowR', -0.4 + 0.5 * w);
    A('chest', 0.12 * Math.sin(t * 2.7), 0.22 * Math.sin(t * 3.1), 0.12 * Math.sin(t * 2.3)); A('head', -0.18 + 0.08 * Math.sin(t * 6), 0.18 * Math.sin(t * 3.3)); A('hipL', 0.2 * Math.sin(t * 3) * sk); A('hipR', -0.2 * Math.sin(t * 3) * sk);
  } else if (clip === 'wade_slow') {   // 0.3x sluggish walk, heavy forward lean, arms dragging for balance
    const p = t * 5.5 * 0.3, a = Math.sin(p); A('hipL', -a * 0.5 * sk); A('hipR', a * 0.5 * sk); A('kneeL', 0.25 + 0.7 * Math.pow(Math.max(0, Math.cos(p)), 1.3) * sk); A('kneeR', 0.25 + 0.7 * Math.pow(Math.max(0, -Math.cos(p)), 1.3) * sk);
    A('chest', 0.28 + 0.02 * a, 0.12 * a); A('pelvis', 0, -0.07 * a); A('head', -0.08, -0.05 * a); A('shoulderL', 0.35 * a - 0.15, 0, -0.18); A('shoulderR', -0.35 * a - 0.15, 0, 0.18); A('elbowL', -0.5); A('elbowR', -0.5); pel.position.y = y0 - 0.03 + 0.012 * Math.sin(p * 2);
  } else { const b = Math.sin(t * 1.7), g = Math.sin(t * 0.45); A('chest', b * 0.012); A('shoulderL', 0, 0, -b * 0.015); A('shoulderR', 0, 0, b * 0.015); A('head', Math.sin(t * 0.8) * 0.015, 0.22 * g * Math.abs(g) ** 0.5, 0); A('elbowL', Math.sin(t * 0.9) * 0.02); pel.position.y = y0 + b * 0.004; }
  if (ch._from) { if (ch._fs == null) ch._fs = t; const e = sm((t - ch._fs) / 0.35); for (const k in rest) { const r = bn(k).rotation, f = ch._from[k]; r.set(mixv(f.x, r.x, e), mixv(f.y, r.y, e), mixv(f.z, r.z, e)); } pel.position.y = mixv(ch._fy, pel.position.y, e); pel.position.z = mixv(ch._fz, pel.position.z, e); if (e >= 1) ch._from = null; }
  ch.coatStretch(Math.max(Math.abs(bn('hipL').rotation.x), Math.abs(bn('hipR').rotation.x)));   // coat hem follows the stride
  ch.tickFace(t);
}

/* ---------------- stage: orthographic camera, lights, drag turntable ---------------- */
export function createStage(canvas, opts = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true }); renderer.setClearColor(0xefe3cf, 1);
  const scene = new T.Scene(), cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 50); cam.position.set(0, 0.95, 12); cam.lookAt(0, 0.95, 0);
  scene.add(new T.AmbientLight(0xffffff, 1.9)); const key = new T.DirectionalLight(0xfff4e6, 1.7); key.position.set(2.5, 4, 5); cam.add(key); scene.add(cam);   // lights ride with the camera: shading stays constant while the figure turns
  const pivot = new T.Group(); scene.add(pivot); let ch = null, exprManual = null, yaw = 0, clip = 'idle', spin = false, vel = 0, t0 = performance.now(), dragging = false, lastX = 0, fitH = 2.7;
  const fit = (h) => { fitH = h; const w = canvas.clientWidth || 400, hh = canvas.clientHeight || 520, asp = w / hh; cam.top = h / 2; cam.bottom = -h / 2; cam.left = -h * asp / 2; cam.right = h * asp / 2; cam.updateProjectionMatrix(); };
  const size = () => { const r = canvas.parentElement.getBoundingClientRect(), w = Math.max(200, r.width), h = Math.max(260, r.height); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(w, h, false); fit(fitH); };
  new ResizeObserver(size).observe(canvas.parentElement); size();
  const down = (e) => { dragging = true; lastX = e.clientX; vel = 0; spin = false; opts.onSpin && opts.onSpin(false); canvas.setPointerCapture(e.pointerId); }, move = (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; const d = dx * 0.6; yaw = (yaw - d + 720) % 360; vel = -d; opts.onYaw && opts.onYaw(yaw); }, up = () => { dragging = false; };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.style.touchAction = 'none';
  const api = { set(spec) { if (ch) { pivot.remove(ch.group); ch.dispose(); } ch = createCharacter(spec); ch.play(clip); if (exprManual) ch.setExpression(exprManual); pivot.add(ch.group); const mid = ch.height * 0.5 + 0.13; cam.position.set(0, mid, 12); cam.lookAt(0, mid, 0); fit(ch.height + 0.85); return ch; },
    setYaw(d) { yaw = ((d % 360) + 360) % 360; }, getYaw: () => yaw, play(n) { const m = normClip(n); if (m) { clip = m; ch && ch.play(m); } }, setAnimation(n) { api.play(n); }, setExpression(n) { exprManual = !n || n === 'auto' ? null : n; ch && ch.setExpression(n); }, setFaceStyle(n) { ch && ch.setFaceStyle(n); }, setWalk(v) { api.play(v ? 'walk' : 'idle'); }, setSpin(v) { spin = v; }, get character() { return ch; }, png: () => canvas.toDataURL('image/png') };
  const frame = (now) => { const dt = Math.min(0.05, (now - t0) / 1000); t0 = now; if (spin) { yaw = (yaw + 60 * dt) % 360; opts.onYaw && opts.onYaw(yaw); } else if (!dragging && Math.abs(vel) > 0.05) { yaw = (yaw + vel + 720) % 360; vel *= 0.92; opts.onYaw && opts.onYaw(yaw); }
    if (ch) { pivot.rotation.y = yaw * Math.PI / 180; applyPose(ch, now / 1000, clip); } const r = canvas.parentElement.getBoundingClientRect(); if (Math.abs(cam.right * 2 - fitH * (r.width / r.height)) > 0.01) fit(fitH); renderer.render(scene, cam); requestAnimationFrame(frame); };
  requestAnimationFrame(frame); window.__stage = api; return api;
}
