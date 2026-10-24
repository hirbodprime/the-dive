import { create } from 'zustand';

// Hot values are mutated on `live` to avoid React re-renders every frame.
export const live = { lit: 0.45, fps: 0, calls: 0, tris: 0, progress: 0, time: 0, flash: 0, glitch: 0, zoom: 0, speed: 0, signal: 0, beam: 0, pointer: { x: 0, y: 0 } };

export const vhs = { noise: 0.06, scanlines: 0.22, chroma: 0.7, distortion: 0.06, vignette: 0.5, tracking: 0.0, hue: 0.0 };

export type Toast = { id: number; title: string; body?: string; color?: string };

type State = {
  booted: boolean;
  paused: boolean;
  wireframe: boolean;
  debug: boolean;
  sound: boolean;
  reducedMotion: boolean;
  lowPower: boolean;
  sandevistan: boolean;
  konami: boolean;
  dive: number;          // 0–4: which space you're in
  reading: boolean;      // the "read it all" drawer for the current dive
  credits: boolean;
  // per-dive interaction state
  signs: string[];       // Night City: neon signs switched on
  sign: string | null;   // …and the one being read
  scanning: boolean;     // Night City: Kiroshi scanner held down
  scan: string | null;   // …the object it last read
  scanned: string[];
  collected: string[];   // the Net: skill nodes downloaded
  log: string | null;    // the Net: access log opened
  daemons: number[];     // Blackwall: daemons uploaded
  breached: boolean;
  charted: string[];     // Deep Space: planets visited
  project: string | null;
  locked: boolean;       // Moon: antenna aimed at Earth
  repo: string | null;   // Moon: repo arc being hovered on the globe
  toasts: Toast[];
  set: (p: Partial<State>) => void;
};

export const useStore = create<State>((set) => ({
  booted: false, paused: false, wireframe: false, debug: false, sound: false, reducedMotion: false, lowPower: false,
  sandevistan: false, konami: false, dive: 0, reading: false, credits: false,
  signs: [], sign: null, scanning: false, scan: null, scanned: [], collected: [], log: null, daemons: [], breached: false, charted: [], project: null, locked: false, repo: null, toasts: [],
  set: (p) => set(p),
}));

let toastId = 0;
export function toast(title: string, body?: string, color?: string) {
  const t = { id: ++toastId, title, body, color };
  const st = useStore.getState();
  st.set({ toasts: [...st.toasts.slice(-2), t] });
  setTimeout(() => useStore.getState().set({ toasts: useStore.getState().toasts.filter((x) => x.id !== t.id) }), 3800);
}

export type VisitorStar = { id: number; name: string; message: string; x: number; y: number; z: number; created_at: string };
export const visitorBus = { stars: [] as VisitorStar[], hover: null as VisitorStar | null, listeners: new Set<() => void>(),
  emit() { this.listeners.forEach((l) => l()); } };
