import * as THREE from 'three';
import { hash3, jitter, mix, shade } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { TREX as C } from '../data/beasts.js';
import { Rig, makeKind, instantiate, smooth2 } from './beastKit.js';

/**
 * Tyrant Rex, after the voxel reference: a massive skull on a short bull neck,
 * a gaping jaw lined with cream teeth, one blazing amber eye under a heavy brow,
 * olive-green hide mottled darker, a pale tan throat and belly, dark red stripes
 * raked diagonally across the flanks and face, tiny two-clawed arms, columns for
 * legs and a long counterweight tail. Design unit = voxel = 0.025 (scaled up in
 * game). +z forward, +y up, x > 0 is the rex's left. Same rig layout as the
 * Battle Raptor so the beast kit and gait code carry over.
 */
const K = 0.75;
const h = (x, y, z, s = 0) => hash3(Math.floor(x * K), Math.floor(y * K), Math.floor(z * K), s);
const pick = (arr, r) => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];

const GREENS = [C.green, C.greenHi, C.green, C.greenLo, C.olive, C.green];
const DEEP = [C.greenLo, C.greenDeep, C.greenLo];
const TANS = [C.tan, C.tanHi, C.tan, C.tanLo];
const BELLIES = [C.belly, C.tanHi, C.belly, C.tan];

const tile = (x, y, z, pal, amt = 0.1, s = 1) => jitter(pick(pal, h(x, y, z, s)), amt, h(x, y, z, s + 40));

/**
 * Raked stripes: thin dark-red bands running diagonally down and back, wobbled by
 * noise, with a deeper red core, as on the reference's flanks and face.
 */
function stripe(x, y, z, every = 9, width = 1.1, slope = 0.62) {
  const wob = smooth2(x * 0.08 + z * 0.06, y * 0.09, 17) * 5;
  const v = z * 0.42 - y * slope + wob + Math.abs(x) * 0.12;
  const f = ((v % every) + every) % every;
  if (f > width) return null;
  return f < width * 0.45 ? jitter(C.stripeDeep, 0.08, h(x, y, z, 71)) : jitter(C.stripe, 0.1, h(x, y, z, 72));
}

/** Olive-green hide, mottled with deep-green patches and small tan flecks, raked with red. */
function hide(x, y, z, o = {}) {
  const { stripes = true, every = 9 } = o;
  if (stripes && Math.abs(x) > 3) {
    const s = stripe(x, y, z, every);
    if (s) return s;
  }
  const p = smooth2(x * 0.16 + z * 0.09, y * 0.19 + z * 0.05, 5) + (h(x, y, z, 9) - 0.5) * 0.2;
  if (p > 0.78) return tile(x, y, z, TANS, 0.1, 3);
  if (p < 0.3) return tile(x, y, z, DEEP, 0.1, 4);
  return tile(x, y, z, GREENS, 0.1, 2);
}

/** Dark ridge scutes along the spine. */
const ridge = (x, y, z) => jitter(h(x, y, z, 61) < 0.5 ? C.ridge : C.ridgeHi, 0.12, h(x, y, z, 62));

function torsoCoat(x, y, z) {
  const v = (y - 42) / 14;
  const e = (h(x, y, z, 11) - 0.5) * 0.25;
  if (v + e > 0.86 && Math.abs(x) < 4) return ridge(x, y, z);
  if (v + e * 0.6 < -0.42 || (z > 14 && v < 0 && Math.abs(x) < 7)) {
    const rib = ((z + 60) % 3.4) < 0.9 ? 0.86 : 1;
    return shade(tile(x, y, z, BELLIES, 0.07, 5), rib);
  }
  return hide(x, y, z);
}

function headCoat(x, y, z) {
  const ax = Math.abs(x);
  if (y > 64 && ax < 3.5 && z < 56) return ridge(x, y, z);
  if (y < 54 && z > 40) return h(x, y, z, 19) < 0.6 ? tile(x, y, z, TANS, 0.08, 8) : hide(x, y, z, { every: 7 });
  return hide(x, y, z, { every: 7 });
}

