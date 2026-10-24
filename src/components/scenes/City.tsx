'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { live, useStore, toast } from '@/lib/store';
import { profile } from '@/content/data';
import { buzz } from '@/lib/audio';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scannables, type Scannable } from '@/content/scan';
import { rng, NOISE_GLSL, fontFamily, meshopt } from './util';
import { cam, setupCam } from './controls';

const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
export const PANO = '/assets/pano/city-6k.jpg';
export const PROPS = [...new Set(scannables.filter((s) => s.model).map((s) => `/assets/models/props/${s.model}.glb`))];

/* The skyline: a real 360° night photo (Shanghai Bund, Poly Haven, CC0), graded to neon and brought to life in the shader:
   window lights twinkle, smog drifts, lightning hits the sky and the plaza turns into a wet, rippling mirror. */
const panoFrag = /* glsl */ `${NOISE_GLSL}
uniform sampler2D uMap; uniform float uTime, uFlash, uPower;
varying vec2 vUv; varying vec3 vDir;
vec3 grade(vec3 c){
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = pow(c, vec3(1.35)) * 1.1;
  c = mix(c * vec3(0.45, 0.62, 1.0), c, smoothstep(0.3, 0.75, l));               // cold shadows
  vec3 neon = mix(vec3(1.0, 0.18, 0.7), vec3(0.05, 0.9, 1.0), step(0.5, vnoise(vec3(floor(vUv * vec2(40.0, 10.0)), 3.0))));
  float hi = smoothstep(0.4, 0.95, l);
  c = mix(c, c * 0.5 + neon * l * (1.25 + uPower * 0.5), hi * (0.45 + uPower * 0.2));  // lights → neon
  return c;
}
void main(){
  vec3 d = normalize(vDir);
  vec2 uv = vUv;
  vec3 c;
  if (d.y < -0.015) {
    // wet ground: mirror the skyline with rain ripples
    float r = vnoise(vec3(uv * vec2(900.0, 500.0), uTime * 2.5)) - 0.5;
    vec2 m = vec2(uv.x + r * 0.004, 1.0 - uv.y + r * 0.01);
    vec3 refl = grade(texture2D(uMap, m).rgb);
    vec3 ground = grade(texture2D(uMap, uv).rgb) * 0.45;
    float wet = smoothstep(-0.015, -0.25, d.y) * 0.55 + 0.25;
    c = mix(ground, refl * 0.85, wet * (0.6 + 0.4 * vnoise(vec3(uv * 40.0, 1.0))));
  } else {
    c = grade(texture2D(uMap, uv).rgb);
    float l = dot(c, vec3(0.333));
    c *= 1.0 + smoothstep(0.25, 0.7, l) * (vnoise(vec3(uv * vec2(700.0, 350.0), uTime * 2.0)) - 0.5) * 0.9;  // windows flicker
  }
  // smog bands lit from below
  float sky = smoothstep(0.02, 0.35, d.y);
  float smog = fbm(vec3(uv.x * 9.0 + uTime * 0.012, d.y * 6.0, uTime * 0.03));
  c = c * (1.0 - sky * 0.78) + vec3(0.3, 0.04, 0.26) * smog * smog * sky * (0.22 + uPower * 0.15);
  c += vec3(0.05, 0.25, 0.35) * smoothstep(0.08, 0.0, abs(d.y - 0.02)) * 0.15;   // haze on the horizon
  c += vec3(0.75, 0.8, 1.0) * uFlash * sky * (0.6 + smog);                          // lightning
  gl_FragColor = vec4(c, 1.0);
}`;

