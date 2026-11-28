import { fbm, hash2, lerp, smoothstep } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE, WATER_Y } from './terrain.js';
import { shoreX, shoreProfile } from './eastCoast.js';
import { K_ICE } from './arctic.js';

/**
 * The Northern Forest: Darkbough (27), Mossmere (28) and Rimewood (29) above the snowfields of
 * Rimefang Mesa, Glimmerfrost and Glacier Bay, and Pinestrand (17), Elmshade (18) and Coldridge (19)
 * running down to a beach on the open northern sea (7, 8 and 9 are ocean).
 *
 * Styled on Oakhollow: dense mixed groves of pine and oak on dark forest grass, light glades
 * between them, deep ponds and brooks, mossy crags. Each border fades toward its neighbour:
 * snow creeps up from the Arctic along the south of 27 to 29, jungle green and broadleaf
 * come in from Sunfeather on the west of 27, and the north of 17 to 19 is dune, sand and sea.
 * The east coast of Glacier Bay carries on up the east side of Rimewood and Coldridge.
 *
 * Shorelines are drawn in world coordinates so they run unbroken from tile to tile.
 */

export const NORTH_FOREST_KINDS = ['darkbough', 'mossmere', 'rimewood', 'pinestrand', 'elmshade', 'coldridge'];

