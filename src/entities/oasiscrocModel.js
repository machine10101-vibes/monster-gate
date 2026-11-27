import * as THREE from 'three';
import { hash3, jitter, mix } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { Rig, makeKind, instantiate } from './beastKit.js';

/**
 * Oasis Crocodile. Same rig as the other beasts: one voxel body cut into joints with shared geometry.
 * +z is forward, +y is up. A long low body on four sprawling legs, a heavy skull with a separate
 * lower jaw lined with pale teeth, rows of dark osteoderms down the back, and a long tail that lies
 * level with the ground. The tail is six joints so a travelling wave can run down it as it walks
 * and swims.
 */

const C = {
  S: 0.05,
  olive: 0x6b7a3a,
  oliveHi: 0x87964a,
  oliveLo: 0x4c5828,
  brown: 0x5a4630,
  brownLo: 0x3c2e20,
  belly: 0xc2b07e,
  bellyLo: 0x9c8a5c,
  tooth: 0xe2d4a8,
  toothLo: 0xb8a77c,
  mouth: 0x8a4c40,
  mouthLo: 0x5e2e28,
  eye: 0xe0a020,
  claw: 0xcdbd92,
};

const h3 = (x, y, z, s) => hash3(Math.floor(x), Math.floor(y), Math.floor(z), s);

/** Olive hide with brown mottling on top, tan belly underneath. */
function hide(belly = 3.6) {
  return (x, y, z) => {
    if (y < belly) return jitter(mix(C.bellyLo, C.belly, 0.6), 0.05, h3(x, y, z, 71));
    const blot = h3(x * 0.35, y * 0.5, z * 0.3, 72);
    const base = blot > 0.78 ? C.brown : blot > 0.68 ? C.oliveLo : h3(x, y, z, 73) > 0.8 ? C.oliveHi : C.olive;
    // A grid of scale seams reads as tiles at this voxel size.
    const seam = (Math.floor(z) % 3 === 0 || Math.floor(x) % 4 === 0) && h3(x, y, z, 74) > 0.45;
    return jitter(seam ? mix(base, C.brownLo, 0.35) : base, 0.05, h3(x, y, z, 75));
  };
}

const scute = (x, y, z) => jitter(h3(x, y, z, 76) > 0.5 ? C.brownLo : C.brown, 0.06, h3(x, y, z, 77));

