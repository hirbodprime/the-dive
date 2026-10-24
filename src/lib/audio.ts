// Procedural ambience + one music track per dive (/public/audio/tape-0N.mp3, credits in src/content/credits.ts).
let ctx: AudioContext | null = null;
let master: GainNode;
const beds: { rain: GainNode; hum: GainNode; motor: GainNode; wall: GainNode; space: GainNode } = {} as never;
const music: (HTMLAudioElement | null)[] = [];
let musicGains: GainNode[] = [];

function noise(c: AudioContext, brown = false) {
  const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; d[i] = brown ? (last = (last + 0.02 * w) / 1.02) * 3.5 : w; }
  const s = c.createBufferSource(); s.buffer = b; s.loop = true; s.start(); return s;
}
function bed(c: AudioContext, src: AudioNode, type: BiquadFilterType, freq: number) {
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = c.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(master); return g;
}

export function initAudio() {
  if (ctx) return;
  ctx = new AudioContext();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  beds.rain = bed(ctx, noise(ctx), 'highpass', 1200);
  beds.motor = bed(ctx, noise(ctx, true), 'lowpass', 300);
  const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 55; hum.start();
  beds.hum = bed(ctx, hum, 'lowpass', 140);
  const wall = ctx.createOscillator(); wall.type = 'square'; wall.frequency.value = 41; wall.start();
  const lfo = ctx.createOscillator(); lfo.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = 12; lfo.connect(lg).connect(wall.frequency); lfo.start();
  beds.wall = bed(ctx, wall, 'lowpass', 400);
  const pad = ctx.createOscillator(); pad.type = 'sine'; pad.frequency.value = 110; pad.start();
  const pad2 = ctx.createOscillator(); pad2.type = 'sine'; pad2.frequency.value = 164.8; pad2.start();
  beds.space = bed(ctx, pad, 'lowpass', 800); pad2.connect(beds.space);
  musicGains = [1, 2, 3, 4, 5].map((n) => {
    const a = new Audio(`/audio/tape-0${n}.mp3`); a.loop = true; a.preload = 'none';
    a.onerror = () => { music[n - 1] = null; };
    const g = ctx!.createGain(); g.gain.value = 0;
    try { ctx!.createMediaElementSource(a).connect(g).connect(master); music[n - 1] = a; } catch { music[n - 1] = null; }
    return g;
  });
}

export function setMuted(muted: boolean) {
  if (!ctx) initAudio();
  ctx!.resume();
  master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx!.currentTime, 0.3);
}

// Called every few frames with the current dive + how hard the tape is glitching.
export function mixTape(tape: number, velocity: number) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime, set = (g: GainNode, v: number) => g.gain.setTargetAtTime(v, t, 0.4);
  set(beds.rain, tape === 0 ? 0.12 : 0); set(beds.hum, tape <= 1 ? 0.05 : 0);
  set(beds.wall, tape === 2 ? 0.05 : 0); set(beds.space, tape >= 3 ? 0.035 : 0);
  set(beds.motor, Math.min(0.25, 0.02 + Math.abs(velocity) * 0.3));
  musicGains.forEach((g, i) => {
    const a = music[i]; if (!a) return;
    const on = i === tape; set(g, on ? 0.5 : 0);
    if (on && a.paused) a.play().catch(() => { music[i] = null; });
  });
}

// Mechanical camcorder click (transport buttons).
export function click(pitch = 1) {
  if (!ctx || ctx.state !== 'running') return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = 1800 * pitch; g.gain.value = 0.15;
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + 0.06);
}

function tone(type: OscillatorType, from: number, to: number, dur: number, vol = 0.12) {
  if (!ctx || ctx.state !== 'running') return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master); o.start(); o.stop(t + dur + 0.02);
}
// Neon tube striking.
export function buzz() { tone('sawtooth', 90, 120, 0.35, 0.1); tone('square', 2400, 1800, 0.08, 0.04); }
// Data downloaded / daemon uploaded.
export function blip(up = 1) { tone('triangle', 660 * up, 1320 * up, 0.18, 0.12); }
// Error / buffer full.
export function denied() { tone('square', 220, 110, 0.25, 0.08); }
