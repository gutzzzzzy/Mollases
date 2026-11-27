// The Great Molasses Flood — automated film. Everything is a pure function of the timestamp t (seconds): seekTo(t) === render frame, in the browser, in --test and in CI.
import BEATS from './beats.json';
import { createCharacter, applyPose, makeSpec, INK_K, toon, mulberry } from './engine.js';
import { createBostonStage, createMolassesTank, createMolassesWave, createPancakes, createBucket, createCrate, SYR_MATS, syrMat } from './world.js';
import { createCameraRig } from './camera.js';
import { createDuck, createXMark, createJug, createRuler, createShadowDisc, createSmoke, createBandAid } from './hook.js';
import { makeEnvs, createVFX, createFlash, createNewspaper, createMagnifier, createEvidencePlate, createStampDoc, createSyrupBottle, createFirewood, createCardTable, createScentField, createStudio, createSoftSteam, createThoughtBubble, createGagCard, createFlipCalendar, sm, eOut, eExpo } from './fx.js';
const T = window.THREE, PI = Math.PI;

/* =====================================================================================================
   EDIT HERE. K([[t, value], ...]) = keyframe track, linear between keys; two keys at the same t = hard step.
   ===================================================================================================== */
const K = (keys) => (t) => { let i = -1; for (let j = 0; j < keys.length; j++) if (keys[j][0] <= t) i = j; else break; if (i < 0) return keys[0][1]; if (i === keys.length - 1) return keys[i][1]; const a = keys[i], b = keys[i + 1]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); };
/* beats.json = the ONE shared audio map (film.js, camera, fx and sfx.py all read it). The film is authored on DESIGN time; the voiceover decides ACTUAL time,
   so toDesign(t) (piecewise-linear through the spoken-trigger anchors) is applied once at the top of seek() and every visual + SFX stays locked to the narration. */
const lerpMap = (m, a, b, x) => { for (let i = 0; i < m.length - 1; i++) if (x <= m[i + 1][a] || i === m.length - 2) { const d = m[i + 1][a] - m[i][a] || 1e-6; return m[i][b] + (m[i + 1][b] - m[i][b]) * Math.min(1, Math.max(0, (x - m[i][a]) / d)); } return x; };
export const toDesign = (t) => lerpMap(BEATS.map, 1, 0, t), toActual = (td) => lerpMap(BEATS.map, 0, 1, td), TRIG = (k) => BEATS.triggers[k].design;
export let DURATION = 118.5;   // render.mjs calls setDuration(audioSeconds); the last beat runs to the end of the voiceover.
const END = 999, BOOM = 48.0;  // design time of "The tank had burst" (= 62.1 s of the voiceover)
const OFF = 14.1, D = (a) => a - OFF;
// post-burst (session 2): scenes are authored in voiceover seconds as design = a - 14.2; world physics keeps running on the original (old) design clock via oldOf()
const D2 = (a) => a - 14.2, OLDMAP = [[48, 48], [49.8, 49.8], [53.8, 54.7], [55.3, 57], [57.8, 60], [60.8, 67], [64.3, 71], [67.8, 75], [73.3, 79], [78.3, 86]];
const oldOf = (t) => { if (t < 48 || t >= 86) return t; for (let i = 0; i < OLDMAP.length - 1; i++) { const a = OLDMAP[i], b = OLDMAP[i + 1]; if (t < b[0]) return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); } return 86; };   // pre-burst scenes are authored in voiceover seconds: design t = actual - 14.1
const STUDIO = [D(9.8), D(13.8)], JUGW = [D(7.2), D(8.7)], SLOWMO = 57.7, TL_CAR = 57.1, TL_FIRE = 55.4, TL_WARE = 56.2, TL_RAIL = 60.9, CLOCK_T = D(58.0), PING_T = D(46.5);

// world time warp: 1x, then 0.4x for 1 s (car flips end-over-end), then 1.4x for 1.5 s to realign with the voiceover. The camera stays on real time.
export const warp = (t) => (t < SLOWMO ? t : t < SLOWMO + 1 ? SLOWMO + (t - SLOWMO) * 0.4 : t < SLOWMO + 2.5 ? SLOWMO + 0.4 + (t - SLOWMO - 1) * 1.4 : t);

export const WORLD = {   // all evaluated at world time
  wavePos: K([[D(0), -60], [D(1.8), -50], [D(4.0), -40], [D(5.6), -33], [D(7.2), -26], [D(8.7), -12], [D(9.8), -2], [D(9.8), -56.3], [48, -56.3], [49.5, -47], [51.5, -34], [54.5, -17], [57, -2], [61, 20], [64, 36], [67, 48], [67, 100], [END, 100]]),
  flood:   K([[D(0), 3.4], [D(9.8), 3.4], [D(9.8), 0], [48, 0], [48, 0.01], [48.9, 3.4], [67, 3.4], [67, 0.95], [79, 0.95], [79, 0.9], [82.5, 0.55], [85.6, -0.7], [END, -0.7]]),
  crest:   K([[0, 1], [48, 1], [64, 0.9], [67, 0.9], [67, 0], [END, 0]]),
  leak:    K([[D(0), 0.5], [D(30.2), 0.6], [D(45), 0.95], [47.9, 1], [END, 1]]),
  tankShake: K([[D(0), 0], [D(28), 0.02], [D(37.5), 0.04], [D(45), 0.14], [D(49.5), 0.12], [D(59), 0.2], [47.9, 0.45], [BOOM, 0.6], [BOOM + 1.5, 0.02], [END, 0]]),
};

export const CAST = {
  civ1: ['civ1', { sex: 'male', headwear: 'flat_cap', outfit: 'overcoat', type: 'default', facialHair: 'none' }],
  civ2: ['civ2', { sex: 'female', headwear: 'cloche_hat', outfit: 'aline', type: 'slim' }],
  civ3: ['civ3', { sex: 'male', headwear: 'bowler_hat', outfit: 'jacket', type: 'stocky', facialHair: 'mustache' }],
  civ4: ['civ4', { sex: 'female', headwear: 'none', hair: 'bob', outfit: 'aline', type: 'pear' }],
  civ5: ['civ5', { sex: 'male', headwear: 'none', hair: 'swept_back', outfit: 'jacket', type: 'tall', facialHair: 'none' }],
  civ6: ['civ6', { sex: 'female', headwear: 'cloche_hat', outfit: 'aline', type: 'default' }],
  wrk1: ['wrk1', { sex: 'male', headwear: 'flat_cap', outfit: 'jacket', type: 'broad', facialHair: 'sideburns' }],
  wrk2: ['wrk2', { sex: 'male', headwear: 'flat_cap', outfit: 'overcoat', type: 'stocky', facialHair: 'beard' }],
  wrk3: ['wrk3', { sex: 'male', headwear: 'none', hair: 'short_part', outfit: 'jacket', type: 'slim', facialHair: 'none' }],
  boss: ['boss', { sex: 'male', headwear: 'top_hat', outfit: 'overcoat', type: 'pear', facialHair: 'mustache', faceStyle: 'stern' }],
  inv:  ['inv',  { sex: 'male', headwear: 'bowler_hat', outfit: 'overcoat', type: 'tall', facialHair: 'sideburns', faceStyle: 'stern' }],
  kid1: ['kid1', { isChild: true, sex: 'male', heritage: 'european' }],
  kid2: ['kid2', { isChild: true, sex: 'female', heritage: 'european' }],
  kid3: ['kid3', { isChild: true, sex: 'male', heritage: 'latin-american' }],
  ff1:  ['ff1',  { role: 'firefighter', type: 'broad' }],
  ff2:  ['ff2',  { role: 'firefighter', type: 'stocky', heritage: 'african' }],
  ff3:  ['ff3',  { role: 'firefighter', type: 'default' }],
};
// actor placement: A(id, clip, expr, [x,z] from, [x,z] to, yaw (0 faces +z; PI faces the tank), rate, extra{off, move:[a,b], seq:[{at,clip,expr,yaw}], until})
const A = (id, clip, expr, from, to, yaw = 0, rate = 1, x = {}) => ({ id, clip, expr, from, to: to || from, yaw, rate, ...x });
const sh = (start, camStart, camEnd, lookStart, lookEnd, o = {}) => ({ start, camStart, camEnd, lookStart, lookEnd, fov: 50, ease: 'inOutCubic', shake: 0, ...o });
const SP = [0, 100, 0];   // studio set origin (the 2 s pancake commercial)

/* 28 beats, one per voiceover phrase (cut every ~1.5–3 s; some beats carry 2 shots). camStart/camEnd/lookStart/lookEnd = [x,y,z], eased inside a shot.
   Cameras stay out of the wave volume: ahead of wavePos + ~10 m, or above it. */

/* shake discipline: ZERO in every calm shot; only real impacts shake, small and exponentially damped:
   'suddenly' rumble <= 0.05, 'deafening metallic roar' tremor 0.04-0.10, one 0.28 jolt decaying in 0.8 s on 'The tank had burst'; chase/destruction keep their authored shake, aftermath is calm again. */
