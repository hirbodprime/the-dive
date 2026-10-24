'use client';
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { live, useStore } from '@/lib/store';
import { rng, NOISE_GLSL, fontFamily } from './util';
import { cam, setupCam } from './controls';

const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
export const NETRUNNER = '/assets/models/netrunner.glb';
export const DAEMON_COUNT = 3;

function glyphAtlas() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d')!, chars = '0123456789ABCDEF█▓▒░<>/\\|=+*#@$%&?!:;ΣΔΛΞΠΨΩ';
  x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 1024);
  x.fillStyle = '#fff'; x.font = `700 50px ${fontFamily()}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const r = rng(31);
  for (let i = 0; i < 256; i++) x.fillText(chars[Math.floor(r() * chars.length)], (i % 16) * 64 + 32, Math.floor(i / 16) * 64 + 34);
  const t = new THREE.CanvasTexture(c); t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t;
}

const wallFrag = /* glsl */ `${NOISE_GLSL}
uniform sampler2D uGlyph; uniform float uTime, uCrack, uBreak, uPulse;
uniform vec3 uHandL, uHandR; uniform vec2 uGhost;
varying vec2 vUv;
float h1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
vec2 h2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
// x: distance to the nearest crack edge, y: order in which this shard breaks, zw: shard centre
vec4 shards(vec2 p){
  vec2 n = floor(p), f = fract(p); float md = 8.0; vec2 mr, mg;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){ vec2 g = vec2(i, j), o = h2(n + g), r = g + o - f; float d = dot(r, r); if (d < md){ md = d; mr = r; mg = g; } }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++){ vec2 g = mg + vec2(i, j), o = h2(n + g), r = g + o - f; if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr))); }
  vec2 c = n + mg + h2(n + mg);
  return vec4(md, h2(n + mg + 17.0).x, c);
}
void main(){
  vec2 w = (vUv - 0.5) * vec2(64.0, 36.0);
  // falling code columns
  float col = floor(w.x / 0.62);
  float dir = h1(col + 3.0) > 0.5 ? 1.0 : -1.0;
  vec2 g = vec2(w.x / 0.62, w.y / 0.78 + uTime * (0.4 + h1(col) * 2.2) * dir);
  vec2 cell = floor(g), f = fract(g);
  float pick = floor(h1(dot(cell, vec2(1.0, 57.0))) * 256.0 + floor(uTime * (0.5 + h1(cell.y + col) * 3.0)));
  vec2 at = (vec2(mod(pick, 16.0), floor(mod(pick, 256.0) / 16.0)) + f) / 16.0;
  float glyph = texture2D(uGlyph, at).r * step(0.25, h1(dot(cell, vec2(7.0, 113.0)) + floor(uTime * 0.7)));
  // slow, breathing corruption — faces in the static if you stare long enough
  float n = fbm(vec3(w * 0.07, uTime * 0.12));
  float m = fbm(vec3(w * 0.25 + n * 4.0, uTime * 0.3));
  vec3 c = mix(vec3(0.05, 0.0, 0.01), vec3(0.6, 0.0, 0.06), pow(m, 1.8) * 1.9);
  c += vec3(1.0, 0.1, 0.16) * glyph * (0.3 + m * 1.1);
  c += vec3(1.0, 0.6, 0.6) * step(0.996, h1(cell.x * 3.0 + cell.y + floor(uTime * 12.0))) * glyph;
  float scan = step(0.97, fract(w.y * 0.05 - uTime * 0.25)); c += vec3(1.0, 0.1, 0.2) * scan * 0.25;
  // her shadow on the wall, so the light of her reads against it
  c *= 1.0 - 0.75 * smoothstep(9.0, 2.0, length((w - uGhost) * vec2(1.0, 0.5)));
  // where she presses, the wall glows and ripples around her palms
  for (int k = 0; k < 2; k++) {
    vec3 hd = k == 0 ? uHandL : uHandR;
    float dh = length(w - hd.xy);
    c += vec3(1.0, 0.35, 0.4) * hd.z * (smoothstep(1.6, 0.0, dh) * 1.3 + smoothstep(0.35, 0.0, abs(dh - fract(uTime * 0.7) * 5.0)) * 0.5 * smoothstep(5.0, 0.0, dh));
  }
  // pulse rings when a daemon lands
  float rr = length(w);
  c += vec3(1.0, 0.85, 0.8) * smoothstep(1.5, 0.0, abs(rr - (1.0 - uPulse) * 40.0)) * uPulse;
  // cracks + shards
  vec4 s = shards(w / 3.2);
  float order = s.y * 0.5 + smoothstep(0.0, 12.0, length(s.zw * 3.2)) * 0.5;
  float crack = smoothstep(0.06, 0.0, s.x) * step(order, uCrack * 1.15);
  c += vec3(1.0, 0.92, 0.88) * crack * (1.5 + sin(uTime * 9.0 + s.y * 20.0) * 0.5);
  float gone = step(order, uBreak);
  if (gone > 0.5) discard;
  c += vec3(1.0, 0.5, 0.45) * smoothstep(0.25, 0.0, s.x) * step(order, uBreak + 0.08) * 1.4;   // hot shard edges
  gl_FragColor = vec4(c, 1.0);
}`;

// Shared between the wall and the ghost: where her palms touch it, and where she is.
const touch = { l: new THREE.Vector3(0, 0, 0), r: new THREE.Vector3(0, 0, 0), ghost: new THREE.Vector2(0, -1) };

function Wall() {
  const daemons = useStore((s) => s.daemons.length), breached = useStore((s) => s.breached);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uGlyph: { value: glyphAtlas() }, uTime: { value: 0 }, uCrack: { value: 0 }, uBreak: { value: 0 }, uPulse: { value: 0 }, uHandL: { value: touch.l }, uHandR: { value: touch.r }, uGhost: { value: touch.ghost } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: wallFrag, side: THREE.DoubleSide }), []);
  const last = useRef(daemons);
  useEffect(() => { if (daemons > last.current) { mat.uniforms.uPulse.value = 1; live.glitch = 0.6; } last.current = daemons; }, [daemons, mat]);
  useFrame((_, dt) => {
    const u = mat.uniforms;
    u.uTime.value = live.time;
    u.uCrack.value += (daemons / DAEMON_COUNT - u.uCrack.value) * Math.min(1, dt * 2.5);
    const brk = breached ? 1.3 : (daemons / DAEMON_COUNT) * 0.3;
    u.uBreak.value += (brk - u.uBreak.value) * Math.min(1, dt * (breached ? 0.7 : 1.8));
    u.uPulse.value = Math.max(0, u.uPulse.value - dt * 0.8);
  });
  return <mesh material={mat}><planeGeometry args={[64, 36]} /></mesh>;
}

/* The netrunner beyond the wall: a free Mixamo character re-rendered as a red ghost of light.
   She shows through the wall, follows your cursor, presses her palms against it, and reaches through once it breaks. */
function Ghost() {
  const gltf = useLoader(GLTFLoader, NETRUNNER);
  const u = useMemo(() => ({ uTime: { value: 0 }, uReveal: { value: 0.8 }, uFree: { value: 0 } }), []);
  const root = useRef<THREE.Group>(null);
  const { model, bones } = useMemo(() => {
    const model = gltf.scene;
    // drawn over the wall (no depth test): through the code you see her outline, not the inside of the wall
    const mat = new THREE.MeshBasicMaterial({ color: '#ff2a3a', side: THREE.DoubleSide, ...add, depthTest: false });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = 'uniform float uTime, uFree; varying vec3 vN; varying vec3 vV; varying float vY;\n' + sh.vertexShader
        .replace('#include <skinning_vertex>', `#include <skinning_vertex>
          float gk = (1.0 - uFree * 0.9) * step(0.975, fract(sin(floor(transformed.y * 0.09 + uTime * 5.0) * 91.7) * 4375.5));
          transformed.x += gk * 7.0 * sin(uTime * 37.0);`)
        .replace('#include <fog_vertex>', `#include <fog_vertex>
          vN = normalize(transformedNormal); vV = normalize(-mvPosition.xyz); vY = transformed.y;`);
      sh.fragmentShader = 'uniform float uTime, uReveal, uFree; varying vec3 vN; varying vec3 vV; varying float vY;\n' + sh.fragmentShader
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.8);
          float scan = 0.7 + 0.3 * sin(vY * 1.4 - uTime * 7.0);
          float band = step(0.94, fract(vY * 0.012 - uTime * 0.35));
          float flick = 0.88 + 0.12 * sin(uTime * 53.0) * sin(uTime * 3.1);
          vec3 col = mix(vec3(1.0, 0.12, 0.2), vec3(1.0, 0.92, 0.92), fres * 0.85);
          // freed: she cools from blackwall red to pale light and steadies
          col = mix(col, mix(vec3(0.55, 0.85, 1.0), vec3(1.0, 0.35, 0.45), fres * 0.6), uFree);
          flick = mix(flick, 1.0, uFree); scan = mix(scan, 0.9, uFree * 0.7);
          float a = ((0.3 + fres * 1.3) * scan + band * 0.5 * (1.0 - uFree)) * flick * uReveal;
          gl_FragColor = vec4(col * a, a);`);
    };
    model.traverse((o) => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).material = mat; o.frustumCulled = false; o.renderOrder = 10; } });
    // normalise to ~15 units tall, feet at 0: she towers behind the wall, you see her from the waist up
    // useLoader caches the scene, so only normalise once — re-running it on remount lifted her higher every visit
    if (!model.userData.normalised) {
      const box = new THREE.Box3().setFromObject(model), h = box.max.y - box.min.y;
      model.scale.multiplyScalar(15 / h); model.updateMatrixWorld(true);
      const b2 = new THREE.Box3().setFromObject(model); model.position.y -= b2.min.y;
      model.userData.normalised = true;
    }
    const find = (n: string) => { let f: THREE.Object3D | undefined; model.traverse((o) => { if (!f && o.name.endsWith(n)) f = o; }); return f; };
    const bones = { lArm: find('LeftArm'), rArm: find('RightArm'), lFore: find('LeftForeArm'), rFore: find('RightForeArm'), lHand: find('LeftHand'), rHand: find('RightHand'),
      head: find('Head'), neck: find('Neck'), spine: find('Spine1'), lLeg: find('LeftUpLeg'), lKnee: find('LeftLeg') };
    return { model, bones };
  }, [gltf, u]);

  const rest = useMemo(() => new Map<THREE.Object3D, THREE.Quaternion>(), []);
  useEffect(() => { Object.values(bones).forEach((b) => b && rest.set(b, (b.userData.rest ??= b.quaternion.clone()))); }, [bones, rest]);   // once: bones keep their last pose across remounts
  const q = useMemo(() => new THREE.Quaternion(), []), pq = useMemo(() => new THREE.Quaternion(), []);
  const turn = (b: THREE.Object3D | undefined, axis: THREE.Vector3, angle: number) => {
    if (!b || !b.parent) return;
    b.parent.getWorldQuaternion(pq);
    q.setFromAxisAngle(axis, angle);
    b.quaternion.premultiply(pq.clone().invert().multiply(q).multiply(pq));
    b.updateMatrixWorld(true);
  };
  const X = useMemo(() => new THREE.Vector3(1, 0, 0), []), Y = useMemo(() => new THREE.Vector3(0, 1, 0), []), Z = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const s = useRef({ reach: 0, free: 0, since: 0, x: 0, look: new THREE.Vector2(), pl: 0, pr: 0 });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const st = useStore.getState(), breached = st.breached, daemons = st.daemons.length;
    const k = Math.min(1, dt * 2), v = s.current, p = live.pointer, t = live.time;
    u.uTime.value = live.time;
    u.uReveal.value += ((breached ? 1.25 : 0.75 + daemons * 0.12) - u.uReveal.value) * Math.min(1, dt * 1.2);
    // breach: she reaches through for ~3s, then steps out and stands in front of you, freed
    v.since = breached ? v.since + dt : 0;
    v.free += ((v.since > 3 ? 1 : 0) - v.free) * Math.min(1, dt * 0.7);
    u.uFree.value = v.free;
    v.reach += ((breached ? 1 - v.free : 0) - v.reach) * Math.min(1, dt * 0.9);
    // she drifts toward your cursor, looks at it, and presses the palm on that side against the wall
    v.x += (p.x * 5.5 * (1 - v.free) - v.x) * Math.min(1, dt * 0.8);
    v.look.x += (p.x - v.look.x) * k; v.look.y += (p.y - v.look.y) * k;
    v.pl += ((breached ? 0 : p.x > -0.15 ? 1 : 0.15) - v.pl) * Math.min(1, dt * 1.5);
    v.pr += ((breached ? 0 : p.x < 0.15 ? 1 : 0.15) - v.pr) * Math.min(1, dt * 1.5);
    const r = v.reach;
    rest.forEach((qq, b) => b.quaternion.copy(qq));
    model.updateMatrixWorld(true);
    const br = Math.sin(t * 0.8);
    turn(bones.spine, X, 0.12 + br * 0.03 - v.look.y * 0.08);
    turn(bones.neck, Y, (v.look.x - v.x / 5.5) * 0.5); turn(bones.head, Y, (v.look.x - v.x / 5.5) * 0.4);
    turn(bones.head, X, -v.look.y * 0.35 + 0.1 - r * 0.15); turn(bones.head, Z, Math.sin(t * 0.3) * 0.06);
    // arms: hanging (0) → palm flat on the wall (press) → reaching through toward you (reach)
    const arm = (side: 1 | -1, press: number, reach: number, upper?: THREE.Object3D, fore?: THREE.Object3D, hand?: THREE.Object3D) => {
      const sway = Math.sin(t * 0.5 + side) * 0.05, r = reach;
      turn(upper, Z, -side * (1.2 + v.free * 0.18 - press * 1.75 - r * 1.25) + sway);   // down ↔ up
      turn(upper, Y, -side * (press * 0.55 - r * 1.2));                   // swing forward
      turn(fore, Z, -side * (press * 0.7 + r * 0.15));                // bend the elbow up
      turn(hand, X, -press * 1.1);                                       // palm flat
    };
    arm(1, v.pl, r, bones.lArm, bones.lFore, bones.lHand);          // her left hand reaches out to you
    arm(-1, v.pr, r * 0.15, bones.rArm, bones.rFore, bones.rHand);
    turn(bones.lLeg, X, -0.25 * (1 - v.free * 0.6)); turn(bones.lKnee, X, 0.45 * (1 - v.free * 0.6));
    if (root.current) {
      const f = v.free;   // freed: scaled to human size, whole figure in frame, standing where the wall was
      root.current.scale.setScalar(1 - f * 0.32);
      root.current.position.set(v.x + Math.sin(t * 0.21) * 0.2 * (1 - f), THREE.MathUtils.lerp(-11.8 - r * 1.5, -4.9, f) + Math.sin(t * 0.7) * 0.15, THREE.MathUtils.lerp(-1.6 + r * 2.8, 0.5, f));
      root.current.rotation.y = Math.sin(t * 0.17) * 0.08 + v.look.x * 0.15;
      root.current.updateMatrixWorld(true);
      // palms → wall uniforms
      const put = (out: THREE.Vector3, b: THREE.Object3D | undefined, press: number) => {
        if (!b) return; b.getWorldPosition(tmp); out.set(tmp.x, tmp.y, press * (0.75 + 0.25 * Math.sin(t * 3)));
      };
      put(touch.l, bones.lHand, v.pl); put(touch.r, bones.rHand, v.pr);
      touch.ghost.set(root.current.position.x, -2);
    }
  });
  return <group ref={root}><primitive object={model} /></group>;
}

