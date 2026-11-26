import * as THREE from 'three';
import { toonMaterial } from '../engine/materials.js';
import { VoxelModel, hash3, shade } from '../engine/voxel.js';
import { J } from './models.js';

/**
 * Dark rune gates in the style of the Monster Gate logo: charcoal ashlar,
 * gold bands, red runes on the pillars and a ruby crest. The opening holds a
 * red plasma curtain with rings and a rising smoke, the same entrance effect as
 * the other gates.
 */

const W = 46;
const H = 50;
const D = 12;
const S = 0.2;
const OX = 23;
const OZ = 5;
const RED = 0xff2a1a;
const RUBY = 0xff1f2a;
const INNER = 12;
const SPRING = 29;

/** Voxel gate, base at y 0, opening facing local +z. */
export function buildRuneGate() {
  const M = new VoxelModel(W, H, D);
  const stone = (x, y, z) => {
    const row = Math.floor(y / 4);
    const col = Math.floor((x + (row % 2) * 3) / 6);
    const base = [0x3b3b42, 0x47474f, 0x303036, 0x55555e][Math.abs(col * 3 + row) % 4];
    let c = J(base, x, y, z, 21, 0.05);
    if (y % 4 === 0) c = shade(c, 0.78);
    if (hash3(x >> 2, y >> 2, z >> 2, 22) > 0.9) c = shade(c, 0.7);
    return c;
  };
  const gold = (x, y, z) => J((x + y) % 3 === 0 ? 0xc9a23c : 0x9a7428, x, y, z, 23, 0.05);
  const deep = (x, y, z) => J(0x1c1418, x, y, z, 24, 0.05);

  // Steps and pillars.
  M.box(0, 0, 0, W, 3, 11, stone);
  M.box(0, 3, 0, W, 4, 11, gold);
  for (const px of [2, 35]) {
    M.box(px, 4, 0, px + 9, 40, 11, stone);
    M.box(px, 17, 0, px + 9, 19, 11, gold);
    M.box(px, 31, 0, px + 9, 33, 11, gold);
    // Rune glyphs, glowing on the front face.
    for (let i = 0; i < 5; i++) {
      const y = 7 + i * 5;
      const gx = px + 3;
      if (i % 2 === 0) {
        M.box(gx, y, 11, gx + 2, y + 4, 12, RED, true);
        M.box(gx + 2, y + 3, 11, gx + 4, y + 4, 12, RED, true);
      } else {
        M.box(gx - 1, y + 2, 11, gx + 4, y + 3, 12, RED, true);
        M.box(gx + 1, y, 11, gx + 2, y + 4, 12, RED, true);
      }
    }
  }

  // Arch band from the spring line up, with gold on the outer edge and a red
  // glow lining the inner edge.
  for (let y = SPRING; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x + 0.5 - OX, y + 0.5 - SPRING);
      if (d < INNER || d > 18) continue;
      for (let z = 0; z < 11; z++) {
        if (d >= 16.8) M.set(x, y, z, gold(x, y, z));
        else M.set(x, y, z, stone(x, y, z));
      }
      if (d < INNER + 1) M.set(x, y, 11, RED, true);
    }
  }

  // Dark backing inside the opening, and a glowing threshold.
  M.box(11, 3, 0, 35, SPRING, 2, deep);
  M.box(11, 3, 11, 35, 4, 12, RED, true);

  // Ruby crest on top of the arch.
  M.box(18, 39, 0, 28, 48, 11, stone);
  M.box(18, 39, 0, 28, 40, 11, gold);
  M.box(18, 47, 0, 28, 48, 11, gold);
  M.box(21, 42, 11, 25, 46, 12, RUBY, true);
  M.set(23, 44, 12, 0xffd0c8, true);

  return M.build(S, OX, 0, OZ);
}

const curtainFrag = `
uniform float uTime;
varying vec2 vP;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main(){
  vec2 c = vec2(vP.x, vP.y - 2.4);
  float r = length(c);
  vec2 q = floor(c * 22.0) / 22.0;
  float rq = length(q);
  float n = vn(q * 3.0 + vec2(0.0, uTime * 0.7)) * 0.6 + vn(q * 8.0 - uTime * 0.95) * 0.4;
  float pulse = 0.0;
  for (int i = 0; i < 3; i++) {
    float t = fract(uTime * 0.45 + float(i) * 0.333);
    float band = abs(rq - t * 2.6);
    pulse += smoothstep(0.12, 0.0, band) * (1.0 - t);
  }
  float core = smoothstep(0.9, 0.0, r);
  vec3 deep = vec3(0.32, 0.02, 0.02);
  vec3 red = vec3(1.0, 0.16, 0.08);
  vec3 hot = vec3(1.0, 0.72, 0.42);
  vec3 col = mix(deep, red, clamp(n * 0.9 + pulse * 0.6, 0.0, 1.0));
  col = mix(col, hot, clamp(core * 0.5 + pulse * 0.25, 0.0, 1.0));
  float fade = smoothstep(0.0, 0.7, vP.y) * smoothstep(0.0, 0.5, 2.6 - abs(vP.x) + 0.2);
  float alpha = (0.38 + n * 0.3 + pulse * 0.55 + core * 0.35) * fade;
  gl_FragColor = vec4(col, alpha);
}
`;

