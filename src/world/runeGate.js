import * as THREE from 'three';
import { toonMaterial } from '../engine/materials.js';
import { VoxelModel, hash3, shade } from '../engine/voxel.js';
import { J } from './models.js';

/**
 * Dark rune gates in the style of the Monster Gate logo: carved charcoal
 * ashlar, gold cornices and rivets, red runes in framed panels on the pillars,
 * a ruby-cut crest on the arch. The opening holds swirling red plasma with
 * rings and rising smoke, the same entrance effect as the other gates.
 */

const W = 46;
const H = 50;
const D = 13;
const S = 0.2;
const OX = 23;
const OZ = 5;
const RED = 0xff2a1a;
const RUBY = 0xff1f2a;
const INNER = 12;
const SPRING = 29;
const PLASMA_Y = 4.4;

/** Voxel gate, base at y 0, opening facing local +z. */
export function buildRuneGate() {
  const M = new VoxelModel(W, H, D);
  const stone = (x, y, z) => {
    const row = Math.floor(y / 3);
    const col = Math.floor((x + (row % 2) * 3) / 5);
    const base = [0x3b3b42, 0x4a4a53, 0x303036, 0x57575f][Math.abs(col * 3 + row) % 4];
    let c = J(base, x, y, z, 21, 0.05);
    if (y % 3 === 0) c = shade(c, 0.7);
    if ((x + z) % 4 === 0 && y % 3 !== 0) c = shade(c, 0.88);
    if (hash3(x >> 2, y >> 2, z >> 2, 22) > 0.92) c = shade(c, 0.66);
    return c;
  };
  const cut = (x, y, z) => shade(stone(x, y, z), 0.74);
  const gold = (x, y, z) => J((x + y) % 3 === 0 ? 0xd4a944 : 0x9a7428, x, y, z, 23, 0.05);
  const deep = (x, y, z) => J(0x1a1216, x, y, z, 24, 0.05);

  // Plinth: three stepped courses with a gold band between.
  M.box(0, 0, 0, W, 2, D - 1, cut);
  M.box(1, 2, 0, W - 1, 4, D - 1, stone);
  M.box(2, 4, 0, W - 2, 5, D, gold);
  M.box(3, 5, 0, W - 3, 6, D - 1, stone);

  // Pillars with fluted shafts, carved capitals and bases.
  for (const px of [4, 33]) {
    M.box(px, 6, 0, px + 9, 26, 11, stone);
    for (let x = px + 1; x < px + 9; x += 2) for (let y = 7; y < 25; y++) M.set(x, y, 11, shade(stone(x, y, 11), 0.82));
    M.box(px - 1, 6, 0, px + 10, 9, 12, cut);
    M.box(px - 1, 9, 0, px + 10, 10, 12, gold);
    M.box(px - 1, 24, 0, px + 10, 27, 12, cut);
    M.box(px - 2, 27, 0, px + 11, 28, 12, stone);
    M.box(px - 2, 28, 0, px + 11, 29, 12, gold);
    // Gold rivets along the shaft edges.
    for (let y = 11; y < 25; y += 6) {
      M.set(px + 1, y, 11, gold(px, y, 11));
      M.set(px + 7, y, 11, gold(px, y, 11));
    }
    // Rune panels: a gold frame around a glowing glyph.
    for (let i = 0; i < 3; i++) {
      const y0 = 11 + i * 5;
      const gx = px + 2;
      for (let x = gx; x <= gx + 5; x++) {
        M.set(x, y0, 12, gold(x, y0, 12));
        M.set(x, y0 + 5, 12, gold(x, y0 + 5, 12));
      }
      for (let y = y0; y <= y0 + 5; y++) {
        M.set(gx, y, 12, gold(gx, y, 12));
        M.set(gx + 5, y, 12, gold(gx, y, 12));
      }
      const g = (x, y) => M.set(x, y, 11, RED, true);
      if (i % 2 === 0) {
        for (let y = y0 + 1; y <= y0 + 4; y++) g(gx + 2, y);
        g(gx + 3, y0 + 4); g(gx + 3, y0 + 3); g(gx + 4, y0 + 2);
        g(gx + 1, y0 + 4);
      } else {
        for (let x = gx + 1; x <= gx + 4; x++) g(x, y0 + 2);
        g(gx + 2, y0 + 1); g(gx + 3, y0 + 3); g(gx + 2, y0 + 4);
      }
    }
  }

  // Arch band built from alternating voussoirs; the keystone is cut darker.
  for (let y = SPRING; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x + 0.5 - OX, y + 0.5 - SPRING);
      if (d < INNER || d > 18.5) continue;
      const ang = Math.atan2(y + 0.5 - SPRING, x + 0.5 - OX);
      const seg = Math.floor(((ang + Math.PI) / Math.PI) * 9);
      const keystone = seg === 4 || seg === 5;
      for (let z = 0; z < 11; z++) {
        let c;
        if (d >= 16.9) c = gold(x, y, z);
        else if (d >= 15.8) c = shade(gold(x, y, z), 0.6);
        else if (keystone) c = shade(stone(x, y, z), 1.25);
        else c = seg % 2 ? stone(x, y, z) : cut(x, y, z);
        M.set(x, y, z, c);
      }
      if (d < INNER + 1) {
        M.set(x, y, 10, gold(x, y, 10));
        M.set(x, y, 11, RED, true);
      }
    }
  }

  // Dark backing and a glowing threshold rune line.
  M.box(11, 5, 0, 36, SPRING, 2, deep);
  M.box(11, 5, 11, 36, 6, 12, RED, true);
  for (let x = 13; x < 34; x += 4) M.set(x, 6, 12, gold(x, 6, 12));

  // Crest: a gold-rimmed shield with a ruby cut in its centre.
  for (let y = 37; y <= 49; y++) {
    const half = y < 43 ? 6 : Math.max(2, 6 - (y - 43) * 0.7);
    for (let x = Math.floor(OX - half); x <= Math.ceil(OX + half); x++) {
      const edge = Math.abs(x + 0.5 - OX) > half - 1.2 || y <= 37;
      M.set(x, y, 0, edge ? gold(x, y, 0) : stone(x, y, 0));
      for (let z = 1; z < 12; z++) {
        const rim = Math.abs(x + 0.5 - OX) > half - 1 || y === 49;
        M.set(x, y, z, rim ? gold(x, y, z) : stone(x, y, z));
      }
    }
  }
  const diamond = (cx, cy, r) => {
    for (let dy = -r; dy <= r; dy++) {
      const w = r - Math.abs(dy);
      for (let dx = -w; dx <= w; dx++) M.set(cx + dx, cy + dy, 12, dx === 0 && dy === 0 ? 0xffd0c8 : RUBY, true);
    }
  };
  diamond(OX, 44, 3);
  M.set(OX - 5, 43, 12, RED, true);
  M.set(OX + 5, 43, 12, RED, true);

  return M.build(S, OX, 0, OZ);
}