function Panorama() {
  const map = useLoader(THREE.TextureLoader, PANO);
  const power = useStore((s) => s.signs.length === profile.billboards.length);
  const mat = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    return new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uTime: { value: 0 }, uFlash: { value: 0 }, uPower: { value: 0 } }, side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec2 vUv; varying vec3 vDir; void main(){ vUv = vec2(1.0 - uv.x, uv.y); vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: panoFrag,
    });
  }, [map]);
  const bolt = useRef({ next: 6, t: 0 });
  useFrame((_, dt) => {
    mat.uniforms.uTime.value = live.time;
    mat.uniforms.uPower.value += ((power ? 1 : 0) - mat.uniforms.uPower.value) * 0.03;
    // lightning: a double flicker every 8–20s
    const b = bolt.current; b.next -= dt;
    if (b.next < 0) { b.t = 0.6; b.next = 8 + Math.random() * 12; }
    b.t = Math.max(0, b.t - dt);
    const f = b.t > 0 ? (Math.sin(b.t * 40) > 0.2 ? 1 : 0.2) * (b.t / 0.6) : 0;
    mat.uniforms.uFlash.value = useStore.getState().reducedMotion ? f * 0.3 : f;
    live.flash = f * 0.15;
  });
  return <mesh material={mat} renderOrder={-1}><sphereGeometry args={[500, 96, 64]} /></mesh>;
}

function Rain({ count = 5000 }) {
  const lines = useMemo(() => {
    const r = rng(3), p = new Float32Array(count * 6), s = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = (r() - 0.5) * 60, y = r() * 40, z = (r() - 0.5) * 60, sp = 0.7 + r() * 0.6;
      p.set([x, y, z, x - 0.03, y - 0.55, z], i * 6); s.set([sp, sp], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aSpeed', new THREE.BufferAttribute(s, 1));
    return new THREE.LineSegments(g, new THREE.ShaderMaterial({ ...add, uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() } },
      vertexShader: `uniform float uTime; uniform vec3 uCam; attribute float aSpeed; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y - uTime * 26.0 * aSpeed, 40.0) - 14.0; p.x += p.y * 0.04;
          p.xz = mod(p.xz - uCam.xz + 30.0, 60.0) - 30.0 + uCam.xz;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); vA = smoothstep(45.0, 3.0, -mv.z) * 0.16; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(0.7, 0.85, 1.0, vA); }' }));
  }, [count]);
  useFrame(({ camera }) => {
    const m = lines.material as THREE.ShaderMaterial; m.uniforms.uTime.value = live.time; m.uniforms.uCam.value.copy(camera.position);
  });
  return <primitive object={lines} />;
}

// Flying cars: light pairs on circular sky-lanes around you.
function Traffic({ count = 260 }) {
  const pts = useMemo(() => {
    const r = rng(21), p = new Float32Array(count * 3), a = new Float32Array(count * 4), c = new Float32Array(count * 3);
    const cols = [new THREE.Color('#ff3355'), new THREE.Color('#fff4e0'), new THREE.Color('#00e5ff'), new THREE.Color('#ff2bd6')];
    for (let i = 0; i < count; i++) {
      const lane = Math.floor(r() * 6);
      a.set([r() * Math.PI * 2, 120 + lane * 35, (r() < 0.5 ? -1 : 1) * (0.02 + r() * 0.03), 12 + lane * 7 + r() * 3], i * 4);
      const col = cols[Math.floor(r() * cols.length)]; c.set([col.r, col.g, col.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aLane', new THREE.BufferAttribute(a, 4)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return new THREE.Points(g, new THREE.ShaderMaterial({ ...add, vertexColors: true, uniforms: { uTime: { value: 0 } },
      vertexShader: `uniform float uTime; attribute vec4 aLane; varying vec3 vC;
        void main(){ float a = aLane.x + uTime * aLane.z; vec3 p = vec3(cos(a) * aLane.y, aLane.w + sin(uTime * 0.5 + aLane.x * 9.0) * 0.6, sin(a) * aLane.y);
          vC = color; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = 900.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: 'varying vec3 vC; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q * vec2(1.0, 3.0)); gl_FragColor = vec4(vC, smoothstep(0.5, 0.0, d)); }' }));
  }, [count]);
  useFrame(() => { (pts.material as THREE.ShaderMaterial).uniforms.uTime.value = live.time; });
  return <primitive object={pts} />;
}

