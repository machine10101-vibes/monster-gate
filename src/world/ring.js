import { fbm, hash2, lerp, clamp, smoothstep } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE } from './terrain.js';
import { TILES } from './tiles.js';
import { ARCTIC_SPECS, arcticFeature, paintArcticCell, frostGoldmead, dressArctic } from './arctic.js';
import { JUNGLE_SPECS, jungleFeature, paintJungleCell, dressJungle, finishJungle } from './jungle.js';
import { VOLCANIC_SPECS, volcanicFeature, paintVolcanicCell, dressVolcanic, emberAmount } from './volcanic.js';
import { DESERT_SPECS, desertFeature, paintDesertCell, dressDesert, carveDesert, openLongacreSouth, openDunesEast } from './desert.js';
import { buildHouse } from './models.js';

/**
 * The seven tiles around Oakhollow (44, 45, 46, 54, 56, 64, 66).
 * Each shared edge is copied from the neighbor that was built first, so the
 * meshes meet. Passes cut through the mountain ring are the ways in.
 */

const AUTO = 0;
const PATH = 1;
const WATER = 2;
const STONE = 3;
const FARM = 4;
const GRAVEL = 5;

function rowOf(data, z) {
  const a = new Float32Array(W);
  for (let x = 0; x < W; x++) a[x] = data.H[z * W + x];
  return a;
}

function colOf(data, x) {
  const a = new Float32Array(W);
  for (let z = 0; z < W; z++) a[z] = data.H[z * W + x];
  return a;
}

function reslope(H, slope) {
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const i = z * W + x;
      const h = H[i];
      let s = 0;
      if (x + 1 < W) s = Math.max(s, Math.abs(H[i + 1] - h));
      if (x > 0) s = Math.max(s, Math.abs(H[i - 1] - h));
      if (z + 1 < W) s = Math.max(s, Math.abs(H[i + W] - h));
      if (z > 0) s = Math.max(s, Math.abs(H[i - W] - h));
      slope[i] = s;
    }
  }
}

function paintChanged(data, before, mark) {
  const { H, zone, top, tint, pathMask, forest, slope } = data;
  for (let i = 0; i < H.length; i++) {
    if (Math.abs(H[i] - before[i]) < 0.01 && !mark[i]) continue;
    const h = H[i];
    const tag = mark[i];
    forest[i] = 0;
    if (tag === 2) {
      zone[i] = ZONE.FIELD;
      top[i] = TILE.GRAVEL;
      pathMask[i] = 1;
      tint[i * 3] = 0.95;
      tint[i * 3 + 1] = 0.9;
      tint[i * 3 + 2] = 0.78;
    } else if (tag === 1) {
      zone[i] = ZONE.FIELD;
      top[i] = TILE.PATH;
      pathMask[i] = 1;
      tint[i * 3] = 1;
      tint[i * 3 + 1] = 0.96;
      tint[i * 3 + 2] = 0.84;
    } else if (h < 0.35) {
      zone[i] = ZONE.WATER;
      top[i] = TILE.SAND;
      pathMask[i] = 0;
      tint[i * 3] = 0.75;
      tint[i * 3 + 1] = 0.88;
      tint[i * 3 + 2] = 1;
    } else if (h >= 8) {
      zone[i] = ZONE.MOUNTAIN;
      top[i] = TILE.STONE;
      pathMask[i] = 0;
      tint[i * 3] = 0.92;
      tint[i * 3 + 1] = 0.93;
      tint[i * 3 + 2] = 0.98;
    } else {
      zone[i] = ZONE.FIELD;
      top[i] = TILE.GRASS;
      pathMask[i] = 0;
      tint[i * 3] = 0.86;
      tint[i * 3 + 1] = 1;
      tint[i * 3 + 2] = 0.74;
    }
  }
  reslope(H, slope);
}

function digBand(H, mark, visit) {
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const hit = visit(x, z, H[z * W + x]);
      if (!hit) continue;
      const i = z * W + x;
      if (hit.h < H[i] - 0.01) {
        H[i] = Math.round(hit.h * 2) / 2;
        if (hit.tag) mark[i] = hit.tag;
      } else if (hit.tag && H[i] < 8.6) {
        mark[i] = hit.tag;
      }
    }
  }
}

/** North, west and east notches in the mountain ring. The south row is left alone. */
export function openRingPasses(data) {
  const H = data.H;
  const before = Float32Array.from(H);
  const mark = new Uint8Array(W * W);
  const south = rowOf(data, W - 1);

  digBand(H, mark, (x, z, h) => {
    if (z > 34) return null;
    const fade = 1 - smoothstep(24, 34, z);
    if (fade <= 0) return null;
    const bank = Math.abs(x - 72);
    if (bank > 38) return null;
    const floor = lerp(4.5, 3, clamp(z / 22, 0, 1));
    const want = bank <= 5 ? floor : floor + (bank - 5) * 0.85;
    return { h: lerp(h, Math.min(h, want), fade), tag: bank <= 5 && z <= 26 ? PATH : 0 };
  });

  digBand(H, mark, (x, z, h) => {
    if (x > 46 || z < 34 || z > 98) return null;
    const bank = Math.abs(z - 64);
    const fade = (1 - smoothstep(16, 30, bank)) * (1 - smoothstep(34, 46, x));
    if (fade <= 0) return null;
    const floor = lerp(4.2, 1.4, clamp(x / 30, 0, 1));
    const want = bank <= 4 ? floor : floor + (bank - 4) * 0.85;
    return { h: lerp(h, Math.min(h, want), fade), tag: bank <= 4 && x <= 40 ? PATH : 0 };
  });

  for (let z = 60; z <= 68; z++) {
    for (let x = 28; x <= 38; x++) {
      H[z * W + x] = 1;
      mark[z * W + x] = 2;
    }
  }

  digBand(H, mark, (x, z, h) => {
    if (x < 110 || z < 76 || z > 114) return null;
    const bank = Math.abs(z - 94);
    const fade = 1 - smoothstep(12, 22, bank);
    if (fade <= 0) return null;
    const floor = lerp(4.5, 1.5, clamp((W - 1 - x) / 28, 0, 1));
    const want = bank <= 4 ? floor : floor + (bank - 4) * 0.9;
    return { h: lerp(h, Math.min(h, want), fade), tag: bank <= 4 ? PATH : 0 };
  });

  for (let x = 0; x < W; x++) H[(W - 1) * W + x] = south[x];
  paintChanged(data, before, mark);
}

