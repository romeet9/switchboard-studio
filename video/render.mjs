// Renders demo.html frame by frame through headless Chromium (CDP), then encodes with ffmpeg.
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const FPS = 30, W = 1920, H = 1080, DPR = 2, PORT = 9339;
const here = resolve(import.meta.dirname);
const frames = join(here, 'out', 'frames');
rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'ssv-'));
const chrome = spawn('/Applications/Chromium.app/Contents/MacOS/Chromium', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, '--hide-scrollbars', '--allow-file-access-from-files',
  `--force-device-scale-factor=${DPR}`, 'about:blank'], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(200); } }
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
await send('Page.navigate', { url: 'file://' + join(here, 'demo.html') });
await sleep(1500);
const total = (await send('Runtime.evaluate', { expression: 'TOTAL', returnByValue: true })).result.result.value;
const n = Math.round(total * FPS);
console.log(`total ${total}s, ${n} frames`);
for (let f = 0; f < n; f++) {
  await send('Runtime.evaluate', { expression: `render(${f / FPS})`, awaitPromise: false });
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
  writeFileSync(join(frames, String(f).padStart(5, '0') + '.jpg'), Buffer.from(shot.result.data, 'base64'));
  if (f % 300 === 0) console.log('frame', f);
}
ws.close(); chrome.kill(); rmSync(profile, { recursive: true, force: true });

const vo = join(here, 'out', 'voiceover.wav');
const enc = (out, scale) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, '%05d.jpg'), '-i', vo,
  '-vf', `scale=${scale}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
enc(join(here, 'out', 'switchboard-studio-explainer-4k.mp4'), '3840:2160');
enc(join(here, 'out', 'switchboard-studio-explainer.mp4'), '1920:1080');
const out = join(here, 'out');
rmSync(frames, { recursive: true, force: true });
console.log('wrote', out);