// Searchlights sweeping the clouds.
function Searchlights() {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.ShaderMaterial({ ...add, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec2 vUv; void main(){ float e = 1.0 - abs(vUv.x - 0.5) * 2.0; gl_FragColor = vec4(0.6, 0.85, 1.0, pow(e, 3.0) * (1.0 - vUv.y) * 0.08); }' }), []);
  const beams = [[-160, -60, 0.3], [140, -200, 1.4], [40, 230, 2.6]];
  useFrame(() => group.current?.children.forEach((b, i) => { b.rotation.z = Math.sin(live.time * 0.25 + i * 2) * 0.5; b.rotation.x = -0.2 + Math.cos(live.time * 0.2 + i) * 0.1; }));
  return (
    <group ref={group}>
      {beams.map(([x, z, r], i) => (
        <group key={i} position={[x, -10, z]} rotation={[0, r, 0]}>
          <mesh material={mat} position={[0, 160, 0]}><planeGeometry args={[30, 320, 1, 1]} /></mesh>
        </group>
      ))}
    </group>
  );
}

/* Neon signs: dead until you click them. Each one holds a piece of the "about me". */
function signTexture(text: string, color: string) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d')!;
  x.strokeStyle = color; x.lineWidth = 10; x.shadowColor = color; x.shadowBlur = 24;
  x.strokeRect(24, 24, 464, 208); x.strokeRect(40, 40, 432, 176);
  x.font = `700 118px ${fontFamily()}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color;
  x.fillText(text, 256, 136);
  x.shadowBlur = 0; x.fillStyle = '#ffffff'; x.globalAlpha = 0.7; x.fillText(text, 256, 136);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SIGN_COLORS = ['#ff2bd6', '#00f0ff', '#f8e602', '#7cff6b'];
let glow: THREE.Texture | null = null;
function glowTexture() {
  if (glow) return glow;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return (glow = new THREE.CanvasTexture(c));
}
export const SIGN_YAW = [-1.85, -0.35, 0.95, 2.45];

function Sign({ i, title }: { i: number; title: string }) {
  const lit = useStore((s) => s.signs.includes(title));
  const [hover, setHover] = useState(false);
  const color = SIGN_COLORS[i % SIGN_COLORS.length];
  const mat = useMemo(() => new THREE.ShaderMaterial({ ...add, uniforms: { uMap: { value: signTexture(title, color) }, uOn: { value: 0 }, uHover: { value: 0 }, uTime: { value: 0 }, uSeed: { value: i * 7.3 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D uMap; uniform float uOn, uHover, uTime, uSeed; varying vec2 vUv;
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main(){ vec4 t = texture2D(uMap, vUv);
        float fl = step(0.08, h(floor(uTime * 14.0) + uSeed)) * (0.85 + 0.15 * sin(uTime * 120.0));
        float dead = 0.22 + 0.12 * sin(uTime * 2.0 + uSeed) + uHover * 0.45 * step(0.5, h(floor(uTime * 18.0) + uSeed));
        float b = mix(dead, 1.6 * fl, uOn);
        gl_FragColor = vec4(mix(vec3(0.6), t.rgb, 0.4 + uOn * 0.6) * b, t.a * b); }` }), [title, color, i]);
  const halo = useRef<THREE.Mesh>(null);
  useFrame(() => {
    mat.uniforms.uTime.value = live.time;
    mat.uniforms.uOn.value += ((lit ? 1 : 0) - mat.uniforms.uOn.value) * 0.08;
    mat.uniforms.uHover.value += ((hover ? 1 : 0) - mat.uniforms.uHover.value) * 0.2;
    if (halo.current) (halo.current.material as THREE.MeshBasicMaterial).opacity = mat.uniforms.uOn.value * 0.35 + mat.uniforms.uHover.value * 0.1;
  });
  useEffect(() => { document.body.style.cursor = hover ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [hover]);
  const yaw = SIGN_YAW[i % SIGN_YAW.length], d = 48;
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); if (e.delta > 6) return;
    const st = useStore.getState();
    buzz();
    if (!lit) {
      const signs = [...st.signs, title];
      st.set({ signs, sign: title });
      if (signs.length === profile.billboards.length) toast('DISTRICT POWERED UP', 'All signs are on. The city remembers you. Dive when ready ▶', '#7cff6b');
    } else st.set({ sign: title });
  };
  return (
    <group position={[-Math.sin(yaw) * d, 9 + (i % 2) * 6, -Math.cos(yaw) * d]} rotation={[0, yaw, 0]}>
      <mesh ref={halo}><planeGeometry args={[30, 18]} /><meshBasicMaterial color={color} map={glowTexture()} {...add} opacity={0} /></mesh>
      {/* the sign's dark housing, so a dead sign still reads as an object against the sky */}
      <mesh position={[0, 0, -0.1]}><planeGeometry args={[14.8, 7.8]} /><meshBasicMaterial color="#07060c" transparent opacity={0.88} depthWrite={false} /></mesh>
      <mesh material={mat} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); setHover(true); }} onPointerOut={() => setHover(false)}>
        <planeGeometry args={[14, 7]} />
      </mesh>
      {/* the frame it hangs from */}
      <mesh position={[0, -6, -0.2]}><boxGeometry args={[0.25, 6, 0.25]} /><meshBasicMaterial color="#05060a" /></mesh>
    </group>
  );
}

