#!/usr/bin/env python3
"""Voiceover -> captions.json (word-timed, chunked to <= 4 words) using faster-whisper. usage: transcribe.py audio.mp3 captions.json"""
import json, sys
from faster_whisper import WhisperModel
src, out = sys.argv[1], sys.argv[2]
model = WhisperModel('base.en', device='cpu', compute_type='int8')
segs, _ = model.transcribe(src, word_timestamps=True, vad_filter=False, language='en')
words = [dict(w=w.word.strip(), start=round(w.start, 3), end=round(w.end, 3)) for s in segs for w in s.words if w.word.strip()]
for i in range(len(words) - 3):
    if [x['w'].lower().strip('.,') for x in words[i:i + 4]] == ['in', 'the', 'final', 'detail']: words[i]['w'] = 'And'
json.dump(words, open(out.replace('captions.json', 'words.json'), 'w'), indent=0)
FIX = [('in the final detail', 'And the final detail')]
def fix(t):
    for a, b in FIX:
        i = t.lower().find(a)
        if i >= 0: t = t[:i] + b + t[i + len(a):]
    return t
caps, cur = [], []
def flush():
    global cur
    if cur: caps.append(dict(start=cur[0]['start'], end=cur[-1]['end'], text=fix(' '.join(w['w'] for w in cur)), words=cur)); cur = []
for w in words:
    if cur and (len(cur) >= 4 or w['start'] - cur[-1]['end'] > 0.6 or w['end'] - cur[0]['start'] > 2.2): flush()
    cur.append(w)
    if w['w'][-1] in '.!?,;:' and len(cur) >= 2: flush()
flush()
for i, c in enumerate(caps[:-1]): c['end'] = max(c['end'], min(caps[i + 1]['start'], c['end'] + 0.35))   # hold until the next caption (no flicker)
json.dump(caps, open(out, 'w'), indent=1); print(f'{len(words)} words -> {len(caps)} captions -> {out}')
