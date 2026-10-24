'use client';
import { useEffect, useState } from 'react';
import { live, vhs, useStore, visitorBus, type VisitorStar } from '@/lib/store';
import { projects, profile } from '@/content/data';
import { credits } from '@/content/credits';
import { click } from '@/lib/audio';

/* Cold open: tape clunks in → blue screen ▶ PLAY → handwritten label → tracking → roll. Skipped for returning visitors. */
export function ColdOpen() {
  const set = useStore((s) => s.set);
  const [stage, setStage] = useState(-1);
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem('dive.seen') === '1'; } catch {}
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen) { set({ booted: true }); return; }
    setStage(0);
    const times = reduced ? [200, 900, 1700] : [500, 1500, 3200];
    const ids = times.map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => ids.forEach(clearTimeout);
  }, [set]);
  useEffect(() => {
    if (stage < 0 || stage >= 3) return;
    const skip = () => setStage(3);
    window.addEventListener('keydown', skip); return () => window.removeEventListener('keydown', skip);
  }, [stage]);
  useEffect(() => {
    if (stage === 3) { try { localStorage.setItem('dive.seen', '1'); } catch {} set({ booted: true }); }
  }, [stage, set]);
  if (stage < 0 || stage >= 3) return null;
  return (
    <div className={`cold-open s${stage}`} onClick={() => setStage(3)} role="dialog" aria-label="Intro — click to skip">
      {stage === 0 && <div className="clunk">⏏ ▸ ▸ <i>clunk</i></div>}
      {stage >= 1 && (
        <div className="bluescreen">
          <span className="play">▶ PLAY</span>
          <div className="label"><span>{profile.name.toUpperCase()}</span><em>— DO NOT TAPE OVER —</em></div>
          <span className="skip">click / any key to skip</span>
        </div>
      )}
      <div className="tracking-bars" />
    </div>
  );
}

/* Project "footage": camcorder zooms (autofocus hunts) and the project plays back. */
export function ProjectFootage() {
  const id = useStore((s) => s.project), set = useStore((s) => s.set), dive = useStore((s) => s.dive);
  const p = dive === 3 ? projects.find((x) => x.id === id) : undefined;
  useEffect(() => {
    if (!p) return;
    click(1.4);
    document.body.classList.remove('af-hunt'); void document.body.offsetWidth; document.body.classList.add('af-hunt');
  }, [p]);
  if (!p) return null;
  return (
    <aside className="footage" style={{ ['--c' as string]: p.color }} aria-live="polite">
      <div className="footage-top"><span className="blink">▶ PLAYBACK</span><span>{p.name.toUpperCase()} · {p.year}</span><button onClick={() => set({ project: null })} aria-label="Close footage">✕</button></div>
      {p.role && <p className="pc-role">{p.role}</p>}
      {p.stat && <p className="stat">◉ {p.stat}</p>}
      <p>{p.story}</p>
      <div className="stack">{p.stack.map((s) => <span key={s}>{s}</span>)}</div>
      <div className="links">
        {Object.entries(p.links).map(([k, u]) => u ? <a key={k} href={u} target="_blank" rel="noreferrer">{k} ↗</a> : <span key={k} className="dim">{k} — coming soon</span>)}
      </div>
    </aside>
  );
}

export function StarTooltip() {
  const [s, setS] = useState<VisitorStar | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const sync = () => setS(visitorBus.hover);
    const mv = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });
    visitorBus.listeners.add(sync); window.addEventListener('pointermove', mv);
    return () => { visitorBus.listeners.delete(sync); window.removeEventListener('pointermove', mv); };
  }, []);
  if (!s) return null;
  return <div className="star-tip" style={{ left: pos.x + 14, top: pos.y + 14 }}><strong>★ {s.name}</strong><p>{s.message}</p></div>;
}

/* Behind-the-scenes mode (~): live stats, shader sliders and what each effect is. */
const SLIDERS: [keyof typeof vhs, string, number, string][] = [
  ['noise', 'Grain', 0.4, 'per-frame hash noise added to every pixel'],
  ['scanlines', 'Scanlines', 1, 'sin() over screen Y, like interlaced video fields'],
  ['chroma', 'Chroma bleed', 4, 'red/blue channels sampled with a horizontal offset'],
  ['distortion', 'Lens barrel', 0.6, 'UVs pushed out by r², a cheap camcorder lens'],
  ['vignette', 'Vignette', 1.5, 'corners darkened by distance from centre'],
  ['tracking', 'Tracking', 1, 'tear bands + snow; bursts on every cut between dives'],
  ['hue', 'Hue', 6.28, 'Rodrigues rotation around the grey axis'],
];
export function DebugPanel() {
  const st = useStore();
  const [, force] = useState(0);
  useEffect(() => { if (!st.debug) return; const id = setInterval(() => force((n) => n + 1), 250); return () => clearInterval(id); }, [st.debug]);
  if (!st.debug) return null;
  return (
    <div className="debug" role="region" aria-label="Debug panel">
      <h4>BEHIND THE SCENES <button onClick={() => st.set({ debug: false })}>✕</button></h4>
      <pre>{`FPS        ${live.fps}\nDRAW CALLS ${live.calls}\nTRIANGLES  ${live.tris.toLocaleString()}\nDIVE       0${st.dive + 1}\nSPEED      ${live.speed.toFixed(2)}\nZOOM       ${live.zoom.toFixed(2)}`}</pre>
      <label className="row"><input type="checkbox" checked={st.wireframe} onChange={(e) => st.set({ wireframe: e.target.checked })} /> wireframe override</label>
      {SLIDERS.map(([k, name, max, help]) => (
        <label key={k} className="slider">
          <span>{name} <em>{vhs[k].toFixed(2)}</em></span>
          <input type="range" min={0} max={max} step={max / 100} defaultValue={vhs[k]} onChange={(e) => { vhs[k] = +e.target.value; }} />
          <small>{help}</small>
        </label>
      ))}
      <p className="small">Night City is a real 360° photo graded to neon in a fragment shader (the wet plaza mirrors the skyline). The netrunner is a skinned Mixamo mesh re-shaded as fresnel light. Afterimages (Shift): previous frame fed back with decay.</p>
    </div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className="toast" style={t.color ? { ['--c' as string]: t.color } : undefined}><b>{t.title}</b>{t.body && <span>{t.body}</span>}</div>)}
    </div>
  );
}

export function Credits() {
  const open = useStore((s) => s.credits), set = useStore((s) => s.set);
  if (!open) return null;
  return (
    <div className="credits" role="dialog" aria-label="Credits" onClick={() => set({ credits: false })}>
      <div className="credits-roll" onClick={(e) => e.stopPropagation()}>
        <button className="credits-close" onClick={() => set({ credits: false })} aria-label="Close">✕</button>
        <p className="credits-kicker">THE DIVE</p>
        <h2>Directed, written &amp; coded by<br />{profile.name}</h2>
        <h3>With thanks to</h3>
        <ul>
          {credits.map((c) => (
            <li key={c.title}>
              <span className="dim">{c.what} · {c.where}</span>
              <a href={c.url} target="_blank" rel="noreferrer">{c.title}</a> — {c.author} <em>({c.license})</em>
            </li>
          ))}
        </ul>
        <p className="dim small">Inspired by the look of Cyberpunk: Edgerunners. Fan homage — no CD Projekt assets are used.</p>
      </div>
    </div>
  );
}