function tailCoat(x, y, z, cy) {
  const v = (y - cy) / 7;
  if (v > 0.75 && Math.abs(x) < 3) return ridge(x, y, z);
  if (v < -0.5) return tile(x, y, z, BELLIES, 0.08, 5);
  return hide(x, y, z, { every: 10 });
}

function limbCoat(x, y, z) {
  if (y < 18 && h(x, y, z, 21) < 0.35) return tile(x, y, z, TANS, 0.1, 6);
  return hide(x, y, z, { every: 8 });
}

function claw(R, base, dir, len, r0) {
  const pts = [base];
  let cur = base;
  for (const [f, drop] of [[0.4, 0], [0.34, -0.5], [0.28, -1.1]]) {
    cur = [cur[0] + dir[0] * len * f, cur[1] + (dir[1] + drop) * len * f, cur[2] + dir[2] * len * f * (drop < -1 ? 0.5 : 1)];
    pts.push(cur);
  }
  const radii = [r0, r0 * 0.82, r0 * 0.58, 0.3];
  for (let i = 0; i < 3; i++) {
    R.cap(pts[i], pts[i + 1], radii[i], radii[i + 1], (x, y, z, t) => jitter(mix(C.clawLo, C.clawTip, (i + t) / 3), 0.08, h(x, y, z, 34)));
  }
}

function tooth(R, base, tip, r0) {
  R.cap(base, tip, r0, 0.2, (x, y, z, t) => jitter(mix(C.toothLo, C.tooth, t * 0.9 + 0.1), 0.04, h(x, y, z, 35)));
}

