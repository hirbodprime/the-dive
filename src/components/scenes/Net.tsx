'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { live, useStore, toast } from '@/lib/store';
import { skills, experience } from '@/content/data';
import { blip } from '@/lib/audio';
import { rng, makeLabel, fontFamily, meshopt } from './util';
import { cam, setupCam, flyTo } from './controls';

const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;

export const TREE = '/assets/models/tree.glb';
const TREE_SCALE = 26, FLOOR = -10;

/* Skill clusters sit in a ring around the tree of life; work experience hangs from its branches. */
export const groupCenters = skills.map((_, gi) => {
  const a = (gi / skills.length) * Math.PI * 2 + 0.4;
  return new THREE.Vector3(Math.sin(a) * 92, 6 + (gi % 2) * 12, Math.cos(a) * 92);
});
export const skillNodes = skills.flatMap((g, gi) => {
  const r = rng(gi + 11), c = groupCenters[gi];
  return g.items.map((s, k) => {
    const a = (k / g.items.length) * Math.PI * 2 + r();
    return { ...s, id: `${g.group}:${s.name}`, group: g.group, color: g.color, pos: c.clone().add(new THREE.Vector3(Math.cos(a) * 6, (r() - 0.5) * 6, Math.sin(a) * 6)) };
  });
});
// Filled in from the tree's real branch geometry once it loads (see Tree): where each log hangs, and the branch it hangs from.
export const logPos = experience.map((_, i) => { const a = i * 0.9 + 0.3; return new THREE.Vector3(Math.sin(a) * 20, 24, Math.cos(a) * 20); });
const logAnchor = logPos.map((p) => p.clone().setY(40));

const gridFrag = /* glsl */ `uniform float uTime; varying vec3 vW;
float line(float x, float w){ float f = abs(fract(x - 0.5) - 0.5) / fwidth(x); return 1.0 - min(f / w, 1.0); }
void main(){
  vec2 p = vW.xz / 6.0;
  float g = max(line(p.x, 1.0), line(p.y, 1.0)) * 0.55 + max(line(p.x / 5.0, 1.5), line(p.y / 5.0, 1.5)) * 0.6;
  float d = length(vW.xz);
  float pulse = smoothstep(4.0, 0.0, abs(mod(d - uTime * 18.0, 90.0) - 45.0)) * 0.8;
  float fade = smoothstep(260.0, 30.0, d);
  vec3 c = mix(vec3(0.0, 0.55, 0.75), vec3(1.0, 0.2, 0.85), smoothstep(40.0, 200.0, d));
  gl_FragColor = vec4(c * (g * (0.45 + pulse) + pulse * 0.05), (g + pulse * 0.1) * fade);
}`;

// Instanced data towers: dark monoliths with glowing edges and blinking data "windows".
function Towers({ count = 420 }) {
  const mesh = useMemo(() => {
    const mat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } },
      vertexShader: `attribute float aSeed; varying vec2 vUv; varying float vSeed; varying vec3 vW; varying vec3 vScale;
        void main(){ vUv = uv; vSeed = aSeed; vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; varying float vSeed; varying vec3 vW; varying vec3 vScale;
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
        void main(){
          vec2 cells = vec2(vScale.x * 2.5, vScale.y * 2.5);
          vec2 id = floor(vUv * cells), f = fract(vUv * cells);
          float on = step(0.72, h(id + vSeed + floor(uTime * (0.5 + vSeed) + h(id) * 8.0)));
          float win = on * step(0.25, f.x) * step(f.x, 0.75) * step(0.35, f.y) * step(f.y, 0.65);
          float edge = smoothstep(0.03, 0.0, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)) * min(cells.x, cells.y) / 6.0);
          vec3 tint = mix(vec3(0.0, 0.9, 1.0), vec3(1.0, 0.17, 0.84), step(0.6, vSeed));
          float fog = smoothstep(320.0, 60.0, length(vW.xz));
          vec3 c = vec3(0.01, 0.02, 0.05) + tint * (win * 0.4 + edge * 0.8);
          gl_FragColor = vec4(mix(vec3(0.004, 0.015, 0.03), c, fog), 1.0);
        }` });
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, count);
    const r = rng(77), seeds = new Float32Array(count), o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      let x = 0, z = 0;
      do { x = (r() - 0.5) * 520; z = (r() - 0.5) * 520; } while (Math.hypot(x, z) < 125 || (Math.abs(x) < 30 && z > 0));
      const w = 4 + r() * 10, h = 12 + Math.pow(r(), 2) * 110;
      o.position.set(x, -10 + h / 2, z); o.scale.set(w, h, w); o.rotation.y = Math.round(r() * 4) * Math.PI / 4; o.updateMatrix();
      m.setMatrixAt(i, o.matrix); seeds[i] = r();
    }
    m.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    return m;
  }, [count]);
  useFrame(() => { (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = live.time; });
  return <primitive object={mesh} />;
}