export const NORTH_FOREST_SPECS = {
  darkbough: {
    banner: ['The Northern Forest', 'Darkbough'], northForest: true, shade: 0.3, forest: 0.85, amp: 3, base: 3.6, seed: 127,
    rim: {},
    frostSouth: 46,
    jungleWest: 40,
    knolls: [[58, 22, 10, 3.4], [126, 60, 8, 2.4], [60, 96, 9, 2.6], [20, 44, 8, 2.2]],
    ponds: [[40, 38, 13, 9.5], [110, 42, 14, 10], [32, 108, 10, 7.5]],
    brooks: [[[30, 106], [56, 114], [86, 108], [112, 116]]],
    crags: [[26, 22, 8, 5], [118, 92, 9.5, 5.2]],
    roads: [[[0, 66], [40, 70], [78, 76], [143, 74]], [[78, 76], [84, 40], [76, 0]]],
    dress: { trees: 150, giants: 4, under: 120, flowers: 70, rocks: 30, timber: 22 },
  },
  mossmere: {
    banner: ['The Still Meres', 'Mossmere'], northForest: true, shade: 0.24, forest: 0.75, amp: 2.8, base: 3.5, seed: 128,
    rim: {},
    frostSouth: 50,
    knolls: [[20, 18, 9, 2.6], [124, 92, 9, 3], [48, 100, 7, 2], [92, 70, 6, 1.6]],
    ponds: [[34, 36, 19, 13], [108, 38, 20, 14], [62, 112, 9, 7]],
    rinks: [[106, 120, 10, 6.5]],
    crags: [[84, 96, 6.5, 4.2]],
    roads: [[[0, 74], [36, 78], [72, 80], [143, 72]], [[18, 143], [22, 118], [36, 78]], [[72, 80], [66, 40], [70, 0]]],
    dress: { trees: 130, giants: 3, under: 110, flowers: 80, rocks: 28, timber: 18 },
  },
  rimewood: {
    banner: ['Pines in the Snow', 'Rimewood'], northForest: true, eastShore: true, shade: 0.2, forest: 0.7, amp: 2.8, base: 3.6, seed: 129,
    rim: {},
    frostSouth: 62,
    knolls: [[24, 24, 9, 2.8], [50, 100, 9, 3], [80, 30, 7, 2]],
    ponds: [[32, 38, 12, 9]],
    rinks: [[34, 112, 10, 7]],
    crags: [[88, 96, 8, 4.4]],
    stacks: [[124, 42, 4.2, 5], [130, 88, 3.6, 4.6]],
    roads: [[[0, 72], [40, 70], [66, 58], [70, 30], [72, 0]], [[66, 58], [88, 62]]],
    dress: { trees: 120, giants: 2, under: 80, flowers: 40, rocks: 30, timber: 16 },
    floes: 6,
  },
  pinestrand: {
    banner: ['Where the Pines Meet the Sea', 'Pinestrand'], northForest: true, northShore: true, shade: 0.22, forest: 0.75, amp: 2.8, base: 3.5, seed: 117,
    rim: {},
    knolls: [[28, 126, 8, 2.4], [100, 122, 9, 2.8], [120, 82, 7, 2]],
    ponds: [[30, 104, 12, 9]],
    lagoons: [[102, 72, 14, 6.5]],
    brooks: [[[30, 104], [26, 84], [32, 66], [30, 40]]],
    seaBrooks: true,
    crags: [[116, 120, 8.5, 5]],
    stacks: [[40, 18, 4.5, 5], [96, 26, 3.6, 4.4]],
    roads: [[[76, 143], [70, 110], [60, 84], [54, 66]], [[70, 110], [110, 100], [143, 96]]],
    dress: { trees: 120, giants: 3, under: 90, flowers: 60, rocks: 24, timber: 16 },
  },
  elmshade: {
    banner: ['The Shaded Shore', 'Elmshade'], northForest: true, northShore: true, shade: 0.26, forest: 0.8, amp: 2.8, base: 3.5, seed: 118,
    rim: {},
    knolls: [[20, 120, 7, 2.2], [104, 104, 7, 2], [62, 92, 6, 1.6]],
    ponds: [[36, 118, 10, 7.5], [116, 118, 11, 8]],
    lagoons: [[46, 72, 15, 6.5]],
    brooks: [[[116, 118], [100, 126], [84, 122]]],
    crags: [[124, 66, 8, 4.6]],
    stacks: [[64, 22, 5, 5.5], [112, 24, 3.6, 4.6]],
    roads: [[[70, 143], [72, 110], [92, 92], [143, 94]], [[0, 96], [40, 98], [72, 110]], [[92, 92], [98, 66]]],
    dress: { trees: 130, giants: 4, under: 100, flowers: 60, rocks: 24, timber: 18 },
  },
  coldridge: {
    banner: ['The Cold Headland', 'Coldridge'], northForest: true, northShore: true, eastShore: true, shade: 0.2, forest: 0.7, amp: 3, base: 3.6, seed: 119,
    rim: {},
    knolls: [[60, 124, 7, 2], [20, 100, 7, 2.2]],
    ponds: [[40, 120, 10, 7.5]],
    lagoons: [[26, 72, 12, 6]],
    crags: [[86, 116, 10, 6.2], [74, 88, 7, 4], [22, 122, 6, 3.6]],
    stacks: [[58, 20, 5, 5.5], [124, 24, 4.2, 5], [128, 80, 4, 5], [124, 126, 4, 4.4]],
    roads: [[[72, 143], [66, 112], [40, 96], [0, 94]], [[40, 96], [58, 70]]],
    dress: { trees: 110, giants: 2, under: 80, flowers: 50, rocks: 36, timber: 14 },
  },
};

/** Shore z (local) at local column x on the north coast: a long bend with coves, continuous across tiles. */
export function shoreZ(spec, x) {
  const gx = spec.ox + x;
  return 50 + Math.sin(gx * 0.029) * 6 + Math.sin(gx * 0.077 + 0.9) * 3 + (fbm(gx * 0.02, 7.7, 307, 2) - 0.5) * 10;
}

/** Signed distance past the shoreline (positive is out to sea), or null for a tile with no coast. */
export function seaDist(spec, x, z) {
  const a = spec.eastShore ? x - shoreX(spec, z) : null;
  const b = spec.northShore ? shoreZ(spec, x) - z : null;
  if (a === null) return b;
  if (b === null) return a;
  // A rounded corner where the north and east shores meet.
  const k = 90;
  return (a + b + Math.sqrt((a - b) * (a - b) + k)) / 2;
}