/** A pass through Harefield's north rim, so the road reaches Ashen Road. */
function openHarefieldNorth(data) {
  const H = data.H;
  const before = Float32Array.from(H);
  const mark = new Uint8Array(W * W);
  digBand(H, mark, (x, z, h) => {
    if (z > 34) return null;
    const fade = 1 - smoothstep(24, 34, z);
    if (fade <= 0) return null;
    const bank = Math.abs(x - 72);
    if (bank > 38) return null;
    const floor = lerp(4.5, 3.6, clamp(z / 22, 0, 1));
    const want = bank <= 5 ? floor : floor + (bank - 5) * 0.85;
    return { h: lerp(h, Math.min(h, want), fade), tag: bank <= 5 && z <= 26 ? PATH : 0 };
  });
  paintChanged(data, before, mark);
}

/** A pass through a west rim, so a road leaves for the jungle block. Band centred on row zc. */
function openWestPass(data, zc) {
  const H = data.H;
  const before = Float32Array.from(H);
  const mark = new Uint8Array(W * W);
  digBand(H, mark, (x, z, h) => {
    if (x > 46) return null;
    const bank = Math.abs(z - zc);
    const fade = (1 - smoothstep(16, 30, bank)) * (1 - smoothstep(34, 46, x));
    if (fade <= 0) return null;
    const floor = lerp(3, 4.2, clamp(x / 30, 0, 1));
    const want = bank <= 4 ? floor : floor + (bank - 4) * 0.85;
    return { h: lerp(h, Math.min(h, want), fade), tag: bank <= 4 && x <= 40 ? PATH : 0 };
  });
  paintChanged(data, before, mark);
}

/** Lanes out of Southford into Longacre and Hayfield. The north row stays on Oakhollow. */
export function openValeSides(data) {
  const H = data.H;
  const before = Float32Array.from(H);
  const mark = new Uint8Array(W * W);
  const north = rowOf(data, 0);

  digBand(H, mark, (x, z, h) => {
    if (z < 16 || x > 22) return null;
    const bank = Math.abs(z - 86);
    const fade = 1 - smoothstep(14, 26, bank);
    if (fade <= 0) return null;
    const inner = H[z * W + 24];
    const floor = lerp(4.2, Math.min(inner, 5.5), clamp(x / 18, 0, 1));
    const want = bank <= 5 ? floor : floor + (bank - 5) * 0.9;
    return { h: lerp(h, Math.min(h, want), fade), tag: bank <= 5 && x <= 16 ? PATH : 0 };
  });

  digBand(H, mark, (x, z, h) => {
    if (z < 16 || x < W - 23) return null;
    const bank = Math.abs(z - 92);
    const fade = 1 - smoothstep(14, 26, bank);
    if (fade <= 0) return null;
    const inner = H[z * W + (W - 25)];
    const floor = lerp(4.2, Math.min(inner, 5.5), clamp((W - 1 - x) / 18, 0, 1));
    const want = bank <= 5 ? floor : floor + (bank - 5) * 0.9;
    return { h: lerp(h, Math.min(h, want), fade), tag: bank <= 5 ? PATH : 0 };
  });

  for (let x = 0; x < W; x++) H[x] = north[x];
  paintChanged(data, before, mark);
}

function noiseAt(x, z, seed, amp) {
  const broad = fbm(x * 0.028, z * 0.026, seed, 4);
  const mid = fbm(x * 0.07 + 2.2, z * 0.066, seed + 5, 3);
  const fine = fbm(x * 0.15, z * 0.14, seed + 11, 2);
  return (broad - 0.42) * amp + (mid - 0.5) * amp * 0.55 + (fine - 0.5) * 0.7;
}

function knollAt(x, z, knolls) {
  let h = 0;
  for (const [cx, cz, r, amp] of knolls) {
    const d = Math.hypot(x - cx, z - cz) / r;
    if (d < 1) h += amp * (1 - d) * (1 - d);
  }
  return h;
}

function onBorder(x, z, edges) {
  return (edges.n && z === 0) || (edges.s && z === W - 1) || (edges.w && x === 0) || (edges.e && x === W - 1);
}

function pullEdge(h, edgeH, dist) {
  const span = clamp(Math.abs(edgeH - h) + 8, 12, 52);
  const w = 1 - smoothstep(0, span, dist);
  return lerp(h, edgeH, w);
}

function stampRoad(H, kind, mask, pts, edges) {
  const samples = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
    for (let s = 0; s < n; s++) {
      const t = s / n;
      samples.push([ax + (bx - ax) * t, az + (bz - az) * t]);
    }
  }
  samples.push(pts[pts.length - 1]);
  const sx = clamp(Math.round(samples[0][0]), 0, W - 1);
  const sz = clamp(Math.round(samples[0][1]), 0, W - 1);
  let h = H[sz * W + sx];
  for (const [x, z] of samples) {
    const ix = clamp(Math.round(x), 0, W - 1);
    const iz = clamp(Math.round(z), 0, W - 1);
    h += clamp(H[iz * W + ix] - h, -0.5, 0.5);
    h = Math.round(h * 2) / 2;
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dz * dz > 2.6) continue;
        const xx = ix + dx;
        const zz = iz + dz;
        if (xx < 0 || zz < 0 || xx >= W || zz >= W) continue;
        const i = zz * W + xx;
        mask[i] = 1;
        if (onBorder(xx, zz, edges)) continue;
        H[i] = h;
        kind[i] = PATH;
      }
    }
  }
}