function sculpt() {
  const R = new Rig(-30, 0, -104, 30, 84, 86, K);

  /* torso: a deep barrel, belly sagging, hips high */
  R.own('torso');
  R.ell([0, 42, 12], [13, 15.5, 16], torsoCoat);
  R.ell([0, 43, -6], [12.6, 14.6, 14], torsoCoat);
  R.ell([0, 44, -20], [11.4, 12.4, 10], torsoCoat);
  R.ell([0, 34, 6], [10, 7, 14], torsoCoat);
  for (const s of [-1, 1]) R.ell([s * 8.8, 47, 14], [5.2, 7, 9], torsoCoat);

  /* neck: short and bull-thick */
  R.own('neck');
  R.cap([0, 49, 24], [0, 56, 38], 11.6, 10.4, (x, y, z) => (y < 46 + (z - 24) * 0.45 ? tile(x, y, z, BELLIES, 0.08, 5) : hide(x, y, z, { every: 8 })), [0.92, 1, 1]);

  /* head: a huge skull and upper jaw */
  R.own('head');
  R.ell([0, 61, 46], [10.6, 8.6, 11], headCoat);
  R.cap([0, 61, 50], [0, 58.4, 76], 9.4, 7.2, headCoat, [0.9, 0.86, 1]);
  R.ell([0, 58.6, 77], [6, 5.4, 3], headCoat);
  for (const s of [-1, 1]) {
    // heavy brow over the eye and the cheek muscle behind it
    R.ell([s * 7.4, 66.2, 52], [3.6, 2.4, 7], headCoat);
    R.ell([s * 9.4, 56, 44], [3, 6, 8], headCoat);
  }
  // the gaping mouth: dark red palate on the underside of the upper jaw
  R.ell([0, 53.4, 60], [6.8, 1.4, 16], (x, y, z) => jitter(h(x, y, z, 81) < 0.5 ? C.mouth : C.mouthHi, 0.08, h(x, y, z, 82)));
  for (let i = 0; i < 11; i++) {
    const z = 50 + i * 2.5;
    const w = 7.6 - i * 0.18;
    for (const s of [-1, 1]) {
      const big = i === 2 || i === 6;
      tooth(R, [s * w, 53.4, z], [s * (w - 0.3), 53.4 - (big ? 8 : 5.2 + (i % 2) * 1.2), z + 0.8], big ? 1.2 : 0.85);
    }
  }
  for (let i = 0; i < 4; i++) tooth(R, [-2.7 + i * 1.8, 53.6, 77.8], [-2.7 + i * 1.8, 48.4, 78.4], 1.2);
  // eye: a deep socket with a blazing amber eye and a black slit pupil
  for (const s of [-1, 1]) {
    R.stamp([s * 9.6, 62.4, 52], [4.4, 3.6, 4.4], (x, y, z) => jitter(C.dark, 0.3, h(x, y, z, 39)), true);
    R.stamp([s * 10, 62.4, 52.4], [2.8, 2.4, 2.8], (x, y, z, u) => (u > 0.55 ? C.eye : C.eyeHi), true, true);
    R.stamp([s * 10.4, 62.4, 52.8], [0.7, 2.2, 1], () => C.dark, true, false);
    R.stamp([s * 3.6, 63, 78], [1.4, 1.2, 1.4], () => C.dark, true);
  }

  /* lower jaw: hangs open, tongue on top, lined with upturned teeth */
  R.own('jaw');
  R.cap([0, 50, 44], [0, 46.4, 74], 7.6, 5.4, (x, y, z) => (y > 49.8 ? jitter(C.tongue, 0.08, h(x, y, z, 83)) : tile(x, y, z, y < 47.4 ? BELLIES : TANS, 0.08, 7)), [0.94, 0.55, 1]);
  R.ell([0, 46.4, 75], [4.6, 3, 2.6], (x, y, z) => tile(x, y, z, BELLIES, 0.08, 7));
  for (const s of [-1, 1]) R.ell([s * 6.6, 48.6, 46], [3.2, 4, 6], (x, y, z) => hide(x, y, z, { every: 7 }));
  for (let i = 0; i < 10; i++) {
    const z = 52 + i * 2.4;
    const w = 6.4 - i * 0.18;
    for (const s of [-1, 1]) tooth(R, [s * w, 50, z], [s * (w - 0.3), 50 + (i === 5 ? 6.6 : 4 + (i % 2)), z + 0.5], i === 5 ? 1.1 : 0.8);
  }
  R.ell([0, 50.6, 56], [3, 0.9, 12], (x, y, z) => jitter(C.mouthHi, 0.06, h(x, y, z, 38)));

  /* tiny arms, two claws each */
  for (const s of [-1, 1]) {
    const nm = s > 0 ? 'L' : 'R';
    R.own('aU' + nm);
    R.cap([s * 9.6, 36, 22], [s * 11, 30, 25], 3.4, 2.6, (x, y, z) => hide(x, y, z, { every: 7 }));
    R.own('aF' + nm);
    R.cap([s * 11, 30, 25], [s * 10.4, 26.6, 30], 2.6, 2, (x, y, z) => hide(x, y, z, { stripes: false }));
    R.own('aH' + nm);
    R.ell([s * 10.4, 26, 31], [2.2, 1.8, 2.2], (x, y, z) => hide(x, y, z, { stripes: false }));
    for (const f of [-1, 1]) claw(R, [s * (10.4 + f * 0.9), 25.6, 32], [s * f * 0.12, -0.5, 0.8], 4.6, 0.8);
  }

  /* legs: huge drumstick thighs, thick shins, three forward toes with grey claws */
  for (const s of [-1, 1]) {
    const nm = s > 0 ? 'L' : 'R';
    R.own('tU' + nm);
    R.cap([s * 11, 40, -6], [s * 13, 24, 6], 13.4, 8.4, limbCoat);
    R.own('tS' + nm);
    R.cap([s * 13, 24, 6], [s * 12, 10, -6], 7.6, 4.8, limbCoat);
    R.own('tM' + nm);
    R.cap([s * 12, 10, -6], [s * 11.6, 3.6, 2], 4.8, 4.2, limbCoat);
    R.own('tF' + nm);
    R.ell([s * 11.6, 3, 3], [5.6, 3, 5], (x, y, z) => limbCoat(x, y, z));
    for (let f = -1; f <= 1; f++) {
      const fx = s * 11.6 + f * 4.6;
      const len = f === 0 ? 13 : 10.5;
      R.cap([s * 11.6 + f * 1.4, 3.4, 4], [fx + f * 1.2, 2.4, 4 + len], 2.9, 2.2, (x, y, z) => limbCoat(x, y, z));
      claw(R, [fx + f * 1.2, 2.4, 4 + len], [f * 0.08, -0.25, 0.9], f === 0 ? 8.6 : 7.2, 1.7);
    }
    claw(R, [s * 7, 4.4, -1], [s * 0.05, -0.1, -0.6], 5, 1.4);
  }

  /* tail: a long, thick counterweight */
  R.own('tail1');
  R.cap([0, 44, -24], [0, 42, -50], 11.4, 7.8, (x, y, z) => tailCoat(x, y, z, 43), [0.88, 0.94, 1]);
  R.own('tail2');
  R.cap([0, 42, -50], [0, 41, -74], 7.8, 4.6, (x, y, z) => tailCoat(x, y, z, 41.5), [0.88, 0.94, 1]);
  R.own('tail3');
  R.cap([0, 41, -74], [0, 44, -100], 4.6, 1.2, (x, y, z, t) => tailCoat(x, y, z, 41 + t * 3), [0.9, 0.95, 1]);

  // a few lit tiles so the blocky mosaic catches the light like the reference
  R.paint((x, y, z, c, id, gx, gy, gz) => (!R.has(gx, gy + 1, gz) && h(x, y, z, 41) < 0.1 ? shade(c, 1.12) : null));
  return R;
}