/* ── Kiroshi scanner: hold right-click / Space. Props are real CC0 models, the towers are the real ones in the photo. ── */
const SCAN = new THREE.Color('#ff6a1a');

function scanHandlers(id: string) {
  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const st = useStore.getState();
    if (!st.scanning) return;
    e.stopPropagation();
    if (st.scan !== id) { buzz(); st.set({ scan: id, scanned: st.scanned.includes(id) ? st.scanned : [...st.scanned, id] }); }
  };
  return { onPointerMove: pick, onClick: pick };
}

function Prop({ s }: { s: Scannable }) {
  const gltf = useLoader(GLTFLoader, `/assets/models/props/${s.model}.glb`, meshopt);
  const obj = useMemo(() => {
    const o = gltf.scene.clone(true);
    o.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (mesh.isMesh) { const m = (mesh.material as THREE.MeshStandardMaterial).clone(); m.emissiveIntensity = 0; mesh.material = m; }
    });
    return o;
  }, [gltf]);
  const mats = useMemo(() => { const a: THREE.MeshStandardMaterial[] = []; obj.traverse((m) => { if ((m as THREE.Mesh).isMesh) a.push((m as THREE.Mesh).material as THREE.MeshStandardMaterial); }); return a; }, [obj]);
  const group = useRef<THREE.Group>(null);
  const [yaw, d] = s.at!;
  const home = useMemo(() => new THREE.Vector3(-Math.sin(yaw) * d, s.y ?? 0, -Math.cos(yaw) * d), [yaw, d, s.y]);
  useFrame(() => {
    const st = useStore.getState(), g = group.current;
    const k = st.scanning ? (st.scan === s.id ? 0.9 : 0.25 + 0.15 * Math.sin(live.time * 6)) : 0;
    for (const m of mats) {
      m.emissiveIntensity += (k - m.emissiveIntensity) * 0.2;
      if (m.emissiveIntensity < 0.01) m.emissive.setRGB(0, 0, 0); else m.emissive.copy(SCAN);
    }
    // the rat scurries along the kerb and stops to sniff
    if (s.id === 'rat' && g) {
      const t = live.time * 0.35, run = Math.sin(t) + Math.sin(t * 2.7) * 0.3;
      g.position.copy(home).add(new THREE.Vector3(run * 1.1, 0, Math.cos(t * 1.3) * 0.25));
      g.rotation.y = Math.cos(t) + Math.cos(t * 2.7) * 0.81 > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  });
  return (
    <group ref={group} position={home} rotation={[0, s.rot ?? 0, 0]} scale={s.scale ?? 1} {...scanHandlers(s.id)}>
      <primitive object={obj} />
    </group>
  );
}