const SPECS = {
  harefield: {
    banner: ['Hare Leas', 'Harefield'], shade: 0.05, forest: 0.28, amp: 3.4, base: 3.6, seed: 44,
    rim: { n: true, w: true },
    knolls: [[40, 48, 10, 6], [78, 70, 8, 4.5], [24, 90, 7, -1.4], [110, 40, 6, 3]],
    roads: [[[100, 143], [90, 100], [70, 70], [72, 0]]],
  },
  northleas: {
    banner: ['North Pasture', 'Northleas'], shade: 0, forest: 0.22, amp: 3.2, base: 3.3, seed: 45,
    rim: { n: true },
    knolls: [[36, 50, 9, 5], [108, 60, 8, 4], [70, 36, 7, -1.6], [96, 90, 6, 3]],
    pond: [78, 46, 7.5, 5.5],
    roads: [[[72, 143], [72, 90], [64, 55]]],
  },
  goldmead: {
    banner: ['Gold Wood', 'Goldmead'], shade: 0.4, forest: 0.7, amp: 3.4, base: 4, seed: 46,
    rim: { n: true },
    knolls: [[40, 36, 9, 5], [70, 90, 8, 4], [28, 100, 7, 3.2]],
    clearing: [96, 58, 16],
    roads: [[[0, 80], [46, 72], [84, 58], [143, 64]]],
  },
  brookside: {
    banner: ['The Brook', 'Brookside'], shade: 0.08, forest: 0.26, amp: 2.8, base: 3.1, seed: 54,
    rim: { w: true },
    knolls: [[50, 40, 8, 4], [36, 110, 9, 5], [80, 30, 6, -1.2], [24, 70, 5, 2]],
    camp: [38, 24, 18],
    brook: true,
    pond: [34, 86, 6.5, 5],
    roads: [[[143, 64], [90, 64], [55, 78], [20, 78], [0, 78]]],
  },
  eastleas: {
    banner: ['East Fields', 'Eastleas'], shade: 0, forest: 0.18, amp: 2.6, base: 3.2, seed: 56,
    rim: { e: true },
    knolls: [[80, 40, 8, 4], [110, 80, 7, 3.5], [50, 110, 6, -1.3], [90, 60, 5, 2]],
    roads: [[[0, 94], [40, 90], [70, 70]]],
  },
  longacre: {
    banner: ['Long Fields', 'Longacre'], shade: 0, forest: 0.08, amp: 1.8, base: 3, seed: 64,
    rim: { w: true, s: true },
    fields: true,
    knolls: [[40, 40, 7, 2.5], [70, 80, 6, -1], [30, 100, 5, 2]],
    roads: [[[143, 86], [100, 86], [60, 70], [30, 70], [0, 70]]],
  },
  hayfield: {
    banner: ['Hay Meadow', 'Hayfield'], shade: 0, forest: 0.1, amp: 2.2, base: 3.1, seed: 66,
    rim: { e: true, s: true },
    hay: true,
    knolls: [[80, 50, 8, 3], [40, 90, 6, 2], [100, 80, 5, -1]],
    roads: [[[0, 92], [36, 86], [70, 60]]],
  },
  ...ARCTIC_SPECS,
  ...VOLCANIC_SPECS,
  ...JUNGLE_SPECS,
  ...DESERT_SPECS,
};

const HAY = 6;

const ROOF_RUST = [0xa8452f, 0xb9553a, 0x93402c, 0xc66443, 0x7d3a2b];
const ROOF_GOLD = [0xc9a14a, 0xd9b45a, 0xb88f3c, 0xe6c76a, 0xa8802f];
const ROOF_MOSS = [0x4f7f3a, 0x5d9444, 0x44702f, 0x6aa650, 0x3d5f2b];

/** Two farmsteads on Longacre. Coordinates are local to the tile. */
const LONGACRE_FARMS = [
  {
    id: 'mara',
    name: "Mara's Acre",
    farmer: 'Mara',
    animals: 'chicken',
    yard: { x0: 78, z0: 24, x1: 118, z1: 62 },
    lane: { x0: 98, z0: 62, x1: 98, z1: 84 },
    house: { x: 86, z: 32, w: 5, d: 4, rot: 0, seed: 21, wall: 0xe4d2a4, roof: ROOF_MOSS, shutters: 0x4a8c86 },
    barn: { x: 104, z: 30, w: 7, d: 5, rot: 0, seed: 22, wall: 0x6a4328, roof: ROOF_RUST },
    pen: { x0: 84, z0: 44, x1: 114, z1: 58 },
    gate: 's',
    herd: 8,
    look: { skin: 0xf0c09a, hair: 0x6a3418, hairStyle: 'short', hairLen: 6, tunic: 0x3f7a45, sleeve: 0xe7d7b0, pants: 0x3d4f78, boots: 0x3a2a1f, hat: 'straw', seed: 31 },
    lines: [
      'The hens stay in the pen. They drop feathers if you need them for fletching.',
      'Mind the gate. They run when a hunter comes close, and another hen takes the place soon after.',
    ],
  },
  {
    id: 'wend',
    name: 'Wend Farm',
    farmer: 'Wend',
    animals: 'cow',
    yard: { x0: 98, z0: 98, x1: 132, z1: 124 },
    lane: { x0: 114, z0: 98, x1: 114, z1: 88 },
    house: { x: 106, z: 104, w: 5, d: 4, rot: 0, seed: 41, wall: 0x9a6a3c, roof: ROOF_GOLD, shutters: 0xa8452f },
    barn: { x: 122, z: 102, w: 7, d: 5, rot: 0, seed: 42, wall: 0x5c4030, roof: ROOF_RUST },
    pen: { x0: 104, z0: 112, x1: 128, z1: 122 },
    gate: 'n',
    herd: 4,
    look: { skin: 0xc89868, hair: 0x3a2414, hairStyle: 'short', beard: true, tunic: 0x8a4a2c, sleeve: 0xd8c4a0, pants: 0x3a4a78, boots: 0x2a1c14, hat: 'straw', seed: 44 },
    lines: [
      'The cows keep to the pen. The milk goes down the lane to Southford.',
      'Hay is in the barn. Shut the gate if you walk through, or they will stare you down.',
    ],
  },
];

function stampYard(H, kind, yard) {
  const { x0, z0, x1, z1 } = yard;
  let sum = 0;
  let n = 0;
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      sum += H[z * W + x];
      n++;
    }
  }
  const h = Math.round((sum / Math.max(1, n)) * 2) / 2;
  const pad = 6;
  for (let z = z0 - pad; z <= z1 + pad; z++) {
    for (let x = x0 - pad; x <= x1 + pad; x++) {
      if (x <= 0 || z <= 0 || x >= W - 1 || z >= W - 1) continue;
      const dx = Math.max(x0 - x, x - x1, 0);
      const dz = Math.max(z0 - z, z - z1, 0);
      const d = Math.hypot(dx, dz);
      const i = z * W + x;
      if (d <= 0) {
        H[i] = h;
        kind[i] = FARM;
      } else if (d < pad) H[i] = Math.round(lerp(h, H[i], d / pad) * 2) / 2;
    }
  }
  yard.h = h;
}

function stampLane(H, kind, mask, lane) {
  const x0 = Math.round(lane.x0);
  const z0 = Math.round(lane.z0);
  const x1 = Math.round(lane.x1);
  const z1 = Math.round(lane.z1);
  const a = H[z0 * W + x0];
  const b = H[z1 * W + x1];
  const steps = Math.max(1, Math.ceil(Math.hypot(lane.x1 - lane.x0, lane.z1 - lane.z0)));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = lane.x0 + (lane.x1 - lane.x0) * t;
    const z = lane.z0 + (lane.z1 - lane.z0) * t;
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xx = Math.round(x + dx);
        const zz = Math.round(z + dz);
        if (xx <= 0 || zz <= 0 || xx >= W - 1 || zz >= W - 1) continue;
        if (Math.hypot(xx - x, zz - z) > 1.6) continue;
        const i = zz * W + xx;
        kind[i] = PATH;
        mask[i] = 1;
        H[i] = Math.round(lerp(a, b, t) * 2) / 2;
      }
    }
  }
}

