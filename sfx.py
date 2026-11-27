#!/usr/bin/env python3
"""Great Molasses Flood — procedural SFX bed with automatic narration ducking.

usage: sfx.py voiceover.mp3 out.wav [--seconds N]

Layers (timeline seconds, edit EVENTS below):
  metal groans + syrup drips   0:24-0:38   (+ rising tank rumble 0:45.5-0:48)
  rupture explosion            0:48         (100 %)
  fluid roar + wood splinters  0:49-1:07    (+ metal screech for the trestle)
  thick syrup squelching       1:07-1:19
  micro-SFX (micro()): 12:40 clock ticks, rivet pings, newspaper/verdict whooshes, steam hiss, masonry crunches, car flip, El snap
Ducking: the voiceover is analysed (RMS). While the narrator speaks the SFX bed sits at DUCK (22 %);
in natural pauses (>= 0.35 s) and during the blast window it surges to 100 %.
Only needs numpy + ffmpeg. Deterministic (fixed seed).
"""
import subprocess, sys, wave
import numpy as np

SR = 44100
DUCK = 0.22
EVENTS = dict(groan=(24, 38), rumble=(45.5, 48.0), boom=48.0, roar=(49, 67), squelch=(64.8, 79),
              blast_window=(47.9, 50.4), splinters=[(55.9, 58.0), (56.9, 59.0), (58.6, 59.2)], screech=(60.0, 63.0))
LEVEL = dict(groan=0.85, rumble=0.8, boom=1.0, roar=1.0, squelch=0.95, wood=1.0)
rng = np.random.default_rng(1919)
# ONE shared audio map (beats.json, also read by film.js): design time -> actual voiceover time, so every SFX lands on its spoken word
import json as _json, os as _os
_BJ = _os.environ.get('BEATS_JSON') or _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'beats.json')
_MAP = _json.load(open(_BJ))['map'] if _os.path.exists(_BJ) else [[0, 0], [118.5, 118.5]]
def AT(t): return float(np.interp(t, [m[0] for m in _MAP], [m[1] for m in _MAP]))


def decode(path, sr):
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], stdout=subprocess.PIPE, check=True).stdout
    return np.frombuffer(out, dtype=np.float32)


