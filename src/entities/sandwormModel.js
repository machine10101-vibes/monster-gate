import * as THREE from 'three';
import { hash3, jitter, mix } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { Rig, makeKind, instantiate, smooth2 } from './beastKit.js';

/**
 * Sand Spine Worm, after the voxel reference: a long ringed body of mottled tan
 * tiles banded with dark brown, a bulbous head that is nothing but a round,
 * gaping maw, a red ribbed throat that tunnels back into the dark, three rings
 * of cream teeth pointing inward, a fat red tongue, and curved horn-tusks
 * sprouting from dark iron-grey collars all along the body and around the lip.
 *
 * Design unit = 0.05 local (the game scales the worm up). The rig is 1.5 voxels
 * per design unit so the tile mottling reads at close range. +z is forward,
 * +y up. The body rests horizontally; the AI rears the front segments up out of
 * the sand and leaves the rest buried.
 */
const S = 0.05;
const K = 1.5;
export const WORM_Y = 11;
const YC = WORM_Y + 0.5;

const P = {
  tan: [0xd9b98a, 0xceac7c, 0xc29e6e, 0xe3c79a, 0xd2b082, 0xb8915f],
  blot: [0x8f6a45, 0x7a5638, 0xa07a52, 0x6b4a30],
  band: [0x5e3f2a, 0x6e4a30, 0x4f3423, 0x684530],
  lip: [0xe6cc9e, 0xdcbf8e, 0xd0b07e, 0xeed6aa],
  throat: [0xa8463e, 0x963a34, 0xb4524a, 0x8a3430],
  ridge: [0x7a2a26, 0x6a2422, 0x84302a],
  deep: 0x220909,
  tongue: [0xb44c46, 0xa64440, 0xc0605a],
  groove: 0x7a2c28,
  tooth: [0xf6eedc, 0xefe4cc, 0xfffaf0],
  gum: 0xc9a88a,
  horn: [0xd8bc8c, 0xccae7e, 0xe2c99c, 0xc4a272],
  hornLine: 0x8e6e4c,
  hornTip: 0xf2e4c6,
  collar: [0x4a4744, 0x3a3836, 0x5c5854, 0x2f2d2b],
};

const h = (x, y, z, s = 0) => hash3(Math.floor(x * K), Math.floor(y * K), Math.floor(z * K), s);
const pick = (arr, r) => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];

/** Body radius along the worm, tail tip to the lip. */
const PROF = [[-64, 2.6], [-58, 4.6], [-48, 6.6], [-36, 8.1], [-22, 9.2], [-6, 9.8], [6, 9.7], [12, 8.7], [17, 8.9], [22, 10.6], [28, 11.9], [33, 11.5], [37, 10.4]];
export function radiusAt(z) {
  if (z <= PROF[0][0]) return PROF[0][1];
  for (let i = 1; i < PROF.length; i++) {
    const [z1, r1] = PROF[i];
    const [z0, r0] = PROF[i - 1];
    if (z <= z1) return r0 + ((r1 - r0) * (z - z0)) / (z1 - z0);
  }
  return PROF[PROF.length - 1][1];
}

/** Segment boundaries (front edge first) and the rig part that owns each span. */
const SEGS = [
  ['head', 19, 40],
  ['n1', 10, 19],
  ['b1', 0, 10],
  ['b2', -10, 0],
  ['b3', -20, -10],
  ['b4', -30, -20],
  ['b5', -40, -30],
  ['b6', -50, -40],
  ['tail', -66, -50],
];
const segOf = (z) => (SEGS.find(([, a, b]) => z >= a && z < b) || SEGS[0])[0];
const SEAMS = [19, 10, 0, -10, -20, -30, -40, -50];