function applyFeature(h, x, z, spec) {
  if (spec.arctic) return arcticFeature(h, x, z, spec);
  if (spec.volcanic) return volcanicFeature(h, x, z, spec);
  if (spec.jungle) return jungleFeature(h, x, z, spec);
  if (spec.desert) return desertFeature(h, x, z, spec);
  if (spec.camp) {
    const [cx, cz, r] = spec.camp;
    const dx = (x - cx) / (r * 0.78);
    const dz = (z - cz) / (r * 0.62);
    const d = Math.hypot(dx, dz);
    if (d < 1.08) {
      const pad = 1 - smoothstep(0.62, 1.08, d);
      return { h: lerp(h, 3.05, pad), kind: d < 0.7 ? PATH : AUTO };
    }
  }
  if (spec.clearing) {
    const [cx, cz, r] = spec.clearing;
    const d = Math.hypot(x - cx, z - cz);
    if (d < r && h < 11) return { h: lerp(3.2, h, d / r), kind: AUTO };
  }
  if (spec.pond) {
    const [cx, cz, rx, rz] = spec.pond;
    const d = Math.hypot((x - cx) / rx, (z - cz) / rz);
    if (d < 1.4 && h < 10) {
      if (d < 0.72) return { h: 0, kind: WATER };
      return { h: lerp(0.3, Math.min(h, 3.4), (d - 0.72) / 0.68), kind: AUTO };
    }
  }
  if (spec.brook && x > 22 && x < 118 && h < 8) {
    const cz = 84 + Math.sin(x * 0.045) * 7;
    const d = Math.abs(z - cz);
    if (d < 5) {
      if (d < 1.5) return { h: 0, kind: WATER };
      return { h: lerp(0.4, Math.min(h, 3.2), (d - 1.5) / 3.5), kind: AUTO };
    }
  }
  return null;
}

function makeTile(spec, edges) {
  const H = new Float32Array(W * W);
  const kind = new Uint8Array(W * W);
  const mask = new Float32Array(W * W);
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      let h = spec.base + noiseAt(x, z, spec.seed, spec.amp) + knollAt(x, z, spec.knolls);
      if (spec.rim.n && z < 14) h += (14 - z) * 0.8;
      if (spec.rim.s && z > W - 15) h += (z - (W - 15)) * 0.8;
      if (spec.rim.w && x < 14) h += (14 - x) * 0.8;
      if (spec.rim.e && x > W - 15) h += (x - (W - 15)) * 0.8;
      if (edges.n) h = pullEdge(h, edges.n[x], z);
      if (edges.s) h = pullEdge(h, edges.s[x], W - 1 - z);
      if (edges.w) h = pullEdge(h, edges.w[z], x);
      if (edges.e) h = pullEdge(h, edges.e[z], W - 1 - x);
      if (!onBorder(x, z, edges)) {
        const feat = applyFeature(h, x, z, spec);
        if (feat) {
          h = feat.h;
          kind[z * W + x] = feat.kind;
        }
      }
      H[z * W + x] = h;
    }
  }
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const i = z * W + x;
      if (edges.n && z === 0) H[i] = edges.n[x];
      else if (edges.s && z === W - 1) H[i] = edges.s[x];
      else if (edges.w && x === 0) H[i] = edges.w[z];
      else if (edges.e && x === W - 1) H[i] = edges.e[z];
      else H[i] = Math.round(H[i] * 2) / 2;
    }
  }
  for (const road of spec.roads) stampRoad(H, kind, mask, road, edges);
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      if (onBorder(x, z, edges)) continue;
      const i = z * W + x;
      if (kind[i] === PATH || kind[i] === WATER || kind[i] === STONE || kind[i] === GRAVEL) continue;
      if (spec.fields && x > 28 && x < W - 28 && z > 28 && z < W - 28 && H[i] > 1.2 && H[i] < 5.5) {
        const strip = Math.floor((z + x * 0.22) / 7) % 3;
        if (strip === 0) kind[i] = FARM;
      }
      if (spec.hay && x > 24 && x < W - 24 && z > 24 && z < W - 24 && H[i] > 1.4 && H[i] < 5.2 && hash2(x, z, spec.seed) > 0.62) {
        kind[i] = HAY;
      }
    }
  }
  if (spec.kind === 'longacre') {
    for (const farm of LONGACRE_FARMS) {
      stampYard(H, kind, farm.yard);
      stampLane(H, kind, mask, farm.lane);
    }
  }

  const zone = new Uint8Array(W * W);
  const top = new Uint8Array(W * W);
  const tint = new Float32Array(W * W * 3);
  const forest = new Float32Array(W * W);
  const slope = new Float32Array(W * W);
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const i = z * W + x;
      const h = H[i];
      const n = fbm(x * 0.05, z * 0.05, spec.seed + 2, 2);
      const k = kind[i];
      if (k === PATH) mask[i] = 1;
      if (spec.arctic) {
        paintArcticCell({ zone, top, tint, forest }, H, x, z, k, k === PATH || mask[i] > 0, n, spec);
        continue;
      }
      if (spec.jungle) {
        paintJungleCell({ zone, top, tint, forest }, H, x, z, k, k === PATH || mask[i] > 0, n, spec);
        continue;
      }
      if (spec.volcanic) {
        paintVolcanicCell({ zone, top, tint, forest }, H, x, z, k, k === PATH || mask[i] > 0, n, spec);
        continue;
      }
      if (spec.desert) {
        paintDesertCell({ zone, top, tint, forest }, H, x, z, k, k === PATH || mask[i] > 0, n, spec);
        continue;
      }
      forest[i] = k === PATH || k === WATER || k === FARM ? 0 : spec.forest * (0.55 + n * 0.7);
      if (k === WATER || h < 0.35) {
        zone[i] = ZONE.WATER;
        top[i] = TILE.SAND;
        tint[i * 3] = 0.7;
        tint[i * 3 + 1] = 0.86;
        tint[i * 3 + 2] = 1;
      } else if (k === PATH || mask[i]) {
        zone[i] = ZONE.FIELD;
        top[i] = TILE.PATH;
        tint[i * 3] = 1;
        tint[i * 3 + 1] = 0.96;
        tint[i * 3 + 2] = 0.84;
      } else if (k === GRAVEL) {
        zone[i] = ZONE.FIELD;
        top[i] = TILE.GRAVEL;
        tint[i * 3] = 0.9;
        tint[i * 3 + 1] = 0.88;
        tint[i * 3 + 2] = 0.84;
      } else if (k === STONE || h >= 8) {
        zone[i] = ZONE.MOUNTAIN;
        top[i] = h > 6 && n > 0.55 ? TILE.MOSS_STONE : TILE.STONE;
        forest[i] = 0;
        tint[i * 3] = 0.9;
        tint[i * 3 + 1] = 0.91;
        tint[i * 3 + 2] = 0.97;
      } else if (k === HAY) {
        zone[i] = ZONE.FIELD;
        top[i] = n > 0.5 ? TILE.FLOWER_GRASS : TILE.GRASS;
        tint[i * 3] = 1.05;
        tint[i * 3 + 1] = 0.9;
        tint[i * 3 + 2] = 0.42;
      } else if (k === FARM) {
        zone[i] = ZONE.FARM;
        top[i] = TILE.FARMLAND;
        tint[i * 3] = spec.kind === 'hayfield' ? 1.05 : 0.98;
        tint[i * 3 + 1] = 0.92;
        tint[i * 3 + 2] = 0.55;
      } else {
        zone[i] = spec.forest > 0.4 ? ZONE.FOREST : ZONE.FIELD;
        const flower = n > 0.66 && h < 5.2 && h > 1.4;
        top[i] = flower ? TILE.FLOWER_GRASS : n < 0.22 && h > 3.4 ? TILE.DIRT : TILE.GRASS;
        const gold = spec.kind === 'goldmead' || spec.kind === 'hayfield' ? 0.16 : 0;
        tint[i * 3] = 0.72 + n * 0.26 + gold;
        tint[i * 3 + 1] = 0.88 + (1 - n) * 0.16;
        tint[i * 3 + 2] = 0.5 + n * 0.2;
      }
    }
  }
  reslope(H, slope);
  return { H, zone, top, tint, pathMask: mask, slope, forest };
}