const BASE = [
  { id: 'body', parent: null, pivot: [0, 40, 0] },
  { id: 'torso', parent: 'body', pivot: [0, 42, 0] },
  { id: 'neck', parent: 'torso', pivot: [0, 49, 24] },
  { id: 'head', parent: 'neck', pivot: [0, 57, 40] },
  { id: 'jaw', parent: 'head', pivot: [0, 51, 45] },
  { id: 'tail1', parent: 'torso', pivot: [0, 44, -24] },
  { id: 'tail2', parent: 'tail1', pivot: [0, 42, -50] },
  { id: 'tail3', parent: 'tail2', pivot: [0, 41, -74] },
];
const LIMBS = [];
for (const s of [-1, 1]) {
  const n = s > 0 ? 'L' : 'R';
  LIMBS.push(
    { id: 'aU' + n, parent: 'torso', pivot: [s * 9.6, 36, 22] },
    { id: 'aF' + n, parent: 'aU' + n, pivot: [s * 11, 30, 25] },
    { id: 'aH' + n, parent: 'aF' + n, pivot: [s * 10.4, 26.6, 30] },
    { id: 'tU' + n, parent: 'torso', pivot: [s * 11, 40, -6] },
    { id: 'tS' + n, parent: 'tU' + n, pivot: [s * 13, 24, 6] },
    { id: 'tM' + n, parent: 'tS' + n, pivot: [s * 12, 10, -6] },
    { id: 'tF' + n, parent: 'tM' + n, pivot: [s * 11.6, 3.6, 2] }
  );
}

/** Planar (y, z) chain of a leg from the hip to the toe pad. */
export const TREX_LEG = [[40, -6], [24, 6], [10, -6], [3.6, 2], [0.6, 10]];
export const TREX_UNIT = C.S;

let kind = null;
export function buildTyrantRex() {
  if (!kind) kind = makeKind(sculpt(), [...BASE, ...LIMBS], C.S);
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const { root, groups } = instantiate(kind, mat);
  const g = groups;
  const parts = {
    body: g.body,
    torso: g.torso,
    neck: g.neck,
    head: g.head,
    jaw: g.jaw,
    arms: ['L', 'R'].map((n) => ({ up: g['aU' + n], fore: g['aF' + n], hand: g['aH' + n] })),
    legs: ['L', 'R'].map((n) => ({ thigh: g['tU' + n], shin: g['tS' + n], meta: g['tM' + n], foot: g['tF' + n] })),
    tail: [g.tail1, g.tail2, g.tail3],
    spikes: [],
  };
  return { root, mat, parts, tris: kind.tris };
}