/** 0..1 how far a cell is into the snow band along the south edge (Arctic neighbours). */
function frostAt(spec, x, z) {
  if (!spec.frostSouth) return 0;
  const gx = spec.ox + x;
  const gz = spec.oz + z;
  const base = 1 - smoothstep(0, spec.frostSouth, W - 1 - z);
  // The ragged edge only wanders near the band, so no stray frost turns up deep in the forest.
  return base * 0.95 + (fbm(gx * 0.12, gz * 0.12, 93, 2) - 0.5) * 0.9 * Math.min(1, 0.2 + base * 2);
}

/** 0..1 how far a cell has faded into Sunfeather's jungle along the west edge. */
export function jungleAt(spec, x, z) {
  if (!spec.jungleWest) return 0;
  const wob = (fbm((spec.ox + x) * 0.05, (spec.oz + z) * 0.05, 1177, 2) - 0.5) * 14;
  return 1 - smoothstep(0, spec.jungleWest, x + wob);
}

/**
 * One grove field shared by all six tiles and by the detail pass (enrich.js), so groves run on
 * across tile borders and every grove stands on dark forest grass.
 */
export const NORTH_GROVE_SEED = 4111;
function groveAt(spec, gx, gz) {
  return fbm(gx * 0.032, gz * 0.032, NORTH_GROVE_SEED, 3);
}

/** Distance from (x, z) to a polyline. */
function lineDist(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const vx = bx - ax;
    const vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return best;
}

export function forestFeature(h, x, z, spec, authored) {
  let out = authored(h, x, z, spec);
  if (out) h = out.h;
  // Ponds frozen over in the snow band: a sheet of ice above the water line, sloping banks.
  for (const [cx, cz, rx, rz] of spec.rinks || []) {
    const wob = (fbm(x * 0.11, z * 0.11, spec.seed + 3, 2) - 0.5) * 0.3;
    const d = Math.hypot((x - cx) / rx, (z - cz) / rz) + wob;
    if (d < 1.36 && h < 10) {
      out = d < 0.82 ? { h: 1.5, kind: K_ICE } : { h: lerp(1.5, Math.min(h, 3.8), (d - 0.82) / 0.54), kind: 0 };
      h = out.h;
    }
  }
  const dd = seaDist(spec, x, z);
  if (dd !== null && dd > -28) {
    const k = smoothstep(-28, -12, dd);
    h = lerp(h, shoreProfile(dd), k);
    out = { h, kind: k > 0.5 ? 0 : out?.kind ?? 0 };
    // A brook keeps its channel down through the dunes and out across the sand to the sea.
    if (spec.seaBrooks) {
      for (const pts of spec.brooks || []) {
        const d = lineDist(x, z, pts);
        if (d < 2.3) {
          h = Math.min(h, lerp(-1.1, -0.1, (d / 2.3) ** 2));
          out = { h, kind: 2 };
        } else if (d < 4.5 && h > 0.4) {
          h = Math.min(h, lerp(0.4, h, (d - 2.3) / 2.2));
          out = { h, kind: out.kind };
        }
      }
    }
  }
  // Dune lagoons: still water behind the beach, kept after the shore is graded.
  for (const [cx, cz, rx, rz] of spec.lagoons || []) {
    const wob = (fbm((spec.ox + x) * 0.09, (spec.oz + z) * 0.09, 1178, 2) - 0.5) * 0.3;
    const d = Math.hypot((x - cx) / rx, (z - cz) / rz) + wob;
    if (d < 1.4) {
      out = d < 0.74 ? { h: lerp(-1.3, -0.15, (d / 0.74) ** 2), kind: 2 } : { h: Math.min(h, lerp(0.4, 2.2, (d - 0.74) / 0.66)), kind: out?.kind ?? 0 };
      h = out.h;
    }
  }
  // Sea stacks: rocky islets standing out of the water off the beach.
  for (const [cx, cz, r, amp] of spec.stacks || []) {
    const a = Math.atan2(z - cz, x - cx);
    const d = Math.hypot(x - cx, z - cz) / (r * (1 + Math.sin(a * 4 + cx) * 0.16));
    if (d < 1.5) {
      const lift = d < 1 ? amp * (1 - d * d * 0.55) : lerp(amp * 0.45, 0, (d - 1) / 0.5);
      out = { h: h + lift, kind: d < 1 ? 3 : out?.kind ?? 0 };
      h = out.h;
    }
  }
  return out;
}