function specEdges(kind, oak, south, made) {
  const north = made.northleas;
  const b = made.brookside;
  const e = made.eastleas;
  if (kind === 'northleas') return { s: rowOf(oak, 0) };
  if (kind === 'brookside') return { e: colOf(oak, 0) };
  if (kind === 'eastleas') return { w: colOf(oak, W - 1) };
  if (kind === 'harefield') return { s: rowOf(b, 0), e: colOf(north, 0) };
  if (kind === 'goldmead') return { w: colOf(north, W - 1), s: rowOf(e, 0) };
  if (kind === 'longacre') return { n: rowOf(b, W - 1), e: colOf(south, 0) };
  if (kind === 'hayfield') return { n: rowOf(e, W - 1), w: colOf(south, W - 1) };
  if (kind === 'snowfall') return { w: colOf(made.goldmead, W - 1) };
  if (kind === 'icewind') return { w: colOf(made.snowfall, W - 1) };
  if (kind === 'rimefang') return { s: rowOf(made.snowfall, 0) };
  if (kind === 'glimmerfrost') return { w: colOf(made.rimefang, W - 1), s: rowOf(made.icewind, 0) };
  if (kind === 'ashroad') return { s: rowOf(made.harefield, 0) };
  if (kind === 'warfield') return { s: rowOf(made.ashroad, 0) };
  if (kind === 'dawnspire') return { e: colOf(made.warfield, 0) };
  if (kind === 'hellspire') return { s: rowOf(made.warfield, 0) };
  if (kind === 'cinderfall') return { e: colOf(made.hellspire, 0), s: rowOf(made.dawnspire, 0) };
  if (kind === 'lagoon') return { e: colOf(b, 0) };
  if (kind === 'sunken') return { e: colOf(made.longacre, 0), n: rowOf(made.lagoon, W - 1) };
  if (kind === 'canopy') return { e: colOf(made.lagoon, 0) };
  if (kind === 'tigerwood') return { n: rowOf(made.canopy, W - 1), e: colOf(made.sunken, 0) };
  if (kind === 'pirateshore') return { n: rowOf(made.sunken, W - 1) };
  if (kind === 'shellbeach') return { n: rowOf(made.tigerwood, W - 1), e: colOf(made.pirateshore, 0) };
  if (kind === 'sunspill') return { n: rowOf(made.longacre, W - 1), w: colOf(made.pirateshore, W - 1) };
  if (kind === 'glassroad') return { n: rowOf(south, W - 1), w: colOf(made.sunspill, W - 1) };
  if (kind === 'deepwell') return { n: rowOf(made.sunspill, W - 1) };
  if (kind === 'greenbowl') return { n: rowOf(made.glassroad, W - 1), w: colOf(made.deepwell, W - 1) };
  return {};
}

/** Height data for the ring. Oakhollow and Southford must already include their passes. */
export function generateRing(oak, south) {
  const order = ['northleas', 'brookside', 'eastleas', 'harefield', 'goldmead', 'longacre', 'hayfield', 'lagoon', 'sunken', 'canopy', 'tigerwood', 'pirateshore', 'shellbeach', 'snowfall', 'icewind', 'rimefang', 'glimmerfrost', 'ashroad', 'warfield', 'dawnspire', 'hellspire', 'cinderfall', 'sunspill', 'glassroad', 'deepwell', 'greenbowl'];
  const made = {};
  const lands = [];
  for (const kind of order) {
    if (kind === 'sunspill') {
      openLongacreSouth(made.longacre);
      openDunesEast(made.pirateshore);
    }
    const spec = { ...SPECS[kind], kind };
    const tile = TILES.find((t) => t.kind === kind);
    const edges = specEdges(kind, oak, south, made);
    for (const key of Object.keys(edges)) if (!edges[key]) edges[key] = null;
    const origin = { x: (tile.tx - 4) * W, z: (tile.tz - 5) * W };
    spec.ox = origin.x;
    spec.oz = origin.z;
    const data = makeTile(spec, edges);
    if (kind === 'harefield') openHarefieldNorth(data);
    if (kind === 'brookside') openWestPass(data, 78);
    if (kind === 'longacre') openWestPass(data, 70);
    made[kind] = data;
    lands.push({
      role: 'ring',
      kind,
      x0: origin.x,
      z0: origin.z,
      data,
      tileId: tile.id,
      banner: spec.banner,
      shade: spec.shade,
      rim: spec.rim,
      arctic: !!spec.arctic,
      volcanic: !!spec.volcanic,
      jungle: !!spec.jungle,
      emberAt: spec.volcanic ? emberAmount(spec) : () => 0,
      chillAt: spec.arctic
        ? spec.blend
          ? (lx) => smoothstep(0, spec.blend.w, lx)
          : () => 1
        : kind === 'goldmead'
          ? (lx) => 0.35 * smoothstep(W - 34, W - 1, lx)
          : () => 0,
    });
  }
  frostGoldmead(made.goldmead);
  carveDesert(lands.filter((l) => DESERT_SPECS[l.kind]));
  return lands;
}