const gateShake = (t, raw) => {
  const S0 = TRIG('suddenly'), P0 = TRIG('pancake'), R0 = TRIG('roar'), B = TRIG('burst'), A0 = TRIG('died21');
  if (t < S0) return 0; if (t < P0) return t < S0 + 1.6 ? Math.min(raw, 0.05) * Math.exp(-(t - S0) / 1.2) : 0;
  if (t < R0) return 0; if (t < B) return 0.04 + 0.06 * (t - R0) / (B - R0);
  if (t < B + 0.8) return 0.28 * Math.exp(-(t - B) / 0.27); if (t < A0) return t < B + 1.6 ? 0 : raw; return 0;
};
export const TIMELINE = [
  { id: 1, name: 'Hook: calm low walk behind the hero', start: 0, end: 3.0, cast: [A('civ1', 'walk', 'neutral', [0.4, 22], [0.2, 13], PI, 1.0), A('civ2', 'walk', 'neutral', [-3.6, 9], [-3.5, 3], PI, 0.8, { off: 0.4 })],
    shots: [sh(0, [0.8, 1.25, 3.4], [0.7, 1.3, 3.0], [-0.2, 1.25, -5], [-0.1, 1.3, -7], { fov: 52, ease: 'linear', track: 'civ1', shake: 0, breathe: 0 })] },
  { id: 2, name: "Hook: 'suddenly' - wave erupts, hero turns and sprints (stays in frame)", start: 3.0, end: 7.2, cast: [A('civ1', 'run_panic', 'panic', [0.2, 13], [0.0, 36], 0, 1.0), A('civ2', 'run_panic', 'panic', [-3.5, 3], [-3.8, 24], 0, 1.0, { off: 0.3 })],
    shots: [sh(3.0, [1.7, 1.5, 6.2], [1.3, 1.45, 5.2], [0, 1.4, -4], [0, 2.8, -16], { fov: 54, ease: 'smooth', track: 'civ1', shake: 0.05, breathe: 0 })] },
  { id: 3, name: 'Hook: pancake commercial smash-cut', start: 7.2, end: 9.0, cast: [], studio: true,
    shots: [sh(7.2, [SP[0] + 2.4, SP[1] + 2.9, SP[2] + 8.6], [SP[0] + 1.4, SP[1] + 2.5, SP[2] + 7.2], [0, SP[1] + 1.9, 0], [0, SP[1] + 1.9, 0], { fov: 46, ease: 'outCubic', breathe: 0.2 })] },
  { id: 4, name: 'Jan 15 1919: aerial crane swoop', start: 9.0, end: 14.0, cast: [A('civ2', 'walk', 'neutral', [-3.4, 18], [-3, 4], PI, 0.85), A('civ5', 'walk', 'neutral', [2.8, -4], [2.4, 8], 0, 0.85), A('civ4', 'walk', 'happy', [0.4, -20], [0.6, -8], 0, 0.7), A('civ6', 'walk', 'neutral', [4.4, 12], [4.2, 2], PI, 0.6)],
    shots: [sh(9, [-14, 32, 44], [-5, 9, 27], [3, 5, 0], [1, 3, -6], { fov: 48 }), sh(12, [-5, 1.5, 22], [-3.5, 1.7, 11], [2, 2, 2], [2, 2.5, -8], { fov: 50, ease: 'smooth', shake: 0.01 })] },
  { id: 5, name: 'Tank beside the railway + dock', start: 14.0, end: 19.0, cast: [A('civ5', 'walk', 'neutral', [2.6, -36], [2.4, -46], PI, 0.7)],
    shots: [sh(14, [-2.5, 1.2, -30], [-1.5, 1.3, -33], [0, 4, -56], [0, 15, -64], { fov: 58 }), sh(16.8, [11, 2.0, -28], [17, 2.4, -38], [2, 8, -60], [6, 10, -62], { fov: 52, ease: 'smooth' })] },
  { id: 6, name: '50-foot scale: worm\'s-eye tilt-up', start: 19.0, end: 24.0, cast: [A('wrk1', 'look_up', 'worried', [-1.0, -52.5], null, PI + 0.25, 1)],
    shots: [sh(19, [0.7, 0.3, -49.2], [0.7, 0.35, -49.6], [-1.0, 1.2, -52.5], [-0.4, 13, -62], { fov: 64, roll: -3 }), sh(21.7, [0.5, 0.3, -49.6], [0.5, 0.3, -50], [0, 11, -61], [0, 19, -64], { fov: 66, ease: 'outCubic', roll: -3, rollEnd: 0 })] },
  { id: 7, name: 'Leaked constantly: macro seam drip', start: 24.0, end: 27.0, cast: [],
    shots: [sh(24, [1.0, 2.9, -52.4], [0.7, 2.7, -53.0], [0, 2.9, -55.9], [0, 2.7, -55.9], { fov: 46, breathe: 0.25 }), sh(25.6, [0.9, 1.1, -53.2], [0.7, 1.0, -53.8], [0, 1.0, -55.9], [0, 0.8, -55.9], { fov: 40, breathe: 0.25 })] },
  { id: 8, name: 'Walls groaned: red seams + rivet pings', start: 27.0, end: 30.0, cast: [],
    shots: [sh(27, [1.1, 5.6, -49], [0.8, 5.8, -51.4], [0, 5.9, -56], [0, 5.9, -56], { fov: 42, ease: 'smooth', shake: 0.05 }), sh(PING_T, [1.6, 5.9, -50.5], [1.6, 5.9, -52.5], [0, 5.9, -56], [-0.8, 5.9, -56], { fov: 36, ease: 'outCubic', shake: 0.18 })] },
  { id: 9, name: 'Residents complained: arguing + newspaper', start: 30.0, end: 33.0, cast: [A('civ3', 'talk', 'angry', [-1.3, -44], null, 0.9, 1.1), A('civ5', 'talk', 'worried', [1.0, -44.2], null, -0.9, 1, { off: 0.9 }), A('civ2', 'talk', 'angry', [-0.1, -42.8], null, 0.2, 1, { off: 1.7 })],
    shots: [sh(30, [-1.8, 1.6, -39.2], [-0.8, 1.6, -40.6], [1.3, 1.4, -44], [1.2, 1.4, -44], { fov: 44, ease: 'smooth', shake: 0, breathe: 0 })] },
  { id: 10, name: 'Kids with buckets: drip into the pail', start: 33.0, end: 35.5, cast: [A('kid1', 'collect_bucket', 'happy', [-0.15, -54.6], null, PI, 1)], buckets: [[0, 0.23, -55.7, 0.35]], leakBucket: true,
    shots: [sh(33, [2.4, 1.4, -52.2], [1.9, 1.3, -52.8], [-0.1, 1.0, -55.0], [-0.1, 0.8, -55.2], { fov: 42, ease: 'smooth' })] },
  { id: 11, name: 'Free syrup gag: crack splits behind grin', start: 35.5, end: 38.0, cast: [A('kid3', 'collect_bucket', 'happy', [1.7, -54.3], null, 0.25, 1.3)], buckets: [[1.86, 0.3, -53.7, 1]],
    shots: [sh(35.5, [1.7, 1.0, -51.8], [1.7, 0.95, -53.2], [1.7, 0.95, -54.5], [1.7, 1.0, -54.5], { fov: 42, fovEnd: 28 })] },
  { id: 12, name: 'Calm: firefighters play cards at Engine 31', start: 38.0, end: 41.2, cast: [A('ff1', 'sit_cards', 'neutral', [-7.6, -11.05], null, PI, 1), A('ff2', 'sit_cards', 'happy', [-7.6, -12.95], null, 0, 0.9, { off: 0.6 }), A('ff3', 'sit_cards', 'neutral', [-6.65, -12], null, -PI / 2, 1.1, { off: 1.1 })], cards: true,
    shots: [sh(38, [-2.8, 1.45, -3.5], [-2.2, 1.6, -18.5], [-8.2, 1.3, -12], [-8.2, 1.4, -12], { fov: 46 })] },
  { id: 13, name: 'Calm: two kids gather firewood beside stacked timber crates', start: 41.2, end: 43.8, cast: [A('kid3', 'collect_bucket', 'happy', [-7.7, -5.0], null, -PI / 2, 1), A('kid1', 'collect_bucket', 'happy', [-7.7, -6.9], null, -PI / 2, 1, { off: 0.6 })], woodScene: true,
    shots: [sh(41.2, [-0.6, 1.7, -1.8], [-1.0, 1.65, -2.6], [-8.2, 0.7, -5.9], [-8.2, 0.7, -6.1], { fov: 46, ease: 'smooth', shake: 0, breathe: 0 })] },
  { id: 14, name: '12:40 PM: clock macro ticks onto 12:40', start: 43.8, end: 46.0, cast: [],
    shots: [sh(43.8, [-3.2, 9.25, -12], [-4.6, 9.25, -12], [-8.8, 9.25, -12], [-8.8, 9.25, -12], { fov: 32, shake: (t) => (t > CLOCK_T && t < CLOCK_T + 0.5 ? 0.14 : 0.01), kick: { at: CLOCK_T, amt: -5, dur: 0.4 } })] },
  { id: 15, name: 'Deafening roar: workers whip toward the tank', start: 46.0, end: 48.0, cast: [A('wrk1', 'idle', 'worried', [-2.0, -40], null, 3.6, 1, { seq: [{ at: 0, clip: 'idle', expr: 'worried', yaw: 3.6 }, { at: 1.0, clip: 'shock', expr: 'shocked', yaw: 3.0 }] }), A('wrk2', 'idle', 'worried', [1.3, -41.2], null, 3.6, 1, { seq: [{ at: 0, clip: 'idle', expr: 'worried', yaw: 3.6 }, { at: 1.1, clip: 'shock', expr: 'shocked', yaw: 3.3 }] }), A('wrk3', 'idle', 'worried', [-0.3, -38.6], null, 3.6, 1, { seq: [{ at: 0, clip: 'idle', expr: 'worried', yaw: 3.6 }, { at: 1.05, clip: 'shock', expr: 'panic', yaw: 3.1 }] })],
    shots: [sh(46, [8.0, 1.5, -33.5], [7.2, 1.6, -34.5], [-0.4, 1.4, -40.0], [-0.4, 1.5, -40.4], { fov: 52, ease: 'smooth', shake: (t) => 0.04 + 0.1 * Math.max(0, t - 46.8) })] },
  { id: 16, name: 'THE TANK HAD BURST! BOOM', start: 48.0, end: 51.5, cast: [A('wrk1', 'shock', 'shocked', [-2.0, -40], [-1.4, -30], 3.0, 1, { seq: [{ at: 0, clip: 'shock', expr: 'shocked', yaw: 3.0 }, { at: 0.7, clip: 'run_panic', expr: 'panic', yaw: 0 }], move: [0.7, 3.5] }), A('wrk2', 'shock', 'shocked', [1.3, -41.2], [1.8, -31], 3.3, 1, { seq: [{ at: 0, clip: 'shock', expr: 'shocked', yaw: 3.3 }, { at: 0.8, clip: 'run_panic', expr: 'panic', yaw: 0 }], move: [0.8, 3.5] })],
    shots: [sh(48, [2.4, 2.0, -41], [3.4, 2.6, -31], [0, 6, -56], [0, 7, -56], { fov: 44, ease: 'outExpo', shake: (t) => 0.03 + 0.75 * Math.pow(Math.max(0, 1 - (t - 48) / 1.5), 1.5), kick: { at: 48.0, amt: 10, dur: 0.7 } }), sh(49.6, [-5.2, 2.8, -21], [-4.8, 3.2, -13], [1, 4.5, -48], [0.5, 4.5, -36], { fov: 56, ease: 'smooth', shake: 0.06 })] },
  { id: 17, name: '35 MPH chase: low reverse dolly', start: 51.5, end: 54.7, cast: [A('civ1', 'run_panic', 'panic', [0.6, -21], [0.6, -3], 0, 1), A('civ4', 'run_panic', 'panic', [-1.8, -18.5], [-1.8, -0.5], 0, 1, { off: 0.3 }), A('civ5', 'run_panic', 'panic', [2.3, -23], [2.3, -5], 0, 1, { off: 0.5 }), A('civ6', 'run_panic', 'panic', [-0.3, -16], [-0.3, 2], 0, 1, { off: 0.2 })],
    shots: [sh(51.5, [0.3, 0.9, -16], [0.3, 0.9, -7.5], [0, 1.6, -21], [0, 1.8, -12], { fov: 60, ease: 'linear', shake: 0.12 }), sh(53.1, [-0.6, 0.7, -7.5], [-0.6, 0.7, 1.5], [0, 1.6, -12.5], [0, 1.8, -3], { fov: 66, ease: 'linear', shake: 0.14 })] },
  { id: 18, name: 'Wave slams the brick buildings', start: 54.7, end: 57.0, cast: [],
    shots: [sh(54.7, [2.2, 2.4, 6], [1.0, 2.8, 9], [-9.5, 4, -9], [-9.5, 5, -11], { fov: 52, ease: 'smooth', shake: 0.1 }), sh(55.9, [-1.5, 6.5, 13], [-2.5, 7.5, 15], [-9.5, 4.5, -10], [-9.5, 5, -11], { fov: 50, ease: 'smooth', shake: 0.1 })] },
  { id: 19, name: 'Slow-mo: car flips off the crest', start: 57.0, end: 60.0, cast: [],
    shots: [sh(57.0, [3.0, 3.2, 17], [1.0, 4.6, 24], [-1.5, 2.5, 3], [-2.0, 5.5, 10], { fov: 46, ease: 'smooth', roll: -3, shake: 0.04 })] },
  { id: 20, name: 'El trestle snaps, deck + green car buckle', start: 60.0, end: 67.0, cast: [],
    shots: [sh(60, [-4.2, 1.8, 46], [-4.4, 2.0, 44], [6.0, 6.0, 24], [6.9, 5.5, 22], { fov: 40, ease: 'smooth', roll: 5, shake: 0.06 }), sh(62.4, [-2, 7, 54], [0, 9, 56], [6.9, 5, 26], [6.9, 4.5, 27], { fov: 46, ease: 'smooth' }), sh(64, [-6, 17, 62], [-12, 22, 70], [0, 2, 38], [0, 1, 32], { fov: 50, ease: 'smooth' })] },
  { id: 21, name: 'Couldn\'t swim: trapped in thick syrup', start: 67.0, end: 71.0, cast: [A('civ2', 'trapped_struggle', 'panic', [-1.2, 5.0], null, 0.35, 1), A('civ3', 'trapped_struggle', 'panic', [0.9, 6.3], null, -0.25, 1, { off: 0.5 }), A('civ4', 'trapped_struggle', 'panic', [-0.1, 3.6], null, 0.1, 1, { off: 1.1 })], collars: true,
    shots: [sh(67, [2.6, 1.6, 15.5], [1.4, 1.5, 12.2], [-0.1, 1.2, 5.0], [-0.1, 1.25, 4.6], { fov: 48, shake: 0.02 })] },
  { id: 22, collars: true, name: 'Rescuers wade at 0.3x', start: 71.0, end: 75.0, cast: [A('ff1', 'wade_slow', 'worried', [-3.2, 18], [-2.6, 14.6], PI, 1), A('ff2', 'wade_slow', 'worried', [3.0, 19], [2.5, 15.3], PI, 1, { off: 0.7 }), A('ff3', 'wade_slow', 'worried', [0.1, 21], [0, 17.5], PI, 1, { off: 1.4 })],
    shots: [sh(71, [2.3, 1.3, -5.2], [2.0, 1.3, -4.6], [0, 1.2, 0], [0, 1.25, 0], { fov: 46, ease: 'linear', track: 'ff3' })] },
  { id: 23, name: 'Collapsed Engine 31: firefighter waves', start: 75.0, end: 79.0, cast: [A('ff1', 'trapped_struggle', 'panic', [-7.3, -12.4], null, 1.3, 0.9)],
    shots: [sh(75, [-1.0, 3.4, 2.0], [3.5, 8.5, 18], [-8.6, 3.2, -12], [-9, 4.2, -12], { fov: 50 })] },
  { id: 24, name: '21 dead, 150 injured: rising crane', start: 79.0, end: 86.0, cast: [A('civ1', 'idle', 'worried', [2, 8], null, -0.5, 1), A('civ6', 'idle', 'worried', [-3, 14], null, 0.4, 1, { off: 1 }), A('wrk3', 'idle', 'worried', [0.5, 0], null, 2.8, 1, { off: 2 })],
    shots: [sh(79, [-8, 3, 44], [-10, 16, 52], [0, 1, 24], [0, 1, 10], { fov: 44, shake: 0.02 }), sh(82.4, [-10, 16, 52], [-24, 40, 86], [0, 0, 14], [0, 0, -6], { fov: 46, ease: 'crane' })] },
  { id: 25, name: 'Company blames sabotage: steaming boss', start: 86.0, end: 91.0, cast: [A('boss', 'talk', 'angry', [-1.0, -27.5], null, 2.7, 1.3)],
    shots: [sh(86, [1.5, 1.6, -30.9], [1.2, 1.62, -30.4], [-1.0, 1.55, -27.5], [-1.0, 1.6, -27.5], { fov: 38, ease: 'smooth', shake: 0.01 })] },
  { id: 26, name: 'Investigation: 3 investigators at the wreck, rivet macro, court LIABLE stamp', start: 91.0, end: 99.0, cast: [A('inv', 'collect_bucket', 'stern', [-0.1, -51.3], null, 0.55, 1), A('civ3', 'talk', 'stern', [-1.5, -51.8], null, 0.4, 1), A('civ6', 'idle', 'stern', [1.2, -51.8], null, -0.5, 1, { off: 0.6 })], evidence: true,
    shots: [sh(91, [2.0, 1.6, -45.4], [1.6, 1.5, -46.2], [0, 0.95, -51.8], [0, 0.9, -51.9], { fov: 54, ease: 'smooth', shake: 0.015 }), sh(93.0, [1.5, 1.1, -48.6], [1.1, 0.9, -49.4], [0.1, 0.5, -52.3], [0.1, 0.45, -52.3], { fov: 40, ease: 'smooth' }), sh(94.9, [-0.1, 4.8, -42.4], [-0.1, 4.5, -42.8], [-0.1, 0.65, -44.5], [-0.1, 0.65, -44.5], { fov: 50, ease: 'smooth' })] },
  { id: 27, name: 'Smell lingered: amber wisps, sniffing resident, flip calendar', start: 99.0, end: 105.0, cast: [A('wrk1', 'talk', 'worried', [-2.4, -31], null, 0.5, 1.6), A('wrk2', 'talk', 'worried', [2.4, -30.2], null, -0.5, 1.5, { off: 1.4 }), A('wrk3', 'talk', 'worried', [-1.2, -28.2], null, 0.2, 1.7, { off: 2.2 }), A('civ5', 'idle', 'worried', [1.3, -28.3], null, -0.45, 1.5, { off: 0.7 }), A('civ1', 'talk', 'worried', [-3.4, -26], null, 0.6, 1.6, { off: 1.1 }), A('civ2', 'walk', 'neutral', [-4.6, -12], [-4.2, -24], PI, 0.9), A('civ3', 'walk', 'worried', [4.8, -30], [4.4, -14], 0, 0.9, { off: 0.8 }), A('kid1', 'walk', 'neutral', [1.4, -16], [1.0, -24], PI, 1), A('kid2', 'walk', 'neutral', [-1.0, -26], [-0.6, -18], 0, 1, { off: 0.4 })], scent: true,
    shots: [sh(99, [-3.2, 1.5, -24.5], [2.2, 1.5, -25], [0, 1.3, -30], [0.4, 1.3, -29.5], { fov: 46 }), sh(102.2, [1.3, 1.45, -25.2], [0.9, 1.45, -25.6], [0.4, 1.3, -29], [0.4, 1.3, -29], { fov: 40, ease: 'smooth' })] },
  { id: 28, name: 'Finale: monster X, tornado X, bistro pancake, pull-back to the broken tank', start: 105.0, end: 113.5, cast: [A('wrk1', 'idle', 'worried', [-2.4, -31], null, 0.5, 1), A('wrk3', 'idle', 'worried', [-1.2, -28.2], null, 0.2, 1, { off: 2.2 }), A('civ2', 'idle', 'worried', [-3.6, -26.5], null, 0.5, 1, { off: 0.5 }), A('civ3', 'talk', 'worried', [3.2, -27.5], null, -0.6, 1.4), A('civ4', 'idle', 'neutral', [-2.2, -23.5], null, 0.3, 1, { off: 1.1 }), A('civ6', 'talk', 'worried', [2.4, -24.5], null, -0.4, 1.5), A('kid1', 'idle', 'neutral', [0.8, -22], null, 0, 1, { off: 0.3 }), A('civ5', 'idle', 'worried', [4.4, -29.5], null, -0.8, 1, { off: 0.9 })], finale: true,
    shots: [sh(105, [1.8, 2.2, -27.4], [1.8, 2.2, -27.4], [0, 1.4, -34], [0, 1.4, -34], { fov: 40 }), sh(107, [1.8, 2.2, -27.4], [1.9, 2.3, -26.8], [0, 1.35, -34], [0, 1.5, -34], { fov: 40, ease: 'smooth', breathe: 0.1 }), sh(108.6, [1.9, 2.3, -26.8], [1.6, 3.0, -25], [0, 1.5, -34], [0, 3.5, -50], { fov: 42, fovEnd: 50, ease: 'smooth' }), sh(111, [1.6, 3.0, -25], [2.0, 3.6, -22.5], [0, 3.5, -50], [-0.4, 5.1, -58], { fov: 50, fovEnd: 52, ease: 'smooth' })] },
];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// ---- checkpoint 1: pre-burst scenes re-timed to the real voiceover (authored in seconds of audio via D()), plus new scenes
{
  const RB = (id, a0, a1) => { const S = TIMELINE.find((s) => s.id === id), o0 = S.start, k = (a1 - a0) / (S.end - S.start); S.shots.forEach((h) => { h.start = D(a0) + (h.start - o0) * k; }); S.start = D(a0); S.end = D(a1); return S; };
  TIMELINE.splice(TIMELINE.findIndex((s) => s.id === 2), 1);
  [[1, 0, 1.8], [3, 9.8, 13.8], [4, 13.8, 18.0], [5, 18.0, 21.8], [6, 28.0, 30.2], [7, 30.2, 33.6], [8, 33.6, 37.5], [9, 37.5, 40.2], [10, 40.2, 42.6], [11, 42.6, 45.0], [12, 49.5, 52.0], [13, 54.0, 56.0], [14, 56.0, 59.0], [15, 59.0, 62.1]].forEach(([i, a, b]) => RB(i, a, b));
  TIMELINE.find((s) => s.id === 6).cast = [A('wrk1', 'look_up', 'worried', [-1.0, -52.5], null, PI + 0.25, 1), A('civ5', 'walk', 'neutral', [-3.5, -48], [-4.6, -55.0], PI, 0.8)];
  TIMELINE.find((s) => s.id === 6).shots = [sh(D(28.0), [0.6, 1.3, -33], [0.2, 1.35, -36], [-6.5, 6.5, -58], [-6.5, 8, -58], { fov: 62, ease: 'smooth', breathe: 0 })];
  const N = (id, name, a0, a1, cast, shots, extra = {}) => TIMELINE.push({ id, name, start: D(a0), end: D(a1), cast, shots, ...extra });
  N(31, "Hook: 'suddenly' - shadow sweeps the hero, FRONT close-up shock, 180 spin", 1.8, 4.0,
    [A('civ1', 'walk', 'neutral', [0.2, 13], [0.2, 13], PI, 1.0, { path: [[0, 0.2, 13], [0.7, 0.2, 12.4], [1.7, 0.2, 12.4], [2.2, 0.2, 15.2]], seq: [{ at: 0.7, clip: 'shock', expr: 'shocked' }, { at: 1.7, clip: 'run_panic', expr: 'panic' }], spin: [1.15, 1.7, PI, 0] }), A('civ2', 'idle', 'neutral', [-3.5, 4], null, PI, 1)],
    [sh(D(1.8), [-2.2, 1.35, 17.2], [-1.4, 1.35, 16.2], [0.2, 2.6, 8], [0.2, 2.8, 6], { fov: 52, ease: 'linear', shake: 0.05, breathe: 0 }), sh(D(2.5), [0.25, 1.55, 10.5], [0.25, 1.5, 10.9], [0.2, 1.56, 12.4], [0.2, 1.56, 12.4], { fov: 34, ease: 'linear', shake: 0, breathe: 0 }), sh(D(3.5), [3.0, 1.5, 11.0], [3.4, 1.6, 14], [0.2, 1.3, 12.6], [0.2, 1.3, 15.5], { fov: 50, ease: 'smooth', shake: 0, breathe: 0 })]);
  N(32, "Hook: 'But instead of water' - turquoise wave, red X, snaps to molasses", 4.0, 7.2,
    [A('civ1', 'run_panic', 'panic', [0.2, 15.2], [0.0, 33], 0, 1.0), A('civ2', 'run_panic', 'panic', [-3.5, 6], [-3.8, 24], 0, 1.0, { off: 0.3 })],
    [sh(D(4.0), [2.6, 1.7, 30], [2.6, 1.7, 32], [0.2, 3.2, 16], [0.0, 4.2, 2], { fov: 48, ease: 'linear', shake: 0, breathe: 0 }), sh(D(6.2), [2.0, 1.5, 36], [2.6, 1.5, 38], [0.0, 1.4, 27], [0.0, 1.5, 30], { fov: 48, ease: 'smooth', shake: 0, breathe: 0 })]);
  N(33, "Hook: 2,000,000 GAL jug cutaway, then tight sprint with the wave closing in", 7.2, 9.8,
    [A('civ1', 'run_panic', 'panic', [0.0, 33], [0.2, 46], 0, 1.0, { move: [1.5, 2.6] }), A('civ4', 'walk', 'neutral', [-3.5, 24], [-3.4, 19], PI, 0.8), A('civ5', 'walk', 'neutral', [3.5, 30], [3.4, 24], PI, 0.8), A('civ3', 'walk', 'neutral', [-3.6, 14], [-3.4, 12], PI, 0.8)],
    [sh(D(7.2), [SP[0] - 0.4, SP[1] + 2.9, SP[2] + 12.5], [SP[0] - 0.4, SP[1] + 3.0, SP[2] + 11.5], [-0.6, SP[1] + 3.1, 0], [-0.6, SP[1] + 3.1, 0], { fov: 52, ease: 'outCubic', breathe: 0 }), sh(D(8.7), [3.2, 1.6, 50], [2.6, 1.6, 52], [0.2, 3.2, 6], [0.2, 4.2, -2], { fov: 54, ease: 'smooth', shake: 0.03, breathe: 0 })]);
  N(34, 'Harbor + factories: molasses barrels at the dock, smoking brick chimneys', 21.8, 28.0,
    [A('wrk1', 'talk', 'neutral', [24.6, -9.2], null, PI, 1), A('wrk2', 'talk', 'neutral', [24.6, -11.8], null, 0, 1, { off: 0.4 })],
    [sh(D(21.8), [27.0, 2.6, 6], [26.6, 2.8, 2], [15, 9, -26], [15, 11, -30], { fov: 58, ease: 'smooth', breathe: 0 }), sh(D(25.0), [26.0, 2.0, 2], [25.6, 2.4, -2], [15, 17, -24], [15, 24, -28], { fov: 62, ease: 'smooth', breathe: 0 })]);
  N(36, 'Giant metal disaster: low-angle rattling tank, worker slaps a Band-Aid on the gushing seam', 45.0, 49.5,
    [A('wrk1', 'collect_bucket', 'worried', [2.9, -54.8], null, PI, 1), A('wrk2', 'talk', 'panic', [-5, -50], null, PI, 1), A('wrk3', 'talk', 'worried', [6.5, -51], null, PI, 1, { off: 0.5 })],
    [sh(D(45.0), [-7, 1.3, -31], [-5, 1.35, -34], [0, 6, -62], [0, 5.5, -60], { fov: 62, ease: 'smooth', breathe: 0 }), sh(D(47.4), [6.2, 1.5, -46.5], [5.2, 1.6, -49.5], [1.9, 3.0, -56], [1.9, 3.2, -56], { fov: 44, ease: 'smooth', breathe: 0 })]);
  N(37, 'Calm: workers carry wooden crates to a loading cart', 52.0, 54.0,
    [A('wrk1', 'walk', 'neutral', [-4.4, -10.5], [-5.9, -3.6], -0.4, 0.9), A('wrk2', 'walk', 'neutral', [-3.6, -13.5], [-5.4, -5.4], -0.5, 0.9, { off: 0.3 }), A('wrk3', 'idle', 'neutral', [-8.2, -2.5], null, PI / 2, 1)],
    [sh(D(52.0), [0.6, 2.3, -10.5], [0.4, 2.2, -8], [-5, 1.2, -6.5], [-6, 1.2, -4.5], { fov: 50, ease: 'smooth', breathe: 0 })]);
  { const RB2 = (id, a0, a1) => { const S = TIMELINE.find((s) => s.id === id), o0 = S.start, k = (a1 - a0) / (S.end - S.start); S.shots.forEach((h) => { h.start = D2(a0) + (h.start - o0) * k; }); S.start = D2(a0); S.end = D2(a1); };
    [[16, 62.2, 64.0], [17, 64.0, 68.0], [18, 68.0, 69.5], [19, 69.5, 72.0], [20, 72.0, 75.0], [21, 75.0, 78.5], [22, 78.5, 82.0], [23, 82.0, 87.5], [24, 87.5, 92.5]].forEach(([i, a, b]) => RB2(i, a, b)); }
  TIMELINE.sort((a, b) => a.start - b.start);
}
for (const s of TIMELINE) s.shots.forEach((h, i) => { h.end = i + 1 < s.shots.length ? s.shots[i + 1].start : s.end; });

