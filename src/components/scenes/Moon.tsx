'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { live, useStore, toast } from '@/lib/store';
import { blip } from '@/lib/audio';
import ThreeGlobe from 'three-globe';
import { arcs, clocks, HOME, type RepoArc } from '@/content/globe';
import { rng, fontFamily, makeLabel } from './util';
import { setupCam } from './controls';
import { SKY } from './Space';

const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
const T = (f: string) => `/assets/tex/${f}.jpg`;
export const MOON_TEXTURES = [T('regolith_diff'), T('regolith_nor_gl'), SKY];
const LAND = '/assets/geo/land.json';
const EARTH_R = 72, LIGHT_DELAY = 1.28;   // seconds: Moon → Earth at the speed of light

const EARTH = new THREE.Vector3(-0.42, 0.46, -1).normalize().multiplyScalar(380);
const SUN_DIR = new THREE.Vector3(0.9, 0.18, 0.25).normalize();
const EARTH_YAW = Math.atan2(-EARTH.x, -EARTH.z);
// a spot on the ground at `yaw` (radians, 0 = -z), `d` metres from where you stand
const spot = (yaw: number, d: number) => { const x = -Math.sin(yaw) * d, z = -Math.cos(yaw) * d; return new THREE.Vector3(x, height(x, z), z); };

// Terrain: gentle rolling regolith plus a field of craters (bowl + raised rim).
const craters = (() => {
  const r = rng(42), list: [number, number, number][] = [];
  for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 520, z = (r() - 0.5) * 520; if (Math.hypot(x, z) > 14) list.push([x, z, 3 + Math.pow(r(), 2.5) * 40]); }
  list.push([22, -38, 16], [-30, -26, 9]);
  return list;
})();
export function height(x: number, z: number) {
  let h = Math.sin(x * 0.02) * Math.cos(z * 0.017) * 2.2 + Math.sin(x * 0.07 + z * 0.05) * 0.5;
  for (const [cx, cz, cr] of craters) {
    const d = Math.hypot(x - cx, z - cz) / cr;
    if (d < 1.6) h += (d < 1 ? (d * d - 1) * cr * 0.22 : 0) + Math.exp(-Math.pow((d - 1) * 4, 2)) * cr * 0.09;
  }
  return h;
}