const SEA = { deep: [0.05, 0.22, 0.38], shallow: [0.08, 0.32, 0.46] };
const FOREST_TINT = [0.62, 0.92, 0.82];
const GLADE_TINT = [0.9, 1.04, 0.74];
const JUNGLE_TINT = [0.56, 0.9, 0.42];

/** Paints one cell: sea, beach, frozen ponds, snow band, then Oakhollow-style forest and glade. */
export function paintForestCell(out, H, x, z, kind, isPath, n, spec) {
  const i = z * W + x;
  const h = H[i];
  const gx = spec.ox + x;
  const gz = spec.oz + z;
  const jr = hash2(gx, gz, 77);
  const bj = 0.94 + jr * 0.12;
  const set = (zone, top, r, g, b) => {
    out.zone[i] = zone;
    out.top[i] = top;
    out.tint[i * 3] = r * bj;
    out.tint[i * 3 + 1] = g * bj;
    out.tint[i * 3 + 2] = b * bj;
  };
  out.forest[i] = 0;
  const dd = seaDist(spec, x, z) ?? -999;
  const frost = frostAt(spec, x, z);
  if (kind === K_ICE) {
    const n2 = fbm(gx * 0.09 + 3, gz * 0.09, 1176, 2);
    const sh = 0.86 + n2 * 0.14;
    set(ZONE.FIELD, TILE.ICE, 0.78 * sh, 0.94 * sh, 1);
    return;
  }
  if (h < WATER_Y || kind === 2) {
    if (dd > -6) {
      const t = smoothstep(-0.2, -1.8, h);
      set(ZONE.WATER, TILE.SAND, lerp(SEA.shallow[0], SEA.deep[0], t), lerp(SEA.shallow[1], SEA.deep[1], t), lerp(SEA.shallow[2], SEA.deep[2], t));
    } else if (frost > 0.5) set(ZONE.WATER, TILE.GRAVEL, 0.7, 0.86, 0.98);
    else set(ZONE.WATER, TILE.SAND, 0.7, 0.86, 1);
    return;
  }
  const nB = fbm(gx * 0.17, gz * 0.17 + 4, 1172, 2);
  // Ground noise in world coordinates, so nothing changes at a tile border.
  n = fbm(gx * 0.05, gz * 0.05, 1171, 2);
  if (isPath) {
    const wear = fbm(gx * 0.08 + 2, gz * 0.08, 44, 2);
    if (frost > 0.66) set(ZONE.FIELD, TILE.PATH, 0.86, 0.9, 0.98);
    else set(ZONE.FIELD, wear < 0.28 ? TILE.DIRT : TILE.PATH, 0.96, 0.9 + wear * 0.08, 0.78);
    return;
  }
  if (kind === 3 || h >= 8) {
    const moss = nB > 0.48 && frost < 0.5 && dd < -4;
    set(ZONE.MOUNTAIN, moss ? TILE.MOSS_STONE : frost > 0.66 && h > 4 && nB > 0.6 ? TILE.SNOW : TILE.STONE, 0.92, 0.94, 0.98);
    return;
  }
  // The beach: pale dry sand behind wet sand, with drifts of pebbles; dune grass where it climbs.
  if (dd > -11 + (nB - 0.5) * 4 && h < 2.6) {
    const wet = h < 0.9;
    if (frost > 0.4) {
      // Toward Glacier Bay the sand turns to its frozen grey shingle and drifted snow.
      if (nB > 0.62) set(ZONE.FIELD, TILE.SNOW, 0.94, 0.97, 1);
      else if (frost > 0.75 || nB < 0.45) set(ZONE.FIELD, TILE.GRAVEL, 0.84 + nB * 0.1, 0.88 + nB * 0.08, 0.94);
      else set(ZONE.FIELD, TILE.SAND, 0.94, 0.92, 0.84);
      return;
    }
    if (nB < 0.2 && !wet) set(ZONE.FIELD, TILE.GRAVEL, 0.9, 0.9, 0.9);
    else set(ZONE.FIELD, TILE.SAND, wet ? 0.9 : 1.0 + nB * 0.05, wet ? 0.86 : 0.95, wet ? 0.74 : 0.8);
    return;
  }
  // Snow and frosted grass creeping up from the Arctic.
  if (frost > 0.66) {
    const low = fbm(gx * 0.02, gz * 0.02, 1173, 3);
    const sh = 0.88 + (low - 0.5) * 0.1;
    set(ZONE.FIELD, TILE.SNOW, sh * (0.92 + n * 0.06), sh * 0.97, 0.99);
    out.forest[i] = spec.forest * 0.25;
    return;
  }
  if (frost > 0.36) {
    set(ZONE.FIELD, TILE.FROST_GRASS, 0.88 + n * 0.1, 0.98, 0.9 + n * 0.08);
    out.forest[i] = spec.forest * 0.45;
    return;
  }
  // Forest and glade, as on Oakhollow: deep blue-green under the groves, warm light grass between.
  const grove = groveAt(spec, gx, gz);
  const forestAmt = smoothstep(0.38, 0.5, grove);
  const patch = fbm(gx * 0.09 + 3, gz * 0.09 + 1, 33, 3);
  const low = fbm(gx * 0.02 + 4, gz * 0.02, 1174, 3);
  const hue = fbm(gx * 0.033, gz * 0.03, 1175, 3);
  const pv = 0.86 + patch * 0.22 + (low - 0.5) * 0.16;
  let t = [0, 1, 2].map((k) => lerp(GLADE_TINT[k], FOREST_TINT[k], forestAmt));
  // Salt wind bleaches the grass toward the beach; frost cools it near the snow; jungle warms it in the west.
  const salt = smoothstep(-34, -10, dd) * 0.5;
  if (salt > 0) t = [lerp(t[0], 0.96, salt * 0.5), lerp(t[1], 0.98, salt * 0.3), lerp(t[2], 0.7, salt * 0.4)];
  if (frost > 0.1) t = [lerp(t[0], 0.8, frost * 0.5), t[1], lerp(t[2], 0.86, frost * 0.6)];
  const jungle = jungleAt(spec, x, z);
  if (jungle > 0) t = t.map((v, k) => lerp(v, JUNGLE_TINT[k], jungle * 0.85));
  t = [t[0] * pv * (0.92 + hue * 0.18), t[1] * pv * (0.96 + (1 - hue) * 0.06), t[2] * pv * (0.88 + (1 - hue) * 0.2)];
  const flower = forestAmt < 0.4 && salt < 0.1 && (jr > 0.9 || (n > 0.7 && h > 1.4 && h < 5.4));
  set(forestAmt > 0.5 ? ZONE.FOREST : ZONE.FIELD, flower ? TILE.FLOWER_GRASS : TILE.GRASS, t[0], t[1], t[2]);
  out.forest[i] = spec.forest * (0.3 + forestAmt * 0.7) * (1 - salt);
}