export function sampleLands(lands, x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  for (const land of lands) {
    if (ix >= land.x0 && iz >= land.z0 && ix < land.x0 + W && iz < land.z0 + W) {
      return land.data.H[(iz - land.z0) * W + (ix - land.x0)];
    }
  }
  return null;
}

function campClear(spec, lx, lz) {
  if (!spec.camp) return false;
  const [cx, cz] = spec.camp;
  const dx = (lx - cx) / 16;
  const dz = (lz - cz) / 13;
  return dx * dx + dz * dz < 1;
}

/** Orc camp in the northwest of Brookside: spiked logs, hide huts, a standard. */
function dressOrcCamp(world, land) {
  const m = world.models;
  const spec = SPECS[land.kind];
  const [cx, cz] = spec.camp;
  const rx = 11.4;
  const rz = 8.6;
  const gate = Math.atan2(0.9, 0.55);
  const wx = land.x0 + cx + 0.5;
  const wz = land.z0 + cz + 0.5;
  world.orcCamp = { x: wx, z: wz, r: 16 };

  const drop = (parts, ox, oz, rot, scale, opts = {}) => {
    const x = land.x0 + cx + ox + 0.5;
    const z = land.z0 + cz + oz + 0.5;
    world.putAt(parts, x, z, rot, scale, opts);
    return { x, z };
  };

  const ring = (count, radX, radZ, scaleLo, scaleHi, collide) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const da = Math.atan2(Math.sin(a - gate), Math.cos(a - gate));
      if (Math.abs(da) < 0.2) continue;
      const ox = Math.sin(a) * radX;
      const oz = Math.cos(a) * radZ;
      const n = hash2(i, Math.round(radX), 54);
      const p = drop(m.orcSpikes[i % m.orcSpikes.length], ox, oz, a + (n - 0.5) * 0.4, 1, { scaleY: scaleLo + n * (scaleHi - scaleLo) });
      if (collide) {
        world.circle(p.x, p.z, 0.4);
        world.occupy(p.x, p.z, 0.55);
      }
    }
  };
  ring(52, rx, rz, 0.85, 1.45, true);
  ring(36, rx + 1.35, rz + 1.15, 0.5, 0.85, false);

  for (const s of [-1, 1]) {
    const a = gate + s * 0.22;
    const p = drop(m.orcSpikes[0], Math.sin(a) * rx, Math.cos(a) * rz, a, 1, { scaleY: 1.55 });
    world.circle(p.x, p.z, 0.42);
  }
  const lx = land.x0 + cx + Math.sin(gate) * rx + 0.5;
  const lz = land.z0 + cz + Math.cos(gate) * rz + 0.5;
  world.putAt(m.orcLintel, lx, lz, gate, 1.05, { y: world.heightAt(lx, lz) + 1.05 });

  const huts = [
    { parts: m.orcHuts[0], ox: -3.5, oz: -2.2, r: 1.85 },
    { parts: m.orcHuts[1], ox: 4.0, oz: -1.4, r: 1.45 },
    { parts: m.orcHuts[2], ox: -2.2, oz: 3.3, r: 1.45 },
    { parts: m.orcHuts[3], ox: 3.4, oz: 2.6, r: 1.25 },
  ];
  for (const h of huts) {
    const rot = Math.atan2(-h.ox, -h.oz);
    const p = drop(h.parts, h.ox, h.oz, rot, 1);
    world.circle(p.x, p.z, h.r);
    world.occupy(p.x, p.z, h.r + 0.3);
  }

  const fire = drop(m.orcFire, 0.2, 0.3, 0.4, 1.05);
  world.lightSpots.push({ x: fire.x, y: world.heightAt(fire.x, fire.z) + 0.9, z: fire.z, color: 0xff7a22 });
  world.occupy(fire.x, fire.z, 0.8);

  const banner = drop(m.orcBanner, -0.4, -5.6, gate, 1);
  world.circle(banner.x, banner.z, 0.35);
  world.occupy(banner.x, banner.z, 0.6);

  const totem = drop(m.orcTotem, Math.sin(gate) * (rx - 2.2), Math.cos(gate) * (rz - 1.8), gate + 0.4, 1);
  world.circle(totem.x, totem.z, 0.35);

  drop(m.orcRack, -5.2, 0.4, 0.6, 1);
  drop(m.orcHide, 5.4, 0.2, -0.8, 1);
  drop(m.orcBones[0], 1.4, -1.6, 0.2, 1.1);
  drop(m.orcBones[1], -1.2, 1.8, 1.1, 1);
  drop(m.crate[0], 4.6, -3.2, 0.5, 1.1);
  drop(m.barrel[0], -4.8, -4.2, 0.3, 1);

  for (let i = 0; i < 5; i++) {
    const a = gate + 2.2 + i * 0.7;
    const rad = 1.6 + (i % 2);
    drop(m.orcCross, Math.sin(a) * (rx + rad), Math.cos(a) * (rz + rad * 0.8), a, 0.9 + (i % 3) * 0.08);
  }

  for (const [ox, oz] of [[-6.2, -4.4], [6.4, -3.6], [-5.8, 4.6], [6.2, 4.2]]) {
    const p = drop(m.orcFire, ox, oz, ox, 0.55);
    world.lightSpots.push({ x: p.x, y: world.heightAt(p.x, p.z) + 0.55, z: p.z, color: 0xff8a3a });
  }
}