function Ground() {
  const [diff, nor] = useLoader(THREE.TextureLoader, [T('regolith_diff'), T('regolith_nor_gl')]);
  const { geo, mat } = useMemo(() => {
    [diff, nor].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); t.anisotropy = 8; });
    diff.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(600, 600, 300, 300); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: diff, normalMap: nor, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 1, metalness: 0 });
    // the rock photo is brown — the Moon is grey
    mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = vec3(lum) * vec3(1.02, 1.0, 0.98) * 1.25;`);
    };
    return { geo, mat };
  }, [diff, nor]);
  return <mesh geometry={geo} material={mat} />;
}

/* Earth as GitHub draws it on their homepage: a dark globe, land as dots, glowing arcs between places.
   Built with three-globe (MIT, vasturiano). Hover an arc or its end points to see the repo. */
const PINK = '#ff4fd8', VIOLET = '#8b5cff', CYAN = '#3ee8ff';
const arcSignal = { pulse: -1 };   // seconds since the last transmission arrived on Earth; -1 = none

function Earth() {
  const [land, setLand] = useState<object[] | null>(null);
  useEffect(() => { fetch(LAND).then((r) => r.json()).then((g: { features: object[] }) => setLand(g.features)).catch(() => setLand([])); }, []);
  const spin = useRef<THREE.Group>(null);
  const globe = useMemo(() => {
    const g = new ThreeGlobe({ animateIn: false })
      .showAtmosphere(true).atmosphereColor('#3a7bff').atmosphereAltitude(0.22)
      .globeMaterial(new THREE.MeshPhongMaterial({ color: '#0d1b4a', emissive: '#060d2a', shininess: 6 }))
      .hexPolygonUseDots(true).hexPolygonResolution(3).hexPolygonMargin(0.55).hexPolygonAltitude(0.004)
      .hexPolygonColor(() => 'rgba(150, 190, 255, 0.85)')
      .arcsData(arcs).arcStartLat((d: object) => (d as RepoArc).from.lat).arcStartLng((d: object) => (d as RepoArc).from.lng)
      .arcEndLat((d: object) => (d as RepoArc).to.lat).arcEndLng((d: object) => (d as RepoArc).to.lng)
      .arcColor((d: object) => (d as RepoArc).mine ? [CYAN, PINK] : [VIOLET, PINK]).arcStroke(1.1).arcAltitudeAutoScale(0.42)
      .arcDashLength(0.45).arcDashGap(0.25).arcDashInitialGap(() => Math.random()).arcDashAnimateTime(2600)
      .pointsData(arcs.flatMap((a) => [{ ...a.from, arc: a }, { ...a.to, arc: a }])).pointColor(() => '#ffffff').pointAltitude(0.012).pointRadius(0.8)
      .ringsData([]).ringColor(() => (t: number) => `rgba(62, 232, 255, ${1 - t})`).ringMaxRadius(9).ringPropagationSpeed(5).ringRepeatPeriod(500);
    g.scale.setScalar(EARTH_R / 100);
    return g;
  }, []);
  useEffect(() => { if (land) globe.hexPolygonsData(land); }, [land, globe]);
  useEffect(() => () => { (globe as unknown as { _destructor?: () => void })._destructor?.(); }, [globe]);

  // Face Europe → Middle East at you (Duisburg and Tehran both in view), with a slow back-and-forth drift.
  const face = useMemo(() => {
    const q = new THREE.Quaternion(), toCam = EARTH.clone().negate().normalize();
    const c = globe.getCoords(42, 22, 0) as { x: number; y: number; z: number };
    q.setFromUnitVectors(new THREE.Vector3(c.x, c.y, c.z).normalize(), toCam);
    return q;
  }, [globe]);

  // Live local clocks on the cities.
  const clockLabels = useMemo(() => clocks.map((c) => ({ c, sprite: null as THREE.Sprite | null })), []);
  const clockGroup = useRef<THREE.Group>(null);
  useEffect(() => {
    const draw = () => {
      const grp = clockGroup.current; if (!grp) return;
      grp.clear();
      clockLabels.forEach((l) => {
        const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: l.c.tz }).format(new Date());
        const s = makeLabel(`${l.c.name} ${time}`, l.c.name === HOME.name ? CYAN : '#9fb8ff', 40, true, 0.026);
        const p = globe.getCoords(l.c.lat, l.c.lng, 0.04) as { x: number; y: number; z: number };
        s.position.set(p.x, p.y, p.z).multiplyScalar(EARTH_R / 100); s.center.set(0, 0);
        grp.add(s); l.sprite = s;
      });
    };
    draw(); const id = setInterval(draw, 20_000);
    return () => clearInterval(id);
  }, [globe, clockLabels]);

  useFrame((_, dt) => {
    if (spin.current) spin.current.quaternion.copy(face).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(live.time * 0.05) * 0.25));
    if (arcSignal.pulse >= 0) {
      if (arcSignal.pulse === 0) globe.ringsData([{ lat: HOME.lat, lng: HOME.lng }]);
      arcSignal.pulse += dt;
      if (arcSignal.pulse > 2.5) { globe.ringsData([]); arcSignal.pulse = -1; }
    }
  });

  const hover = (e: ThreeEvent<PointerEvent>) => {
    let o: THREE.Object3D | null = e.object, d: { arc?: RepoArc; repo?: string } | undefined;
    while (o && !d) { d = (o as unknown as { __data?: { arc?: RepoArc; repo?: string } }).__data; o = o.parent; }
    const repo = d?.repo ?? d?.arc?.repo ?? null;
    if (useStore.getState().repo !== repo && repo) { e.stopPropagation(); useStore.getState().set({ repo }); document.body.style.cursor = 'pointer'; }
  };
  return (
    <group position={EARTH}>
      <group ref={spin}>
        <primitive object={globe} onPointerMove={hover} onPointerOut={() => { document.body.style.cursor = ''; }}
          onClick={(e: ThreeEvent<MouseEvent>) => { const r = useStore.getState().repo; if (r && e.delta < 6) window.open(`https://github.com/${r}`, '_blank', 'noopener'); }} />
        <group ref={clockGroup} />
      </group>
    </group>
  );
}