/** Mottled tile hide with dark seam bands and brown blotches, as on the reference. */
function hide(x, y, z) {
  const ang = Math.atan2(x, y - YC);
  const warp = (smooth2(z * 0.35, ang * 2.2, 7) - 0.5) * 1.6;
  let seam = 99;
  for (const s of SEAMS) seam = Math.min(seam, Math.abs(z - s + warp));
  const mid = Math.abs(((z + 1000) % 10) - 5 + warp * 0.6);
  const r = h(x, y, z, 3);
  if (seam < 1.15 || (mid < 0.45 && r < 0.55)) return jitter(pick(P.band, h(x, y, z, 5)), 0.06, r);
  const blot = smooth2(z * 0.18 + 40, ang * 1.6 + y * 0.05, 11);
  if (blot > 0.64 && r < 0.8) return jitter(pick(P.blot, h(x, y, z, 9)), 0.05, r);
  const top = (y - YC) / 12;
  return jitter(mix(pick(P.tan, r), 0xf0dcb4, Math.max(0, top) * 0.18), 0.05, h(x, y, z, 13));
}

function lipPaint(x, y, z) {
  const r = h(x, y, z, 17);
  if (r < 0.12) return pick(P.blot, h(x, y, z, 19));
  return jitter(pick(P.lip, r), 0.05, h(x, y, z, 21));
}

/** Throat axis radius: a cone from the rim back into the dark. */
const throatR = (z) => (z >= 35 ? 8.3 : z <= 15 ? 2.6 : 2.6 + ((z - 15) / 20) * 5.7);

/** A horn-tusk on a quadratic curve: out along the radial, then forward and down. */
function horn(R, own, p0, out, len, r0, fwd = 0.45, drop = 0.45) {
  R.own(own);
  const ox = out[0];
  const oy = out[1];
  // Iron-grey socket collar the horn sprouts from.
  R.cap([p0[0] - ox * 0.4, p0[1] - oy * 0.4, p0[2]], [p0[0] + ox * 0.7, p0[1] + oy * 0.7, p0[2]], r0 + 0.45, r0 + 0.35, (x, y, z) => pick(P.collar, h(x, y, z, 23)));
  const p1 = [p0[0] + ox * len * 0.55, p0[1] + oy * len * 0.55, p0[2] + len * 0.08];
  const p2 = [p0[0] + ox * len * 0.78, p0[1] + oy * len * 0.78 - len * drop, p0[2] + len * fwd];
  const N = 16;
  let prev = p0;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    const p = [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1], a * p0[2] + b * p1[2] + c * p2[2]];
    const ra = Math.max(0.42, r0 * (1 - ((i - 1) / N) * 0.85));
    const rb = Math.max(0.42, r0 * (1 - t * 0.85));
    const t0 = (i - 1) / N;
    R.cap(prev, p, ra, rb, (x, y, z, tt) => {
      const T = t0 + tt / N;
      if (T > 0.84) return jitter(P.hornTip, 0.04, h(x, y, z, 29));
      if ((T * 9) % 1 < 0.12) return P.hornLine;
      return jitter(pick(P.horn, h(x, y, z, 31)), 0.05, h(x, y, z, 33));
    });
    prev = p;
  }
}

function tooth(R, base, tip, r0) {
  R.own(base[1] < YC - 1.4 ? 'jaw' : 'head');
  R.cap(base, tip, r0, 0.32, (x, y, z, t) => (t < 0.16 ? P.gum : t > 0.7 ? P.tooth[2] : jitter(pick(P.tooth, h(x, y, z, 37)), 0.03, h(x, y, z, 39))));
}