function dressLand(world, land) {
  const m = world.models;
  const spec = SPECS[land.kind];
  const seed = spec.seed;
  const data = land.data;
  const trees = [];
  if (land.kind === 'brookside') dressOrcCamp(world, land);
  if (spec.arctic) {
    dressArctic(world, land, spec);
    return;
  }
  if (spec.jungle) {
    dressJungle(world, land, spec);
    return;
  }
  if (spec.volcanic) {
    dressVolcanic(world, land, spec);
    return;
  }
  if (spec.desert) {
    dressDesert(world, land, spec);
    return;
  }
  reserveLongacre(world, land);
  const place = (parts, lx, lz, rot, scale, opts) => {
    const x = land.x0 + lx + 0.5;
    const z = land.z0 + lz + 0.5;
    if (!world.free(x, z, (opts && opts.r) || 1.1)) return false;
    world.putAt(parts, x, z, rot, scale, opts);
    return true;
  };
  for (let n = 0; n < 90; n++) {
    const lx = 8 + Math.floor(hash2(n, 2, seed) * (W - 16));
    const lz = 8 + Math.floor(hash2(n, 5, seed) * (W - 16));
    const i = lz * W + lx;
    const h = data.H[i];
    if (data.pathMask[i] || h < 1.3 || h > 7.2) continue;
    if (campClear(spec, lx, lz)) continue;
    if (data.zone[i] === ZONE.WATER || data.zone[i] === ZONE.FARM) continue;
    if (hash2(n, 9, seed) > 0.38 + spec.forest) continue;
    const x = land.x0 + lx + 0.5;
    const z = land.z0 + lz + 0.5;
    if (!world.free(x, z, 1.6)) continue;
    const roll = hash2(n, 4, seed);
    let parts = m.oaks[n % m.oaks.length];
    if (land.kind === 'goldmead' && roll < 0.55) parts = m.pines[n % m.pines.length];
    else if (land.kind === 'harefield' && h > 5.4) parts = m.pines[n % m.pines.length];
    else if (roll > 0.72) parts = m.blossoms[n % m.blossoms.length];
    else if (roll > 0.58) parts = m.autumn[n % m.autumn.length];
    const s = 0.62 + hash2(n, 1, seed) * 0.28;
    world.putAt(parts, x, z, roll * 6, s);
    world.circle(x, z, 0.4);
    world.occupy(x, z, 1.3);
    world.treeDots.push({ x, z });
    trees.push(n);
    if (trees.length > (spec.forest > 0.5 ? 86 : 58)) break;
  }
  for (let n = 0; n < 40; n++) {
    const lx = 6 + Math.floor(hash2(n, 3, seed + 3) * (W - 12));
    const lz = 6 + Math.floor(hash2(n, 8, seed + 3) * (W - 12));
    const i = lz * W + lx;
    const h = data.H[i];
    if (data.pathMask[i] || h < 2.2 || h > 9) continue;
    if (campClear(spec, lx, lz)) continue;
    if (!place(h > 6 ? m.boulders[n % m.boulders.length] : m.rocks[n % m.rocks.length], lx, lz, n, h > 6 ? 0.9 : 0.7, { r: 1 })) continue;
    world.circle(land.x0 + lx + 0.5, land.z0 + lz + 0.5, h > 6 ? 0.7 : 0.4);
    world.occupy(land.x0 + lx + 0.5, land.z0 + lz + 0.5, 0.8);
  }
  for (let n = 0; n < 110; n++) {
    const lx = 4 + Math.floor(hash2(n, 1, seed + 7) * (W - 8));
    const lz = 4 + Math.floor(hash2(n, 6, seed + 7) * (W - 8));
    const i = lz * W + lx;
    const h = data.H[i];
    if (data.pathMask[i] || h < 1.2 || h > 6.5) continue;
    if (campClear(spec, lx, lz)) continue;
    if (data.zone[i] === ZONE.WATER || data.zone[i] === ZONE.MOUNTAIN) continue;
    const x = land.x0 + lx + 0.5;
    const z = land.z0 + lz + 0.5;
    if (!world.free(x, z, 0.5)) continue;
    const roll = hash2(n, 4, seed + 7);
    const gold = land.kind === 'goldmead' || land.kind === 'hayfield' || land.kind === 'northleas';
    const parts = roll > 0.78 ? m.bushes[n % m.bushes.length] : roll > 0.45 ? m.flowers[n % m.flowers.length] : gold ? m.tuftsGold[n % m.tuftsGold.length] : m.tufts[n % m.tufts.length];
    world.putAt(parts, x, z, roll * 6, roll > 0.78 ? 0.85 : 1, { cover: roll <= 0.78 });
    if (roll > 0.78) world.occupy(x, z, 0.6);
  }
  if (spec.pond || spec.brook) {
    for (let z = 2; z < W - 2; z += 3) {
      for (let x = 2; x < W - 2; x += 3) {
        if (data.zone[z * W + x] === ZONE.WATER) continue;
        let wet = false;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (data.zone[(z + dz) * W + (x + dx)] === ZONE.WATER) wet = true;
        }
        if (!wet || hash2(x, z, seed) < 0.55) continue;
        const wx = land.x0 + x + 0.5;
        const wz = land.z0 + z + 0.5;
        if (world.free(wx, wz, 0.4)) world.putAt(m.reeds[(x + z) % m.reeds.length], wx, wz, z * 0.2, 1);
      }
    }
  }
  if (land.kind === 'longacre') buildLongacre(world, land);
  if (land.kind === 'goldmead') {
    const [cx, cz, cr] = spec.clearing;
    let extra = 0;
    for (let lz = 14; lz < W - 14 && extra < 70; lz += 6) {
      for (let lx = 14; lx < W - 14 && extra < 70; lx += 6) {
        if (hash2(lx, lz, seed + 12) < 0.42) continue;
        if (Math.hypot(lx - cx, lz - cz) < cr - 2) continue;
        const i = lz * W + lx;
        const h = data.H[i];
        if (data.pathMask[i] || h < 1.4 || h > 6.8) continue;
        const parts = hash2(lx, lz, 3) > 0.5 ? m.pines[(lx + lz) % m.pines.length] : m.oaks[(lx + lz) % m.oaks.length];
        const x = land.x0 + lx + 0.5;
        const z = land.z0 + lz + 0.5;
        if (!world.free(x, z, 1.5)) continue;
        world.putAt(parts, x, z, hash2(lx, lz, 8) * 6, 0.7 + hash2(lx, lz, 4) * 0.25);
        world.circle(x, z, 0.35);
        world.occupy(x, z, 1.15);
        world.treeDots.push({ x, z });
        extra++;
      }
    }
  }
  if (land.kind === 'hayfield') {
    for (let n = 0; n < 22; n++) {
      const lx = 26 + Math.floor(hash2(n, 2, seed + 4) * 90);
      const lz = 26 + Math.floor(hash2(n, 9, seed + 4) * 90);
      const i = lz * W + lx;
      if (data.pathMask[i] || data.H[i] < 1.5 || data.H[i] > 5) continue;
      if (place(m.hay, lx, lz, n * 0.5, 1.05, { r: 0.9 })) {
        world.circle(land.x0 + lx + 0.5, land.z0 + lz + 0.5, 0.45);
      }
    }
  }
}