function sculptCroc() {
  const R = new Rig(-17, -1, -56, 17, 15, 42, 1);
  const skin = hide(3.4);

  // Body: long, low and broad, with two rows of osteoderms down the back.
  R.own('body');
  R.ell([0, 6, 0], [7.6, 4, 15], skin);
  R.ell([0, 6.4, 11], [6.2, 3.6, 6], skin);
  R.ell([0, 6.2, -11], [6.4, 3.6, 6], skin);
  for (let z = -13; z <= 12; z += 2.6) {
    for (const s of [1, -1]) R.ell([s * 1.8, 9.7 - Math.abs(z) * 0.03, z], [1.05, 0.9, 1.1], scute);
    for (const s of [1, -1]) R.ell([s * 4.4, 8.9 - Math.abs(z) * 0.03, z + 1.3], [0.9, 0.7, 1], scute);
  }

  // Head: a heavy skull, raised eyes, a long flat snout lined with downward teeth.
  R.own('head');
  R.ell([0, 6.8, 17], [5.4, 3.4, 5], skin);
  R.cap([0, 6.6, 19], [0, 5.8, 36], 3.6, 2.3, skin, [1.25, 0.62, 1]);
  R.ell([0, 5.9, 36.5], [3.2, 1.6, 2.2], skin);
  for (const s of [1, -1]) {
    R.ell([s * 2.7, 9.3, 16.5], [1.5, 1.3, 1.7], skin);
    R.set(s * 3.4, 9.6, 17.5, C.eye, true);
    R.set(s * 3.4, 10, 17.5, C.eye, true);
    R.set(s * 1.1, 7.4, 37.6, C.brownLo);
    // Upper teeth along both sides of the snout.
    for (let z = 21; z <= 36; z += 1.6) {
      const w = 4.2 - (z - 21) * 0.11;
      const long = Math.round(z * 10) % 3 === 0;
      R.cap([s * w, 4.6, z], [s * w, long ? 2.6 : 3.4, z + 0.2], 0.55, 0.15, () => (long ? C.tooth : C.toothLo));
    }
  }
  R.box(-3.4, 4.2, 21, 3.4, 4.9, 36, () => C.mouth);

  // Lower jaw on its own joint so the bite can open wide.
  R.own('jaw');
  R.cap([0, 4.3, 16], [0, 3.7, 36], 3.4, 2.0, skin, [1.25, 0.55, 1]);
  R.box(-2.8, 4.1, 19, 2.8, 4.7, 35, () => C.mouthLo);
  for (const s of [1, -1]) {
    for (let z = 20; z <= 35; z += 1.6) {
      const w = 3.7 - (z - 20) * 0.1;
      const long = Math.round(z * 10) % 4 === 0;
      R.cap([s * w, 4.4, z + 0.8], [s * w, long ? 6.4 : 5.6, z + 1], 0.55, 0.15, () => (long ? C.tooth : C.toothLo));
    }
  }

  // Four sprawling legs: upper limb out to the side, forearm down to a splayed foot with pale claws.
  const leg = (id, s, z, big) => {
    R.own(id);
    const r = big ? 2.2 : 1.8;
    R.cap([s * 5.8, 5.2, z], [s * 11, 4.6, z + 0.6], r, r * 0.85, skin);
    R.cap([s * 11, 4.6, z + 0.6], [s * 12, 1, z + 1.8], r * 0.85, r * 0.65, skin);
    R.ell([s * 12.2, 0.7, z + 2.8], [2, 0.75, 2.2], skin);
    for (const d of [-1.2, 0, 1.2]) R.cap([s * (12.2 + d * 0.5), 0.6, z + 4.2], [s * (12.4 + d * 0.9), 0.3, z + 5.6], 0.45, 0.2, () => C.claw);
  };
  leg('FL', 1, 8.5, false);
  leg('FR', -1, 8.5, false);
  leg('BL', 1, -9.5, true);
  leg('BR', -1, -9.5, true);

  // The tail: six joints, level with the ground, taller than wide, with a double crest of scutes
  // that merges into one ridge toward the tip.
  const TAIL = [
    ['t1', -14, -22, 5.6, 5.2, 4.6, 4.0],
    ['t2', -22, -29, 5.2, 4.8, 4.0, 3.4],
    ['t3', -29, -36, 4.8, 4.4, 3.4, 2.7],
    ['t4', -36, -42, 4.4, 4.0, 2.7, 2.0],
    ['t5', -42, -48, 4.0, 3.7, 2.0, 1.3],
    ['t6', -48, -54, 3.7, 3.4, 1.3, 0.5],
  ];
  for (const [id, z0, z1, y0, y1, r0, r1] of TAIL) {
    R.own(id);
    R.cap([0, y0, z0], [0, y1, z1], r0, r1, hide(y0 - r0 * 0.55), [0.72, 1, 1]);
    for (let z = z0 - 1; z > z1; z -= 2.2) {
      const t = (z - z0) / (z1 - z0);
      const r = r0 + (r1 - r0) * t;
      const top = y0 + (y1 - y0) * t + r;
      const crest = Math.max(0.55, r * 0.32);
      if (z > -40) for (const s of [1, -1]) R.ell([s * r * 0.32, top + crest * 0.5, z], [crest * 0.55, crest, crest * 0.8], scute);
      else R.ell([0, top + crest * 0.6, z], [crest * 0.5, crest * 1.1, crest * 0.9], scute);
    }
  }
  return R;
}

const SPEC = [
  { id: 'body', parent: null, pivot: [0, 6, 0] },
  { id: 'head', parent: 'body', pivot: [0, 6.6, 13] },
  { id: 'jaw', parent: 'head', pivot: [0, 4.6, 15] },
  { id: 'FL', parent: 'body', pivot: [5.8, 5.2, 8.5] },
  { id: 'FR', parent: 'body', pivot: [-5.8, 5.2, 8.5] },
  { id: 'BL', parent: 'body', pivot: [5.8, 5.2, -9.5] },
  { id: 'BR', parent: 'body', pivot: [-5.8, 5.2, -9.5] },
  { id: 't1', parent: 'body', pivot: [0, 5.6, -14] },
  { id: 't2', parent: 't1', pivot: [0, 5.2, -22] },
  { id: 't3', parent: 't2', pivot: [0, 4.8, -29] },
  { id: 't4', parent: 't3', pivot: [0, 4.4, -36] },
  { id: 't5', parent: 't4', pivot: [0, 4.0, -42] },
  { id: 't6', parent: 't5', pivot: [0, 3.7, -48] },
];

let kind = null;
export function buildOasisCrocodile() {
  if (!kind) kind = makeKind(sculptCroc(), SPEC, C.S);
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const { root, groups: g } = instantiate(kind, mat);
  const parts = {
    body: g.body,
    head: g.head,
    jaw: g.jaw,
    legs: [g.FL, g.FR, g.BL, g.BR],
    tail: [g.t1, g.t2, g.t3, g.t4, g.t5, g.t6],
  };
  return { root, mat, parts, tris: kind.tris };
}