function Grid() {
  const mat = useMemo(() => new THREE.ShaderMaterial({ ...add, uniforms: { uTime: { value: 0 } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: gridFrag }), []);
  useFrame(() => { mat.uniforms.uTime.value = live.time; });
  return (
    <>
      <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}><planeGeometry args={[600, 600]} /></mesh>
      <mesh material={mat} rotation={[Math.PI / 2, 0, 0]} position={[0, 170, 0]} scale={0.8}><planeGeometry args={[600, 600]} /></mesh>
    </>
  );
}

// Packets racing up and down light-pipes.
function Streams({ count = 2400 }) {
  const pts = useMemo(() => {
    const r = rng(5), p = new Float32Array(count * 3), s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2, d = 20 + r() * 240;
      p.set([Math.cos(a) * d, r() * 100, Math.sin(a) * d], i * 3); s[i] = (r() < 0.5 ? -1 : 1) * (8 + r() * 30);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aSpeed', new THREE.BufferAttribute(s, 1));
    return new THREE.Points(g, new THREE.ShaderMaterial({ ...add, uniforms: { uTime: { value: 0 } },
      vertexShader: 'uniform float uTime; attribute float aSpeed; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + uTime * aSpeed, 100.0) - 10.0; vA = smoothstep(260.0, 40.0, length(p.xz)); vec4 mv = modelViewMatrix * vec4(p,1.0); gl_PointSize = 140.0 / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.3, 1.0, 0.95, smoothstep(0.5, 0.0, d) * vA); }' }));
  }, [count]);
  useFrame(() => { (pts.material as THREE.ShaderMaterial).uniforms.uTime.value = live.time; });
  return <primitive object={pts} />;
}

// A glass orb (real refraction, tinted by its group) with a glowing crystal inside. Downloaded = the crystal lights up.
function SkillNode({ n }: { n: (typeof skillNodes)[number] }) {
  const got = useStore((s) => s.collected.includes(n.id));
  const [hover, setHover] = useState(false);
  const ref = useRef<THREE.Group>(null), ring = useRef<THREE.Mesh>(null), gem = useRef<THREE.Mesh>(null);
  const label = useMemo(() => { const s = makeLabel(`${n.name}`, n.color, 44, true); s.scale.multiplyScalar(1.6); s.position.set(0, 1.9 + n.level, 0); return s; }, [n]);
  const size = 0.55 + n.level * 0.75;
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, metalness: 0, transmission: 1, thickness: size * 1.6, ior: 1.45,
    attenuationColor: new THREE.Color(n.color), attenuationDistance: size * 7, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2, specularIntensity: 1, iridescence: 0.5, iridescenceIOR: 1.3 }), [n.color, size]);
  const gemMat = useMemo(() => new THREE.MeshStandardMaterial({ color: n.color, emissive: n.color, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3, flatShading: true }), [n.color]);
  const burst = useRef(0);
  useEffect(() => { if (got) burst.current = 1; }, [got]);
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return;
    g.position.y = Math.sin(live.time * 0.8 + n.level * 9) * 0.25;
    if (gem.current) { gem.current.rotation.y += dt * (got ? 0.6 : 1.4); gem.current.rotation.x += dt * 0.4; }
    gemMat.emissiveIntensity += ((got ? 3 : hover ? 2 : 1.1) - gemMat.emissiveIntensity) * 0.1;
    // fly close enough and it downloads itself
    if (!got && cam.pos.distanceTo(n.pos) < size + 3.2) collect(n);
    burst.current = Math.max(0, burst.current - dt * 1.2);
    if (ring.current) { ring.current.scale.setScalar(1 + (1 - burst.current) * 6); (ring.current.material as THREE.MeshBasicMaterial).opacity = burst.current * 0.8; }
  });
  useEffect(() => { document.body.style.cursor = hover ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [hover]);
  const onClick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta > 6) return; flyTo(n.pos, size + 2.6); };
  return (
    <group position={n.pos}>
      <group ref={ref} scale={hover ? 1.12 : 1} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); setHover(true); }} onPointerOut={() => setHover(false)}>
        <mesh material={glass}><sphereGeometry args={[size, 48, 32]} /></mesh>
        <mesh ref={gem} material={gemMat} scale={got ? 0.55 : 0.45}><octahedronGeometry args={[size, 0]} /></mesh>
        {got && <pointLight color={n.color} intensity={6} distance={size * 8} />}
      </group>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[size, 0.05, 6, 48]} /><meshBasicMaterial color={n.color} {...add} opacity={0} /></mesh>
      <primitive object={label} />
    </group>
  );
}