function Backlight() {
  const breached = useStore((s) => s.breached), daemons = useStore((s) => s.daemons.length);
  const mat = useMemo(() => new THREE.ShaderMaterial({ ...add, uniforms: { uI: { value: 0.2 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uI, uTime; varying vec2 vUv; void main(){ float d = length((vUv - 0.5) * vec2(1.6, 1.0));
      vec3 c = mix(vec3(1.0, 0.55, 0.5), vec3(0.8, 0.02, 0.1), smoothstep(0.0, 0.3, d));
      gl_FragColor = vec4(c * smoothstep(0.6, 0.0, d) * uI * (0.9 + 0.1 * sin(uTime * 2.0)), 1.0); }` }), []);
  useFrame((_, dt) => { mat.uniforms.uTime.value = live.time; mat.uniforms.uI.value += ((breached ? 0.32 : 0.25 + daemons * 0.15) - mat.uniforms.uI.value) * Math.min(1, dt * 1.2); });
  return <mesh material={mat} position={[0, 0, -16]}><planeGeometry args={[80, 50]} /></mesh>;
}

function Embers({ count = 900 }) {
  const pts = useMemo(() => {
    const r = rng(17), p = new Float32Array(count * 3), s = new Float32Array(count);
    for (let i = 0; i < count; i++) { p.set([(r() - 0.5) * 50, (r() - 0.5) * 30, r() * 14 - 2], i * 3); s[i] = 0.3 + r(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
    return new THREE.Points(g, new THREE.ShaderMaterial({ ...add, uniforms: { uTime: { value: 0 } },
      vertexShader: 'uniform float uTime; attribute float aS; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + uTime * aS * 1.5 + 15.0, 30.0) - 15.0; p.x += sin(uTime * aS + p.y) * 0.4; vA = aS * (0.5 + 0.5 * sin(uTime * 6.0 * aS + p.x)); vec4 mv = modelViewMatrix * vec4(p,1.0); gl_PointSize = 70.0 * aS / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.25, 0.2, smoothstep(0.5, 0.0, d) * vA); }' }));
  }, [count]);
  useFrame(() => { (pts.material as THREE.ShaderMaterial).uniforms.uTime.value = live.time; });
  return <primitive object={pts} />;
}

// If the netrunner model is missing (fresh clone, offline install) the wall still works, just with nobody behind it.
class Optional extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export function Blackwall() {
  const breached = useStore((s) => s.breached);
  useEffect(() => { setupCam({ mode: 'fixed', pos: [0, 0, 16], fov: 62 }); }, []);
  useFrame((_, dt) => { cam.pos.z += ((breached ? 12 : 16) - cam.pos.z) * Math.min(1, dt * 0.6); });
  return (
    <group>
      <color attach="background" args={['#070001']} />
      <fog attach="fog" args={['#120003', 12, 60]} />
      <Backlight />
      <Optional><Suspense fallback={null}><Ghost /></Suspense></Optional>
      <Wall />
      <Embers />
    </group>
  );
}
