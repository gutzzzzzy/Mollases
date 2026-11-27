// Cinematic camera rig: hard cuts between shots, eased lerp camStart->camEnd / lookStart->lookEnd inside a shot,
// optional lock-on to a character (positions become offsets from that character), and a deterministic procedural shake.
// Everything is a pure function of (shot, u, shake intensity, time) — so headless frame-stepping matches the live preview.
const T = window.THREE;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k;
export const EASE = {
  linear: (x) => x, smooth: (x) => x * x * (3 - 2 * x), in: (x) => x * x * x, out: (x) => 1 - Math.pow(1 - x, 3),
  whip: (x) => (x < 0.5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2),   // dolly/whip-pan: slow, violent middle, slow
  crane: (x) => x * x * x * (x * (6 * x - 15) + 10),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)), outCubic: (x) => 1 - Math.pow(1 - x, 3),
};
const V = (a) => new T.Vector3(a[0], a[1], a[2]);
export function createCameraRig(camera) {
  const rig = { shot: null, pos: new T.Vector3(), look: new T.Vector3(), dist: 10, fov: 50, aspectK: 1, shake: { i: 0, t: 0 },
    setAspect(a) { rig.aspectK = a >= 1 ? 0.72 : 1; return rig; },   // fov is authored for portrait; landscape gets a tighter vertical fov
    cut(shot) { rig.shot = shot; return rig; },   // hard cut: next update snaps instantly (no blending)
    setShake(intensity, time) { rig.shake.i = intensity; rig.shake.t = time; return rig; },
    minY: 1.2, calm: false,
    update(u, trackPos) {
      const s = rig.shot, e = (EASE[s.ease] || EASE.smooth)(clamp(u, 0, 1));
      rig.pos.lerpVectors(V(s.camStart), V(s.camEnd || s.camStart), e); rig.look.lerpVectors(V(s.lookStart), V(s.lookEnd || s.lookStart), e);
      if (s.track && trackPos) { rig.pos.add(trackPos); rig.look.add(trackPos); }
      rig.fov = lerp(s.fov || 50, s.fovEnd ?? s.fov ?? 50, e); { const kk = s.kick, q = kk ? (rig.shake.t - kk.at) / (kk.dur || 0.6) : 2; rig.fov += kk && q >= 0 && q < 1 ? kk.amt * Math.pow(1 - q, 2) : 0; } camera.fov = rig.fov * rig.aspectK; camera.updateProjectionMatrix();
      if (rig.limit) rig.limit(rig.pos, rig.look); if (rig.minY && !s.lowOK && rig.pos.y < rig.minY) rig.pos.y = rig.minY;   // camera discipline: never below 1.2 m (no sidewalk-slab / under-floor frames)
      rig.dist = rig.pos.distanceTo(rig.look); camera.position.copy(rig.pos); camera.lookAt(rig.look);
      const k = rig.shake.i, t = rig.shake.t;
      if (k > 0) {   // sums of incommensurate sines seeded only by `time`
        const sc = clamp(rig.dist / 10, 0.8, 2.5), n = (a, b) => Math.sin(t * a + b);
        camera.translateX(k * 0.45 * sc * (n(37.1, 0.3) + 0.6 * n(71.3, 1.7))); camera.translateY(k * 0.4 * sc * (n(43.7, 2.1) + 0.6 * n(83.9, 0.5))); camera.translateZ(k * 0.25 * sc * n(29.3, 4.0));
        camera.rotateZ(k * 0.045 * n(31.9, 1.1));
      }
      const tb = rig.shake.t, br = rig.calm ? 0 : (s.breathe ?? 0.4);   // deterministic handheld breathing
      if (br > 0) { camera.translateX(br * 0.018 * Math.sin(tb * 1.7)); camera.translateY(br * 0.022 * Math.sin(tb * 1.1 + 1)); camera.rotateZ(br * 0.004 * Math.sin(tb * 0.9)); }
      const rl = lerp(s.roll || 0, s.rollEnd ?? s.roll ?? 0, e); if (rl) camera.rotateZ(rl * Math.PI / 180);
      return rig;
    } };
  return rig;
}