// Invisible hit zone over a tower in the panorama, with a bracket that lights up while scanning.
function Tower({ s }: { s: Scannable }) {
  const R = 300, yaw = Math.PI / 2 - s.t! * Math.PI * 2, top = THREE.MathUtils.degToRad(s.top!), w = THREE.MathUtils.degToRad(s.w!);
  const h = R * Math.tan(top), width = R * w;
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, h)), [width, h]);
  const line = useRef<THREE.LineSegments>(null);
  useFrame(() => {
    const st = useStore.getState(), m = line.current?.material as THREE.LineBasicMaterial | undefined;
    if (m) m.opacity += ((st.scanning ? (st.scan === s.id ? 1 : 0.35) : 0) - m.opacity) * 0.2;
  });
  return (
    <group position={[-Math.sin(yaw) * R, h / 2 - 1.6, -Math.cos(yaw) * R]} rotation={[0, yaw, 0]}>
      <mesh {...scanHandlers(s.id)}><planeGeometry args={[width, h]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
      <lineSegments ref={line} geometry={edges}><lineBasicMaterial color={SCAN} transparent opacity={0} depthWrite={false} fog={false} /></lineSegments>
    </group>
  );
}

// A wet street patch so the props stand on something; it fades into the panorama's own ground.
function Street() {
  const alpha = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d')!, g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#bbb'); g.addColorStop(1, '#000');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} renderOrder={0}>
      <circleGeometry args={[16, 64]} />
      <meshStandardMaterial color="#07070c" roughness={0.18} metalness={0.7} alphaMap={alpha} transparent depthWrite={false} />
    </mesh>
  );
}

// Light the props with the skyline itself, plus some neon spill.
function CityLight() {
  const { scene } = useThree();
  const map = useLoader(THREE.TextureLoader, PANO);
  useEffect(() => {
    const t = map.clone(); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
    scene.environment = t; scene.environmentIntensity = 0.55;
    return () => { scene.environment = null; t.dispose(); };
  }, [map, scene]);
  return (
    <>
      <hemisphereLight args={['#3a4cff', '#14060f', 0.35]} />
      <pointLight position={[3, 3.5, -2]} color="#ff2bd6" intensity={22} distance={14} />
      <pointLight position={[2, 3, 4]} color="#00e5ff" intensity={18} distance={14} />
      <pointLight position={[2.1, 3.7, -5.5]} color="#ffd9a0" intensity={14} distance={9} />
    </>
  );
}

function ScanInput() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement, set = (v: boolean) => useStore.getState().set({ scanning: v });
    const menu = (e: Event) => e.preventDefault();
    const down = (e: PointerEvent) => { if (e.button === 2) set(true); };
    const up = (e: PointerEvent) => { if (e.button === 2) set(false); };
    el.addEventListener('contextmenu', menu); el.addEventListener('pointerdown', down); window.addEventListener('pointerup', up);
    return () => { el.removeEventListener('contextmenu', menu); el.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); set(false); };
  }, [gl]);
  // scanning narrows the view a touch, like the optics zooming in
  useFrame(() => { const sc = useStore.getState().scanning; cam.fovMax = sc ? 52 : 80; if (sc && cam.fovTarget > 52) cam.fovTarget = 52; else if (!sc && cam.fovTarget === 52) cam.fovTarget = 62; });
  return null;
}

export function City() {
  const { camera } = useThree();
  useEffect(() => { setupCam({ mode: 'look', pos: [0, 1.6, 0], yaw: -1.3, pitch: 0.05, fov: 62, fovMin: 28, fovMax: 80, pitchMin: -0.9, pitchMax: 0.9, autoYaw: -0.03 }); }, [camera]);
  useFrame(() => { if (cam.idle > 3 && useStore.getState().reducedMotion) cam.autoYaw = 0; });
  return (
    <group>
      <color attach="background" args={['#04030a']} />
      <Panorama />
      <Searchlights />
      <Traffic />
      <Rain />
      {profile.billboards.map((b, i) => <Sign key={b.title} i={i} title={b.title} />)}
      <CityLight />
      <Street />
      {scannables.map((sc) => sc.model ? <Prop key={sc.id} s={sc} /> : <Tower key={sc.id} s={sc} />)}
      <ScanInput />
    </group>
  );
}