function sculpt() {
  const R = new Rig(-27, -8, -68, 27, 40, 46, K);

  // Body: short tapered slices so the profile follows PROF exactly.
  for (let z = -66; z < 24; z += 1.5) {
    const z2 = z + 1.5;
    R.own(segOf(z + 0.75));
    R.cap([0, WORM_Y, z], [0, WORM_Y, z2], radiusAt(z), radiusAt(z2), hide, [1, 0.95, 1]);
  }
  // Ring plates: each segment swells in the middle so it reads as an annulus.
  for (const [id, a, b] of SEGS) {
    if (id === 'head') continue;
    const zm = (a + b) / 2;
    const r = radiusAt(zm);
    R.own(id);
    R.ell([0, WORM_Y, zm], [r + 0.7, r * 0.95 + 0.7, (b - a) * 0.36], hide);
  }

  // Ball joints at the bending hinges so a reared neck never opens a gap.
  for (const [id, z] of [['n1', 19], ['n1', 10], ['b1', 0]]) {
    R.own(id);
    const r = radiusAt(z) * 0.97;
    R.ell([0, WORM_Y, z], [r, r * 0.95, r * 0.9], hide);
  }

  // Head: a bulb that is all maw, with a thick rolled lip.
  R.own('head');
  R.ell([0, YC, 27], [12.1, 11.6, 10.6], hide);
  R.cap([0, WORM_Y, 18], [0, YC, 24], 8.9, 11.2, hide);
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    R.ell([Math.sin(a) * 9.7, YC + Math.cos(a) * 10.1, 36.2], [2.7, 2.7, 2.4], lipPaint);
  }

  // The lower half of the maw is the jaw so the bite can gape and clamp.
  R.reown('head', 'jaw', (x, y, z) => z > 21.5 && y < YC - 1.4);

  // Carve the throat: a cone of air from the lip back into the neck.
  const k = K;
  for (let gz = Math.floor(14 * k); gz <= Math.ceil(42 * k); gz++) {
    const z = (gz + 0.5) / k;
    const rt = throatR(z);
    for (let gy = Math.floor((YC - 10) * k); gy <= Math.ceil((YC + 10) * k); gy++)
      for (let gx = Math.floor(-10 * k); gx <= Math.ceil(10 * k); gx++) {
        const x = (gx + 0.5) / k;
        const y = (gy + 0.5) / k;
        const d = (x / rt) ** 2 + ((y - YC) / (rt * 1.06)) ** 2;
        if (d <= 1) R.clearG(gx, gy, gz);
      }
  }
  // Paint the throat walls: red rings, darker and darker down the tunnel.
  R.paint((x, y, z, col, own) => {
    if (z < 13 || z > 38.2 || (own !== 'head' && own !== 'jaw' && own !== 'n1')) return null;
    const rt = throatR(z);
    const d = Math.sqrt((x / rt) ** 2 + ((y - YC) / (rt * 1.06)) ** 2);
    if (z > 35.4) return d < 1.14 ? jitter(pick(P.throat, h(x, y, z, 59)), 0.06, h(x, y, z, 61)) : null;
    if (d > 1.32) return null;
    const ring = Math.floor(z * 1.35 + (smooth2(x * 0.4, y * 0.4, 3) - 0.5) * 1.2) % 2 === 0;
    const base = ring ? pick(P.ridge, h(x, y, z, 41)) : pick(P.throat, h(x, y, z, 43));
    const depth = Math.min(1, Math.max(0, (31 - z) / 16));
    return jitter(mix(base, P.deep, depth * depth * 0.9), 0.05, h(x, y, z, 45));
  });

  // Tongue lolling on the floor of the jaw, with a groove down the middle.
  R.own('jaw');
  R.ell([0, YC - 6.3, 27.5], [3.9, 1.6, 7.6], (x, y, z) => {
    if (Math.abs(x) < 0.55 && y > YC - 5.4) return P.groove;
    if (Math.floor(z * 1.5) % 3 === 0) return pick(P.ridge, h(x, y, z, 47));
    return jitter(pick(P.tongue, h(x, y, z, 49)), 0.05, h(x, y, z, 51));
  });

  // Three rings of teeth, all raked inward toward the throat.
  const rows = [
    { z: 35.4, rx: 8.6, ry: 9.0, n: 18, len: 0.46, r0: 1.05, back: 2.4 },
    { z: 30.8, rx: 7.1, ry: 7.5, n: 13, len: 0.4, r0: 0.9, back: 1.9 },
    { z: 26.4, rx: 5.4, ry: 5.7, n: 9, len: 0.36, r0: 0.75, back: 1.4 },
  ];
  rows.forEach((row, ri) => {
    for (let i = 0; i < row.n; i++) {
      const a = ((i + (ri % 2) * 0.5) / row.n) * Math.PI * 2;
      const s = Math.sin(a);
      const c = Math.cos(a);
      const base = [s * row.rx, YC + c * row.ry, row.z];
      const L = 1 - row.len * (0.85 + h(i, ri, 3, 53) * 0.35);
      const tip = [s * row.rx * L, YC + c * row.ry * L, row.z - row.back];
      tooth(R, base, tip, row.r0);
    }
  });

  // Horn-tusks around the outside of the lip: a fringe of hooks raking back and down.
  for (const side of [1, -1]) {
    for (const [deg, len] of [[38, 9.5], [72, 10.5], [108, 10], [142, 9], [168, 7.5]]) {
      const th = (deg * Math.PI) / 180;
      const out = [Math.sin(th) * side, Math.cos(th)];
      const rr = radiusAt(30) - 0.4;
      const p0 = [out[0] * rr, YC + out[1] * rr, 30.5];
      horn(R, deg > 118 ? 'jaw' : 'head', p0, out, len, 1.6, -0.12, 0.38);
    }
  }
  // Two tall horns over the crown, hooking forward over the maw.
  for (const side of [1, -1]) {
    const th = (14 * Math.PI) / 180;
    const out = [Math.sin(th) * side, Math.cos(th)];
    horn(R, 'head', [out[0] * 10.6, YC + out[1] * 10.6, 24], out, 9, 1.55, 0.7, 0.5);
  }

  // Body horns: two pairs on every ring, smaller toward the tail.
  for (const [id, a, b] of SEGS) {
    if (id === 'head') continue;
    const zm = (a + b) / 2;
    const r = radiusAt(zm);
    const sc = Math.min(1, r / 9.4);
    const pairs = id === 'tail' ? [[60, 0.75]] : [[52, 1.05], [104, 0.95]];
    pairs.forEach(([deg, l], j) => {
      for (const side of [1, -1]) {
        const th = ((deg + (h(zm, j, side, 57) - 0.5) * 10) * Math.PI) / 180;
        const out = [Math.sin(th) * side, Math.cos(th)];
        const p0 = [out[0] * (r - 0.3), WORM_Y + out[1] * (r * 0.95 - 0.3), zm + (j ? -1.8 : 1.6)];
        horn(R, id, p0, out, r * l * 1.3, 1.75 * sc, 0.95, j ? 0.5 : 0.62);
      }
    });
  }
  return R;
}

