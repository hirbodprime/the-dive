import * as THREE from 'three';
import { live } from '@/lib/store';

// Camera you can drive. 'look' = stand still and drag to look around (panoramas),
// 'fly' = free flight (drag to steer, wheel / WASD to move), 'fixed' = small parallax only.
export type Mode = 'look' | 'fly' | 'fixed';

export const cam = {
  mode: 'look' as Mode,
  yaw: 0, pitch: 0, baseYaw: 0, basePitch: 0, spinYaw: 0, spinPitch: 0,
  pitchMin: -1.2, pitchMax: 1.2, yawRange: Math.PI * 4,
  pos: new THREE.Vector3(), vel: new THREE.Vector3(), bounds: 300, floor: -Infinity, speed: 30,
  fov: 60, fovTarget: 60, fovMin: 30, fovMax: 75,
  autoYaw: 0, idle: 0,
  dest: null as null | { pos: THREE.Vector3; look: THREE.Vector3; follow?: () => THREE.Vector3 },
  keys: new Set<string>(),
};

type Setup = Partial<Pick<typeof cam, 'mode' | 'yaw' | 'pitch' | 'pitchMin' | 'pitchMax' | 'yawRange' | 'bounds' | 'floor' | 'speed' | 'fov' | 'fovMin' | 'fovMax' | 'autoYaw'>> & { pos?: [number, number, number] };

export function setupCam({ pos, ...s }: Setup) {
  Object.assign(cam, { mode: 'look', yaw: 0, pitch: 0, pitchMin: -1.2, pitchMax: 1.2, yawRange: Math.PI * 4, bounds: 300, floor: -Infinity, speed: 30,
    fov: 60, fovMin: 30, fovMax: 75, autoYaw: 0, dest: null }, s);
  cam.baseYaw = cam.yaw; cam.basePitch = cam.pitch; cam.fovTarget = cam.fov; cam.idle = 0;
  cam.spinYaw = cam.spinPitch = 0; cam.vel.set(0, 0, 0);
  cam.pos.set(...(pos ?? [0, 0, 0]));
}

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();

export function forward(out = fwd) {
  return out.set(-Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), -Math.cos(cam.yaw) * Math.cos(cam.pitch));
}

function anglesTo(from: THREE.Vector3, to: THREE.Vector3) {
  tmp.subVectors(to, from).normalize();
  return { yaw: Math.atan2(-tmp.x, -tmp.z), pitch: Math.asin(THREE.MathUtils.clamp(tmp.y, -1, 1)) };
}

// Glide to a point and face `look`. Any manual input cancels it.
export function flyTo(look: THREE.Vector3, distance: number, follow?: () => THREE.Vector3) {
  const dir = tmp.subVectors(cam.pos, look).normalize();
  if (!isFinite(dir.x)) dir.set(0, 0, 1);
  const pos = look.clone().addScaledVector(dir, distance).add(new THREE.Vector3(0, distance * 0.15, 0));
  cam.dest = { pos, look: look.clone(), follow };
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/* ── input ── */
export function bindInput(el: HTMLElement) {
  let down = false, lx = 0, ly = 0, pinch = 0;
  const pts = new Map<number, { x: number; y: number }>();
  const onDown = (e: PointerEvent) => {
    // Left button / touch only: right button is reserved for the scanner.
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    down = true; lx = e.clientX; ly = e.clientY; cam.spinYaw = cam.spinPitch = 0; el.style.cursor = 'grabbing';
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  };
  const onMove = (e: PointerEvent) => {
    live.pointer.x = (e.clientX / window.innerWidth) * 2 - 1; live.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    if (!down) return;
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      zoom((pinch - d) * 2.5); pinch = d; return;
    }
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    // Grab-the-screen: the world follows your hand. Kept slow so it feels like turning your head.
    const k = (cam.fov / 60) * (e.pointerType === 'touch' ? 0.0032 : 0.0019);
    cam.yaw += dx * k; cam.pitch += dy * k;
    cam.spinYaw = dx * k * 6; cam.spinPitch = dy * k * 6;
    cam.idle = 0; cam.dest = null;
  };
  const onUp = (e: PointerEvent) => { pts.delete(e.pointerId); if (!pts.size) { down = false; el.style.cursor = ''; } };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); zoom(e.deltaY); };
  el.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });
  const kd = (e: KeyboardEvent) => { const t = (e.target as HTMLElement).tagName; if (t !== 'INPUT' && t !== 'TEXTAREA') { cam.keys.add(e.key.toLowerCase()); cam.idle = 0; } };
  const ku = (e: KeyboardEvent) => cam.keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  return () => {
    el.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
    el.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
  };
}