def filt(x, lo=None, hi=None):
    """FFT band filter with soft edges."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def env(n, a, d, shape=1.0):
    t = np.arange(n) / SR
    return np.minimum(t / max(a, 1e-4), 1) * np.exp(-t / max(d, 1e-4) * shape)


def add(buf, x, t0, gain=1.0, pan=0.0):
    i = int(AT(t0) * SR); j = min(len(buf), i + len(x))
    if i >= len(buf) or j <= i: return
    seg = x[:j - i] * gain; buf[i:j, 0] += seg * (1 - max(pan, 0)); buf[i:j, 1] += seg * (1 + min(pan, 0))


def norm(x): return x / (np.max(np.abs(x)) + 1e-9)


def groan(n, f0, f1):
    t = np.arange(n) / SR; f = f0 + (f1 - f0) * (t / t[-1]) ** 1.5 + 2.0 * np.sin(2 * np.pi * 5.5 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR; y = sum(np.sin(k * ph + k) / k for k in range(1, 9)) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    y = filt(y + 0.2 * filt(rng.standard_normal(n), 300, 1800), 40, 1800)
    return norm(y) * np.sin(np.pi * t / t[-1]) ** 1.5


def drip():
    n = int(0.22 * SR); t = np.arange(n) / SR; f = 1500 + 700 * rng.random()
    return norm(np.sin(2 * np.pi * f * t * (1 - 0.4 * t / t[-1])) * np.exp(-t / 0.035) + 0.6 * np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.05))


def tick(hi=1.0):
    n = int(0.09 * SR); t = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * 1900 * hi * t) * np.exp(-t / 0.006) + 0.5 * filt(rng.standard_normal(n), 2500, 7000) * np.exp(-t / 0.004))


def ping():
    n = int(0.7 * SR); t = np.arange(n) / SR
    return norm(sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in ((2350, .22), (3610, .12), (5120, .06))) + 0.5 * filt(rng.standard_normal(n), 2000, 9000) * np.exp(-t / 0.01))


def whoosh(d, up=True):
    n = int(d * SR); t = np.arange(n) / SR; x = filt(rng.standard_normal(n), 500, 5200) * np.clip(np.sin(np.pi * t / t[-1]), 0, 1) ** (1.6 if up else 0.8)
    return norm(x) * (np.linspace(0.4, 1, n) if up else np.linspace(1, 0.3, n))


def hiss(d):
    n = int(d * SR); t = np.arange(n) / SR; return norm(filt(rng.standard_normal(n), 3000, 9500)) * np.minimum(1, np.minimum(t / 0.15, (d - t) / 0.3)) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * t) ** 2)


def thud(d=0.5, f=70):
    n = int(d * SR); t = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * (f + 40 * np.exp(-t * 30)) * t) * np.exp(-t / (d * 0.25)) + 0.7 * filt(rng.standard_normal(n), 60, 600) * np.exp(-t / 0.05))


def crunch(d=0.9):   # masonry + timber collapse: low rumble, brick rattle, splinters
    n = int(d * SR); t = np.arange(n) / SR
    x = 0.8 * filt(rng.standard_normal(n), 40, 400) * np.exp(-t / (d * 0.35))
    for _ in range(14):
        k = int(rng.uniform(0, d * 0.8) * SR); m = int(0.06 * SR)
        if k + m < n: x[k:k + m] += norm(filt(rng.standard_normal(m), 500, 3800)) * np.exp(-np.arange(m) / SR / 0.012) * rng.uniform(0.3, 1.0)
    return norm(x)


def micro(buf, E):
    # 12:40 clock: dry ticks every 0.5 s speeding up, then the heavy chime-clunk on the hour hand
    t = 42.8   # design time; CLOCK_T = 43.9 (= 58.0 s of the voiceover)
    while t < 43.9: add(buf, tick(), t, 0.55, 0.15); t += 0.5 if t < 43.3 else 0.25
    add(buf, thud(0.6, 95), 43.9, 0.9); add(buf, ping() * 0.5, 43.9, 0.6, 0.1)
    # metallic groans + sharp rivet pings (seams 27-30, the 28.6 s ping lands on its beat)
    for tp, g in ((19.7, .5), (20.4, .6), (21.1, .7), (22.5, .6), (32.4, 1.0), (33.4, .6), (34.8, .7), (46.2, .5), (47.0, .7)): add(buf, ping(), tp, g * 0.8, rng.uniform(-.7, .7))
    # paper whooshes: newspaper slap-in 31.0, court document 94.9, stamp thud on 95.75
    add(buf, whoosh(0.5), 24.05, 0.8, -0.2); add(buf, thud(0.25, 140), 24.5, 0.4); add(buf, whoosh(0.45), 94.7, 0.8, 0.2); add(buf, thud(0.45, 110), 95.925, 1.0); add(buf, tick(0.7), 95.925, 0.6)
    # cartoon steam hiss: boss ears
    add(buf, hiss(3.85), 87.0, 0.55, -0.15); add(buf, hiss(3.65), 87.2, 0.45, 0.15)   # both end by design 90.85 = 1:38.4, before the investigation cut at 91.0 (1:38.5)
    # masonry / timber collapse crunches (firehouse 55.4, warehouse 56.2, row of houses 56.4-58.6) and the tank-side houses at the blast
    for tp, g, d in ((55.4, 1.0, 1.1), (56.2, 0.9, 1.0), (56.5, 0.7, 0.8), (57.2, 0.7, 0.8), (58.0, 0.6, 0.8), (58.6, 0.6, 0.8), (48.5, 0.8, 1.0), (48.9, 0.7, 0.9)): add(buf, crunch(d), tp, g, rng.uniform(-.8, .8))
    # car flip: launch thump 57.1, tumble creaks, landing impact ~59.3
    add(buf, thud(0.5, 85), 57.1, 0.9); add(buf, whoosh(1.4, False), 57.6, 0.5)
    for tp in (57.8, 58.3, 58.8): add(buf, ping() * 0.6, tp, 0.35, rng.uniform(-.6, .6))
    add(buf, thud(0.8, 55), 59.3, 1.0); add(buf, crunch(0.6), 59.3, 0.6)
    # El trestle snap hit
    add(buf, thud(0.7, 60), 60.9, 1.0); add(buf, crunch(1.0), 60.9, 0.8)
    # heavy sticky syrup squelches under the trapped / wading beats
    t = 67.4
    while t < 78.5:
        m = int(rng.uniform(.25, .55) * SR); tm_ = np.arange(m) / SR; f = rng.uniform(60, 130) * (1 + 1.8 * tm_ / tm_[-1])
        add(buf, norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tm_ / 0.16) + 0.3 * filt(rng.standard_normal(m), 100, 700) * np.exp(-tm_ / 0.1)), t, 0.7 * rng.uniform(.5, 1), rng.uniform(-.6, .6)); t += 0.4 + 0.7 * rng.random()


def build(total):
    N = int(total * SR); buf = np.zeros((N, 2)); E = EVENTS
    # -- groans + drips 24-38
    t = E['groan'][0]
    while t < E['groan'][1] - 1.5:
        d = 1.6 + 1.6 * rng.random(); add(buf, groan(int(d * SR), 48 + 20 * rng.random(), 70 + 40 * rng.random()), t, LEVEL['groan'] * (0.6 + 0.4 * rng.random()), rng.uniform(-.4, .4)); t += d * (0.6 + 0.5 * rng.random())
    t = E['groan'][0] + 0.3
    while t < E['groan'][1]: add(buf, drip(), t, LEVEL['groan'] * 0.7 * (0.5 + 0.5 * rng.random()), rng.uniform(-.8, .8)); t += 0.35 + 1.1 * rng.random()
    # -- rising rumble before the blast
    a, b = E['rumble']; n = int((b - a) * SR); ramp = np.linspace(0, 1, n) ** 2
    add(buf, norm(filt(rng.standard_normal(n), 25, 140)) * ramp * (1 + 0.5 * np.sin(np.arange(n) / SR * 31)), a, LEVEL['rumble'])
    for k in range(7): add(buf, norm(filt(rng.standard_normal(int(.35 * SR)), 900, 3500)) * env(int(.35 * SR), .004, .06), a + 0.5 + k * 0.33 + 0.1 * rng.random(), 0.35 * (k + 1) / 7, rng.uniform(-.6, .6))   # rivet pops
    # -- BOOM
    tb = E['boom']; n = int(4.5 * SR); t_ = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-t_ * 3)) * t_) * np.exp(-t_ / 1.3) * 1.2 + filt(rng.standard_normal(n), 30, 420) * np.exp(-t_ / 0.9) * 1.4
    boom += filt(rng.standard_normal(n), 800, 9000) * np.exp(-t_ / 0.07) * 1.0
    boom += sum(np.sin(2 * np.pi * f * t_ * (1 + 0.002 * i)) * np.exp(-t_ / (0.9 - 0.08 * i)) * 0.12 for i, f in enumerate([210, 335, 520, 760, 1130, 1670]))   # steel plates ringing
    add(buf, norm(np.tanh(boom * 0.9)), tb, LEVEL['boom'])
    # -- roar 49-67
    a, b = E['roar']; n = int((b - a) * SR); tt = np.arange(n) / SR
    L = filt(np.cumsum(rng.standard_normal(n)), 30, 500); R = filt(np.cumsum(rng.standard_normal(n)), 30, 500)
    amp = np.interp(tt, [0, 3, 8, 14, b - a], [0.0, 0.9, 1.0, 0.8, 0.35]) * (0.85 + 0.15 * np.sin(tt * 2.3))
    buf[int(AT(a) * SR):int(AT(a) * SR) + n, 0] += norm(L) * amp * LEVEL['roar']; buf[int(AT(a) * SR):int(AT(a) * SR) + n, 1] += norm(R) * amp * LEVEL['roar']
    hiss = filt(rng.standard_normal(n), 900, 5000) * amp * 0.12; buf[int(AT(a) * SR):int(AT(a) * SR) + n, :] += hiss[:, None] * LEVEL['roar']
    # -- wood splinters, heavier at the building / car hits
    def crack(d):
        m = int(d * SR); tm_ = np.arange(m) / SR; return norm(filt(rng.standard_normal(m), 700, 4200) * np.exp(-tm_ / (d * 0.3)) * (1 + 0.6 * np.sign(np.sin(tm_ * rng.uniform(80, 220)))))
    t = 52.0
    while t < 66.5: add(buf, crack(0.05 + 0.1 * rng.random()), t, LEVEL['wood'] * 0.35 * rng.random(), rng.uniform(-.9, .9)); t += 0.12 + 0.5 * rng.random()
    for (a2, b2) in E['splinters']:
        t = a2
        while t < b2: add(buf, crack(0.08 + 0.2 * rng.random()), t, LEVEL['wood'] * (0.6 + 0.4 * rng.random()), rng.uniform(-.9, .9)); t += 0.04 + 0.18 * rng.random()
    # -- metal screech while the trestle buckles
    a, b = E['screech']; n = int((b - a) * SR); tt = np.arange(n) / SR; f = 1100 - 700 * (tt / tt[-1]) + 60 * np.sin(tt * 19)
    sc = sum(np.sin(k * 2 * np.pi * np.cumsum(f) / SR) / k for k in (1, 2, 3)) * (0.5 + 0.5 * np.sin(tt * 23)) ** 2
    add(buf, norm(filt(sc, 300, 4000)) * np.sin(np.pi * tt / tt[-1]) ** 0.7, a, 0.45)
    # -- squelching 67-79: bubble pops over a slow thick gurgle
    a, b = E['squelch']; n = int((b - a) * SR); tt = np.arange(n) / SR
    gur = norm(filt(np.cumsum(rng.standard_normal(n)), 20, 220)) * (0.5 + 0.5 * np.sin(tt * 2 * np.pi * 0.7)) * 0.5
    fade = np.minimum(1, np.minimum(tt, (b - a) - tt) / 1.0)
    buf[int(AT(a) * SR):int(AT(a) * SR) + n, :] += (gur * fade)[:, None] * LEVEL['squelch']
    t = a
    while t < b - 0.3:
        m = int(rng.uniform(.35, .7) * SR); tm_ = np.arange(m) / SR; f0 = rng.uniform(48, 95); f = f0 * (1 - 0.35 * (tm_ / tm_[-1]))   # low, heavy, falling: sticky syrup suck, no cartoon rise
        pop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tm_ / 0.22) + 0.35 * filt(rng.standard_normal(m), 70, 420) * np.exp(-tm_ / 0.16) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * tm_))
        add(buf, norm(pop), t, LEVEL['squelch'] * rng.uniform(.55, 1.0) * min(1, (t - a) / 1.0, (b - t) / 1.0), rng.uniform(-.6, .6)); t += 0.45 + 0.8 * rng.random()
    micro(buf, E)
    return buf


def duck_curve(voice, total):
    sr = 16000; hop = sr // 100; n = len(voice) // hop
    rms = np.sqrt(np.mean(voice[:n * hop].reshape(n, hop) ** 2, axis=1))
    thr = max(0.004, 0.12 * np.percentile(rms, 90)); speech = rms > thr
    # fill short gaps (< 0.35 s) so natural micro-pauses between words keep the duck; drop blips < 0.1 s
    i = 0
    while i < n:
        if not speech[i]:
            j = i
            while j < n and not speech[j]: j += 1
            if 0 < i and j < n and (j - i) < 35: speech[i:j] = True
            i = j
        else: i += 1
    tgt = np.where(speech, DUCK, 1.0).astype(float)
    g = np.empty(n); cur = 1.0
    for k in range(n):   # one-pole: duck in 0.08 s, release over 0.4 s
        a = 1 - np.exp(-1 / (0.08 * 100)) if tgt[k] < cur else 1 - np.exp(-1 / (0.4 * 100)); cur += (tgt[k] - cur) * a; g[k] = cur
    tt = np.arange(n) / 100.0; a0, a1 = (AT(v) for v in EVENTS['blast_window']); g[(tt >= a0) & (tt <= a1)] = 1.0   # the blast always surges to 100 %
    full = np.interp(np.arange(int(total * SR)) / SR, tt, g)
    return full, speech.mean()


def main():
    src, out = sys.argv[1], sys.argv[2]; total = None
    if '--seconds' in sys.argv: total = float(sys.argv[sys.argv.index('--seconds') + 1])
    voice = decode(src, 16000); total = total or len(voice) / 16000
    buf = build(total); g, frac = duck_curve(voice, total)
    buf *= g[:len(buf), None]; buf = np.tanh(buf * 0.9) / np.tanh(0.9) * 0.9
    pcm = (np.clip(buf, -1, 1) * 32767).astype('<i2')
    with wave.open(out, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(f'sfx: {total:.1f}s, narration {frac * 100:.0f}% of time, peak {np.abs(buf).max():.2f} -> {out}')


if __name__ == '__main__': main()
