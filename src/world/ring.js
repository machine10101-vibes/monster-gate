import { fbm, hash2, lerp, clamp, smoothstep } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE } from './terrain.js';
import { TILES } from './tiles.js';

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
    roads: [[[100, 143], [90, 100], [70, 70]]],
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
    rim: { n: true, e: true },
    knolls: [[40, 36, 9, 5], [70, 90, 8, 4], [28, 100, 7, 3.2]],
    clearing: [96, 58, 16],
    roads: [[[0, 80], [46, 72], [84, 58]]],
  },
  brookside: {
    banner: ['The Brook', 'Brookside'], shade: 0.08, forest: 0.26, amp: 2.8, base: 3.1, seed: 54,
    rim: { w: true },
    knolls: [[50, 40, 8, 4], [36, 110, 9, 5], [80, 30, 6, -1.2], [24, 70, 5, 2]],
    brook: true,
    pond: [34, 86, 6.5, 5],
    roads: [[[143, 64], [90, 64], [55, 78]]],
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
    roads: [[[143, 86], [100, 86], [60, 70]]],
  },
  hayfield: {
    banner: ['Hay Meadow', 'Hayfield'], shade: 0, forest: 0.1, amp: 2.2, base: 3.1, seed: 66,
    rim: { e: true, s: true },
    hay: true,
    knolls: [[80, 50, 8, 3], [40, 90, 6, 2], [100, 80, 5, -1]],
    roads: [[[0, 92], [36, 86], [70, 60]]],
  },
};

const HAY = 6;

function applyFeature(h, x, z, spec) {
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
  return {};
}

/** Height data for the ring. Oakhollow and Southford must already include their passes. */
export function generateRing(oak, south) {
  const order = ['northleas', 'brookside', 'eastleas', 'harefield', 'goldmead', 'longacre', 'hayfield'];
  const made = {};
  const lands = [];
  for (const kind of order) {
    const spec = { ...SPECS[kind], kind };
    const tile = TILES.find((t) => t.kind === kind);
    const edges = specEdges(kind, oak, south, made);
    for (const key of Object.keys(edges)) if (!edges[key]) edges[key] = null;
    const data = makeTile(spec, edges);
    made[kind] = data;
    const origin = { x: (tile.tx - 4) * W, z: (tile.tz - 5) * W };
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
    });
  }
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

function dressLand(world, land) {
  const m = world.models;
  const spec = SPECS[land.kind];
  const seed = spec.seed;
  const data = land.data;
  const trees = [];
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
  if (land.kind === 'longacre') {
    for (let n = 0; n < 16; n++) {
      const lx = 30 + Math.floor(hash2(n, 2, seed + 4) * 80);
      const lz = 30 + Math.floor(hash2(n, 9, seed + 4) * 80);
      const i = lz * W + lx;
      if (data.zone[i] !== ZONE.FARM || data.pathMask[i]) continue;
      if (place(m.fence[n % m.fence.length], lx, lz, (n % 2) * 1.57, 1, { r: 0.7 })) {
        world.circle(land.x0 + lx + 0.5, land.z0 + lz + 0.5, 0.3);
      }
    }
  }
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

export function dressRing(world) {
  for (const land of world.lands || []) {
    if (land.role === 'ring') dressLand(world, land);
  }
}
