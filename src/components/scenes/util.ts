import * as THREE from 'three';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Models are packed with gltf-transform (meshopt + webp). Pass this as useLoader's extension callback.
export const meshopt = (l: GLTFLoader) => { l.setMeshoptDecoder(MeshoptDecoder); };

export const smooth = (a: number, b: number, t: number) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Seeded RNG so the city / galaxy layout is identical on every visit.
export function rng(seed = 1) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

// Text on a sprite, used for node + planet labels. `bg` puts it on a dark plate so it stays readable over anything.
export function fontFamily() {
  return getComputedStyle(document.documentElement).getPropertyValue('--f-display').trim() || 'sans-serif';
}
export function makeLabel(text: string, color = '#00f0ff', size = 48, bg = false, screen = 0) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const font = `600 ${size}px ${fontFamily()}`;
  ctx.font = font;
  const pad = bg ? size * 0.6 : 12;
  c.width = Math.ceil(ctx.measureText(text).width + pad * 2); c.height = Math.ceil(size * (bg ? 1.7 : 1.4));
  ctx.font = font; ctx.textBaseline = 'middle';
  if (bg) {
    ctx.fillStyle = 'rgba(4, 8, 18, 0.82)'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = color; ctx.fillRect(0, 0, size * 0.12, c.height);
    ctx.fillStyle = '#f2f7ff';
  } else { ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.fillStyle = color; }
  ctx.fillText(text, pad, c.height / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  // screen > 0: constant on-screen height (fraction of the viewport), readable from any distance
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, sizeAttenuation: !screen }));
  s.scale.set((c.width / c.height) * (screen || 1), screen || 1, 1);
  return s;
}

export const NOISE_GLSL = /* glsl */ `
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`;
