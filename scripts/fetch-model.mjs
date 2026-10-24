// The netrunner is Adobe Mixamo's "Michelle" as shipped in the three.js examples. Mixamo's licence allows using it in a
// project but not redistributing the file, so it isn't committed: this pulls it on install if it's missing.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const out = 'public/assets/models/netrunner.glb';
const url = 'https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/models/gltf/Michelle.glb';
if (!existsSync(out)) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(`fetched ${out}`);
  } catch (e) {
    console.warn(`could not fetch ${out} (${e.message}); the Blackwall will run without her`);
  }
}
