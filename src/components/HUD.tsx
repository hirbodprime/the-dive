'use client';
import { useEffect, useRef, useState } from 'react';
import { live, useStore } from '@/lib/store';
import { tapes } from '@/content/data';
import { setMuted, click, initAudio } from '@/lib/audio';
import { go, next, prev, rewind } from './Dive';

const TAPE_SECONDS = 30 * 60; // the whole site is one 30-minute tape
const pad = (n: number, l = 2) => String(Math.floor(n)).padStart(l, '0');
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function HUD() {
  const st = useStore();
  const counter = useRef<HTMLSpanElement>(null), date = useRef<HTMLSpanElement>(null), zoom = useRef<HTMLSpanElement>(null), head = useRef<HTMLDivElement>(null);
  const [signal, setSignal] = useState(0);

  // Per-frame HUD values are written straight to the DOM.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = live.progress * TAPE_SECONDS;
      if (counter.current) counter.current.textContent = `${Math.floor(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}`;
      const d = new Date();
      if (date.current) date.current.textContent = `${d.getHours() >= 12 ? 'PM' : 'AM'} ${(d.getHours() % 12) || 12}:${pad(d.getMinutes())}:${pad(d.getSeconds())}  ${MONTHS[d.getMonth()]}.${d.getDate()} ${d.getFullYear()}`;
      if (zoom.current) { const z = Math.round(Math.max(0, Math.min(1, live.zoom)) * 8); zoom.current.textContent = '▮'.repeat(z) + '▯'.repeat(8 - z); }
      if (head.current) head.current.style.left = `${live.progress * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Signal bar = real server round-trip.
  useEffect(() => {
    const ping = async () => {
      const t = performance.now();
      try { const r = await fetch('/api/status', { cache: 'no-store' }); const ms = performance.now() - t; setSignal(!r.ok ? 0 : ms < 120 ? 4 : ms < 300 ? 3 : ms < 800 ? 2 : 1); } catch { setSignal(0); }
    };
    ping(); const id = setInterval(ping, 20000); return () => clearInterval(id);
  }, []);

  const t = (fn: () => void, p = 1) => () => { click(p); fn(); };
  const toggleSound = () => { initAudio(); setMuted(st.sound); st.set({ sound: !st.sound }); };
  const status = st.paused ? '❚❚ PAUSE' : '● REC';

  return (
    <div className={`hud ${st.paused ? 'is-paused' : ''}`} aria-label="Camcorder controls">
      <div className="hud-tl">
        <span className={`rec ${st.paused ? '' : 'blink'}`}>{status}</span>
        <span ref={counter} className="counter">0:00:00</span>
        <span className="sp">SP</span>
        <span className="zoom">W <span ref={zoom}>▯▯▯▯▯▯▯▯</span> T</span>
      </div>
      <div className="hud-tr">
        <span ref={date} className="date" />
        <span className="signal" title="Live server signal">{[1, 2, 3, 4].map((b) => <i key={b} className={b <= signal ? 'on' : ''} style={{ height: 3 + b * 3 }} />)}</span>
        <span className="battery" title="Battery"><i style={{ width: `${100 - live.progress * 70}%` }} /></span>
        <a className="eject" href="/cv" title="Recruiter fast lane — clean CV">⏏ EJECT</a>
      </div>
      <span className="corner c1" /><span className="corner c2" /><span className="corner c3" /><span className="corner c4" />
      {st.sandevistan && <div className="sande">SANDEVISTAN</div>}
      {st.paused && <div className="paused-tag">❚❚</div>}

      <nav className="transport" aria-label="Tape controls">
        <button onClick={prev} aria-label="Previous dive" title="Previous dive ( [ )">◀◀</button>
        <button onClick={t(() => st.set({ paused: !st.paused }))} aria-label={st.paused ? 'Play' : 'Pause'} className={st.paused ? 'on' : ''}>{st.paused ? '▶' : '❚❚'}</button>
        <button onClick={next} aria-label="Next dive" title="Next dive ( ] )">▶▶</button>
        <div className="timeline">
          {tapes.map((tp, i) => (
            <button key={tp.id} style={{ left: `${(i / 5) * 100}%` }} onClick={() => go(i)} className={st.dive === i ? 'on' : ''} title={`TAPE 0${tp.n} · ${tp.title}`}>
              <span>0{tp.n} {tp.title}</span>
            </button>
          ))}
          <div ref={head} className="head" />
        </div>
        <button onClick={toggleSound} aria-label={st.sound ? 'Mute' : 'Unmute'}>{st.sound ? '♪ ON' : '♪ OFF'}</button>
        <button onClick={t(rewind, 0.6)} aria-label="Rewind whole tape" title="Rewind tape">⏪</button>
        <details className="settings">
          <summary aria-label="Settings">⚙</summary>
          <label><input type="checkbox" checked={st.reducedMotion} onChange={(e) => st.set({ reducedMotion: e.target.checked })} /> Reduced motion</label>
          <label><input type="checkbox" checked={st.lowPower} onChange={(e) => st.set({ lowPower: e.target.checked })} /> Low power</label>
          <label><input type="checkbox" checked={st.debug} onChange={(e) => st.set({ debug: e.target.checked })} /> Behind the scenes (~)</label>
          <button className="credits-btn" onClick={() => st.set({ credits: true })}>★ Credits</button>
          <p className="keys">1–5 jump · [ ] prev/next · WASD + drag to fly · space pause (scan in Night City) · right-click scan · hold shift…</p>
        </details>
      </nav>
    </div>
  );
}