const SPEC = [
  { id: 'b1', parent: null, pivot: [0, WORM_Y, 0] },
  { id: 'n1', parent: 'b1', pivot: [0, WORM_Y, 10] },
  { id: 'head', parent: 'n1', pivot: [0, WORM_Y, 19] },
  { id: 'jaw', parent: 'head', pivot: [0, YC - 2, 22] },
  { id: 'b2', parent: 'b1', pivot: [0, WORM_Y, 0] },
  { id: 'b3', parent: 'b2', pivot: [0, WORM_Y, -10] },
  { id: 'b4', parent: 'b3', pivot: [0, WORM_Y, -20] },
  { id: 'b5', parent: 'b4', pivot: [0, WORM_Y, -30] },
  { id: 'b6', parent: 'b5', pivot: [0, WORM_Y, -40] },
  { id: 'tail', parent: 'b6', pivot: [0, WORM_Y, -50] },
];

export const WORM_UNIT = S;

let kind = null;
export function buildSandSpineWorm() {
  if (!kind) kind = makeKind(sculpt(), SPEC, S);
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const { root, groups: g } = instantiate(kind, mat);
  const parts = {
    head: g.head,
    jaw: g.jaw,
    neck: g.n1,
    front: g.b1,
    back: [g.b2, g.b3, g.b4, g.b5, g.b6, g.tail],
    segs: [g.head, g.n1, g.b1, g.b2, g.b3, g.b4, g.b5, g.b6, g.tail],
    tail: g.tail,
  };
  return { root, mat, parts, tris: kind.tris };
}