const MOODS = {
  sun: { bg: 0xbcd3e8, sunI: 1.9, sunC: 0xfff0d2, hemiI: 0.9, hs: 0xcfe0f5, hg: 0xa89880, fill: 0.4, env: 'sun', sky: 'sun', cloud: 0.85, rim: 0 },
  gloom: { bg: 0x59606a, sunI: 0.8, sunC: 0xc4cedc, hemiI: 1.6, hs: 0xa4b0be, hg: 0x76706c, fill: 0.6, env: 'gloom', sky: 'gloom', cloud: 0.95, rim: 2.2 },
  spring: { bg: 0xa9d2f5, sunI: 2.1, sunC: 0xffe2a8, hemiI: 1.0, hs: 0xd6e8fb, hg: 0xb4a484, fill: 0.4, env: 'sun', sky: 'spring', cloud: 0.95, rim: 0 },
  studio: { bg: 0xf3b84a, sunI: 0, sunC: 0xffffff, hemiI: 1.6, hs: 0xffe9b8, hg: 0xd9a050, fill: 1.3, env: 'sun', sky: null, cloud: 0, rim: 2.8 },
};
export const moodAt = (t) => (t >= STUDIO[0] && t < STUDIO[1] ? 'studio' : t >= JUGW[0] && t < JUGW[1] ? 'studio' : t >= BOOM && t < 99 ? 'gloom' : t >= 99 ? 'spring' : 'sun');