const plasmaFrag = `
uniform float uTime;
uniform float uDir;
uniform float uAlpha;
varying vec2 vP;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main(){
  vec2 c = vec2(vP.x, vP.y - ${PLASMA_Y.toFixed(2)});
  float r = length(c);
  float a = atan(c.y, c.x);
  // Spiral arms that wind inward and turn with time, in the direction of uDir.
  float spin = a * 2.0 + 4.2 / (r + 0.55) - uDir * uTime * 1.9;
  float arms = 0.5 + 0.5 * sin(spin * 3.0 + vn(vec2(r * 3.0, uTime * 0.6)) * 2.5);
  float n = vn(vec2(spin * 1.8, r * 5.0 - uDir * uTime * 1.4)) * 0.7 + vn(vec2(a * 4.0 + uTime * 0.35, r * 9.0)) * 0.3;
  float swirl = smoothstep(0.42, 0.95, arms * 0.62 + n * 0.55);
  float core = smoothstep(1.5, 0.0, r);
  vec3 deep = vec3(0.26, 0.02, 0.03);
  vec3 red = vec3(0.95, 0.14, 0.08);
  vec3 hot = vec3(1.0, 0.72, 0.36);
  vec3 col = mix(deep, red, clamp(n * 0.8 + swirl * 0.6, 0.0, 1.0));
  col = mix(col, hot, clamp(swirl * core * 0.9 + core * 0.22, 0.0, 1.0));
  float fade = smoothstep(0.0, 0.55, vP.y);
  float alpha = (0.22 + swirl * 0.7 + core * 0.25) * fade * uAlpha;
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
  return new THREE.ShapeGeometry(shape, 16);
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

  const plasmaVert = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const makeLayer = (dir, alpha, z) => {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uDir: { value: dir }, uAlpha: { value: alpha } },
      vertexShader: plasmaVert,
      fragmentShader: plasmaFrag,
    });
    const mesh = new THREE.Mesh(openingShape(), mat);
    mesh.position.set(0, 0, z);
    mesh.renderOrder = 3;
    group.add(mesh);
    return mat;
  };
  // Two counter-turning layers give the plasma depth.
  const plasmaMats = [makeLayer(1, 1.0, 0), makeLayer(-1, 0.55, 0.04)];

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
    ring.position.set(0, PLASMA_Y, 0.25 + i * 0.05);
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
      for (const m of plasmaMats) m.uniforms.uTime.value = t;
      for (const mat of ringMats) mat.uniforms.uTime.value = t;
      updateSmoke(smoke, t);
      light.intensity = 1.8 + 0.8 * Math.sin(t * 3.1) * Math.sin(t * 1.7);
    },
  };
  if (!world.runeGates) world.runeGates = [];
  world.runeGates.push(site);
  return site;
}