function collect(n: (typeof skillNodes)[number]) {
  const st = useStore.getState();
  if (st.collected.includes(n.id)) return;
  const collected = [...st.collected, n.id];
  st.set({ collected });
  blip(0.8 + n.level * 0.6);
  const bars = Math.round(n.level * 10);
  toast(`DOWNLOADED · ${n.name}`, `${n.group} ${'▮'.repeat(bars)}${'▯'.repeat(10 - bars)} ${Math.round(n.level * 100)}%`, n.color);
  if (collected.length === skillNodes.length) setTimeout(() => toast('SKILL TREE COMPLETE', 'Every node downloaded. You know everything I know (almost).', '#7cff6b'), 900);
}

function Cluster({ gi }: { gi: number }) {
  const g = skills[gi], c = groupCenters[gi];
  const label = useMemo(() => { const s = makeLabel(g.group, g.color, 72); s.scale.multiplyScalar(3); s.position.set(0, 9, 0); return s; }, [g]);
  const lines = useMemo(() => {
    const nodes = skillNodes.filter((n) => n.group === g.group), p: number[] = [];
    nodes.forEach((n) => p.push(c.x, c.y, c.z, n.pos.x, n.pos.y, n.pos.z));
    p.push(c.x, c.y, c.z, 0, 4, 0); // uplink to the tree
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: g.color, ...add, opacity: 0.35 }));
  }, [g, c]);
  const ring = useRef<THREE.Mesh>(null);
  useFrame(() => { if (ring.current) ring.current.rotation.z = live.time * 0.3 * (gi % 2 ? 1 : -1); });
  return (
    <>
      <primitive object={lines} />
      <group position={c}>
        <primitive object={label} />
        <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[8.5, 0.06, 6, 96]} /><meshBasicMaterial color={g.color} {...add} opacity={0.5} /></mesh>
      </group>
    </>
  );
}

/* Access logs: terminal windows orbiting the core spire. */
function logTexture(j: (typeof experience)[number]) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 260;
  const x = c.getContext('2d')!, f = fontFamily(), col = j.side ? '#f8e602' : '#7cff6b';
  x.fillStyle = 'rgba(3, 8, 16, 0.92)'; x.fillRect(0, 0, 640, 260);
  x.strokeStyle = col; x.lineWidth = 4; x.strokeRect(2, 2, 636, 256);
  x.fillStyle = col; x.fillRect(0, 0, 640, 44);
  x.fillStyle = '#000'; x.font = `600 26px ${f}`; x.fillText(`[${j.from} – ${j.to}]  ${j.side ? 'SIDE QUEST' : 'ACCESS GRANTED'}`, 18, 31);
  x.fillStyle = '#ffffff'; x.font = `700 52px ${f}`; x.fillText(j.company.toUpperCase().slice(0, 22), 18, 118);
  x.fillStyle = '#bfe9ff'; x.font = `500 30px ${f}`; x.fillText(`${j.role} · ${j.place}`.slice(0, 40), 18, 172);
  x.fillStyle = col; x.font = `500 24px ${f}`; x.fillText('▶ click to open log', 18, 230);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// A log hangs on a thread from its branch, with a lantern above it, and sways a little.
function Log({ i }: { i: number }) {
  const j = experience[i];
  const tex = useMemo(() => logTexture(j), [j]);
  const ref = useRef<THREE.Group>(null), card = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const col = j.side ? '#f8e602' : '#7cff6b';
  const thread = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), []);
  useFrame(({ camera }) => {
    const g = ref.current; if (!g) return;
    const top = logAnchor[i], p = logPos[i];
    g.position.copy(top);
    g.rotation.z = Math.sin(live.time * 0.7 + i) * 0.04; g.rotation.x = Math.cos(live.time * 0.5 + i * 2) * 0.03;
    const len = top.y - p.y;
    (g.children[0] as THREE.Line).scale.set(1, -len, 1);
    g.children[1].position.set(0, -len + 2.4, 0);
    g.children[2].position.set(0, -len, 0);
    card.current?.lookAt(camera.position.x, card.current.getWorldPosition(new THREE.Vector3()).y, camera.position.z);
  });
  useEffect(() => { document.body.style.cursor = hover ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [hover]);
  const onClick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta > 6) return; openLog(i); };
  return (
    <group ref={ref}>
      <lineSegments geometry={thread}><lineBasicMaterial color={col} transparent opacity={0.55} /></lineSegments>
      <group>
        <mesh><sphereGeometry args={[0.35, 16, 12]} /><meshBasicMaterial color={col} /></mesh>
        <pointLight color={col} intensity={25} distance={22} />
      </group>
      <mesh ref={card} scale={hover ? 1.75 : 1.6} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); setHover(true); }} onPointerOut={() => setHover(false)}>
        <planeGeometry args={[6.4, 2.6]} /><meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function openLog(i: number) {
  const j = experience[i];
  blip(1.4); useStore.getState().set({ log: j.company + j.from });
}
// Opening a log (from the tree or the DOM list) flies you to it.
function LogNavigator() {
  const log = useStore((s) => s.log);
  useEffect(() => {
    const p = logPos[experience.findIndex((j) => j.company + j.from === log)];
    if (!p) return;
    // approach from outside the tree, level with the log, so you don't end up inside the leaves
    const out = new THREE.Vector3(p.x, 0, p.z).normalize();
    cam.dest = { pos: p.clone().addScaledVector(out, 17).add(new THREE.Vector3(0, 1.5, 0)), look: p.clone() };
  }, [log]);
  return null;
}