function reserveLongacre(world, land) {
  if (land.kind !== 'longacre') return;
  for (const farm of LONGACRE_FARMS) {
    for (let x = farm.yard.x0; x <= farm.yard.x1; x += 4) {
      for (let z = farm.yard.z0; z <= farm.yard.z1; z += 4) world.occupy(land.x0 + x, land.z0 + z, 3);
    }
  }
}

function fenceRect(world, x0, z0, x1, z1, gate) {
  const g = 2.6;
  const gap = (side) => {
    if (gate.side !== side) return [];
    if (side === 'n' || side === 's') {
      const z = side === 'n' ? z0 : z1;
      return [[gate.at - g / 2, gate.at + g / 2, z - 0.7, z + 0.7]];
    }
    const x = side === 'w' ? x0 : x1;
    return [[x - 0.7, x + 0.7, gate.at - g / 2, gate.at + g / 2]];
  };
  world.fenceLine(x0, z0, x1, z0, gap('n'));
  world.fenceLine(x1, z0, x1, z1, gap('e'));
  world.fenceLine(x1, z1, x0, z1, gap('s'));
  world.fenceLine(x0, z1, x0, z0, gap('w'));
}

function buildLongacre(world, land) {
  const m = world.models;
  const X = (lx) => land.x0 + lx;
  const Z = (lz) => land.z0 + lz;
  world.farms = [];
  world.farmMarks = [];
  world.chickenNests = [];
  world.cowPens = [];
  if (!world.npcSpots) world.npcSpots = {};
  for (const farm of LONGACRE_FARMS) {
    const house = buildHouse({ ...farm.house, wh: 22, pitch: 1.05, chimney: true, flowers: true });
    const barn = buildHouse({ ...farm.barn, wh: 18, pitch: 0.72, chimney: false, flowers: false, bigDoor: true });
    const hx = X(farm.house.x);
    const hz = Z(farm.house.z);
    const bx = X(farm.barn.x);
    const bz = Z(farm.barn.z);
    world.putAt(house, hx, hz, farm.house.rot, 1);
    world.putAt(barn, bx, bz, farm.barn.rot, 1);
    world.box(hx, hz, farm.house.w * 0.42, farm.house.d * 0.42);
    world.box(bx, bz, farm.barn.w * 0.42, farm.barn.d * 0.42);
    const pen = {
      x0: X(farm.pen.x0),
      z0: Z(farm.pen.z0),
      x1: X(farm.pen.x1),
      z1: Z(farm.pen.z1),
    };
    const gateAt = farm.gate === 'n' || farm.gate === 's' ? (pen.x0 + pen.x1) / 2 : (pen.z0 + pen.z1) / 2;
    fenceRect(world, pen.x0, pen.z0, pen.x1, pen.z1, { side: farm.gate, at: gateAt });
    const bounds = {
      cx: (pen.x0 + pen.x1) / 2,
      cz: (pen.z0 + pen.z1) / 2,
      hx: (pen.x1 - pen.x0) / 2 - 1.6,
      hz: (pen.z1 - pen.z0) / 2 - 1.6,
    };
    const spots = [];
    const cols = farm.animals === 'chicken' ? 4 : 2;
    const rows = Math.ceil(farm.herd / cols);
    for (let i = 0; i < farm.herd; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      spots.push({
        x: bounds.cx + (c - (cols - 1) / 2) * (bounds.hx * 1.3 / Math.max(1, cols - 1)),
        z: bounds.cz + (r - (rows - 1) / 2) * (bounds.hz * 1.1 / Math.max(1, rows - 1)),
      });
    }
    if (farm.animals === 'chicken') {
      for (const spot of spots) world.chickenNests.push({ x: spot.x, z: spot.z, pen: bounds });
    } else {
      world.cowPens.push({ bounds, spots });
    }
    for (let x = farm.yard.x0 + 2; x < farm.yard.x1 - 1; x += 1.4) {
      for (let z = farm.yard.z0 + 2; z < farm.pen.z0 - 1.2; z += 1.5) {
        if (Math.abs(x - farm.lane.x0) < 2.2) continue;
        if (Math.hypot(x - farm.house.x, z - farm.house.z) < 4.2) continue;
        if (Math.hypot(x - farm.barn.x, z - farm.barn.z) < 5) continue;
        const wx = X(x);
        const wz = Z(z);
        const ripe = hash2(Math.floor(x), Math.floor(z), farm.house.seed) > 0.25;
        const list = ripe ? m.wheat : m.wheatGreen;
        world.putAt(list[(x + z) % list.length | 0], wx, wz, ((x + z) % 4) * (Math.PI / 2), 1, { cover: true });
      }
    }
    world.putAt(m.scarecrow, X((farm.pen.x0 + farm.pen.x1) / 2), Z(farm.pen.z0 - 2.2), 0.4, 1.3);
    world.putAt(m.hay, bx + 3.2, bz + 1.4, 0.5, 1.35);
    world.circle(bx + 3.2, bz + 1.4, 0.55);
    world.putAt(m.hay, bx + 4.3, bz + 2.2, 1.2, 1.15);
    world.circle(bx + 4.3, bz + 2.2, 0.45);
    const roam = [
      { x0: X(farm.yard.x0 + 2), z0: Z(farm.yard.z0 + 2), x1: X(farm.yard.x1 - 2), z1: Z(farm.pen.z0 - 1.5) },
      { x0: X(farm.lane.x0 - 1.4), z0: Z(Math.min(farm.lane.z0, farm.lane.z1)), x1: X(farm.lane.x0 + 1.4), z1: Z(Math.max(farm.lane.z0, farm.lane.z1)) },
    ];
    world.npcSpots[farm.id] = { x: hx + 1.2, z: hz + farm.house.d * 0.55 + 1.4 };
    world.farmMarks.push({ name: farm.name, x: hx, z: hz - 4 });
    world.farms.push({
      id: farm.id,
      name: farm.name,
      farmer: farm.farmer,
      animals: farm.animals,
      look: farm.look,
      lines: farm.lines,
      roam,
      yaw: 0,
    });
  }
}

export function dressRing(world) {
  for (const land of world.lands || []) {
    if (land.role === 'ring') dressLand(world, land);
  }
  finishJungle(world);
}
