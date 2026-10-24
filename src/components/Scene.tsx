'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer, RenderPass, EffectPass } from 'postprocessing';
import { live, vhs, useStore } from '@/lib/store';
import { VHSEffect, AfterimagePass } from '@/lib/VHSEffect';
import { City, PANO, PROPS } from './scenes/City';
import { meshopt } from './scenes/util';
import { Net, TREE } from './scenes/Net';
import { Blackwall, NETRUNNER } from './scenes/Blackwall';
import { Space, SPACE_TEXTURES } from './scenes/Space';
import { Moon, MOON_TEXTURES } from './scenes/Moon';
import { bindInput, stepCam } from './scenes/controls';

function Rig() {
  const { camera, gl, scene, size } = useThree();
  const st = useStore();
  const { composer, effect, after } = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType });
    const effect = new VHSEffect(), after = new AfterimagePass();
    composer.addPass(new RenderPass(scene, camera)); composer.addPass(after); composer.addPass(new EffectPass(camera, effect));
    return { composer, effect, after };
  }, [gl, scene, camera]);
  useEffect(() => composer.setSize(size.width, size.height), [composer, size]);
  useEffect(() => bindInput(gl.domElement), [gl]);
  useEffect(() => { scene.overrideMaterial = st.wireframe ? new THREE.MeshBasicMaterial({ color: '#00ff88', wireframe: true }) : null; }, [st.wireframe, scene]);

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    const slow = st.sandevistan ? 0.15 : 1;
    if (!st.paused) live.time += dt * slow;
    stepCam(camera as THREE.PerspectiveCamera, dt, !st.reducedMotion);

    // VHS: quiet by default, a tracking burst on every cut between dives, a little wobble when flying fast
    let tracking = live.glitch * 1.1 + Math.min(0.25, live.speed * 0.004) + vhs.tracking + (st.paused ? 0.35 : 0);
    if (st.dive === 2) tracking += 0.08;
    if (st.reducedMotion) tracking *= 0.25;
    effect.setU('uTime', live.time); effect.setU('uTracking', Math.min(1.2, tracking)); effect.setU('uVel', live.glitch);
    effect.setU('uFlash', live.flash); live.flash = Math.max(0, live.flash - dt * 1.2);   // one-shot flashes (breach) fade out
    effect.setU('uNoise', vhs.noise * (st.reducedMotion ? 0.5 : 1)); effect.setU('uScan', vhs.scanlines);
    effect.setU('uChroma', vhs.chroma); effect.setU('uDistort', vhs.distortion); effect.setU('uVignette', vhs.vignette);
    effect.setU('uHue', vhs.hue + (st.konami ? live.time * 0.5 : 0));
    after.strength += ((st.sandevistan && !st.lowPower ? 0.93 : 0) - after.strength) * 0.2;

    composer.render(dt);
    live.calls = gl.info.render.calls; live.tris = gl.info.render.triangles;
  }, 1);
  return null;
}

// Warm the cache for the next dive while you're still in this one.
const ASSETS: (() => void)[] = [
  () => { useLoader.preload(THREE.TextureLoader, PANO); PROPS.forEach((p) => useLoader.preload(GLTFLoader, p, meshopt)); },
  () => useLoader.preload(GLTFLoader, TREE, meshopt),
  () => useLoader.preload(GLTFLoader, NETRUNNER),
  () => SPACE_TEXTURES.forEach((t) => useLoader.preload(THREE.TextureLoader, t)),
  () => MOON_TEXTURES.forEach((t) => useLoader.preload(THREE.TextureLoader, t)),
];

function Dives() {
  const dive = useStore((s) => s.dive);
  useEffect(() => { const id = setTimeout(() => ASSETS[(dive + 1) % 5](), 2500); return () => clearTimeout(id); }, [dive]);
  return (
    <Suspense fallback={null}>
      {dive === 0 && <City />}
      {dive === 1 && <Net />}
      {dive === 2 && <Blackwall />}
      {dive === 3 && <Space />}
      {dive === 4 && <Moon />}
    </Suspense>
  );
}

export default function Scene() {
  const lowPower = useStore((s) => s.lowPower);
  // labels are drawn into canvases, so wait for the web fonts first
  const [fonts, setFonts] = useState(false);
  useEffect(() => { document.fonts.ready.then(() => setFonts(true)); }, []);
  if (!fonts) return null;
  return (
    <Canvas className="scene" dpr={lowPower ? 1 : [1, 1.75]} camera={{ fov: 60, near: 0.1, far: 3000, position: [0, 1.6, 0] }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      onPointerMissed={() => useStore.getState().set({ sign: null, log: null })}>
      <Dives />
      <Rig />
    </Canvas>
  );
}
