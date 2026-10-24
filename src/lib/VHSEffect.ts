import { Effect, BlendFunction, Pass } from 'postprocessing';
import * as THREE from 'three';

// Whole-frame camcorder look: barrel lens, chroma bleed, tracking tear, grain, scanlines, vignette, light leak.
const frag = /* glsl */ `
uniform float uTime, uNoise, uScan, uChroma, uDistort, uVignette, uTracking, uFlash, uHue, uVel;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
vec3 hueShift(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a); return c*ca + cross(k,c)*sin(a) + k*dot(k,c)*(1.0-ca); }
void mainUv(inout vec2 uv){
  vec2 c = uv - 0.5;
  uv = 0.5 + c * (1.0 + uDistort * dot(c, c));
  // tracking: horizontal tear bands that roll while rewinding / fast-forwarding
  float band = smoothstep(0.92, 1.0, sin(uv.y * 9.0 + uTime * (2.0 + abs(uVel) * 30.0)));
  uv.x += band * uTracking * 0.04 * (hash(vec2(floor(uv.y * 120.0), uTime)) - 0.5);
  uv.x += uTracking * 0.004 * sin(uv.y * 300.0 + uTime * 50.0);
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
  float off = (0.0015 + uTracking * 0.006) * uChroma;
  vec3 col = vec3(texture2D(inputBuffer, uv + vec2(off, 0.0)).r, inputColor.g, texture2D(inputBuffer, uv - vec2(off, 0.0)).b);
  col = hueShift(col, uHue);
  float g = hash(uv * vec2(1920.0, 1080.0) + fract(uTime * 7.0)) - 0.5;
  col += g * uNoise;
  col *= 1.0 - uScan * 0.25 * (0.5 + 0.5 * sin(uv.y * 900.0));
  // snow lines during tracking glitches
  float line = step(0.997 - uTracking * 0.02, hash(vec2(floor(uv.y * 240.0), floor(uTime * 24.0))));
  col = mix(col, vec3(hash(uv + uTime)), line * 0.6);
  // warm light leak from the right edge
  col += vec3(1.0, 0.35, 0.15) * 0.06 * smoothstep(0.6, 1.2, uv.x + 0.15 * sin(uTime * 0.3));
  vec2 c = uv - 0.5;
  col *= 1.0 - uVignette * dot(c, c) * 2.2;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
  col = mix(col, vec3(1.0), uFlash);
  outputColor = vec4(col, inputColor.a);
}`;

export class VHSEffect extends Effect {
  constructor() {
    const u = (v: number) => new THREE.Uniform(v);
    super('VHSEffect', frag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uTime', u(0)], ['uNoise', u(0.09)], ['uScan', u(0.35)], ['uChroma', u(1)], ['uDistort', u(0.12)],
        ['uVignette', u(0.55)], ['uTracking', u(0)], ['uFlash', u(0)], ['uHue', u(0)], ['uVel', u(0)],
      ]),
    });
  }
  setU(name: string, v: number) { this.uniforms.get(name)!.value = v; }
}

// Sandevistan afterimages: blends the previous output (decayed + tinted) under the current frame.
export class AfterimagePass extends Pass {
  private prev: THREE.WebGLRenderTarget;
  private mat: THREE.ShaderMaterial;
  private copy: THREE.ShaderMaterial;
  strength = 0;
  constructor() {
    super('AfterimagePass');
    this.prev = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tNew: { value: null }, tOld: { value: null }, uK: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tNew, tOld; uniform float uK; varying vec2 vUv;
        void main(){ vec4 n = texture2D(tNew, vUv); vec4 o = texture2D(tOld, vUv + vec2(0.002, 0.0));
          vec3 ghost = o.rgb * vec3(0.6, 1.0, 0.9) * uK; gl_FragColor = vec4(max(n.rgb, ghost), 1.0); }`,
      depthTest: false, depthWrite: false,
    });
    this.copy = new THREE.ShaderMaterial({
      uniforms: { t: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }',
      depthTest: false, depthWrite: false,
    });
    this.fullscreenMaterial = this.mat;
  }
  setSize(w: number, h: number) { this.prev.setSize(w, h); }
  render(renderer: THREE.WebGLRenderer, input: THREE.WebGLRenderTarget, output: THREE.WebGLRenderTarget | null) {
    this.mat.uniforms.tNew.value = input.texture;
    this.mat.uniforms.tOld.value = this.prev.texture;
    this.mat.uniforms.uK.value = this.strength;
    this.fullscreenMaterial = this.mat;
    renderer.setRenderTarget(this.renderToScreen ? null : output);
    renderer.render(this.scene, this.camera);
    // keep this frame for the next one
    if (output) {
      this.copy.uniforms.t.value = output.texture;
      this.fullscreenMaterial = this.copy;
      renderer.setRenderTarget(this.prev);
      renderer.render(this.scene, this.camera);
    }
  }
}