/** Atmosphere: chill rises toward the snow along the south of 27 to 29. */
export function forestChill(spec) {
  if (!spec.frostSouth) return () => 0;
  return (lx, lz) => 0.6 * (1 - smoothstep(0, spec.frostSouth, W - 1 - lz));
}

/** Which detail kit a cell takes, so snow gets frost pines, sand gets driftwood, the west gets jungle. */
export function forestDetailBiome(spec, data) {
  return (lx, lz) => {
    const i = lz * W + lx;
    const t = data.top[i];
    if (t === TILE.SNOW || t === TILE.FROST_GRASS || t === TILE.ICE) return 'arctic';
    if (t === TILE.SAND || t === TILE.GRAVEL) return 'strand';
    const j = jungleAt(spec, lx, lz);
    if (j > 0 && hash2(spec.ox + lx, spec.oz + lz, 517) < j * 0.85) return 'jungle';
    return null;
  };
}

/* ------------------------------ dressing ------------------------------ */

const pickM = (arr, n) => (arr && arr.length ? arr[n % arr.length] : null);

function scatter(spec, count, tag, tries, fn) {
  let placed = 0;
  for (let n = 0; n < tries && placed < count; n++) {
    const lx = 4 + Math.floor(hash2(n, tag, spec.seed) * (W - 8));
    const lz = 4 + Math.floor(hash2(n, tag + 50, spec.seed) * (W - 8));
    if (fn(lx, lz, n)) placed++;
  }
  return placed;
}

