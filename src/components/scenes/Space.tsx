'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { live, useStore, visitorBus, type VisitorStar } from '@/lib/store';
import { projects } from '@/content/data';
import { blip } from '@/lib/audio';
import { rng, makeLabel } from './util';
import { cam, setupCam, flyTo } from './controls';

const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
const T = (f: string) => `/assets/tex/${f}.jpg`;
export const SKY = T('8k_stars_milky_way');

// Real planet maps (Solar System Scope, CC BY 4.0), one body per project, biggest projects get the gas giants.
// atmo = colour of the scattered light at the limb (physically: Rayleigh blue on Earth, dusty on Mars, hazy on Venus).
type Body = { tex: string; atmo?: string; haze?: number; tilt: number; bump?: number; earth?: boolean; ring?: boolean; spin: number };
const BODIES: Body[] = [
  { tex: '2k_jupiter', atmo: '#d9bf9a', haze: 0.35, tilt: 0.05, spin: 0.09 },
  { tex: '2k_earth_daymap', atmo: '#5c9dff', haze: 1, tilt: 0.41, earth: true, spin: 0.04 },
  { tex: '2k_saturn', atmo: '#e8d5a6', haze: 0.3, tilt: 0.47, ring: true, spin: 0.08 },
  { tex: '2k_neptune', atmo: '#5a86ff', haze: 0.7, tilt: 0.49, spin: 0.05 },
  { tex: '2k_mars', atmo: '#e3a27a', haze: 0.35, tilt: 0.44, bump: 2.5, spin: 0.04 },
  { tex: '2k_venus_atmosphere', atmo: '#f3ddaa', haze: 0.9, tilt: 0.05, spin: 0.01 },
  { tex: '2k_uranus', atmo: '#a6ecf2', haze: 0.6, tilt: 1.71, spin: 0.05 },
  { tex: '2k_mercury', tilt: 0.0, bump: 3, spin: 0.01 },
  { tex: '2k_moon', tilt: 0.12, bump: 3, spin: 0.02 },
  { tex: '2k_ceres_fictional', tilt: 0.07, bump: 3, spin: 0.03 },
  { tex: '2k_venus_surface', atmo: '#ffb070', haze: 0.4, tilt: 0.05, bump: 2, spin: 0.01 },
  { tex: '2k_makemake_fictional', tilt: 0.3, bump: 2, spin: 0.03 },
  { tex: '2k_eris_fictional', tilt: 0.2, bump: 2, spin: 0.03 },
];
const EARTH = ['2k_earth_nightmap', '2k_earth_clouds', '2k_earth_rough', '2k_earth_normal'].map(T);
const RING = '/assets/tex/2k_saturn_ring_alpha.png';
export const SPACE_TEXTURES = [...BODIES.map((b) => T(b.tex)), ...EARTH, RING, T('2k_sun'), SKY];

export const planetPos = projects.map((_, i) => {
  const a = i * 2.39996 + 0.6, d = 30 + i * 13;
  return new THREE.Vector3(Math.cos(a) * d, Math.sin(i * 1.7) * 6, Math.sin(a) * d);
});
export const planetSize = (i: number) => 1.6 + projects[i].weight * 3.4;

function Sky() {
  const map = useLoader(THREE.TextureLoader, SKY);
  map.colorSpace = THREE.SRGBColorSpace;
  return <mesh scale={[-1, 1, 1]} renderOrder={-1}><sphereGeometry args={[1400, 64, 32]} /><meshBasicMaterial map={map} side={THREE.BackSide} depthWrite={false} fog={false} color="#9aa6c8" /></mesh>;
}

