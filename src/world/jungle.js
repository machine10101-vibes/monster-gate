import { fbm, hash2, lerp, smoothstep } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE, WATER_Y } from './terrain.js';

/**
 * The jungle block west of Brookside and Longacre: Mirrormere Oasis (53), Silverrun Canopy (52),
 * Southmead (63), Runmouth (62), and the beach tiles Dunes (73) and Shellbeach (72) with the pirate docks.
 * ring.js builds the height fields and stitches edges; terrain features, painting and dressing live here.
 */

const K_WATER = 2;
const K_STONE = 3;
const TAU = Math.PI * 2;
export const PIER_Y = 1;

export const JUNGLE_KINDS = ['lagoon', 'canopy', 'sunken', 'tigerwood', 'pirateshore', 'shellbeach'];

export const JUNGLE_SPECS = {
  lagoon: {
    banner: ['Mirrormere Oasis', 'The Lagoon'], jungle: true, shade: 0, forest: 0.7, amp: 2.6, base: 3.1, seed: 71,
    rim: { n: true },
    knolls: [[112, 112, 9, 2.6], [24, 118, 8, 2.2], [132, 60, 6, 1.8], [20, 30, 8, 2.4]],
    pools: [[62, 50, 30, 19], [118, 34, 9, 7]],
    islands: [[64, 52, 5.5, 1.5]],
    roads: [[[143, 80], [112, 84], [88, 92], [60, 98], [34, 90], [0, 80]], [[88, 92], [84, 120], [72, 143]]],
    dress: { giants: 8, broadleaf: 40, palms: 34, bananas: 10, bamboo: 6, bigLeaves: 64, ferns: 56, heliconia: 18, orchids: 28, hibiscus: 14, bushes: 22, mangrove: 12, rocks: 14, boulders: 3 },
  },
  canopy: {
    banner: ['Under the Giants', 'Silverrun Canopy'], jungle: true, shade: 0.06, forest: 0.85, amp: 2.8, base: 3.2, seed: 72,
    rim: { n: true, w: true },
    knolls: [[30, 40, 10, 3.2], [118, 112, 9, 2.8], [40, 122, 8, 2.2], [120, 30, 8, 2.4]],
    pools: [[28, 102, 8, 6]],
    ruin: { cx: 82, cz: 66, r: 15 },
    roads: [[[143, 80], [112, 76], [92, 70], [82, 84], [78, 110], [70, 143]]],
    dress: { giants: 12, broadleaf: 52, palms: 12, bananas: 12, bamboo: 8, bigLeaves: 70, ferns: 62, heliconia: 14, orchids: 26, hibiscus: 6, bushes: 24, mangrove: 4, rocks: 22, boulders: 6 },
  },
  sunken: {
    banner: ['Raptor Hunting Grounds', 'Southmead'], jungle: true, shade: 0.04, forest: 0.8, amp: 3, base: 3.2, seed: 73,
    rim: {},
    knolls: [[110, 40, 9, 2.8], [30, 110, 9, 2.4], [116, 118, 8, 2.2], [24, 30, 7, 2.2]],
    pools: [[100, 108, 10, 8], [28, 36, 8, 6]],
    roads: [[[143, 70], [104, 74], [72, 72]], [[72, 0], [72, 72], [72, 110], [72, 143]], [[72, 72], [40, 78], [0, 80]]],
    dress: { giants: 10, broadleaf: 46, palms: 14, bananas: 10, bamboo: 12, bigLeaves: 64, ferns: 66, heliconia: 14, orchids: 22, hibiscus: 6, bushes: 26, mangrove: 6, rocks: 20, boulders: 8 },
  },
  tigerwood: {
    banner: ['The Wreck in the Roots', 'Runmouth'], jungle: true, shade: 0.08, forest: 0.85, amp: 3, base: 3.2, seed: 74,
    rim: { w: true },
    knolls: [[110, 40, 9, 3], [24, 30, 8, 2.6], [118, 118, 8, 2.4], [30, 130, 7, 2]],
    pools: [[26, 52, 9, 7], [112, 122, 7, 6]],
    clearing: { cx: 40, cz: 100, r: 17 },
    roads: [[[143, 80], [100, 84], [70, 72]], [[70, 0], [70, 72], [74, 110], [74, 143]]],
    dress: { giants: 11, broadleaf: 50, palms: 12, bananas: 8, bamboo: 10, bigLeaves: 64, ferns: 62, heliconia: 12, orchids: 24, hibiscus: 4, bushes: 24, mangrove: 6, rocks: 24, boulders: 8 },
  },
  pirateshore: {
    banner: ['Where the Jungle Meets the Sea', 'Dunes'], jungle: true, coast: true, shade: 0, forest: 0.5, amp: 2.4, base: 3.2, seed: 75,
    rim: { e: true },
    knolls: [[28, 30, 8, 2.2], [112, 40, 8, 2.4], [60, 44, 6, 1.8]],
    roads: [[[72, 0], [70, 40], [72, 84], [72, 100]], [[0, 100], [30, 100], [60, 100], [104, 100], [130, 98]]],
    piers: [{ x: 44, z0: 100, z1: 140, ship: 'brown', side: 1 }, { x: 104, z0: 100, z1: 141, fishing: true }],
    dress: { giants: 3, broadleaf: 14, palms: 12, bananas: 3, bamboo: 3, bigLeaves: 22, ferns: 20, heliconia: 6, orchids: 8, hibiscus: 8, bushes: 12, mangrove: 0, rocks: 8, boulders: 3, beachPalms: 20, driftwood: 10, shells: 40, starfish: 12, beachRocks: 12, crabs: 10 },
  },
  shellbeach: {
    banner: ['White Sand and Shells', 'Shellbeach'], jungle: true, coast: true, coastBend: 12, shade: 0, forest: 0.5, amp: 2.4, base: 3.2, seed: 76,
    rim: { w: true },
    knolls: [[110, 40, 8, 2.4], [30, 34, 9, 2.6], [70, 50, 6, 1.8]],
    roads: [[[74, 0], [74, 70], [96, 98]], [[96, 98], [120, 100], [143, 100]]],
    piers: [{ x: 96, z0: 100, z1: 138, ship: 'black', side: -1 }],
    dress: { giants: 3, broadleaf: 14, palms: 14, bananas: 3, bamboo: 4, bigLeaves: 22, ferns: 22, heliconia: 6, orchids: 8, hibiscus: 8, bushes: 12, mangrove: 0, rocks: 8, boulders: 3, beachPalms: 22, driftwood: 12, shells: 44, starfish: 14, beachRocks: 14, crabs: 12 },
  },
};