export function createFilm(canvas, opts = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
  renderer.autoClear = false; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(); scene.background = new T.Color(0xbcd3e8); const camera = new T.PerspectiveCamera(50, 9 / 16, 0.1, 200); scene.add(camera);
  // lights: world-fixed sun (shadow caster) + hemisphere ambient + camera fill + studio rim
  const sun = new T.DirectionalLight(0xfff0d2, 3.1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); { const c = sun.shadow.camera; c.left = c.bottom = -38; c.right = c.top = 38; c.near = 1; c.far = 170; } sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06; scene.add(sun, sun.target);
  const hemi = new T.HemisphereLight(0xcfe0f5, 0xa89880, 0.95); scene.add(hemi);
  const fill = new T.DirectionalLight(0xffffff, 0.4); fill.position.set(-2, 3, 5); camera.add(fill); camera.add(fill.target); fill.target.position.set(0, 0, -10);
  const rim = new T.DirectionalLight(0xffdc90, 0); rim.position.set(SP[0] - 2, SP[1] + 6, SP[2] - 8); rim.target.position.set(SP[0], SP[1] + 1.5, SP[2]); scene.add(rim, rim.target);
  const glow = new T.PointLight(0xffb84a, 0, 9, 1.6); scene.add(glow);
  const envs = makeEnvs(renderer), rig = createCameraRig(camera);
  let LIM = null; rig.limit = (p, l) => { if (!LIM || LIM.crest < 0.3 || LIM.len < 0.5) return; const ch = 1.25 * LIM.h * LIM.crest, lip = LIM.pos + 2.5 * ch + 0.5, need = lip + 2.8; if (p.z < need && p.z > -57 && p.y < LIM.h + ch * 1.5 + 2 && Math.abs(p.x) < 11) p.z = need; };
  const stage = createBostonStage(), tank = createMolassesTank(), wave = createMolassesWave(), pan = createPancakes(), vfx = createVFX(scene), flash = createFlash(camera), news = createNewspaper(camera), scent = createScentField();
  // ---- traffic: deterministic car-following sim (precomputed, sampled by t); cars yield to pedestrians and each other
  const TRAF = (() => {
    const DT = 1 / 30, TE = BOOM + 3.2, N = Math.ceil((TE + OFF) / DT) + 1, V0 = 5.2;
    const peds = (t) => { const o = []; for (const S of TIMELINE) { if (t < S.start || t >= S.end) continue; for (const c of S.cast) { const mv = c.move || [0, S.end - S.start], k = clamp(((t - S.start) - mv[0]) / (mv[1] - mv[0]), 0, 1); o.push([c.from[0] + (c.to[0] - c.from[0]) * k, c.from[1] + (c.to[1] - c.from[1]) * k]); } } return o; };
    const defs = [{ i: 0, x: -1.6, d: 1, v: V0 * 1.0, z0: -120 }, { i: 3, x: -1.6, d: 1, v: V0 * 0.9, z0: -150 }, { i: 4, x: -1.6, d: 1, v: V0 * 0.95, z0: -52 }, { i: 1, x: 2.7, d: -1, v: V0 * 0.9, z0: 80 }, { i: 2, x: 2.7, d: -1, v: V0 * 0.8, z0: 115 }];
    const run = (z0s) => {
      const cs = defs.map((d, k) => ({ ...d, z: z0s[k], s: d.v, out: new Float32Array(N), dist: new Float32Array(N), spd: new Float32Array(N) })), dd = new Float32Array(defs.length);
      for (let n = 0; n < N; n++) {
        const t = n * DT - OFF, P = peds(t), post = t > BOOM - 0.2;
        cs.forEach((c, k) => {
          c.out[n] = c.z; c.dist[n] = dd[k]; c.spd[n] = c.s;
          let gap = 99;
          for (const [px, pz] of P) if (Math.abs(px - c.x) < 1.5) { const g = (pz - c.z) * c.d - 1.0; if (g > -2.2 && g < gap) gap = g; }
          cs.forEach((o, m) => { if (m !== k && Math.abs(o.x - c.x) < 1) { const g = (o.z - c.z) * c.d - 3.6; if (g > -1 && g < gap) gap = g; } });
          let tv = c.v; if (post) tv = 0; else if (gap < 14) tv = Math.min(tv, Math.max(0, (gap - 1.2) * 0.9));
          const a = tv > c.s ? 2.2 : (post ? -6 : -7); c.s = Math.max(0, c.s + clamp(tv - c.s, -Math.abs(a) * DT * 2, Math.abs(a) * DT * 2 * (tv > c.s ? 1 : 1)));
          c.z += c.d * c.s * DT; dd[k] += c.s * DT;
        });
      }
      return cs;
    };
    let z0s = defs.map((d) => d.z0), cs = run(z0s);
    for (let it = 0; it < 4; it++) { const zE = cs[0].out[N - 1]; z0s[0] += 4.0 - zE; cs = run(z0s); }
    return { cs, DT, N };
  })();
  scene.add(stage.group, tank.group, wave.group, scent.group);
  const studio = createStudio(); studio.position.set(...SP); scene.add(studio);
  const duck = createDuck(), xmark = createXMark(camera), jug = createJug(), ruler = createRuler(), shadowDisc = createShadowDisc(), bandaid = createBandAid();
  duck.scale.setScalar(1.7); jug.group.position.set(SP[0], SP[1], SP[2]); ruler.group.position.set(-6.5, 0, -57.0); scene.add(duck, jug.group, ruler.group, shadowDisc, bandaid);
  const CHIM = [[15, -32, 11.5, 11], [15.5, -7, 8.4, 11], [15.5, 32, 8.4, 11]], chim = new T.Group(), smoke = createSmoke(CHIM.map(([x, z, y0, h]) => [x, y0 + h, z, 1.1]));
  for (const [x, z, y0, h] of CHIM) { const c = new T.Mesh(new T.CylinderGeometry(0.9, 1.25, h, 16), toon('#9a4a34')); c.position.set(x, y0 + h / 2, z); c.castShadow = true; const b = new T.Mesh(new T.CylinderGeometry(0.98, 0.98, 0.7, 16), toon('#2b1a2a')); b.position.set(x, y0 + h - 0.35, z); chim.add(c, b); }
  scene.add(chim, smoke.group);
  const hb = new T.Group(); { const bm = toon('#8a6238'), hm = toon('#3a3a40'); const mk = (x, y, z) => { const g = new T.Group(); const b = new T.Mesh(new T.CylinderGeometry(0.46, 0.46, 1.0, 16), bm); b.castShadow = true; g.add(b); for (const yy of [-0.3, 0.3]) { const r = new T.Mesh(new T.TorusGeometry(0.47, 0.035, 6, 18), hm); r.rotation.x = PI / 2; r.position.y = yy; g.add(r); } g.position.set(x, y, z); hb.add(g); }; for (let i = 0; i < 5; i++) { mk(24.0, 0.5, -1 - i * 1.15); mk(25.2, 0.5, -1.6 - i * 1.15); } for (let i = 0; i < 4; i++) mk(24.6, 1.45, -2.2 - i * 1.15); hb.visible = false; scene.add(hb); }
  const carryCrates = [0, 1].map(() => { const c = createCrate(0.7); c.visible = false; scene.add(c); return c; }), cart = new T.Group();
  { const wd = toon('#8a6238'), mm = (g, x, y, z) => { const m = new T.Mesh(g, wd); m.position.set(x, y, z); m.castShadow = true; cart.add(m); }; mm(new T.BoxGeometry(2.4, 0.16, 1.4), 0.6 * 0 + 0, 0.62, 0); mm(new T.BoxGeometry(2.4, 0.3, 0.08), 0, 0.82, 0.68); mm(new T.BoxGeometry(2.4, 0.3, 0.08), 0, 0.82, -0.68); mm(new T.BoxGeometry(0.08, 0.3, 1.4), 1.2, 0.82, 0); for (const s of [-1, 1]) { const w = new T.Mesh(new T.CylinderGeometry(0.46, 0.46, 0.1, 18), toon('#3a2a20')); w.rotation.z = PI / 2; w.position.set(0.2, 0.46, s * 0.76); cart.add(w); } const hd = new T.Mesh(new T.BoxGeometry(1.5, 0.07, 0.07), wd); hd.position.set(-1.9, 0.8, 0); cart.add(hd); for (const [x, z, r] of [[0.1, 0.0, 0.1], [-0.7, 0.3, -0.1], [0.5, -0.3, 0.2]]) { const c = createCrate(0.62); c.position.set(x, 0.7, z); c.rotation.y = r; cart.add(c); } cart.position.set(-6.6, 0, -2.4); cart.rotation.y = 0.3; cart.visible = false; scene.add(cart); }
  scene.add(pan.group); pan.crate = new T.Mesh(new T.BoxGeometry(1.3, 1.15, 1.3), toon('#9a7448')); pan.crate.position.set(0, 0.575, -34); scene.add(pan.crate);
  // syrup bottle pouring over the studio stack
  const amber = syrMat({ color: '#7a3510', roughness: 0.08, metalness: 0.0 }), bottle = createSyrupBottle(amber), stream = new T.Mesh(new T.CylinderGeometry(0.05, 0.06, 1, 12), amber); bottle.position.set(SP[0] - 0.15, SP[1] + 3.0, SP[2]); bottle.rotation.z = -0.65; scene.add(bottle, stream);
  // misc props
  const buckets = [0, 1].map(() => { const b = createBucket(); b.visible = false; scene.add(b); return b; });
  const cardTable = createCardTable(); cardTable.position.set(-7.6, 0.2, -12); scene.add(cardTable);
  const woodScene = new T.Group(); scene.add(woodScene); { for (const [x, y, z, s, r] of [[-9.2, 0.2, -5.7, 0.85, 0.1], [-9.2, 0.2, -6.7, 0.85, -0.05], [-9.15, 1.05, -6.2, 0.7, 0.3]]) { const c = createCrate(s); c.position.set(x, y, z); c.rotation.y = r; woodScene.add(c); } for (const [x, z, r] of [[-7.4, -4.2, 0.4], [-7.5, -7.9, 1.2], [-7.0, -5.9, 2.0]]) { const fw = createFirewood(); fw.position.set(x, 0.22, z); fw.rotation.y = r; fw.scale.setScalar(0.8); woodScene.add(fw); } }
  const softSteam = createSoftSteam(), bubble = createThoughtBubble(camera), gag = createGagCard(camera), cal = createFlipCalendar(); scene.add(softSteam.group, cal.group); cal.group.position.set(0.1, 0, -29.4); cal.group.visible = false;
  const bistro = new T.Group(); { const cel = (geo, mat) => { const m = new T.Mesh(geo, mat); m.castShadow = true; return m; }; const wt2 = toon('#f3ead2'), dk = toon('#3a2a2a'); const top = cel(new T.CylinderGeometry(0.62, 0.62, 0.05, 28), wt2, 0.03); top.position.y = 1.135; bistro.add(top); const rim = cel(new T.TorusGeometry(0.62, 0.025, 8, 28), dk, 0.015); rim.rotation.x = PI / 2; rim.position.y = 1.16; bistro.add(rim); const ped = cel(new T.CylinderGeometry(0.06, 0.08, 1.1, 12), dk, 0.02); ped.position.y = 0.55; bistro.add(ped); const bs = cel(new T.CylinderGeometry(0.38, 0.42, 0.05, 20), dk, 0.02); bs.position.y = 0.03; bistro.add(bs); } bistro.position.set(0, 0, -34); bistro.visible = false; scene.add(bistro);
  const wood = createFirewood(); wood.visible = false; const magnifier = createMagnifier(), plate = createEvidencePlate(true), stampDoc = createStampDoc(), tableM = new T.MeshToonMaterial();
  const mkTable = (x, z) => { const b = new T.Mesh(new T.BoxGeometry(1.0, 0.62, 1.0), toon('#9a7448')); b.position.set(x, 0.31, z); b.castShadow = true; scene.add(b); return b; }, tblA = mkTable(1.7, -45), tblB = mkTable(-0.25, -44.5);
  tblB.geometry = new T.BoxGeometry(2.3, 0.08, 1.5); tblB.position.set(-0.25, 0.6, -44.5); tblB.castShadow = false; tblB.material = toon('#7a4a24'); { const tp = new T.Mesh(new T.BoxGeometry(2.2, 0.02, 1.4), toon('#a8793f')); tp.position.y = 0.045; tblB.add(tp); for (const [lx, lz] of [[-1.05, -0.65], [1.05, -0.65], [-1.05, 0.65], [1.05, 0.65]]) { const lg = new T.Mesh(new T.BoxGeometry(0.1, 0.56, 0.1), toon('#5a3818')); lg.position.set(lx, -0.32, lz); tblB.add(lg); } }
  stampDoc.position.set(-0.62, 0.66, -44.5); scene.add(stampDoc);
  // group investigation beside the wreck: two fallen curved plates, rubble, held magnifier (horizontal over the snapped rivets), clipboard
  const evG = new T.Group(); scene.add(evG); const plateW = new T.Group(); plateW.add(plate); plateW.scale.setScalar(0.95); plateW.rotation.order = 'YXZ'; plateW.rotation.set(-PI / 2 + 0.08, 0.4, 0); plateW.position.set(0.15, 0.32, -52.4); evG.add(plateW);
  const plate2 = createEvidencePlate(true), plate2W = new T.Group(); plate2W.add(plate2); plate2W.scale.setScalar(1.25); plate2W.rotation.order = 'YXZ'; plate2W.rotation.set(-PI / 2 + 0.5, -0.7, 0.15); plate2W.position.set(-3.6, 0.55, -55.8); plate2W.visible = false; evG.add(plate2W);
  { const rr = mulberry(5), br = toon('#a0472e'), tm2 = toon('#7a5a3c'); for (let i = 0; i < 16; i++) { const b = new T.Mesh(new T.BoxGeometry(0.34 + rr() * 0.2, 0.18, 0.18), br); b.position.set(-4.5 + rr() * 9, 0.1 + (i % 3) * 0.02, -50.5 - rr() * 6); b.rotation.set(rr(), rr() * 3, rr() * 0.4); b.castShadow = true; evG.add(b); } }
  magnifier.rotation.set(PI, PI / 2, 0); magnifier.position.set(0, -0.4, 0); magnifier.scale.setScalar(0.5);
  const clip = new T.Group(); clip.add(new T.Mesh(new T.BoxGeometry(0.3, 0.38, 0.03), toon('#7a4a24'))); { const pp = new T.Mesh(new T.PlaneGeometry(0.25, 0.32), new T.MeshBasicMaterial({ color: '#f3ead2' })); pp.position.z = 0.02; clip.add(pp); } clip.rotation.x = -0.35; evG.add(clip);
  const ripM = new T.MeshBasicMaterial({ color: '#150802', transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), ripM2 = new T.MeshBasicMaterial({ color: '#2a1105', transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const collars = [0, 1, 2].map(() => { const m = new T.Group(), a = new T.Mesh(new T.RingGeometry(0.3, 0.46, 40), ripM), b = new T.Mesh(new T.RingGeometry(0.5, 0.82, 40), ripM2); a.rotation.x = b.rotation.x = -PI / 2; m.add(a, b); m.visible = false; scene.add(m); return m; });   // flat dark ripples blended into the syrup (no raised hoops)
  // floating barrels (viscous drift once the wave passed)
  const passT = (z) => { let lo = BOOM, hi = 67; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (WORLD.wavePos(m) < z) lo = m; else hi = m; } return hi; };
  const barrels = [[-3.5, -8], [2.8, -3], [-1.2, 6], [3.8, 12], [-4.2, 18], [0.5, 26]].map(([x, z], i) => { const g = new T.Group(); g.add(Object.assign(new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.95, 16), toon('#8a6238')), { castShadow: true })); for (const y of [-0.28, 0.28]) g.add(new T.Mesh(new T.TorusGeometry(0.43, 0.03, 6, 18), toon('#3a3a40'))); g.children.slice(1).forEach((h, k) => { h.rotation.x = PI / 2; h.position.y = k ? 0.28 : -0.28; }); scene.add(g); return { g, x, z, ph: i * 1.7, tp: passT(z + 6) }; });
  // dust, sparks, shockwave events
  for (const l of tank.landings(BOOM)) vfx.puff(l.t, l.x, 0, l.z, l.s * 0.8, 1.8);
  
  [[TL_FIRE + 0.3, -9.3, 0, -9.5, 3.4], [TL_FIRE + 0.8, -9.3, 0, -14.5, 3.4], [TL_FIRE + 1.5, -8, 0, -12, 4.2], [TL_WARE + 0.3, 9.2, 0, -4, 3.4], [TL_WARE + 0.8, 9.2, 0, -10, 3.4], [TL_WARE + 1.4, 8.5, 0, -7, 4.2]].forEach(([t, x, y, z, s]) => vfx.puff(t, x, y, z, s, 1.8));
  vfx.puff(TL_CAR + 2.24, -4.0, 0, 11, 2.4, 1.6); vfx.puff(TL_RAIL + 0.5, 4.0, 0, 20, 3.6, 1.8); vfx.puff(TL_RAIL + 1.1, 5.5, 0, 24, 4.2, 2.0); vfx.puff(TL_RAIL + 1.6, 6.5, 0, 28, 3.6, 1.8); vfx.spark(TL_RAIL + 0.35, 6.2, 6.4, 20, 12); vfx.spark(TL_RAIL + 0.9, 6.8, 5.0, 27, 12);
  vfx.build();
  scene.traverse((o) => { if (!o.isMesh || !o.material) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!(m.isMeshToonMaterial || m.isMeshStandardMaterial) || o.userData.hull) return; o.receiveShadow = true; if (!['PlaneGeometry', 'CircleGeometry', 'RingGeometry'].includes(o.geometry.type) && !o.userData.noCast) o.castShadow = true; });
  stage.sky.material.map = stage.skyTex.sun;
  const actors = {};
  for (const id in CAST) { const ch = createCharacter(makeSpec(CAST[id][0], CAST[id][1])); ch.group.visible = false; scene.add(ch.group); actors[id] = { ch, pos: new T.Vector3() }; ch.group.traverse((o) => { if (o.isMesh && !o.userData.hull) { o.castShadow = true; o.receiveShadow = true; } }); }
  actors.kid3.ch.group.add(wood); wood.position.set(0, 0.52, 0.3); const wood2 = createFirewood(); wood2.visible = false; actors.kid1.ch.group.add(wood2); wood2.position.set(0, 0.52, 0.3);
  /* ---- captions: rendered in WebGL (overlay quad) so they are baked into canvas.toDataURL frames ---- */
  const cc = document.createElement('canvas'), cg = cc.getContext('2d'), ctex = new T.CanvasTexture(cc); ctex.colorSpace = T.SRGBColorSpace;
  const cquad = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: ctex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })); cquad.renderOrder = 999; cquad.frustumCulled = false; cquad.visible = false; camera.add(cquad);   // camera child: fixed on screen even while the camera shakes
  let captions = [], capKey = '', capOn = true, W = 720, H = 1280;
  const drawCaption = (cap, t) => {
    const key = cap ? cap.text + '|' + (cap.words ? cap.words.filter((w) => w.start <= t).length : 0) : ''; if (key === capKey) return; capKey = key; cg.clearRect(0, 0, cc.width, cc.height); if (!cap) { ctex.needsUpdate = true; return; }
    const fs = Math.round(Math.min(W, H) * (W < H ? 0.075 : 0.085)); cg.font = '900 ' + fs + 'px "Arial Black", Impact, Helvetica, sans-serif'; cg.textAlign = 'left'; cg.textBaseline = 'middle'; cg.lineJoin = 'round';
    const words = cap.words && cap.words.length ? cap.words : cap.text.split(/\s+/).map((w) => ({ w, start: 0, end: 0 })), maxW = W * 0.88, lines = [[]], sp = cg.measureText(' ').width; let cur = 0;
    for (const w of words) { const ww = cg.measureText(w.w.toUpperCase()).width; if (cur + ww > maxW && lines[lines.length - 1].length) { lines.push([]); cur = 0; } lines[lines.length - 1].push({ ...w, ww }); cur += ww + sp; }
    const lh = fs * 1.2, y0 = cc.height / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((ln, li) => { const tw = ln.reduce((a, w) => a + w.ww, 0) + sp * (ln.length - 1); let x = (cc.width - tw) / 2; for (const w of ln) { const txt = w.w.toUpperCase(), on = cap.words && w.start <= t && t < (w.end || 1e9) + 0.0001 ? true : false; cg.lineWidth = fs * 0.3; cg.strokeStyle = '#2b1a2a'; cg.strokeText(txt, x, y0 + li * lh); cg.fillStyle = on ? '#ffd24a' : '#fff6e0'; cg.fillText(txt, x, y0 + li * lh); x += w.ww + sp; } });
    ctex.needsUpdate = true;
  };
  const layoutCaption = () => { cc.width = W; cc.height = Math.round(H * 0.3); capKey = '\u0000'; };
  layoutCaption();
  let curMood = '', lastEnv = null;
  const film = { renderer, scene, camera, rig, stage, tank, wave, pan, actors, TIMELINE, WORLD, get DURATION() { return DURATION; }, t: 0, scene_i: 0,
    setDuration(d) { DURATION = d; const S = TIMELINE[TIMELINE.length - 1]; S.end = d; S.shots[S.shots.length - 1].end = d; return d; },
    get captionsOn() { return capOn; }, setCaptionsOn(v) { capOn = !!v; capKey = '\u0000'; },
    setCaptions(list) { captions = (list || []).slice().sort((a, b) => a.start - b.start); capKey = '\u0000'; },
    setResolution(w, h, pr = 1) { W = w; H = h; renderer.setPixelRatio(pr); renderer.setSize(w, h, false); camera.aspect = w / h; rig.setAspect(w / h); layoutCaption(); camera.updateProjectionMatrix(); },
    sceneAt(t) { for (let i = TIMELINE.length - 1; i >= 0; i--) if (t >= TIMELINE[i].start) return i; return 0; },
    keyTimes() { const out = []; for (const s of TIMELINE) for (const h of s.shots) out.push({ t: +toActual(h.start + Math.min(0.9, (h.end - h.start) * 0.45)).toFixed(2), beat: s.id, name: s.name }); return out; },
    seek(tIn) {
      const tReal = clamp(tIn, 0, DURATION), t = toDesign(tReal), wt = warp(oldOf(t)), i = film.sceneAt(t), S = TIMELINE[i], u = clamp((t - S.start) / (S.end - S.start), 0, 1); film.t = tReal; film.scene_i = i;
      // ---- mood: bright winter sun -> studio smash-cut -> instant overcast gloom at the rupture
      const mk = moodAt(t), M = MOODS[mk], studioOn = mk === 'studio'; scene.background.setHex(M.bg); sun.intensity = M.sunI; sun.color.setHex(M.sunC); hemi.intensity = M.hemiI; hemi.color.setHex(M.hs); hemi.groundColor.setHex(M.hg); fill.intensity = M.fill; rim.intensity = M.rim; rim.color.setHex(mk === 'gloom' ? 0xffc27a : 0xffdc90);
      stage.sky.visible = !!M.sky; if (M.sky) stage.sky.material.map = stage.skyTex[M.sky]; stage.clouds.material.map = stage.cloudTex[M.sky || 'sun']; stage.clouds.visible = M.cloud > 0; stage.clouds.material.opacity = M.cloud; stage.clouds.rotation.y = t * 0.012;
      const env = envs[M.env]; if (env !== lastEnv) { lastEnv = env; SYR_MATS.forEach((m) => { m.envMap = env; m.needsUpdate = true; }); }
      // ---- world (all on warped world time)
      const w = {}; for (const k in WORLD) w[k] = WORLD[k](wt);
      wave.setWavePos(w.wavePos); wave.setFloodHeight(w.flood); wave.setCrest(w.crest); wave.update(wt); wave.group.visible = (t >= TRIG('suddenly') && t < TRIG('pancake')) || (t >= BOOM && w.flood > -0.4); stage.stains.visible = t >= 89;
      LIM = { pos: w.wavePos, h: w.flood, crest: w.crest, len: w.wavePos + 56.3 }; const dB = wt - BOOM; tank.burst(dB); tank.setLeak(w.leak); tank.shake(w.tankShake, wt); tank.leaks[0].floorY = S.leakBucket ? 0.57 : 0.12;
      tank.setCrack(wt < BOOM ? sm((t - D(42.6)) / 2.0) * (t >= D(42.6) ? 1 : 0) : 0); tank.seamFx(t, PING_T); tank.animate(t, dB);
      stage.setDamage({ a: wt - TL_WARE, b: wt - TL_FIRE, rail: wt - TL_RAIL, ex: [wt - 56.4, wt - 58.0, wt - 57.2, wt - 58.6, wt - BOOM - 0.5, wt - BOOM - 0.9] }); stage.cars[0].drive(-1.6, TRAF.cs[0].out[TRAF.N - 1], 0, 0).flip(wt - TL_CAR, Math.max(0.98, w.flood - 0.3));
      stage.firehouse.setClock(t < CLOCK_T ? 234 : 240 + 4 * Math.exp(-(t - CLOCK_T) * 9) * Math.cos((t - CLOCK_T) * 40) * (t < CLOCK_T + 0.5 ? 1 : 0), t < CLOCK_T ? 19.5 : 20);
      for (const b of barrels) { const q = Math.max(0, wt - b.tp), on = wt > b.tp && w.flood > 0.05, k = 1 - Math.exp(-q / 1.6); b.g.visible = on; if (on) { b.g.position.set(b.x + 0.4 * k * Math.sin(b.ph), w.flood - 0.2 + 0.06 * Math.sin(0.9 * q + b.ph), b.z + 3.2 * k); b.g.rotation.set(0.5 * Math.sin(0.5 * q + b.ph) * k + 0.2, 0.3 * k * b.ph, PI / 2 * k + 0.2 * Math.sin(0.6 * q)); } }
      vfx.update(wt); vfx.shock(t, BOOM, 0, STREET_TANK_Z); flash.set(t >= BOOM && t < BOOM + 0.045 ? 1 : t >= BOOM + 0.045 && t < BOOM + 0.085 ? 0.55 : 0); news.set(t, D(38.4));
      { // checkpoint-1 props (t is design time; aT = seconds of voiceover)
        const aT = t + OFF, ch0 = 1.25 * 3.4; wave.setLook(t < D(5.5) ? 'water' : 'molasses');
        const dk = wave.group.visible && t < D(5.5); duck.visible = dk; if (dk) { duck.position.set(1.2, 3.4 + ch0 + 0.2 + 0.12 * Math.sin(aT * 3), w.wavePos + 0.2 * ch0 + 0.9); duck.rotation.set(0.15 * Math.sin(aT * 2.2), 2.9 + 0.2 * Math.sin(aT * 1.3), 0.1 * Math.sin(aT * 2.9)); }
        xmark.set((aT - 5.3) / 0.45);
        { const p = clamp((aT - 1.8) / 0.8, 0, 1), fd = 1 - clamp((aT - 3.3) / 0.8, 0, 1), hz = actors.civ1.pos.z; shadowDisc.visible = S.id === 31 && p > 0 && fd > 0; if (shadowDisc.visible) { const r = 3 + 11 * sm(p); shadowDisc.scale.set(r, r, r); shadowDisc.position.set(actors.civ1.pos.x, 0.04, hz - (1 - sm(p)) * 9); shadowDisc.material.opacity = 0.55 * sm(p) * fd; } }
        ruler.group.visible = S.id === 6; if (S.id === 6) ruler.update(t - S.start);
        chim.visible = true; smoke.update(aT);
        hb.visible = S.id === 34; const bOn = S.id === 36 && aT >= 47.4; bandaid.visible = bOn; if (bOn) { const u = clamp((aT - 47.4) / 0.25, 0, 1); bandaid.position.set(1.75, 3.2, -55.95); bandaid.rotation.z = 0.2; bandaid.scale.setScalar(0.4 + 0.6 * eOut(u) + 0.15 * (1 - u)); bandaid.children[3].visible = aT >= 48.3; }
        const k37 = S.id === 37; cart.visible = k37; carryCrates.forEach((c, i) => { c.visible = k37; if (k37) { const a = actors['wrk' + (i + 1)], yw = a.ch.group.rotation.y; c.position.set(a.pos.x + Math.sin(yw) * 0.55, 0.95 + 0.04 * Math.sin(aT * 9 + i), a.pos.z + Math.cos(yw) * 0.55); c.rotation.y = yw; } });
      }
      // ---- set dressing per beat
      const jugOn = t >= JUGW[0] && t < JUGW[1], panOn = studioOn && !jugOn; studio.visible = studioOn; for (const o of [bottle, stream]) o.visible = panOn; jug.group.visible = jugOn; if (jugOn) jug.update(t - JUGW[0]);
      const finale = !!S.finale, onStreet = !studioOn;
      if (studioOn) { pan.group.position.set(SP[0], SP[1] + 0.3, SP[2]); pan.group.scale.setScalar(1.5); pan.group.visible = panOn; pan.crate.visible = false; const topY = SP[1] + 0.3 + pan.top * 1.5, my = bottle.position.y, pk = clamp((t - STUDIO[0]) / 0.25, 0, 1); stream.position.set(bottle.position.x, (my + topY) / 2, 0); stream.scale.set(0.8 + 0.2 * Math.sin(t * 40), Math.max(0.01, my - topY) * sm(pk), 0.8 + 0.2 * Math.sin(t * 40)); bottle.rotation.z = -0.65 + 0.05 * Math.sin(t * 6); }
      else { const fv = t >= 107; pan.group.visible = fv; pan.crate.visible = false; bistro.visible = fv; pan.group.position.set(0, 1.17, -34); const pk = clamp((t - 107) / 0.4, 0, 1); pan.group.scale.setScalar(fv ? 1.0 * (0.55 + 0.45 * sm(pk)) : 1.0); }
      pan.update(t); pan.lines.forEach((l) => { l.m.visible = t < 105; }); glow.intensity = finale && t >= 107 ? 2.2 + 0.4 * Math.sin(t * 3) : 0; glow.position.set(0.5, 2.4, -32.6);
      cardTable.visible = S.id === 12; { const gk = S.finale && t < 105.98 ? 0 : S.finale && t < 107 ? 1 : -1; gag.set(gk, t); if (S.finale && t < 107) xmark.set(t < 106 ? (t - 105.5) / 0.45 : (t - 106.5) / 0.45); } cal.group.visible = S.id === 27; if (S.id === 27) cal.update(t, 99.0, 1.2); scent.update(t, S.scent ? sm((t - S.start) / 2) : 0);
      buckets.forEach((b, k) => { const d = S.buckets && S.buckets[k]; b.visible = !!d; if (d) { b.position.set(d[0], d[1] - 0.0, d[2]); } });
      wood.visible = !!S.woodScene; wood2.visible = !!S.woodScene; woodScene.visible = !!S.woodScene; const ev = !!S.evidence; for (const o of [tblA, tblB, stampDoc, evG, magnifier]) o.visible = ev; { const wr = actors.inv.ch.bn('wristR'); if (magnifier.parent !== wr) wr.add(magnifier); } tblA.visible = false; if (ev) { stampDoc.userData.set(t, 95.575); evG.visible = t < 94.9; const a6 = actors.civ6.pos; clip.position.set(a6.x + 0.27, 1.12, a6.z + 0.25); clip.rotation.y = 0.3; }
      { const fl = (t + OFF) / TRAF.DT, n0 = Math.min(TRAF.N - 2, Math.floor(fl)), fr = Math.min(1, fl - n0); for (const c of TRAF.cs) { const car = stage.cars[c.i]; let z = c.out[n0] + (c.out[n0 + 1] - c.out[n0]) * fr; const ds = c.dist[n0] + (c.dist[n0 + 1] - c.dist[n0]) * fr; z = ((((z + 66) % 132) + 132) % 132) - 66; const vis = true; if (c.i === 0 && wt >= TL_CAR) continue; car.group.visible = vis; car.drive(c.x, z, c.d > 0 ? 0 : PI, ds); { let hh = S.shots[0]; for (const q of S.shots) if (t >= q.start) hh = q; const uu = clamp((t - hh.start) / Math.max(1e-3, hh.end - hh.start), 0, 1), cx = hh.camStart[0] + (hh.camEnd[0] - hh.camStart[0]) * uu, cy = hh.camStart[1] + (hh.camEnd[1] - hh.camStart[1]) * uu, cz = hh.camStart[2] + (hh.camEnd[2] - hh.camStart[2]) * uu; const dd2 = Math.hypot(cx - c.x, cz - z), keep = cy < 4.2 ? sm((dd2 - 3.2) / 2.0) : 1; car.group.scale.setScalar(Math.max(0.001, keep)); if (keep < 0.01) car.group.visible = false; } } }
      // ---- actors
      const live = new Set();
      for (let n = 0; n < S.cast.length; n++) {
        const c = S.cast[n], a = actors[c.id], ch = a.ch, ts = t - S.start, dur = S.end - S.start, mv = c.move || [0, dur], k = clamp((ts - mv[0]) / (mv[1] - mv[0]), 0, 1);
        let x = c.from[0] + (c.to[0] - c.from[0]) * k, z = c.from[1] + (c.to[1] - c.from[1]) * k; if (c.path) { let i = 0; while (i < c.path.length - 2 && ts >= c.path[i + 1][0]) i++; const a0 = c.path[i], a1 = c.path[i + 1], u = clamp((ts - a0[0]) / (a1[0] - a0[0]), 0, 1); x = a0[1] + (a1[1] - a0[1]) * u; z = a0[2] + (a1[2] - a0[2]) * u; } const gy = Math.abs(x) > 6.15 && Math.abs(x) < 9.4 ? 0.2 : 0;
        let seg = { at: 0, clip: c.clip, expr: c.expr, rate: c.rate }; if (c.seq) for (const q of c.seq) if (ts >= q.at) seg = { rate: c.rate, ...q };
        live.add(c.id); ch.group.visible = true; ch.group.position.set(x, gy, z); ch.group.rotation.y = c.spin ? (ts < c.spin[0] ? c.spin[2] : ts > c.spin[1] ? c.spin[3] : c.spin[2] + (c.spin[3] - c.spin[2]) * sm((ts - c.spin[0]) / (c.spin[1] - c.spin[0]))) : (seg.yaw ?? c.yaw); a.pos.set(x, gy, z);
        ch.clip = seg.clip; ch._from = null; ch._fs = null; ch._t0 = 0; ch.setExpression(seg.expr || 'auto');
        applyPose(ch, Math.max(0, (ts - seg.at)) * (seg.rate || 1) * (S.id === 22 ? 1 : 1) + (c.off || 0) + (S.id === 22 ? 0 : 0), seg.clip); if (ch.tickFace) ch.tickFace(t);
        if (c.id === 'civ1') { a.hat = a.hat || (() => { const HG = ch.bn('head').children.find((q) => q.type === 'Group'); return HG ? HG.children.filter((q) => q.position.y > 0.08).map((q) => [q, q.position.y]) : []; })(); const pop = S.id === 31 && ts > 0.7 ? 0.1 * Math.exp(-(ts - 0.7) * 3.5) * Math.abs(Math.sin((ts - 0.7) * 8)) : 0; for (const [m, y0] of a.hat) m.position.y = y0 + pop; }
      }
      for (const id in actors) if (!live.has(id)) actors[id].ch.group.visible = false;
      // trapped-civilian syrup collars (raised glossy ripple ring at the waist)
      collars.forEach((m, k) => { const c = S.collars && S.cast[k]; m.visible = !!c; if (!c) return; const a = actors[c.id].pos; m.position.set(a.x, w.flood + 0.1, a.z); const pulse = 1 + 0.1 * Math.sin(t * 2.4 + k * 2); m.scale.set(pulse, 1, pulse * (0.9 + 0.1 * Math.sin(t * 3 + k))); });
      // boss: face flushes red/purple, cartoon steam from the ears
      { const b = actors.boss, on = S.id === 25; b.ch.setFlush(on ? sm((t - 86.3) / 2.2) : 0); if (on) { const hy = b.ch.height * 0.8, yaw = b.ch.group.rotation.y, ex = Math.cos(yaw) * 0.19, ez = -Math.sin(yaw) * 0.19; softSteam.update(t, 87.0, 91, [new T.Vector3(b.pos.x - ex, hy, b.pos.z - ez), new T.Vector3(b.pos.x + ex, hy, b.pos.z + ez)]); const pt = sm((t - 87.4) / 0.35); b.ch.bn('shoulderL').rotation.z += 1.9 * pt; } else softSteam.update(t, 1e9, 1e9, null); bubble.set(on ? (t - 87.6) / 0.5 : 0); }
      if (S.id === 27) { const h = actors.civ5.ch.bn('head'); h.rotation.x += -0.2 * Math.abs(Math.sin(t * 5.5)) * (Math.sin(t * 0.9) > -0.2 ? 1 : 0.3); }
      // ---- camera: hard cut to the shot, eased within it
      let shot = S.shots[0]; for (const h of S.shots) if (t >= h.start) shot = h;
      const su = clamp((t - shot.start) / (shot.end - shot.start), 0, 1), shkRaw = typeof shot.shake === 'function' ? shot.shake(t, su) : (shot.shake || 0), shk = gateShake(t, shkRaw);
      rig.calm = shk === 0 && (t < TRIG('suddenly') || (t >= TRIG('pancake') && t < TRIG('roar')) || t >= TRIG('died21')); rig.cut(shot).setShake(shk, t); const tp = shot.track && actors[shot.track] ? actors[shot.track].pos : null; rig.update(su, tp);
      // shadow frustum follows what the camera is looking at
      { const f = rig.look; if (mk === 'gloom') { rim.position.set(f.x - 12, f.y + 10, f.z - 30); rim.target.position.set(f.x, f.y, f.z); rim.target.updateMatrixWorld(); } sun.position.set(f.x + 44, f.y + 52, f.z + 30); sun.target.position.set(f.x, 0, f.z); if (studioOn) { sun.position.set(SP[0] + 30, SP[1] + 40, SP[2] + 20); sun.target.position.set(...SP); } sun.target.updateMatrixWorld(); }
      let fd = rig.dist; for (const id in actors) if (actors[id].ch.group.visible) fd = Math.min(fd === rig.dist ? 1e9 : fd, camera.position.distanceTo(actors[id].pos)); if (fd > 1e8) fd = rig.dist;
      INK_K.value = clamp(fd / 5 * (1280 / Math.max(H, 1)) * (W < H ? 1 : 0.8), 0.9, 7);
      stage.sky.position.copy(camera.position); stage.clouds.position.copy(camera.position);
      let cap = null; if (capOn) for (const c of captions) if (tReal >= c.start && tReal < c.end) { cap = c; break; }
      drawCaption(cap, tReal); cquad.visible = !!cap;
      if (cap) { const vh = 2 * Math.tan(camera.fov * PI / 360), vw = vh * camera.aspect; cquad.scale.set(vw, vh * cc.height / H, 1); cquad.position.set(0, (W < H ? -0.42 : -0.6) * vh / 2, -1); }
      renderer.clear(); renderer.render(scene, camera);
      return film;
    } };
  film.setResolution(opts.width || 720, opts.height || 1280);
  return film;
}
const STREET_TANK_Z = -70;
