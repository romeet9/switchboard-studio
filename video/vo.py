"""Generate the voiceover per scene with edge-tts, then write timings.js and out/voiceover.wav.
Usage: python3 vo.py [path-to-edge-tts]   (voice: en-US-AndrewNeural)"""
import json, subprocess, sys, os
here = os.path.dirname(os.path.abspath(__file__))
tts = sys.argv[1] if len(sys.argv) > 1 else 'edge-tts'
VOICE, RATE, LEAD, TAIL = 'en-US-AndrewNeural', '+4%', 0.25, 0.6
scenes = json.loads(subprocess.check_output(['node', '-e',
    "global.window={};require('./scenes.js');console.log(JSON.stringify(window.SCENES))"], cwd=here))
out = os.path.join(here, 'out', 'vo'); os.makedirs(out, exist_ok=True)
durs, starts, t = [], [], 0.0
for i, s in enumerate(scenes):
    mp3 = os.path.join(out, f'{i:02d}.mp3')
    subprocess.run([tts, '--voice', VOICE, f'--rate={RATE}', '--text', s['vo'], '--write-media', mp3], check=True, capture_output=True)
    d = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]))
    dur = round(max(s['min'], LEAD + d + TAIL), 2)
    durs.append(dur); starts.append(t); t += dur
    print(f'{i:02d} vo {d:.2f}s scene {dur:.2f}s')
open(os.path.join(here, 'timings.js'), 'w').write(f'window.DURS = {json.dumps(durs)};\n')
inputs, filt = [], []
for i, st in enumerate(starts):
    inputs += ['-i', os.path.join(out, f'{i:02d}.mp3')]
    ms = int((st + LEAD) * 1000)
    filt.append(f'[{i}:a]adelay={ms}|{ms}[a{i}]')
mix = ''.join(f'[a{i}]' for i in range(len(starts)))
filt.append(f'{mix}amix=inputs={len(starts)}:normalize=0,apad=whole_dur={t:.2f},loudnorm=I=-16:TP=-1.5[out]')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(filt), '-map', '[out]',
                '-ar', '48000', '-ac', '2', os.path.join(here, 'out', 'voiceover.wav')], check=True)
print(f'total {t:.2f}s')
