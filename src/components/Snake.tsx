'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { snackIcons } from '@/content/icons';
import { blip, denied } from '@/lib/audio';

// Neon Snake on a tiny VHS monitor in the corner of Night City. Food is the stack I work with; eating one flashes its name.
const W = 18, H = 13, CELL = 14;
type P = { x: number; y: number };
const DIRS: Record<string, P> = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
};
const paths = snackIcons.map((i) => typeof Path2D === 'undefined' ? null : new Path2D(i.path));
const readBest = () => { try { return +(localStorage.getItem('dive.snake') ?? 0); } catch { return 0; } };

export function Snake() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'ready' | 'play' | 'over'>('ready');
  const [score, setScore] = useState(0), [best, setBest] = useState(0);
  const [flash, setFlash] = useState<{ name: string; color: string; id: number } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const g = useRef({ snake: [] as P[], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: { x: 0, y: 0, i: 0 }, acc: 0, step: 0.14, eaten: 0 });

  useEffect(() => setBest(readBest()), []);

  const placeFood = () => {
    const s = g.current;
    let f: P;
    do { f = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) }; } while (s.snake.some((p) => p.x === f.x && p.y === f.y));
    s.food = { ...f, i: Math.floor(Math.random() * snackIcons.length) };
  };
  const start = useCallback(() => {
    const s = g.current;
    s.snake = [{ x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }]; s.dir = { x: 1, y: 0 }; s.next = { x: 1, y: 0 }; s.acc = 0; s.step = 0.14; s.eaten = 0;
    placeFood(); setScore(0); setState('play'); blip(1.2);
  }, []);
  const turn = useCallback((d: P) => { const s = g.current; if (d.x !== -s.dir.x || d.y !== -s.dir.y) s.next = d; }, []);

  // keys only while the monitor is open, so they don't fight the scanner / flight controls
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const d = DIRS[e.key] ?? DIRS[e.key.toLowerCase()];
      if (d) { e.preventDefault(); e.stopPropagation(); if (state !== 'play') start(); else turn(d); }
      else if (e.key === 'Enter' && state !== 'play') { e.preventDefault(); start(); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [open, state, start, turn]);

  // game loop + drawing
  useEffect(() => {
    if (!open) return;
    const c = canvas.current!, ctx = c.getContext('2d')!, dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * CELL * dpr; c.height = H * CELL * dpr; ctx.scale(dpr, dpr);
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const s = g.current;
      if (state === 'play') {
        s.acc += dt;
        while (s.acc > s.step) {
          s.acc -= s.step; s.dir = s.next;
          const h = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
          if (h.x < 0 || h.y < 0 || h.x >= W || h.y >= H || s.snake.some((p) => p.x === h.x && p.y === h.y)) {
            denied(); setState('over');
            setBest((b) => { const nb = Math.max(b, s.eaten); try { localStorage.setItem('dive.snake', String(nb)); } catch { /* private mode */ } return nb; });
            break;
          }
          s.snake.unshift(h);
          if (h.x === s.food.x && h.y === s.food.y) {
            const icon = snackIcons[s.food.i];
            s.eaten++; setScore(s.eaten); s.step = Math.max(0.065, s.step * 0.95);
            setFlash({ name: icon.name, color: icon.color, id: now }); blip(1 + Math.random() * 0.8);
            placeFood();
          } else s.snake.pop();
        }
      }
      // draw
      ctx.fillStyle = '#03060a'; ctx.fillRect(0, 0, W * CELL, H * CELL);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)'; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x++) { ctx.beginPath(); ctx.moveTo(x * CELL + 0.5, 0); ctx.lineTo(x * CELL + 0.5, H * CELL); ctx.stroke(); }
      for (let y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL + 0.5); ctx.lineTo(W * CELL, y * CELL + 0.5); ctx.stroke(); }
      if (s.snake.length) {
        const f = s.food, icon = snackIcons[f.i], path = paths[f.i];
        ctx.save(); ctx.translate(f.x * CELL + 1, f.y * CELL + 1); ctx.scale((CELL - 2) / 24, (CELL - 2) / 24);
        ctx.shadowColor = icon.color; ctx.shadowBlur = 14; ctx.fillStyle = icon.color; if (path) ctx.fill(path);
        ctx.restore();
        s.snake.forEach((p, k) => {
          const t = 1 - k / (s.snake.length + 4);
          ctx.shadowColor = '#ff2bd6'; ctx.shadowBlur = k === 0 ? 12 : 6;
          ctx.fillStyle = k === 0 ? '#ffffff' : `rgba(255, ${Math.round(43 + 120 * (1 - t))}, 214, ${0.45 + t * 0.55})`;
          ctx.fillRect(p.x * CELL + 1.5, p.y * CELL + 1.5, CELL - 3, CELL - 3);
        });
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [open, state]);

  // swipe on touch
  const touch = useRef<P | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; if (state !== 'play') start(); };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.touches[0].clientX - touch.current.x, dy = e.touches[0].clientY - touch.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    turn(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) });
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  if (!open) return <button className="snake-tab" onClick={() => setOpen(true)} aria-label="Play Neon Snake"><span>▶</span> NEON SNAKE</button>;
  return (
    <div className="snake" role="group" aria-label="Neon Snake mini-game">
      <div className="snake-bezel">
        <div className="snake-screen" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onClick={() => state !== 'play' && start()}>
          <canvas ref={canvas} style={{ width: W * CELL, height: H * CELL }} />
          {flash && <b className="snake-flash" key={flash.id} style={{ color: flash.color }} onAnimationEnd={() => setFlash(null)}>+ {flash.name}</b>}
          {state !== 'play' && (
            <div className="snake-msg">
              <b>{state === 'over' ? 'SIGNAL LOST' : 'NEON SNAKE'}</b>
              <span>{state === 'over' ? `${score} skills eaten · ` : ''}arrows / swipe to {state === 'over' ? 'retry' : 'play'}</span>
            </div>
          )}
        </div>
        <div className="snake-foot"><span>SCORE {String(score).padStart(3, '0')}</span><span>HI {String(best).padStart(3, '0')}</span><button onClick={() => setOpen(false)} aria-label="Close Snake">⏻</button></div>
      </div>
    </div>
  );
}
