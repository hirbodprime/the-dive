'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { live, useStore } from '@/lib/store';
import { mixTape, click } from '@/lib/audio';
import { HUD } from './HUD';
import { DivePanels, SeoContent, Drawer } from './Panels';
import { ColdOpen, ProjectFootage, DebugPanel, StarTooltip, Toasts, Credits } from './Overlays';

// 3D is lazy-loaded so the real text renders (and indexes) first.
const Scene = dynamic(() => import('./Scene'), { ssr: false });

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

// Cut to another dive: the tape glitches, everything transient closes.
export function go(n: number) {
  const st = useStore.getState();
  const dive = (n + 5) % 5;
  if (dive === st.dive) return;
  click(dive > st.dive ? 1.2 : 0.8);
  live.glitch = 1;
  st.set({ dive, reading: false, sign: null, log: null, project: null, scan: null, scanning: false });
}
export const next = () => go(useStore.getState().dive + 1);
export const prev = () => go(useStore.getState().dive - 1);

// Rewind the whole tape: flick back through every dive to the start.
export function rewind() {
  const step = () => {
    const d = useStore.getState().dive;
    if (d === 0) return;
    live.glitch = 1.2; useStore.getState().set({ dive: d - 1, reading: false, project: null, sign: null, log: null });
    setTimeout(step, 420);
  };
  click(0.6); step();
}

// handy in the console while developing: __dive.cam, __dive.go(3)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') import('./scenes/controls').then(({ cam }) => { (window as unknown as Record<string, unknown>).__dive = { cam, go, store: useStore, live }; });

export default function Dive() {
  const set = useStore((s) => s.set);
  const keys = useRef<string[]>([]);

  // Tape counter + audio mix.
  useEffect(() => {
    let raf = 0, frames = 0, fpsT = performance.now(), entered = performance.now(), last = useStore.getState().dive, prevT = performance.now();
    const tick = (now: number) => {
      live.glitch = Math.max(0, live.glitch - Math.min(0.1, (now - prevT) / 1000) * 1.6); prevT = now;
      const st = useStore.getState();
      if (st.dive !== last) { last = st.dive; entered = now; }
      live.progress = (st.dive + Math.min(0.95, (now - entered) / 240000)) / 5;
      if (++frames % 6 === 0) mixTape(st.dive, live.glitch);
      if (now - fpsT > 500) { live.fps = Math.round((frames * 1000) / (now - fpsT)); frames = 0; fpsT = now; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard transport + easter eggs. (WASD / arrows / Q E fly — see scenes/controls.)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const st = useStore.getState();
      keys.current = [...keys.current, e.key].slice(-KONAMI.length);
      if (keys.current.join() === KONAMI.join()) { set({ konami: !st.konami }); click(0.5); }
      if (e.key === 'Shift' && !st.sandevistan) set({ sandevistan: true });
      else if (e.key === ' ' && tag !== 'BUTTON' && st.dive === 0) { e.preventDefault(); if (!st.scanning) set({ scanning: true }); }  // Kiroshi scanner
      else if (e.key === ' ' && tag !== 'BUTTON') { e.preventDefault(); click(); set({ paused: !st.paused }); }
      else if (e.key === '`' || e.key === '~') set({ debug: !st.debug });
      else if (/^[1-5]$/.test(e.key)) go(+e.key - 1);
      else if (e.key === 'PageDown' || e.key === ']' || e.key === 'n') next();
      else if (e.key === 'PageUp' || e.key === '[' || e.key === 'p') prev();
      else if (e.key === 'Escape') set({ project: null, sign: null, log: null, scan: null, reading: false, credits: false });
    };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') set({ sandevistan: false }); if (e.key === ' ') set({ scanning: false }); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [set]);

  // Preferences + live data.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const lowCore = (navigator.hardwareConcurrency ?? 8) <= 4;
    set({ reducedMotion: mq.matches, lowPower: lowCore });
    fetch('/api/github').then((r) => r.json()).then((g: { commits?: number }) => { live.lit = 0.25 + Math.min(0.6, (g.commits ?? 30) / 120); }).catch(() => {});
  }, [set]);

  return (
    <>
      <div className="scene-wrap"><Scene /></div>
      <div className="fx-grain" aria-hidden />
      <HUD />
      <main><DivePanels /><SeoContent /></main>
      <ProjectFootage />
      <Drawer />
      <StarTooltip />
      <Toasts />
      <Credits />
      <DebugPanel />
      <ColdOpen />
    </>
  );
}
