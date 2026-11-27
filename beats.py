#!/usr/bin/env python3
"""ONE shared beats.json (consumed by film.js, camera.js, fx.js via film.js, and sfx.py).
   usage: beats.py audio.mp3 beats.json [words.json]
   * speech/pause map from a 10 ms RMS envelope (analyze_audio.py) - exact to 0.01 s
   * if words.json (faster-whisper word timestamps) is given, every trigger word is located exactly (source 'whisper')
   * otherwise each trigger snaps to the nearest sentence start (end of a pause) within +-1.6 s of its design time (source 'rms-pause')
   'map' = piecewise-linear [design_t, actual_t] anchors: the film is authored on design time, the voiceover decides actual time."""
import json, re, subprocess, sys, os
here = os.path.dirname(os.path.abspath(__file__))
audio, out = sys.argv[1], sys.argv[2]; words = json.load(open(sys.argv[3])) if len(sys.argv) > 3 and os.path.exists(sys.argv[3]) else None
subprocess.run([sys.executable, os.path.join(here, 'analyze_audio.py'), audio, '/tmp/_audio_map.json'], check=True, capture_output=True)
am = json.load(open('/tmp/_audio_map.json')); dur = am['duration']
# key, design time, spoken phrase (tokens, first = the onset word), beat it opens
TR = [('suddenly', 3.0, ['suddenly'], 'wave erupts, hero sprints'), ('pancake', 7.2, ['pancake'], 'pancake commercial gag'), ('january_1919', 9.0, ['january', '1919'], 'calm 1919 aerial'),
      ('massive_tank', 14.0, ['massive', 'steel', 'tank'], 'tank establishing'), ('caribbean', 16.5, ['caribbean'], 'harbor context'), ('fifty_feet', 19.0, ['50', 'fifty', 'feet'], 'tilt-up'), ('seriously_wrong', 22.0, ['seriously', 'wrong'], 'ominous seam'),
      ('leaked', 24.0, ['leaked', 'constantly'], 'leaks + drips'), ('groaned', 27.0, ['groaned', 'walls'], 'groaning walls, rivet pings'), ('complained', 30.0, ['complained'], 'residents + BOSTON POST'), ('buckets', 33.0, ['buckets'], 'kid collects syrup'),
      ('free_syrup', 35.5, ['free', 'syrup'], 'bulging tank'), ('cards', 38.0, ['playing', 'cards'], 'card players'), ('firewood', 41.2, ['firewood'], 'kids gather firewood'), ('clock_1240', 43.8, ['12:40', 'twelve', 'forty'], 'clock close-up'),
      ('roar', 46.0, ['deafening', 'roar'], 'metallic roar, rivets snapping'), ('burst', 48.0, ['burst'], 'BOOM'), ('mph35', 51.5, ['35', 'thirty', 'miles'], 'wave chase'), ('smashing', 54.7, ['smashing', 'buildings'], 'buildings fall'),
      ('vehicles', 57.0, ['vehicles', 'sweeping'], 'car flip'), ('elevated', 60.0, ['elevated', 'railway'], 'El damage'), ('trapped', 67.0, ['trapped'], 'trapped civilians'), ('rescuers', 71.0, ['rescuers'], 'rescuers wade'),
      ('firehouse', 75.0, ['firehouse', 'collapsed'], 'Engine 31'), ('died21', 79.0, ['21', 'twenty'], 'solemn crane'), ('injured', 82.4, [], '150 injured, crane rises'), ('sabotaged', 86.0, ['sabotaged', 'sabotage'], 'boss + steam'), ('investigation', 91.0, ['investigation', 'years'], 'investigators'),
      ('responsible', 94.9, ['responsible', 'ordered'], 'court verdict + LIABLE'), ('smell', 99.0, ['smell'], 'sunny street'), ('smell2', 100.8, [], 'smell lingers, harbor drift'), ('smell3', 103.0, [], 'crane up over the town'), ('remember', 105.0, ['remember'], 'pancake pull-back finale'), ('fin2', 107.0, [], 'pull-back begins'), ('fin3', 110.5, [], 'town reveal'), ('fin4', 116.0, [], 'final held wide')]
norm = lambda s: re.sub(r'[^a-z0-9:]', '', s.lower())
starts = [s['s'] for s in am['segments']]
OV = {'rescuers': 69.0, 'smell': 98.8, 'smell2': 100.6, 'smell3': 102.8, 'injured': 82.1, 'fin2': 106.1, 'fin3': 111.3, 'fin4': 116.0}  # sentence starts read from the speech map (script order)
trig, last = {}, 0.0
for k, d, toks, what in TR:
    t, src = None, 'design'
    if k in OV and not words: t, src = OV[k], 'speech-seg'
    if words:
        for w in words:
            if w['start'] > last + 0.2 and norm(w['w']) in toks: t, src = w['start'], 'whisper'; break
    if t is None:
        c = [s for s in starts if abs(s - d) <= 1.6 and s > last + 0.2]
        if c: t, src = min(c, key=lambda s: abs(s - d)), 'rms-pause'
    if t is None: t = max(d, last + 0.3)
    trig[k] = dict(design=d, t=round(t, 2), source=src, what=what); last = t
mp = [[0.0, 0.0]] + [[v['design'], v['t']] for v in trig.values()] + [[118.5, dur]]
import os
fx = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'timing_fixed.json')
if os.path.exists(fx):   # user-supplied checkpoint timeline wins over the pause-snapping heuristics
    F = json.load(open(fx)); trig, mp = F['triggers'], F['map']
json.dump(dict(duration=dur, voiceover='assets/voiceover.mp3', triggers=trig, map=mp, speech=am['segments'], pauses=[p for p in am['pauses'] if p['d'] >= 0.3]), open(out, 'w'), indent=1)
print('%-15s %7s %8s %7s  %s' % ('trigger', 'design', 'actual', 'shift', 'source'))
for k, v in trig.items(): print('%-15s %7.2f %8.2f %+7.2f  %s' % (k, v['design'], v['t'], v['t'] - v['design'], v['source']))