function Sky() {
  const map = useLoader(THREE.TextureLoader, SKY);
  map.colorSpace = THREE.SRGBColorSpace;
  return <mesh scale={[-1, 1, 1]} rotation={[0.6, 1.2, 0]}><sphereGeometry args={[1400, 64, 32]} /><meshBasicMaterial map={map} side={THREE.BackSide} depthWrite={false} color="#8890a8" /></mesh>;
}

/* The antenna follows your cursor. Hold it on Earth to lock the uplink. */
function Dish() {
  const { camera } = useThree();
  const head = useRef<THREE.Group>(null), beam = useRef<THREE.Mesh>(null);
  const ray = useMemo(() => new THREE.Raycaster(), []), dir = useMemo(() => new THREE.Vector3(), []), earthDir = useMemo(() => new THREE.Vector3(), []);
  const hold = useRef(0);
  const base = useMemo(() => spot(EARTH_YAW + 0.3, 12), []);
  const dishGeo = useMemo(() => {
    const pts = Array.from({ length: 16 }, (_, k) => { const r = (k / 15) * 1.6; return new THREE.Vector2(r, r * r * 0.22); });
    return new THREE.LatheGeometry(pts, 48).rotateX(Math.PI / 2);
  }, []);
  // The beam is light: its head crawls to Earth in 1.28 s, the real Moon → Earth delay.
  const beamMat = useMemo(() => new THREE.ShaderMaterial({ ...add, uniforms: { uTime: { value: 0 }, uI: { value: 0 }, uHead: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uTime, uI, uHead; varying vec2 vUv; void main(){
      float s = step(0.6, fract(vUv.y * 60.0 - uTime * 6.0));
      float lit = step(vUv.y, uHead), head = smoothstep(0.04, 0.0, abs(vUv.y - uHead)) * step(uHead, 0.999);
      float a = uI * (lit * (0.3 + s * 0.5) + head * 3.0);
      gl_FragColor = vec4(mix(vec3(0.3, 0.9, 1.0), vec3(1.0), head) * a, a); }` }), []);
  const transit = useRef(-1), lastBeam = useRef(0);
  useFrame((_, dt) => {
    const st = useStore.getState();
    ray.setFromCamera(new THREE.Vector2(live.pointer.x, live.pointer.y), camera);
    const target = camera.position.clone().addScaledVector(ray.ray.direction, 400);
    const pivot = base.clone().add(new THREE.Vector3(0, 2.2, 0));
    dir.subVectors(target, pivot).normalize();
    if (head.current) {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
      head.current.quaternion.slerp(q, 1 - Math.pow(0.05, dt));
    }
    const facing = new THREE.Vector3(0, 0, -1).applyQuaternion(head.current?.quaternion ?? new THREE.Quaternion());
    earthDir.subVectors(EARTH, pivot).normalize();
    live.signal = THREE.MathUtils.clamp((facing.dot(earthDir) - 0.9) / 0.098, 0, 1);
    if (!st.locked) {
      hold.current = live.signal > 0.93 ? hold.current + dt : 0;
      if (hold.current > 1) { st.set({ locked: true }); blip(1.6); live.beam = 1; toast('UPLINK LOCKED', 'Earth acquired. Test ping on its way: light takes 1.28 s to get there.', '#00f0ff'); }
    }
    if (live.beam > lastBeam.current + 0.5) transit.current = 0;     // a new transmission left the dish
    if (transit.current >= 0) {
      transit.current += dt;
      if (transit.current >= LIGHT_DELAY) {
        transit.current = -1; arcSignal.pulse = 0; blip(2);
        toast('SIGNAL REACHED EARTH', `Received in ${HOME.name} after ${LIGHT_DELAY} s (384,400 km at the speed of light).`, '#3ee8ff');
      }
    }
    live.beam = Math.max(0, live.beam - dt * 0.12); lastBeam.current = live.beam;
    beamMat.uniforms.uHead.value = transit.current >= 0 ? transit.current / LIGHT_DELAY : 1;
    beamMat.uniforms.uTime.value = live.time; beamMat.uniforms.uI.value = live.beam;
    if (beam.current) {
      const len = EARTH.distanceTo(pivot);
      beam.current.position.copy(pivot).lerp(EARTH, 0.5); beam.current.scale.set(1, len, 1);
      beam.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), earthDir);
    }
  });
  return (
    <>
      <group position={base}>
        {[0, 2.1, 4.2].map((a) => <mesh key={a} position={[Math.sin(a) * 0.5, 0.55, Math.cos(a) * 0.5]} rotation={[Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4]}><cylinderGeometry args={[0.04, 0.05, 1.3]} /><meshStandardMaterial color="#8d939c" metalness={0.8} roughness={0.35} /></mesh>)}
        <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.07, 0.09, 1.6]} /><meshStandardMaterial color="#b9c0c9" metalness={0.8} roughness={0.3} /></mesh>
        <group ref={head} position={[0, 2.2, 0]}>
          <mesh geometry={dishGeo}><meshStandardMaterial color="#e9edf2" metalness={0.55} roughness={0.25} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 0, -0.75]}><cylinderGeometry args={[0.03, 0.03, 1.5]} /><meshStandardMaterial color="#555" /></mesh>
          <mesh position={[0, 0, -1.45]}><sphereGeometry args={[0.1, 12, 12]} /><meshBasicMaterial color="#00f0ff" /></mesh>
        </group>
      </group>
      <mesh ref={beam} material={beamMat}><cylinderGeometry args={[0.06, 0.45, 1, 12, 1, true]} /></mesh>
    </>
  );
}

function Flag() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 160;
    const x = c.getContext('2d')!; x.fillStyle = '#ff2bd6'; x.fillRect(0, 0, 256, 160);
    x.fillStyle = '#fff'; x.font = `700 64px ${fontFamily()}`; x.textAlign = 'center'; x.fillText('⏏ HAM', 128, 100);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  const at = useMemo(() => spot(EARTH_YAW - 0.05, 10), []);
  return (
    <group position={at}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.025, 0.025, 2]} /><meshStandardMaterial color="#ccc" metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0.5, 1.7, 0]}><planeGeometry args={[1, 0.62]} /><meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.8} /></mesh>
    </group>
  );
}

export function Moon() {
  useEffect(() => {
    // start facing Earth
    const y = height(0, 0) + 1.7, d = EARTH.clone().sub(new THREE.Vector3(0, y, 0)).normalize();
    setupCam({ mode: 'look', pos: [0, y, 0], yaw: Math.atan2(-d.x, -d.z) - 0.12, pitch: Math.asin(d.y) - 0.2, fov: 60, fovMin: 22, fovMax: 75, pitchMin: -0.7, pitchMax: 1.1 });
  }, []);
  return (
    <group>
      <color attach="background" args={['#000002']} />
      <directionalLight position={SUN_DIR.clone().multiplyScalar(100)} intensity={3.2} color="#fff6ea" />
      <ambientLight intensity={0.05} color="#9fb4ff" />
      <hemisphereLight args={['#8fa8ff', '#000000', 0.08]} />
      <Sky />
      <Earth />
      <Ground />
      <Flag />
      <Dish />
    </group>
  );
}