const PROFILE = [[74, 3.3], [90, 2.0], [98, 1.2], [106, 0.9], [110, 0.5], [113, 0], [122, -0.9], [143, -2.2]];

function profile(zz) {
  if (zz <= PROFILE[0][0]) return PROFILE[0][1];
  for (let i = 1; i < PROFILE.length; i++) {
    const [z1, h1] = PROFILE[i];
    const [z0, h0] = PROFILE[i - 1];
    if (zz <= z1) return lerp(h0, h1, (zz - z0) / (z1 - z0));
  }
  return PROFILE[PROFILE.length - 1][1];
}

/** The shore z a cell would have on a straight coast, bent by world-space waves so both beach tiles line up. */
function coastZ(spec, x, z) {
  const gx = spec.ox + x;
  let zz = z + Math.sin(gx * 0.05) * 3.5 + Math.sin(gx * 0.021 + 1) * 4.5;
  if (spec.coastBend) zz += (1 - smoothstep(0, 60, x)) * spec.coastBend;
  return zz;
}

/** 0 in the jungle, 1 on open sand. */
function beachAmount(spec, x, z) {
  if (!spec.coast) return 0;
  return smoothstep(78, 96, coastZ(spec, x, z));
}

export function jungleFeature(h, x, z, spec) {
  let out = null;
  if (spec.coast) {
    const zz = coastZ(spec, x, z);
    if (zz > 72) {
      const dune = zz < 108 ? (fbm((spec.ox + x) * 0.09, (spec.oz + z) * 0.09, spec.seed + 4, 2) - 0.5) * 0.9 : 0;
      out = { h: lerp(h, profile(zz) + dune, smoothstep(72, 92, zz)), kind: 0 };
      h = out.h;
    }
  }
  if (spec.ruin) {
    const { cx, cz, r } = spec.ruin;
    const d = Math.hypot(x - cx, z - cz);
    if (d < r + 10) {
      const flat = 3.5;
      out = { h: lerp(flat, h, smoothstep(r, r + 10, d)), kind: d < r ? K_STONE : 0 };
      h = out.h;
    }
  }
  if (spec.clearing) {
    const { cx, cz, r } = spec.clearing;
    const d = Math.hypot(x - cx, z - cz);
    if (d < r + 8) {
      out = { h: lerp(3.2, h, smoothstep(r - 4, r + 8, d)), kind: 0 };
      h = out.h;
    }
  }
  for (const [cx, cz, rx, rz] of spec.pools || []) {
    const wob = (fbm((spec.ox + x) * 0.1, (spec.oz + z) * 0.1, spec.seed + 9, 2) - 0.5) * 0.22;
    const d = Math.hypot((x - cx) / rx, (z - cz) / rz) + wob;
    if (d < 1.4 && h < 10) {
      if (d < 0.72) {
        let bed = lerp(-0.7, 0.05, d / 0.72);
        for (const [ix, iz, ir, ih] of spec.islands || []) {
          const di = Math.hypot(x - ix, z - iz) / ir;
          if (di < 1) bed = Math.max(bed, lerp(ih, 0.1, smoothstep(0.55, 1, di)));
        }
        return bed > 0.45 ? { h: bed, kind: 0 } : { h: bed, kind: K_WATER };
      }
      out = { h: lerp(0.3, Math.min(h, 3.4), (d - 0.72) / 0.68), kind: 0 };
      h = out.h;
    }
  }
  return out;
}