// Wheel / pinch: zoom in look mode, thrust in fly mode.
export function zoom(delta: number) {
  cam.idle = 0;
  if (cam.mode === 'fly') { cam.dest = null; cam.vel.addScaledVector(forward(tmp), -THREE.MathUtils.clamp(delta, -120, 120) * 0.035 * cam.speed / 30); }
  else cam.fovTarget = THREE.MathUtils.clamp(cam.fovTarget + delta * 0.03, cam.fovMin, cam.fovMax);
}

// On-screen thrust (touch): +1 forward, -1 back.
export function thrust(dir: number) { cam.idle = 0; cam.dest = null; cam.vel.addScaledVector(forward(tmp), dir * cam.speed * 0.6); }

/* ── per-frame ── */
export function stepCam(camera: THREE.PerspectiveCamera, dt: number, sway: boolean) {
  cam.idle += dt;
  // release inertia
  cam.yaw += cam.spinYaw * dt; cam.pitch += cam.spinPitch * dt;
  const damp = Math.pow(0.02, dt); cam.spinYaw *= damp; cam.spinPitch *= damp;
  if (cam.idle > 3 && !cam.dest) cam.yaw += cam.autoYaw * dt;

  if (cam.mode === 'fixed') {
    cam.yaw = cam.baseYaw + THREE.MathUtils.clamp(-live.pointer.x * 0.08, -0.1, 0.1);
    cam.pitch = cam.basePitch + live.pointer.y * 0.05;
  }

  if (cam.mode === 'fly') {
    const k = cam.keys, a = cam.speed * 1.6 * dt;
    forward(fwd); right.crossVectors(fwd, up).normalize();
    if (k.has('w') || k.has('arrowup')) cam.vel.addScaledVector(fwd, a);
    if (k.has('s') || k.has('arrowdown')) cam.vel.addScaledVector(fwd, -a);
    if (k.has('d') || k.has('arrowright')) cam.vel.addScaledVector(right, a);
    if (k.has('a') || k.has('arrowleft')) cam.vel.addScaledVector(right, -a);
    if (k.has('e') || k.has('r')) cam.vel.y += a;
    if (k.has('q') || k.has('f')) cam.vel.y -= a;
    if (k.size) cam.dest = null;
    cam.vel.multiplyScalar(Math.pow(0.18, dt));
    if (cam.vel.length() > cam.speed * 1.4) cam.vel.setLength(cam.speed * 1.4);
    cam.pos.addScaledVector(cam.vel, dt);
    if (cam.pos.length() > cam.bounds) { cam.pos.setLength(cam.bounds); cam.vel.multiplyScalar(0.5); }
    if (cam.pos.y < cam.floor) { cam.pos.y = cam.floor; cam.vel.y = Math.max(0, cam.vel.y); }
  }

  if (cam.dest) {
    const d = cam.dest, kk = 1 - Math.pow(0.06, dt);
    if (d.follow) d.look.copy(d.follow());
    if (cam.mode === 'fly') cam.pos.lerp(d.pos, kk);
    const t = anglesTo(cam.pos, d.look);
    cam.yaw += wrap(t.yaw - cam.yaw) * kk; cam.pitch += (t.pitch - cam.pitch) * kk;
    if (cam.pos.distanceTo(d.pos) < 0.05 && Math.abs(wrap(t.yaw - cam.yaw)) < 0.002) cam.dest = null;
  }

  if (cam.mode !== 'fixed' && cam.yawRange < Math.PI) cam.yaw = cam.baseYaw + THREE.MathUtils.clamp(wrap(cam.yaw - cam.baseYaw), -cam.yawRange, cam.yawRange);
  cam.pitch = THREE.MathUtils.clamp(cam.pitch, cam.pitchMin, cam.pitchMax);

  cam.fov += (cam.fovTarget - cam.fov) * (1 - Math.pow(0.004, dt));
  camera.fov = cam.fov; camera.updateProjectionMatrix();
  camera.position.copy(cam.pos);
  let sy = 0, sp = 0;
  if (sway) { const t = live.time; sy = Math.sin(t * 0.7) * 0.004 + Math.sin(t * 2.3) * 0.0015; sp = Math.sin(t * 0.9) * 0.004 + Math.cos(t * 3.1) * 0.001; }
  camera.rotation.order = 'YXZ';
  camera.rotation.set(cam.pitch + sp, cam.yaw + sy, Math.sin(live.time * 0.5) * 0.004 * +sway);
  live.zoom = 1 - (cam.fov - 30) / 45;
  live.speed = cam.vel.length();
}