function glowTexture(inner: string, outer: string) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!, g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner); g.addColorStop(0.25, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// The sun: limb-darkened photosphere (edges are cooler and dimmer, like the real one) inside a warm corona.
function Sun() {
  const map = useLoader(THREE.TextureLoader, T('2k_sun'));
  const ref = useRef<THREE.Mesh>(null);
  const glow = useMemo(() => glowTexture('rgba(255,244,225,1)', 'rgba(255,170,80,0.4)'), []);
  const corona = useMemo(() => glowTexture('rgba(255,200,140,0.5)', 'rgba(255,120,40,0.08)'), []);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform sampler2D uMap; uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        vec3 c = texture2D(uMap, vUv + vec2(uTime * 0.002, 0.0)).rgb;
        float limb = 1.0 - 0.6 * (1.0 - pow(mu, 0.55));
        vec3 col = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.93, 0.8), pow(mu, 0.8)) * (0.55 + c * 1.1) * limb * 1.5;
        gl_FragColor = vec4(col, 1.0); }`,
  }), [map]);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.02; mat.uniforms.uTime.value = live.time; });
  return (
    <group>
      <mesh ref={ref} material={mat}><sphereGeometry args={[9, 64, 64]} /></mesh>
      <sprite scale={42}><spriteMaterial map={glow} {...add} /></sprite>
      <sprite scale={130}><spriteMaterial map={corona} {...add} opacity={0.45} /></sprite>
      <pointLight intensity={3.2} decay={0} distance={0} color="#fff4e6" />
    </group>
  );
}

function Orbits() {
  const lines = useMemo(() => {
    const p: number[] = [];
    planetPos.forEach((v) => {
      const r = Math.hypot(v.x, v.z), N = 160;
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2, b = ((k + 1) / N) * Math.PI * 2;
        p.push(Math.cos(a) * r, v.y, Math.sin(a) * r, Math.cos(b) * r, v.y, Math.sin(b) * r);
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#4d7cff', ...add, opacity: 0.12 }));
  }, []);
  return <primitive object={lines} />;
}

// Asteroid belt between the inner and outer projects.
function Belt({ count = 1400 }) {
  const map = useLoader(THREE.TextureLoader, T('2k_moon'));
  const mesh = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 1), pos = geo.attributes.position, r0 = rng(2);
    for (let i = 0; i < pos.count; i++) { const s = 0.7 + r0() * 0.5; pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * s * 0.8, pos.getZ(i) * s); }
    geo.computeVertexNormals();
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ map, color: '#8a8580', roughness: 1, flatShading: true }), count);
    const r = rng(12), o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2, d = 98 + (r() - 0.5) * 18 + Math.sin(a * 7) * 3;
      o.position.set(Math.cos(a) * d, (r() - 0.5) * 3.5, Math.sin(a) * d);
      o.rotation.set(r() * 6, r() * 6, r() * 6); o.scale.setScalar(0.08 + Math.pow(r(), 3) * 0.9); o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    return m;
  }, [count, map]);
  useFrame((_, dt) => { mesh.rotation.y += dt * 0.004; });
  return <primitive object={mesh} />;
}

// Atmosphere: scattered sunlight at the limb, only on the day side, fading across the terminator.
const atmoVert = 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = normalize(mat3(modelMatrix) * normal); vec4 mv = viewMatrix * w; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
const atmoFrag = (inner: boolean) => `uniform vec3 uColor, uSun; uniform float uI; varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main(){ float d = dot(normalize(vN), normalize(vV));
    float f = ${inner ? 'pow(1.0 - clamp(d, 0.0, 1.0), 3.0)' : 'pow(smoothstep(0.0, -0.34, d), 2.5)'};
    float lit = smoothstep(-0.35, 0.45, dot(normalize(vW), uSun));
    float a = f * lit * uI;
    gl_FragColor = vec4(uColor * a, a); }`;

// Saturn's rings: the real ring texture mapped radially, with the planet's shadow falling across them.
function Rings({ size }: { size: number }) {
  const map = useLoader(THREE.TextureLoader, RING);
  const inner = size * 1.24, outer = size * 2.3;
  const { geo, mat } = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.RingGeometry(inner, outer, 160, 1), pos = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5); }
    const mat = new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false,
      uniforms: { uMap: { value: map }, uCenter: { value: new THREE.Vector3() }, uR: { value: size } },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform sampler2D uMap; uniform vec3 uCenter; uniform float uR; varying vec2 vUv; varying vec3 vW;
        void main(){ vec4 t = texture2D(uMap, vUv);
          vec3 d = normalize(-vW), oc = vW - uCenter; float b = dot(oc, d), c = dot(oc, oc) - uR * uR;
          float shadow = (b < 0.0 && b * b - c > 0.0) ? 0.06 : 1.0;
          gl_FragColor = vec4(t.rgb * shadow * 0.95, t.a * 0.95); }` });
    return { geo, mat };
  }, [map, inner, outer, size]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => { ref.current?.parent?.getWorldPosition(mat.uniforms.uCenter.value); });
  return <mesh ref={ref} geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} />;
}