function localSlope(H, x, z) {
  const h = H[z * W + x];
  let s = 0;
  if (x + 1 < W) s = Math.max(s, Math.abs(H[z * W + x + 1] - h));
  if (x > 0) s = Math.max(s, Math.abs(H[z * W + x - 1] - h));
  if (z + 1 < W) s = Math.max(s, Math.abs(H[(z + 1) * W + x] - h));
  if (z > 0) s = Math.max(s, Math.abs(H[(z - 1) * W + x] - h));
  return s;
}

export function paintJungleCell(out, H, x, z, kind, isPath, n, spec) {
  const i = z * W + x;
  const h = H[i];
  const gx = spec.ox + x;
  const gz = spec.oz + z;
  const nA = fbm(gx * 0.06 + 3, gz * 0.06, 81, 3);
  const nB = fbm(gx * 0.17, gz * 0.17 + 4, 82, 2);
  const beach = beachAmount(spec, x, z);
  const set = (zone, top, r, g, b) => {
    out.zone[i] = zone;
    out.top[i] = top;
    out.tint[i * 3] = r;
    out.tint[i * 3 + 1] = g;
    out.tint[i * 3 + 2] = b;
  };
  out.forest[i] = 0;
  if (kind === K_WATER || h < 0.35) {
    set(ZONE.WATER, TILE.SAND, 0.62, 0.95, 0.95);
    return;
  }
  if (isPath) {
    if (beach > 0.5) set(ZONE.FIELD, TILE.PATH, 1, 0.94, 0.78);
    else set(ZONE.FIELD, TILE.PATH, 0.96, 0.88, 0.68);
    return;
  }
  if (spec.ruin) {
    const { cx, cz, r } = spec.ruin;
    const d = Math.hypot(x - cx, z - cz);
    if (d < r) {
      const chk = ((x >> 2) + (z >> 2)) & 1;
      if (d < r * 0.62) set(ZONE.FIELD, TILE.FLAGSTONE, 0.78 + chk * 0.05 + nB * 0.06, 0.92 + chk * 0.03, 0.78);
      else set(ZONE.FIELD, nB > 0.55 ? TILE.MOSS_STONE : TILE.COBBLE, 0.8 + nB * 0.1, 0.95, 0.8);
      return;
    }
  }
  if (spec.clearing) {
    const { cx, cz, r } = spec.clearing;
    const d = Math.hypot(x - cx, z - cz);
    if (d < r) {
      set(ZONE.FIELD, nB > 0.5 ? TILE.DIRT : TILE.GRASS, 0.74 + nB * 0.12, 0.7 + nB * 0.1, 0.5);
      return;
    }
  }
  if (h >= 8 || kind === K_STONE) {
    set(ZONE.MOUNTAIN, h > 6 && n > 0.45 ? TILE.MOSS_STONE : TILE.STONE, 0.74, 0.92, 0.74);
    return;
  }
  if (beach > 0.55) {
    const wet = h < 0.9;
    set(ZONE.FIELD, TILE.SAND, wet ? 0.92 : 1.02 + nB * 0.06, wet ? 0.88 : 0.97, wet ? 0.74 : 0.8 + nB * 0.06);
    return;
  }
  if (h < 1.1) {
    set(ZONE.FIELD, TILE.SAND, 0.98, 0.94, 0.78);
    return;
  }
  if (beach > 0.22) {
    if (nB > 0.45) set(ZONE.FIELD, TILE.SAND, 1.0, 0.96, 0.8);
    else set(ZONE.FIELD, TILE.GRASS, 0.9 + nA * 0.15, 1.0, 0.5);
    return;
  }
  out.forest[i] = spec.forest * (0.55 + n * 0.7);
  const slope = localSlope(H, x, z);
  const dense = slope > 1.2 && nA > 0.4;
  if (dense) set(ZONE.FOREST, TILE.MOSS_STONE, 0.72, 0.9, 0.7);
  else if (nB > 0.82) set(ZONE.FOREST, TILE.DIRT, 0.68, 0.6, 0.42);
  else if (n > 0.62 && h < 5) set(ZONE.FOREST, TILE.FLOWER_GRASS, 0.5 + nA * 0.14, 0.84, 0.4);
  else set(ZONE.FOREST, TILE.GRASS, 0.3 + nA * 0.16, 0.66 + (1 - nA) * 0.16, 0.28 + nA * 0.1);
}

/* ------------------------------ dressing ------------------------------ */

const DRESS_MODEL = {
  giants: 'jungleGiants', broadleaf: 'broadleaf', palms: 'palms', beachPalms: 'palmsLean', bananas: 'bananas', bamboo: 'bamboo',
  mangrove: 'mangrove', bigLeaves: 'bigLeaves', ferns: 'ferns', heliconia: 'heliconia', orchids: 'orchids', hibiscus: 'hibiscus',
  bushes: 'tropBush', rocks: 'mossRocks', boulders: 'mossBoulders', driftwood: 'driftwood', shells: 'shells', starfish: 'starfish',
  beachRocks: 'beachRocks', crabs: 'crabs',
};
const VEG_VERTS = 1100000;