export function dressNorthForest(world, land, spec) {
  const m = world.models;
  const J = m.jungle;
  const A = m.arctic;
  const data = land.data;
  const D = spec.dress;
  const at = (lx, lz) => [land.x0 + lx + 0.5, land.z0 + lz + 0.5];
  const topAt = (lx, lz) => data.top[lz * W + lx];
  const ok = (lx, lz, lo, hi) => {
    const i = lz * W + lx;
    const h = data.H[i];
    if (data.pathMask[i] || h < lo || h > hi || data.zone[i] === ZONE.WATER || data.zone[i] === ZONE.MOUNTAIN) return false;
    // A verge either side of every road.
    for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
      const x = lx + dx;
      const z = lz + dz;
      if (x >= 0 && z >= 0 && x < W && z < W && data.pathMask[z * W + x]) return false;
    }
    return true;
  };
  const sandy = (lx, lz) => {
    const t = topAt(lx, lz);
    return t === TILE.SAND || t === TILE.GRAVEL;
  };
  const snowy = (lx, lz) => {
    const t = topAt(lx, lz);
    return t === TILE.SNOW || t === TILE.FROST_GRASS || t === TILE.ICE;
  };
  const put = (parts, lx, lz, rot, scale, r, collide, opts) => {
    if (!parts) return false;
    const [x, z] = at(lx, lz);
    if (!world.free(x, z, r)) return false;
    if (world.overLedge(x, z, 0.45 * scale)) return false;
    world.putAt(parts, x, z, rot, scale, opts);
    if (collide) world.circle(x, z, collide);
    world.occupy(x, z, r);
    return true;
  };
  const shareProps = world.instanceProps;
  world.instanceProps = true;
  try {
    // The canopy: groves of pine and oak, frost pines in the snow band, broadleaf toward Sunfeather.
    scatter(spec, D.trees, 1, D.trees * 14, (lx, lz, n) => {
      if (!ok(lx, lz, 1.2, 7.4) || sandy(lx, lz)) return false;
      const gx = spec.ox + lx;
      const gz = spec.oz + lz;
      const grove = groveAt(spec, gx, gz);
      // Snowy pine stands fill the frost band more evenly than the groves further north.
      const open = snowy(lx, lz) ? 0.45 : 0.12;
      if (grove < 0.44 && hash2(n, 9, spec.seed) > open) return false;
      const roll = hash2(n, 4, spec.seed);
      let parts;
      if (snowy(lx, lz)) parts = A && roll > 0.35 ? pickM(A.frostPines, n) : pickM(m.snowPines, n);
      else if (J && jungleAt(spec, lx, lz) > hash2(n, 6, spec.seed) + 0.15) parts = roll > 0.4 ? pickM(J.broadleaf, n) : roll > 0.2 ? pickM(J.bananas, n) : pickM(J.palms, n);
      else if (roll > 0.94) parts = pickM(m.autumn, n);
      else if (roll > 0.5) parts = pickM(m.pines, n);
      else parts = pickM(m.oaks, n);
      const s = 0.68 + hash2(n, 1, spec.seed) * 0.34;
      if (!put(parts, lx, lz, roll * 6.28, s, 1.4, 0.4)) return false;
      world.treeDots.push({ x: land.x0 + lx + 0.5, z: land.z0 + lz + 0.5 });
      return true;
    });
    // A few old giants alone in the glades.
    scatter(spec, D.giants, 2, D.giants * 60, (lx, lz, n) => {
      if (!ok(lx, lz, 1.6, 6.5) || sandy(lx, lz) || snowy(lx, lz)) return false;
      if (groveAt(spec, spec.ox + lx, spec.oz + lz) > 0.42) return false;
      const [x, z] = at(lx, lz);
      if (!world.free(x, z, 5)) return false;
      if (!put(pickM(m.giants, n), lx, lz, n * 1.7, 0.95 + hash2(n, 3, spec.seed) * 0.15, 4, 0.9)) return false;
      world.treeDots.push({ x, z });
      return true;
    });
    // Undergrowth: ferns, bushes, mushrooms and forest grass under the trees; frost bushes in the snow.
    scatter(spec, D.under, 3, D.under * 10, (lx, lz, n) => {
      if (!ok(lx, lz, 1.2, 7) || sandy(lx, lz)) return false;
      const roll = hash2(n, 5, spec.seed);
      let parts;
      let cover = true;
      if (snowy(lx, lz)) parts = A ? pickM(roll > 0.5 ? A.frostBushes : A.snowMounds, n) : null;
      else if (J && jungleAt(spec, lx, lz) > roll) parts = pickM(roll > 0.5 ? J.ferns : J.bigLeaves, n);
      else if (roll > 0.82) {
        parts = pickM(m.bushes, n);
        cover = false;
      } else if (roll > 0.5) parts = pickM(m.ferns, n);
      else if (roll > 0.47) parts = pickM(roll > 0.49 ? m.mushRed : m.mushBrown, n);
      else parts = pickM(m.tuftsForest, n);
      return put(parts, lx, lz, roll * 6.28, cover ? 1 : 0.85, cover ? 0.5 : 0.7, cover ? 0 : 0.35, cover ? { cover: true } : undefined);
    });
    // Wildflowers in the glades.
    scatter(spec, D.flowers, 4, D.flowers * 12, (lx, lz, n) => {
      if (!ok(lx, lz, 1.2, 6.5) || sandy(lx, lz)) return false;
      if (groveAt(spec, spec.ox + lx, spec.oz + lz) > 0.46) return false;
      const roll = hash2(n, 7, spec.seed);
      const parts = snowy(lx, lz) ? (A ? pickM(A.frostFlowers, n) : null) : roll > 0.4 ? pickM(m.flowers, n) : pickM(m.tufts, n);
      return put(parts, lx, lz, roll * 6.28, 1, 0.45, 0, { cover: true });
    });
    // Rocks and boulders, heavier round the crags.
    scatter(spec, D.rocks, 5, D.rocks * 30, (lx, lz, n) => {
      if (!ok(lx, lz, 1, 8.5) || sandy(lx, lz)) return false;
      const big = data.H[lz * W + lx] > 5.2 || hash2(n, 8, spec.seed) > 0.8;
      const list = snowy(lx, lz) && A ? A.snowRocks : J && jungleAt(spec, lx, lz) > 0.5 ? J.mossRocks : big ? m.boulders : m.rocks;
      return put(pickM(list, n), lx, lz, n, big ? 0.9 : 0.75, 1, big ? 0.7 : 0.4);
    });
    // Fallen timber and stumps in the woods.
    scatter(spec, D.timber, 6, D.timber * 30, (lx, lz, n) => {
      if (!ok(lx, lz, 1.4, 6.5) || sandy(lx, lz)) return false;
      if (groveAt(spec, spec.ox + lx, spec.oz + lz) < 0.46) return false;
      const list = snowy(lx, lz) && A?.frozenLogs ? A.frozenLogs : hash2(n, 9, spec.seed) > 0.5 ? m.logs : m.stumps;
      return put(pickM(list, n), lx, lz, n * 1.3, 1, 1.1, 0.5);
    });
    // Reeds round every pond and brook, lily pads on the still water.
    for (let z = 2; z < W - 2; z += 2)
      for (let x = 2; x < W - 2; x += 2) {
        const i = z * W + x;
        const d = seaDist(spec, x, z) ?? -999;
        if (d > -16) continue;
        if (data.zone[i] === ZONE.WATER) {
          if (m.lily && data.H[i] < -0.6 && hash2(x, z, spec.seed + 4) > 0.86) {
            const [wx, wz] = at(x, z);
            if (world.free(wx, wz, 0.6)) world.putAt(m.lily[(x + z) % m.lily.length], wx, wz, x * 0.7, 1, { y: WATER_Y - 0.04 });
          }
          continue;
        }
        if (sandy(x, z) || data.pathMask[i]) continue;
        let wet = false;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (data.zone[i + dx + dz * W] === ZONE.WATER) wet = true;
        if (!wet || hash2(x, z, spec.seed) < 0.4) continue;
        const [wx, wz] = at(x, z);
        if (m.reeds && world.free(wx, wz, 0.4)) world.putAt(m.reeds[(x + z) % m.reeds.length], wx, wz, z * 0.2, 1);
      }
    // Shore pines along the top of the dunes.
    if (spec.northShore || spec.eastShore) {
      scatter(spec, 26, 7, 900, (lx, lz, n) => {
        const d = seaDist(spec, lx, lz);
        if (d === null || d < -26 || d > -12 || !ok(lx, lz, 1.6, 6) || sandy(lx, lz)) return false;
        return put(pickM(m.pines, n), lx, lz, n * 2.1, 0.62 + hash2(n, 2, spec.seed) * 0.22, 1.5, 0.4);
      });
    }
    // The beach: driftwood, shells, beach rocks, crabs and starfish.
    if (J && (spec.northShore || spec.eastShore)) {
      const beach = [['driftwood', 18, 1.4, 0.5], ['shells', 40, 0.4, 0], ['beachRocks', 16, 1.2, 0.6], ['crabs', 8, 0.4, 0], ['starfish', 10, 0.5, 0]];
      beach.forEach(([key, count, r, collide], k) => {
        scatter(spec, count, 20 + k, count * 40, (lx, lz, n) => {
          const i = lz * W + lx;
          const h = data.H[i];
          if (data.pathMask[i] || h < 0.5 || h > 2.4 || data.zone[i] === ZONE.WATER || !sandy(lx, lz)) return false;
          return put(pickM(J[key], n), lx, lz, n * 1.9, 1, r, collide, collide ? undefined : { cover: true });
        });
      });
    }
    // A few floes drifting south from Glacier Bay.
    if (A && spec.floes) {
      scatter(spec, spec.floes, 30, spec.floes * 40, (lx, lz, n) => {
        const i = lz * W + lx;
        if (data.zone[i] !== ZONE.WATER || data.H[i] > -0.8 || (seaDist(spec, lx, lz) ?? -99) < 8) return false;
        const [x, z] = at(lx, lz);
        if (!world.free(x, z, 3)) return false;
        world.putAt(pickM(A.floes, n), x, z, n * 1.7, 0.9 + hash2(n, 3, spec.seed) * 0.4, { y: WATER_Y - 0.08 });
        world.occupy(x, z, 2.4);
        return true;
      });
    }
  } finally {
    world.instanceProps = shareProps;
  }
}