const ringFrag = `
uniform float uTime;
uniform float uPhase;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  p = floor(p * 18.0) / 18.0;
  float r = length(p);
  float t = fract(uTime * 0.42 + uPhase);
  float band = abs(r - mix(0.15, 1.05, t));
  float a = smoothstep(0.1, 0.0, band) * (1.0 - t);
  a *= smoothstep(1.05, 0.82, r);
  vec3 col = mix(vec3(1.0, 0.3, 0.12), vec3(1.0, 0.82, 0.55), t);
  gl_FragColor = vec4(col * (0.75 + a), a);
}
`;

/** Arch outline in local units, matching the opening: half-width INNER*S. */
function openingShape() {
  const hw = INNER * S;
  const spring = SPRING * S;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0.6);
  shape.lineTo(hw, 0.6);
  shape.lineTo(hw, spring);
  shape.absarc(0, spring, hw, 0, Math.PI, false);
  shape.lineTo(-hw, 0.6);
  return new THREE.ShapeGeometry(shape, 12);
}

const SMOKE_N = 90;

function smokeSystem() {
  const pos = new Float32Array(SMOKE_N * 3);
  const seed = new Float32Array(SMOKE_N);
  for (let i = 0; i < SMOKE_N; i++) seed[i] = hash3(i, 7, 3, 31);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xff3a1a,
    size: 0.42,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  return { points: new THREE.Points(geo, mat), pos, seed, geo };
}

function updateSmoke(sys, t) {
  const { pos, seed, geo } = sys;
  const hw = INNER * S * 0.9;
  for (let i = 0; i < SMOKE_N; i++) {
    const life = (t * (0.22 + seed[i] * 0.2) + seed[i]) % 1;
    const wob = Math.sin(t * 1.3 + i * 1.7) * 0.25 * life;
    pos[i * 3] = (seed[i] * 2 - 1) * hw * (0.5 + life * 0.7) + wob;
    pos[i * 3 + 1] = 0.5 + life * 5.4;
    pos[i * 3 + 2] = 0.2 + Math.cos(t * 0.9 + i) * 0.35 * life;
  }
  geo.attributes.position.needsUpdate = true;
}

/**
 * Place a rune gate on the ground. `yaw` turns the opening (local +z).
 * Returns the site with a `tick(t)` the world calls every frame.
 */
export function placeRuneGate(world, spec) {
  const built = buildRuneGate();
  let y = 0;
  for (let dz = -1.8; dz <= 1.8; dz += 0.4) {
    for (let dx = -2.4; dx <= 2.4; dx += 0.4) y = Math.max(y, world.heightAt(spec.x + dx, spec.z + dz));
  }
  const group = new THREE.Group();
  group.name = spec.name || 'rune-gate';
  group.position.set(spec.x, y, spec.z);
  group.rotation.y = spec.yaw || 0;

  if (built.solid) {
    const solid = new THREE.Mesh(built.solid, toonMaterial({ vertexColors: true }));
    solid.castShadow = true;
    solid.receiveShadow = true;
    group.add(solid);
  }
  if (built.glow) {
    group.add(new THREE.Mesh(built.glow, new THREE.MeshBasicMaterial({ vertexColors: true })));
  }

  const curtainMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: curtainFrag,
  });
  const curtain = new THREE.Mesh(openingShape(), curtainMat);
  curtain.position.set(0, 0, 0);
  curtain.renderOrder = 3;
  group.add(curtain);

  const ringGeo = new THREE.PlaneGeometry(4.2, 4.2);
  const ringMats = [0, 1].map((i) => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPhase: { value: i / 2 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: ringFrag,
  }));
  ringMats.forEach((mat, i) => {
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.position.set(0, SPRING * S, 0.25 + i * 0.05);
    ring.renderOrder = 4;
    group.add(ring);
  });

  const smoke = smokeSystem();
  smoke.points.position.set(0, 0, 0.4);
  smoke.points.renderOrder = 5;
  group.add(smoke.points);

  const light = new THREE.PointLight(0xff3a1a, 2.4, 12, 1.5);
  light.position.set(0, 1.8, 1.2);
  group.add(light);

  world.group.add(group);

  // Pillar bases block walking; the gap between them is the opening.
  const yaw = spec.yaw || 0;
  for (const lx of [-3.3, 3.3]) {
    world.circle(spec.x + Math.cos(yaw) * lx, spec.z - Math.sin(yaw) * lx, 0.9);
  }

  const site = {
    ...spec,
    y,
    group,
    light,
    tick(t) {
      curtainMat.uniforms.uTime.value = t;
      for (const mat of ringMats) mat.uniforms.uTime.value = t;
      updateSmoke(smoke, t);
      light.intensity = 1.8 + 0.8 * Math.sin(t * 3.1) * Math.sin(t * 1.7);
    },
  };
  if (!world.runeGates) world.runeGates = [];
  world.runeGates.push(site);
  return site;
}