const vertsOf = (arr) => {
  if (!arr || !arr.length) return 0;
  let t = 0;
  for (const parts of arr) for (const p of parts) t += p.geo.attributes.position.count;
  return t / arr.length;
};

/** Scales the planted counts down so one tile of foliage stays inside a vertex budget (the tablet has to draw it). */
function budgeted(dress, J) {
  let est = 0;
  for (const [k, n] of Object.entries(dress)) est += n * vertsOf(J[DRESS_MODEL[k]]);
  const f = Math.min(1, VEG_VERTS / Math.max(1, est));
  const out = {};
  for (const [k, n] of Object.entries(dress)) out[k] = n === 0 ? 0 : Math.max(1, Math.round(n * f));
  return out;
}

const pick = (arr, n) => (arr && arr.length ? arr[n % arr.length] : null);

export function dressJungle(world, land, spec) {
  const J = world.models.jungle;
  if (!J) return;
  const data = land.data;
  const seed = spec.seed;
  const D = budgeted(spec.dress, J);
  const jun = (world.jungle ||= { lands: [], yards: [], piers: [], gates: [] });
  jun.lands.push(land);

  const place = (parts, lx, lz, rot, scale, o = {}) => {
    if (!parts) return false;
    const x = land.x0 + lx + 0.5;
    const z = land.z0 + lz + 0.5;
    if (!world.free(x, z, o.r ?? 1)) return false;
    world.putAt(parts, x, z, rot, scale, o.opts);
    if (o.collide) world.circle(x, z, o.collide);
    if (o.occ) world.occupy(x, z, o.occ);
    if (o.light) world.lightSpots.push({ x, y: world.heightAt(x, z) + o.light[1], z, color: o.light[0] });
    return true;
  };
  const at = (lx, lz) => [land.x0 + lx + 0.5, land.z0 + lz + 0.5];
  const reserved = (lx, lz) => {
    if (spec.ruin && Math.hypot(lx - spec.ruin.cx, lz - spec.ruin.cz) < spec.ruin.r + 1) return true;
    if (spec.clearing && Math.hypot(lx - spec.clearing.cx, lz - spec.clearing.cz) < spec.clearing.r) return true;
    if (spec.piers) for (const p of spec.piers) if (Math.abs(lx - p.x) < 14 && lz > 92) return true;
    if (spec.gate && Math.abs(lx - spec.gate.x) < 10 && Math.abs(lz - spec.gate.z) < 8) return true;
    return false;
  };
  const nearWater = (lx, lz, r) => {
    for (let dz = -r; dz <= r; dz += 2)
      for (let dx = -r; dx <= r; dx += 2) {
        const xx = lx + dx;
        const zz = lz + dz;
        if (xx < 1 || zz < 1 || xx >= W - 1 || zz >= W - 1) continue;
        if (data.zone[zz * W + xx] === ZONE.WATER) return true;
      }
    return false;
  };
  const cellOk = (lx, lz, lo, hi, onSand = null) => {
    const i = lz * W + lx;
    const h = data.H[i];
    if (data.pathMask[i] || h < lo || h > hi || reserved(lx, lz)) return false;
    if (data.zone[i] === ZONE.WATER) return false;
    const sand = data.top[i] === TILE.SAND;
    if (onSand === true && !sand) return false;
    if (onSand === false && sand) return false;
    return true;
  };
  const scatter = (count, tag, tries, fn) => {
    let placed = 0;
    for (let n = 0; n < tries && placed < count; n++) {
      const lx = 4 + Math.floor(hash2(n, tag, seed) * (W - 8));
      const lz = 4 + Math.floor(hash2(n, tag + 50, seed) * (W - 8));
      if (fn(lx, lz, n)) placed++;
    }
    return placed;
  };
  const tree = (parts, lx, lz, n, scale, r, collide, occ) => {
    const ok = place(parts, lx, lz, n * 1.7, scale, { r, collide, occ });
    if (ok) world.treeDots.push({ x: land.x0 + lx + 0.5, z: land.z0 + lz + 0.5 });
    return ok;
  };

  for (const [cx, cz, r, ih] of spec.islands || []) {
    void ih;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + 0.5;
      const lx = Math.round(cx + Math.cos(a) * r * 0.45);
      const lz = Math.round(cz + Math.sin(a) * r * 0.45);
      const parts = k === 0 ? pick(J.palms, 0) : pick(J.palmsShort, k);
      place(parts, lx, lz, a, 0.85, { r: 0.5, occ: 1 });
    }
  }

  if (spec.ruin) dressRuin(world, land, spec, J, place);
  if (spec.clearing) dressWreck(world, land, spec, J, place);
  if (land.kind === 'lagoon') dressOasisGate(world, land, J, at);
  if (land.kind === 'pirateshore') dressPirateGate(world, land, spec, J, at, jun);

  const beachy = (lx, lz) => beachAmount(spec, lx, lz);
  const jungleOnly = (lx, lz) => beachy(lx, lz) < 0.3;

  scatter(D.giants, 1, D.giants * 24, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 6.6, false) || !jungleOnly(lx, lz)) return false;
    return tree(pick(J.jungleGiants, n), lx, lz, n, 0.85 + hash2(n, 3, seed) * 0.3, 2.4, 1.0, 2.6);
  });
  scatter(D.broadleaf, 2, D.broadleaf * 18, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 6.8, false) || !jungleOnly(lx, lz)) return false;
    return tree(pick(J.broadleaf, n), lx, lz, n, 0.8 + hash2(n, 3, seed) * 0.35, 1.6, 0.45, 1.3);
  });
  scatter(D.palms, 3, D.palms * 20, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.0, 6.4, null)) return false;
    const wet = nearWater(lx, lz, 8);
    if (!wet && hash2(n, 6, seed) > 0.4) return false;
    return tree(pick(J.palms, n), lx, lz, n, 0.8 + hash2(n, 3, seed) * 0.3, 1.2, 0.34, 1.1);
  });
  scatter(D.beachPalms || 0, 4, (D.beachPalms || 0) * 30, (lx, lz, n) => {
    const b = beachy(lx, lz);
    if (b < 0.4 || !cellOk(lx, lz, 0.9, 3.4, true)) return false;
    return tree(pick(J.palmsLean, n), lx, lz, n * 0.9, 0.8 + hash2(n, 3, seed) * 0.3, 1.4, 0.32, 1.2);
  });
  scatter(D.bananas, 5, D.bananas * 18, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 5.4, false) || !jungleOnly(lx, lz)) return false;
    return tree(pick(J.bananas, n), lx, lz, n, 0.9 + hash2(n, 3, seed) * 0.2, 1.0, 0.28, 0.9);
  });
  scatter(D.bamboo, 6, D.bamboo * 22, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 5.6, false) || !jungleOnly(lx, lz)) return false;
    const grove = fbm(lx * 0.05, lz * 0.05, seed + 7, 2);
    if (grove < 0.45) return false;
    return tree(pick(J.bamboo, n), lx, lz, n, 0.85 + hash2(n, 3, seed) * 0.25, 1.4, 0.5, 1.4);
  });
  scatter(D.mangrove, 7, D.mangrove * 60, (lx, lz, n) => {
    if (!cellOk(lx, lz, 0.5, 1.6) || !nearWater(lx, lz, 3)) return false;
    return place(pick(J.mangrove, n), lx, lz, n * 1.3, 0.9, { r: 2.2, collide: 0.7, occ: 1.6 });
  });
  scatter(D.bigLeaves, 8, D.bigLeaves * 12, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 6.4, false)) return false;
    return place(pick(J.bigLeaves, n), lx, lz, n, 0.9 + hash2(n, 3, seed) * 0.3, { r: 0.5, opts: { cover: true } });
  });
  scatter(D.ferns, 9, D.ferns * 12, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 6.4, false) || !jungleOnly(lx, lz)) return false;
    return place(pick(J.ferns, n), lx, lz, n, 0.9 + hash2(n, 3, seed) * 0.4, { r: 0.4, opts: { cover: true } });
  });
  scatter(D.heliconia, 10, D.heliconia * 16, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 5.6, false)) return false;
    return place(pick(J.heliconia, n), lx, lz, n, 1, { r: 0.6, opts: { cover: true } });
  });
  scatter(D.orchids, 11, D.orchids * 16, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 6, false)) return false;
    return place(pick(J.orchids, n), lx, lz, n, 1, { r: 0.4, opts: { cover: true } });
  });
  scatter(D.hibiscus, 12, D.hibiscus * 18, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 5.4)) return false;
    return place(pick(J.hibiscus, n), lx, lz, n, 1, { r: 0.8, collide: 0.35, occ: 0.7 });
  });
  scatter(D.bushes, 13, D.bushes * 16, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 6.4, false)) return false;
    return place(pick(J.tropBush, n), lx, lz, n, 1, { r: 0.8, collide: 0.35, occ: 0.7 });
  });
  scatter(D.rocks, 14, D.rocks * 10, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 8.4, false)) return false;
    return place(pick(J.mossRocks, n), lx, lz, n, 0.8 + hash2(n, 3, seed) * 0.4, { r: 0.9, collide: 0.5, occ: 0.8 });
  });
  scatter(D.boulders, 15, D.boulders * 14, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 8.4, false)) return false;
    return place(pick(J.mossBoulders, n), lx, lz, n, 0.9 + hash2(n, 3, seed) * 0.4, { r: 1.8, collide: 1.1, occ: 1.7 });
  });
  scatter(D.driftwood || 0, 16, (D.driftwood || 0) * 20, (lx, lz, n) => {
    if (beachy(lx, lz) < 0.7 || !cellOk(lx, lz, 0.6, 1.8, true)) return false;
    return place(pick(J.driftwood, n), lx, lz, n * 1.1, 1, { r: 1.4, collide: 0.5, occ: 1.1 });
  });
  scatter(D.shells || 0, 17, (D.shells || 0) * 12, (lx, lz, n) => {
    if (beachy(lx, lz) < 0.7 || !cellOk(lx, lz, 0.5, 1.8, true)) return false;
    return place(pick(J.shells, n), lx, lz, n * 2, 1, { r: 0.4, opts: { cover: true } });
  });
  scatter(D.starfish || 0, 18, (D.starfish || 0) * 16, (lx, lz, n) => {
    if (beachy(lx, lz) < 0.7 || !cellOk(lx, lz, 0.5, 1.4, true)) return false;
    return place(pick(J.starfish, n), lx, lz, n * 2, 1, { r: 0.5, opts: { cover: true } });
  });
  scatter(D.beachRocks || 0, 19, (D.beachRocks || 0) * 16, (lx, lz, n) => {
    if (beachy(lx, lz) < 0.6 || !cellOk(lx, lz, 0.5, 2.4, true)) return false;
    return place(pick(J.beachRocks, n), lx, lz, n, 0.9 + hash2(n, 3, seed) * 0.4, { r: 1.2, collide: 0.6, occ: 1 });
  });
  scatter(D.crabs || 0, 20, (D.crabs || 0) * 16, (lx, lz, n) => {
    if (beachy(lx, lz) < 0.7 || !cellOk(lx, lz, 0.5, 1.4, true)) return false;
    return place(pick(J.crabs, n), lx, lz, n * 2.3, 1, { r: 0.4, opts: { cover: true } });
  });

  for (const p of spec.piers || []) buildPier(world, land, spec, J, p, place, jun);
  if (land.kind === 'pirateshore' || land.kind === 'shellbeach') dressShipyard(world, land, spec, J, place, jun);
}

