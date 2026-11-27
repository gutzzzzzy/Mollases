#!/usr/bin/env python3
"""Voiceover -> speech/pause map (10 ms RMS envelope). usage: analyze_audio.py audio.mp3 out.json
Exact (to 0.01 s) speech segments and pauses; beats.py then maps trigger words onto them (faster-whisper words when available)."""
import json, subprocess, sys, numpy as np
src, out = sys.argv[1], sys.argv[2]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, '<i2').astype(np.float32) / 32768; hop = 160
n = len(x) // hop; rms = np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12); db = 20 * np.log10(rms + 1e-9)
hi = np.percentile(db, 95); thr_on, thr_off = hi - 24, hi - 28
sp = np.zeros(n, bool); on = False
for i, v in enumerate(db):
    if not on and v > thr_on: on = True
    elif on and v < thr_off: on = False
    sp[i] = on
# merge gaps < 0.14 s (inter-word), drop blips < 0.06 s
segs = []; i = 0
while i < n:
    if sp[i]:
        j = i
        while j < n and sp[j]: j += 1
        segs.append([i, j]); i = j
    else: i += 1
m = []
for s in segs:
    if m and (s[0] - m[-1][1]) * 0.01 < 0.14: m[-1][1] = s[1]
    else: m.append(s)
m = [s for s in m if (s[1] - s[0]) * 0.01 >= 0.06]
segments = [dict(s=round(a * 0.01, 2), e=round(b * 0.01, 2)) for a, b in m]
pauses = [dict(s=segments[k]['e'], e=segments[k + 1]['s'], d=round(segments[k + 1]['s'] - segments[k]['e'], 2)) for k in range(len(segments) - 1)]
json.dump(dict(duration=round(n * 0.01, 2), threshold_db=round(float(thr_on), 1), segments=segments, pauses=pauses), open(out, 'w'), indent=1)
print(f'{n*0.01:.2f}s  {len(segments)} speech segments  {len(pauses)} pauses  {sum(1 for p in pauses if p["d"] >= .35)} pauses>=0.35s')