/* The tree of life (Poly Haven "Island Tree 01", CC0) — huge, in the middle of the Net. Work experience hangs from its branches. */
function Tree() {
  const gltf = useLoader(GLTFLoader, TREE, meshopt);
  const tree = useMemo(() => {
    const o = gltf.scene;
    o.scale.setScalar(TREE_SCALE); o.position.set(0, FLOOR, 0); o.updateMatrixWorld(true);
    const branchPts: THREE.Vector3[] = [];
    o.traverse((m) => {
      const mesh = m as THREE.Mesh; if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.name.includes('leaves')) { Object.assign(mat, { transparent: false, alphaTest: 0.45, depthWrite: true, side: THREE.DoubleSide }); mat.needsUpdate = true; }
      else {
        // candidate hanging points: undersides of real branches, out under the canopy
        const pos = mesh.geometry.attributes.position, v = new THREE.Vector3(), r = rng(9);
        for (let k = 0; k < pos.count; k += 7) {
          v.fromBufferAttribute(pos, k); mesh.localToWorld(v);
          const rad = Math.hypot(v.x, v.z);
          if (v.y > FLOOR + TREE_SCALE * 2.3 && v.y < FLOOR + TREE_SCALE * 3.4 && rad > TREE_SCALE * 0.9 && rad < TREE_SCALE * 1.9 && r() < 0.5) branchPts.push(v.clone());
        }
      }
    });
    // one branch per log, spread around the tree and facing the way you arrive
    experience.forEach((_, i) => {
      const want = Math.PI * 0.15 + (i - (experience.length - 1) / 2) * 0.62;
      let best: THREE.Vector3 | null = null, score = Infinity;
      for (const v of branchPts) { const a = Math.atan2(v.x, v.z), d = Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want))) * 20 - v.y * 0.1; if (d < score) { score = d; best = v; } }
      if (best) { logAnchor[i].copy(best); logPos[i].copy(best).setY(best.y - 12 - (i % 3) * 5); }
    });
    return o;
  }, [gltf]);
  const label = useMemo(() => { const s = makeLabel('WORK HISTORY · hanging from the tree', '#7cff6b', 56, true); s.scale.multiplyScalar(3.4); s.position.set(0, 14, 58); return s; }, []);
  return <><primitive object={tree} /><primitive object={label} /></>;
}

// The Net has no sky; give glass and bark something to reflect, and a cold light from above with neon from below.
function NetLight() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl), env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env; scene.environmentIntensity = 0.35;
    return () => { scene.environment = null; env.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return (
    <>
      <hemisphereLight args={['#6fb6ff', '#2a0a3a', 0.6]} />
      <directionalLight position={[40, 120, 60]} intensity={1.6} color="#cfe6ff" />
      <pointLight position={[0, -6, 0]} color="#00f0ff" intensity={900} distance={120} />
      <pointLight position={[30, 10, 40]} color="#ff2bd6" intensity={300} distance={80} />
    </>
  );
}

export function Net() {
  useEffect(() => { setupCam({ mode: 'fly', pos: [0, 26, 150], yaw: 0, pitch: 0.14, fov: 62, bounds: 280, floor: -7, speed: 26 }); }, []);
  return (
    <group>
      <color attach="background" args={['#01050b']} />
      <fogExp2 attach="fog" args={['#01050b', 0.0045]} />
      <Grid />
      <Towers />
      <Streams />
      <NetLight />
      <Tree />
      {experience.map((_, i) => <Log key={i} i={i} />)}
      <LogNavigator />
      {skills.map((_, gi) => <Cluster key={gi} gi={gi} />)}
      {skillNodes.map((n) => <SkillNode key={n.id} n={n} />)}
    </group>
  );
}