function dressOasisGate(world, land, J, at) {
  for (const [lx, lz, rot] of [[132, 70, -0.4], [132, 90, 0.4]]) {
    const [x, z] = at(lx, lz);
    if (J.idols && world.free(x, z, 1.4)) {
      world.putAt(J.idols[lx % J.idols.length], x, z, rot + Math.PI / 2, 1);
      world.circle(x, z, 0.6);
      world.occupy(x, z, 1.4);
    }
    if (J.tikiTorch && world.free(x, z + 2, 0.6)) {
      const tx = x + 2;
      const tz = z + (lz > 80 ? 1.5 : -1.5);
      world.putAt(J.tikiTorch[0], tx, tz, 0, 1);
      world.circle(tx, tz, 0.15);
      world.lightSpots.push({ x: tx, y: world.heightAt(tx, tz) + 2.3, z: tz, color: 0xffa040 });
    }
  }
}

function dressRuin(world, land, spec, J, place) {
  const { cx, cz, r } = spec.ruin;
  const put = (parts, lx, lz, rot, scale, o) => place(parts, Math.round(lx), Math.round(lz), rot, scale, o);
  put(pick(J.altar, 0), cx, cz, 0, 1.1, { r: 4, collide: 2.5, occ: 4 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + 0.2;
    const rr = r - 3.4;
    const gap = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2 * 2), Math.cos(a - Math.PI / 2 * 2)));
    if (gap < 0.5) continue;
    put(pick(J.ruinPillars, k), cx + Math.cos(a) * rr, cz + Math.sin(a) * rr, a, 1, { r: 1.2, collide: 0.7, occ: 1.2 });
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    put(pick(J.idols, k), cx + Math.cos(a) * 8.2, cz + Math.sin(a) * 8.2, a + Math.PI, 1, { r: 1.3, collide: 0.6, occ: 1.3, light: [0xffb347, 2.2] });
  }
  put(pick(J.ruinArch, 0), cx + r + 6, cz + 10, Math.PI / 2, 1, { r: 4, collide: 0.8, occ: 3.4 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.4;
    put(pick(J.vineCurtain, k), cx + Math.cos(a) * (r - 2), cz + Math.sin(a) * (r - 2), a, 1, { r: 0.8, opts: { cover: true } });
  }
  for (let k = 0; k < 5; k++) {
    const a = k * 1.3 + 0.5;
    put(pick(J.mossRocks, k), cx + Math.cos(a) * (r + 1.5), cz + Math.sin(a) * (r + 1.5), a, 1, { r: 0.8, collide: 0.5, occ: 0.8 });
  }
}