// Earth: city lights on the night side, a cloud layer, shiny oceans.
function useEarth(mat: THREE.MeshStandardMaterial, on: boolean) {
  const [night, clouds, rough, normal] = useLoader(THREE.TextureLoader, EARTH);
  return useMemo(() => {
    if (!on) return null;
    night.colorSpace = THREE.SRGBColorSpace;
    Object.assign(mat, { emissiveMap: night, emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 1.6, roughnessMap: rough, roughness: 1, metalness: 0, normalMap: normal });
    mat.normalScale.set(0.6, 0.6);
    const uSun = { value: new THREE.Vector3() };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSunView = uSun;
      sh.fragmentShader = 'uniform vec3 uSunView;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance *= smoothstep(0.12, -0.18, dot(normal, normalize(uSunView + vViewPosition)));`);
    };
    mat.needsUpdate = true;
    return { uSun, clouds };
  }, [mat, on, night, clouds, rough, normal]);
}

function Planet({ i }: { i: number }) {
  const p = projects[i], pos = planetPos[i], size = planetSize(i), b = BODIES[i % BODIES.length];
  const map = useLoader(THREE.TextureLoader, T(b.tex));
  const sel = useStore((s) => s.project === p.id), seen = useStore((s) => s.charted.includes(p.id));
  const [hover, setHover] = useState(false);
  const body = useRef<THREE.Mesh>(null), cloud = useRef<THREE.Mesh>(null), moons = useRef<THREE.Group>(null);
  const moonMap = useLoader(THREE.TextureLoader, T('2k_moon'));
  const mat = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0, ...(b.bump ? { bumpMap: map, bumpScale: b.bump } : {}) });
  }, [map, b.bump]);
  const earth = useEarth(mat, !!b.earth);
  const sun = useMemo(() => pos.clone().negate().normalize(), [pos]);
  const atmo = useMemo(() => b.atmo ? [false, true].map((inner) => new THREE.ShaderMaterial({ ...add, side: inner ? THREE.FrontSide : THREE.BackSide,
    uniforms: { uColor: { value: new THREE.Color(b.atmo) }, uSun: { value: sun }, uI: { value: b.haze! * (inner ? 0.9 : 1.4) } }, vertexShader: atmoVert, fragmentShader: atmoFrag(inner) })) : null, [b, sun]);
  const label = useMemo(() => { const s = makeLabel(p.name, p.color, 52, true, 0.032); s.center.set(0.5, 0); s.position.set(0, size * (b.ring ? 1.6 : 1.25), 0); return s; }, [p, size, b.ring]);
  const moonLabels = useMemo(() => p.stack.map((t) => { const s = makeLabel(t, '#cfe8ff', 34, true); s.scale.multiplyScalar(0.9); return s; }), [p]);
  const moonMat = useMemo(() => new THREE.MeshStandardMaterial({ map: moonMap, bumpMap: moonMap, bumpScale: 2, roughness: 1 }), [moonMap]);
  const halo = useRef<THREE.Mesh>(null);
  useFrame(({ camera }, dt) => {
    if (body.current) body.current.rotation.y += dt * b.spin;
    if (cloud.current) cloud.current.rotation.y += dt * b.spin * 1.25;
    if (earth) earth.uSun.value.setFromMatrixPosition(camera.matrixWorldInverse);   // the sun sits at the origin
    // hover / selection: a thin white ring around the planet, not a coloured glow on it
    if (halo.current) { const m = halo.current.material as THREE.MeshBasicMaterial; m.opacity += ((hover ? 0.5 : sel ? 0.3 : 0) - m.opacity) * 0.15; halo.current.quaternion.copy(camera.quaternion); }
    moons.current?.children.forEach((m, k) => {
      const a = live.time * (0.25 + k * 0.08) + k * 2.1, d = size * (b.ring ? 2.6 : 1) + 2.2 + k * 1.3;
      m.position.set(Math.cos(a) * d, Math.sin(a * 0.7 + k) * 0.8, Math.sin(a) * d);
    });
  });
  useEffect(() => { document.body.style.cursor = hover ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [hover]);
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta > 6) return; useStore.getState().set({ project: p.id }); };
  return (
    <group position={pos}>
      <group rotation={[0, 0, b.tilt]}>
        <mesh ref={body} material={mat} onClick={click} onPointerOver={(e) => { e.stopPropagation(); setHover(true); }} onPointerOut={() => setHover(false)}>
          <sphereGeometry args={[size, 96, 64]} />
        </mesh>
        {earth && (
          <mesh ref={cloud} scale={1.012}><sphereGeometry args={[size, 96, 64]} />
            <meshStandardMaterial color="#ffffff" alphaMap={earth.clouds} transparent depthWrite={false} roughness={1} />
          </mesh>
        )}
        {atmo && <><mesh material={atmo[1]} scale={1.004}><sphereGeometry args={[size, 64, 48]} /></mesh>
          <mesh material={atmo[0]} scale={1.06}><sphereGeometry args={[size, 64, 48]} /></mesh></>}
        {b.ring && <Rings size={size} />}
      </group>
      <mesh ref={halo}><ringGeometry args={[size * 1.32, size * 1.36, 96]} /><meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} /></mesh>
      <primitive object={label} />
      {seen && <mesh position={[0, size * (b.ring ? 1.6 : 1.25) + 3.2, 0]}><octahedronGeometry args={[0.35, 0]} /><meshBasicMaterial color="#7cff6b" /></mesh>}
      <group ref={moons}>
        {p.stack.map((_, k) => (
          <group key={k}>
            <mesh material={moonMat}><sphereGeometry args={[0.32, 24, 24]} /></mesh>
            <primitive object={moonLabels[k]} position={[0, 0.85, 0]} />
          </group>
        ))}
      </group>
    </group>
  );
}