function dressWreck(world, land, spec, J, place) {
  const { cx, cz } = spec.clearing;
  const put = (parts, dx, dz, rot, scale, o) => place(parts, Math.round(cx + dx), Math.round(cz + dz), rot, scale, o);
  const [wx, wz] = [land.x0 + cx + 0.5, land.z0 + cz + 0.5];
  if (J.shipWreck?.length) {
    const parts = pick(J.shipWreck, 0);
    world.putAt(parts, wx, wz, 0.45, 1);
    world.box(wx, wz, 5, 2.4);
    world.occupy(wx, wz, 11);
    world.lightSpots.push({ x: wx + 1, y: world.heightAt(wx, wz) + 3, z: wz, color: 0x6aff9a });
  }
  put(pick(J.treasureChest, 0), -3, 8, 0.5, 1.1, { r: 1.2, collide: 0.7, occ: 1.4, light: [0xffd23f, 0.9] });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + 0.8;
    put(pick(J.skullTotems, k), Math.cos(a) * 13, Math.sin(a) * 11, a, 1, { r: 1.2, collide: 0.4, occ: 1, light: k % 2 ? [0x6aff9a, 2.2] : null });
  }
  put(pick(J.cannon, 0), 9, -2, 2.4, 1, { r: 2, collide: 0.8, occ: 1.8 });
  put(pick(J.cannon, 1), -10, 3, 0.7, 1, { r: 2, collide: 0.8, occ: 1.8 });
  put(pick(J.cargoStack, 0), 6, 7, 0.6, 1, { r: 2, collide: 1.2, occ: 2 });
  put(pick(J.anchor, 0), -8, -6, 1.1, 1, { r: 2, collide: 0.6, occ: 1.6 });
}

function dressPirateGate(world, land, spec, J, at, jun) {
  spec.gate = { x: 72, z: 62 };
  const [gx, gz] = at(72, 62);
  jun.gates.push({ x: gx, z: gz });
  jun.yards.push({ x: gx, z: gz, r: 12 });
  for (const s of [-1, 1]) {
    const x = gx + s * 5.2;
    if (J.pirateFlag) {
      world.putAt(pick(J.pirateFlag, s > 0 ? 1 : 0), x, gz - 1, s * 0.3, 1);
      world.circle(x, gz - 1, 0.25);
    }
    if (J.skullTotems) {
      world.putAt(pick(J.skullTotems, s > 0 ? 1 : 0), x + s * 2.2, gz + 1.5, s, 1);
      world.circle(x + s * 2.2, gz + 1.5, 0.35);
      world.lightSpots.push({ x: x + s * 2.2, y: world.heightAt(x, gz) + 2.4, z: gz + 1.5, color: 0xff7a3a });
    }
    if (J.tikiTorch) {
      for (const dz of [3, -3]) {
        world.putAt(J.tikiTorch[0], x - s * 1.2, gz + dz, 0, 1);
        world.circle(x - s * 1.2, gz + dz, 0.15);
        world.lightSpots.push({ x: x - s * 1.2, y: world.heightAt(x, gz) + 2.3, z: gz + dz, color: 0xffa040 });
      }
    }
  }
}

/** One wooden pier running south into the sea, with a moored ship beside it and a fishing platform on the long one. */
function buildPier(world, land, spec, J, p, place, jun) {
  const seg = pick(J.pierSegment, 0);
  const end = pick(J.pierEnd, 0);
  if (!seg) return;
  const px = land.x0 + p.x + 0.5;
  const zs = land.z0 + p.z0;
  const ze = land.z0 + p.z1;
  const n = Math.max(1, Math.round((ze - zs) / 8));
  const platform = p.fishing ? pick(J.pierPlatform, 0) : null;
  const run = platform ? n - 1 : n;
  for (let k = 0; k < run; k++) {
    const parts = k === run - 1 && !platform ? end || seg : seg;
    world.place(parts, px, PIER_Y, zs + 4 + k * 8, -Math.PI / 2, 1);
  }
  const zEnd = zs + run * 8;
  (world.docks ||= []).push({ x0: px - 1.7, x1: px + 1.7, z0: zs, z1: zEnd, y: PIER_Y });
  world.box(px - 1.72, (zs + zEnd) / 2 + 0.8, 0.12, (zEnd - zs) / 2 - 0.8);
  world.box(px + 1.72, (zs + zEnd) / 2 + 0.8, 0.12, (zEnd - zs) / 2 - 0.8);
  if (!platform) world.box(px, zEnd + 0.1, 1.8, 0.12);
  world.occupy(px, (zs + zEnd) / 2, 6);
  for (const dz of [2.2, 14]) {
    if (zs + dz < zEnd - 2) world.lightSpots.push({ x: px + 1.6, y: PIER_Y + 2.6, z: zs + dz, color: 0xffc766 });
  }
  const info = { x: px, z0: zs, z1: zEnd, fishing: !!p.fishing };
  jun.piers.push(info);
  jun.yards.push({ x: px, z: zs - 6, r: 12 });

  if (p.ship) {
    const parts = pick(p.ship === 'black' ? J.shipBlack : J.shipBrown, 0);
    if (parts) {
      const sx = px + p.side * 6.3;
      const sz = zs + 25;
      world.place(parts, sx, WATER_Y, sz, -Math.PI / 2, 1);
      world.occupy(sx, sz, 10);
      world.box(sx, sz, 4, 12);
      world.lightSpots.push({ x: sx, y: WATER_Y + 5, z: sz - 8 * p.side, color: 0xffb347 });
    }
  }
  if (platform) {
    const cz = zEnd + 5;
    world.place(platform, px, PIER_Y, cz, -Math.PI / 2, 1);
    world.docks.push({ x0: px - 5, x1: px + 5, z0: zEnd, z1: zEnd + 10, y: PIER_Y });
    world.box(px - 5.1, cz, 0.12, 5);
    world.box(px + 5.1, cz, 0.12, 5);
    world.box(px, zEnd + 10.1, 5, 0.12);
    info.z1 = zEnd + 10;
    addPierFishing(world, px, zEnd, info);
  }
}