function VisitorStars() {
  const [stars, setStars] = useState<VisitorStar[]>([]);
  const glow = useMemo(() => glowTexture('rgba(255,252,230,1)', 'rgba(255,220,120,0.35)'), []);
  useEffect(() => {
    const sync = () => setStars([...visitorBus.stars]);
    visitorBus.listeners.add(sync);
    fetch('/api/stars').then((r) => r.ok ? r.json() : []).then((s: VisitorStar[]) => { visitorBus.stars = s; sync(); }).catch(() => {});
    return () => { visitorBus.listeners.delete(sync); };
  }, []);
  // stored coordinates span roughly ±75 × ±15 × 0…-90 — spread them through the system
  return (
    <group>
      {stars.map((s) => (
        <sprite key={s.id} position={[s.x * 2.4, s.y * 2 + 18, (s.z + 45) * 3.2]} scale={3.2}
          onPointerOver={(e) => { e.stopPropagation(); visitorBus.hover = s; visitorBus.emit(); }}
          onPointerOut={() => { visitorBus.hover = null; visitorBus.emit(); }}>
          <spriteMaterial map={glow} {...add} />
        </sprite>
      ))}
    </group>
  );
}

// Selecting a project (by clicking a planet or the list) flies you there and charts it.
function Navigator() {
  const project = useStore((s) => s.project);
  useEffect(() => {
    const i = projects.findIndex((p) => p.id === project);
    if (i < 0) return;
    const st = useStore.getState();
    if (!st.charted.includes(project!)) st.set({ charted: [...st.charted, project!] });
    blip(1.2);
    const target = planetPos[i].clone().add(new THREE.Vector3(planetSize(i) * 1.1, 0, 0));
    flyTo(target, planetSize(i) * 4.2 + 6);
  }, [project]);
  return null;
}

export function Space() {
  useEffect(() => { setupCam({ mode: 'fly', pos: [0, 48, 175], yaw: 0, pitch: -0.24, fov: 58, bounds: 520, speed: 55 }); }, []);
  useFrame(() => { if (cam.idle > 6 && !cam.dest && !useStore.getState().project) cam.yaw += 0.0004; });
  return (
    <group>
      <color attach="background" args={['#010105']} />
      <ambientLight intensity={0.025} color="#8090c0" />
      <Sky />
      <Sun />
      <Orbits />
      <Belt />
      {projects.map((_, i) => <Planet key={i} i={i} />)}
      <VisitorStars />
      <Navigator />
    </group>
  );
}