const SEA_FISH = ['tuna', 'stingray', 'tigershark'];

function addPierFishing(world, px, zEnd, info) {
  if (!world.fishGeo || !world.fishMats) return;
  const spots = [];
  const add = (x, z, standX, standZ) => spots.push({ x, z, standX, standZ });
  for (const s of [-1, 1]) {
    for (const dz of [-14, -4]) add(px + s * 3.5, zEnd + dz, px + s * 1.15, zEnd + dz);
    add(px + s * 7.8, zEnd + 3, px + s * 4.4, zEnd + 3);
    add(px + s * 7.8, zEnd + 8, px + s * 4.4, zEnd + 8);
  }
  add(px - 2.5, zEnd + 13.2, px - 2.5, zEnd + 9.3);
  add(px + 2.5, zEnd + 13.2, px + 2.5, zEnd + 9.3);
  info.spots = spots.length;
  world.pendingSeaSpots = (world.pendingSeaSpots || []).concat(spots);
}

function dressShipyard(world, land, spec, J, place, jun) {
  const put = (parts, lx, lz, rot, scale, o) => place(parts, Math.round(lx), Math.round(lz), rot, scale, o);
  for (const p of spec.piers || []) {
    const lx = p.x;
    for (const s of [-1, 1]) {
      put(pick(J.lanternPost, s > 0 ? 1 : 0), lx + s * 3.2, 99, 0, 1, { r: 0.7, collide: 0.2, occ: 0.6, light: [0xffc870, 2.7] });
      put(pick(J.pirateFlag, s > 0 ? 0 : 1), lx + s * 6.4, 95, s * 0.5, 1, { r: 0.8, collide: 0.25, occ: 0.8 });
    }
    put(pick(J.cannon, p.x % 2), lx + 7.5, 96, 3.3, 1, { r: 2, collide: 0.8, occ: 1.6 });
    put(pick(J.cargoStack, p.x % 2), lx - 8, 97, 0.4, 1, { r: 2, collide: 1.2, occ: 2 });
    put(pick(J.ropeCoil, 0), lx - 3.4, 101, 0.3, 1, { r: 0.6, opts: { cover: true } });
    put(pick(J.cannonPile, 0), lx + 4, 97, 0, 1, { r: 1, collide: 0.5, occ: 0.9 });
  }
  if (land.kind === 'pirateshore') {
    put(pick(J.shack, 0), 70, 90, 0, 1, { r: 5, collide: 0, occ: 5 });
    put(pick(J.shack, 1), 128, 92, -0.4, 1, { r: 4, collide: 0, occ: 4 });
    put(pick(J.netRack, 0), 118, 96, 0, 1, { r: 3, collide: 1, occ: 2.5 });
    put(pick(J.rowboat, 0), 24, 99, 0.5, 1, { r: 3, collide: 1.2, occ: 2.5 });
    put(pick(J.rowboat, 1), 78, 103, -0.3, 1, { r: 3, collide: 1.2, occ: 2.5 });
    put(pick(J.plankPile, 0), 30, 94, 0.2, 1, { r: 2, collide: 1, occ: 1.8 });
    put(pick(J.anchor, 1), 56, 98, 0.9, 1, { r: 1.6, collide: 0.6, occ: 1.4 });
    put(pick(J.tikiTorch, 0), 62, 96, 0, 1, { r: 0.5, collide: 0.15, occ: 0.5, light: [0xffa040, 2.3] });
    put(pick(J.tikiTorch, 0), 84, 96, 0, 1, { r: 0.5, collide: 0.15, occ: 0.5, light: [0xffa040, 2.3] });
  } else {
    put(pick(J.shack, 0), 120, 90, 0.3, 1, { r: 5, collide: 0, occ: 5 });
    put(pick(J.rowboat, 0), 64, 100, 0.4, 1, { r: 3, collide: 1.2, occ: 2.5 });
    put(pick(J.anchor, 0), 80, 99, 1.2, 1, { r: 1.6, collide: 0.6, occ: 1.4 });
    put(pick(J.tikiTorch, 0), 110, 96, 0, 1, { r: 0.5, collide: 0.15, occ: 0.5, light: [0xffa040, 2.3] });
  }
  void jun;
}

/** Called after every land is dressed: finishes the fishing spots on the long pier once the water models exist. */
export function finishJungle(world) {
  const jun = world.jungle;
  if (!jun) return;
  if (world.pendingSeaSpots && world.fishGeo) {
    for (const s of world.pendingSeaSpots) world.addSeaFishSpot(s);
    world.pendingSeaSpots = null;
  }
  jun.catches = SEA_FISH;
}
