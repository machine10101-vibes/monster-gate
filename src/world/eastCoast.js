import { fbm, hash2, lerp, smoothstep } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE, WATER_Y } from './terrain.js';
import { arcticFeature, paintArcticCell } from './arctic.js';

/**
 * The east coast: Glacier Bay (39), Frostshore (49) and Seawind Leas (59), the last land
 * before the open ocean of 40, 50 and 60. Glacier Bay and Frostshore carry the snowfields
 * of Glimmerfrost and Icewind Reach down to a frozen gravel shore with floes on the sea;
 * Seawind Leas is open grass and trees running to a sand beach. Frostshore thaws into
 * grass along its south edge, and frost creeps onto the north of Seawind Leas.
 *
 * The shoreline is drawn in world coordinates so it runs unbroken from tile to tile.
 */

export const EAST_COAST_KINDS = ['glacierbay', 'frostshore', 'seawind'];

/** Height of the open sea floor along the east edge, matched by every coast tile. */
export const OCEAN_FLOOR = -2.4;

export const EAST_COAST_SPECS = {
  glacierbay: {
    banner: ['The Frozen Bay', 'Glacier Bay'], arctic: true, eastCoast: true, shade: 0.05, forest: 0.3, amp: 3.2, base: 3.8, seed: 39,
    rim: { n: true },
    knolls: [[34, 34, 10, 4], [70, 30, 8, 3.2], [30, 90, 9, 3.4], [76, 126, 7, 2.6]],
    ice: [[56, 68, 12, 8]],
    pads: [[40, 120, 7, 3.8]],
    roads: [[[96, 143], [90, 120], [62, 112], [30, 112], [0, 112]]],
    dress: { pines: 70, dead: 14, bushes: 20, flowers: 26, clusters: 26, spires: 12, rocks: 30, boulders: 12, mounds: 40, snowmen: 1 },
    floes: 16,
    shoreIce: 14,
  },
  frostshore: {
    banner: ['Where the Ice Meets the Sea', 'Frostshore'], arctic: true, eastCoast: true, shade: 0.06, forest: 0.4, amp: 3, base: 3.7, seed: 49,
    rim: {},
    blend: { s: 46 },
    knolls: [[30, 26, 10, 3.8], [64, 40, 8, 3], [26, 96, 8, 2.8]],
    ice: [[44, 74, 10, 7]],
    pads: [[66, 104, 7, 3.6]],
    roads: [
      [[92, 143], [86, 116], [70, 84], [40, 58], [0, 50]],
      [[70, 84], [84, 44], [96, 0]],
    ],
    dress: { pines: 110, dead: 10, bushes: 30, flowers: 34, clusters: 14, spires: 6, rocks: 28, boulders: 10, mounds: 40, snowmen: 2 },
    floes: 10,
    shoreIce: 8,
    igloos: [[66, 104, 2.4]],
  },
  seawind: {
    banner: ['Grass by the Sea', 'Seawind Leas'], eastCoast: true, meadow: true, shade: 0, forest: 0.36, amp: 2.6, base: 3.3, seed: 59,
    rim: { s: true },
    frostNorth: 34,
    knolls: [[30, 40, 11, 3.4], [64, 104, 10, 2.8], [24, 118, 8, 2.4], [70, 60, 7, 1.8]],
    pond: [44, 82, 8, 6],
    roads: [[[0, 72], [32, 74], [60, 66], [82, 40], [92, 0]], [[60, 66], [74, 92], [86, 104]]],
  },
};

/** Shore x (local) at local row z: a long gentle bend plus a few headlands, continuous across tiles. */
export function shoreX(spec, z) {
  const gz = spec.oz + z;
  return 104 + Math.sin(gz * 0.031) * 7 + Math.sin(gz * 0.083 + 1.7) * 3 + (fbm(gz * 0.02, 3.3, 211, 2) - 0.5) * 10;
}

/** Ground profile by distance past the shoreline: lowland, beach, shallows, then the sea floor. */
export function shoreProfile(dd) {
  if (dd < -12) return 2.6;
  if (dd < 0) return lerp(0.6, 2.6, -dd / 12);
  if (dd < 8) return lerp(0.6, -0.7, dd / 8);
  return lerp(-0.7, OCEAN_FLOOR, Math.min(1, (dd - 8) / 22));
}

export function coastFeature(h, x, z, spec) {
  let out = null;
  if (spec.arctic) {
    out = arcticFeature(h, x, z, spec);
  } else if (spec.pond) {
    const [cx, cz, rx, rz] = spec.pond;
    const d = Math.hypot((x - cx) / rx, (z - cz) / rz);
    if (d < 1.4 && h < 10) out = d < 0.72 ? { h: 0, kind: 2 } : { h: lerp(0.3, Math.min(h, 3.4), (d - 0.72) / 0.68), kind: 0 };
  }
  if (out) h = out.h;
  const dd = x - shoreX(spec, z);
  if (dd > -28) {
    const k = smoothstep(-28, -12, dd);
    return { h: lerp(h, shoreProfile(dd), k), kind: k > 0.5 ? 0 : out?.kind ?? 0 };
  }
  return out;
}

const SEA = { deep: [0.05, 0.22, 0.38], shallow: [0.08, 0.32, 0.46] };
const ICE_SEA = { deep: [0.06, 0.24, 0.36], shallow: [0.14, 0.42, 0.52] };

/** Paints one coast cell: the sea, the beach, then the land behind it in its own style. */
export function paintCoastCell(out, H, x, z, kind, isPath, n, spec) {
  const i = z * W + x;
  const h = H[i];
  const gx = spec.ox + x;
  const gz = spec.oz + z;
  const set = (zone, top, r, g, b) => {
    out.zone[i] = zone;
    out.top[i] = top;
    out.tint[i * 3] = r;
    out.tint[i * 3 + 1] = g;
    out.tint[i * 3 + 2] = b;
  };
  out.forest[i] = 0;
  const dd = x - shoreX(spec, z);
  if (h < 0.35 || kind === 2) {
    const pal = spec.arctic && dd > -4 ? ICE_SEA : SEA;
    const t = smoothstep(-0.2, -1.8, h);
    const foam = hash2(gx + 5, gz + 9, 88) * 0.03;
    set(ZONE.WATER, TILE.SAND, lerp(pal.shallow[0], pal.deep[0], t) + foam, lerp(pal.shallow[1], pal.deep[1], t) + foam, lerp(pal.shallow[2], pal.deep[2], t) + foam);
    return;
  }
  const nB = fbm(gx * 0.17, gz * 0.17 + 4, spec.seed + 2, 2);
  if (!isPath && dd > -11 + (nB - 0.5) * 4 && h < 2.4) {
    if (spec.arctic) {
      // A frozen shingle beach: grey gravel with drifts of snow and the odd sheet of shore ice.
      if (nB > 0.62) set(ZONE.FIELD, TILE.SNOW, 0.94, 0.97, 1);
      else if (nB < 0.22 && h < 1.2) set(ZONE.FIELD, TILE.ICE, 0.8, 0.94, 1);
      else set(ZONE.FIELD, TILE.GRAVEL, 0.84 + nB * 0.1, 0.88 + nB * 0.08, 0.94);
    } else {
      const wet = h < 0.9;
      set(ZONE.FIELD, TILE.SAND, wet ? 0.9 : 1.0 + nB * 0.05, wet ? 0.86 : 0.95, wet ? 0.74 : 0.8);
    }
    return;
  }
  if (spec.arctic) {
    paintArcticCell(out, H, x, z, kind, isPath, n, spec);
    return;
  }
  paintMeadowCell(out, H, x, z, kind, isPath, n, spec, dd);
}

/** Open grass and wildflowers, sea-blown toward the beach and frosted along the north edge. */
function paintMeadowCell(out, H, x, z, kind, isPath, n, spec, dd) {
  const i = z * W + x;
  const h = H[i];
  const set = (zone, top, r, g, b) => {
    out.zone[i] = zone;
    out.top[i] = top;
    out.tint[i * 3] = r;
    out.tint[i * 3 + 1] = g;
    out.tint[i * 3 + 2] = b;
  };
  if (isPath) {
    set(ZONE.FIELD, TILE.PATH, 1, 0.96, 0.84);
    return;
  }
  if (kind === 3 || h >= 8) {
    set(ZONE.MOUNTAIN, h > 6 && n > 0.55 ? TILE.MOSS_STONE : TILE.STONE, 0.9, 0.91, 0.97);
    return;
  }
  const gx = spec.ox + x;
  const gz = spec.oz + z;
  // Frost along the north edge, fading in from Frostshore.
  if (spec.frostNorth) {
    const v = (1 - smoothstep(0, spec.frostNorth, z)) * 0.95 + (fbm(gx * 0.12, gz * 0.12, 93, 2) - 0.5) * 0.9;
    if (v > 0.66) {
      set(ZONE.FIELD, TILE.SNOW, 0.95, 0.97, 1);
      return;
    }
    if (v > 0.36) {
      set(ZONE.FIELD, TILE.FROST_GRASS, 0.88, 0.98, 0.92);
      out.forest[i] = spec.forest * 0.3;
      return;
    }
  }
  out.forest[i] = spec.forest * (0.55 + n * 0.7);
  const low = fbm(gx * 0.018 + 5, gz * 0.018, spec.seed + 11, 3);
  const hue = fbm(gx * 0.031 + 2, gz * 0.029, spec.seed + 23, 3);
  // Salt wind bleaches the grass toward the beach.
  const salt = smoothstep(-34, -10, dd) * 0.18;
  const flower = n > 0.66 && h < 5.2 && h > 1.4 && salt < 0.1;
  set(
    spec.forest > 0.4 ? ZONE.FOREST : ZONE.FIELD,
    flower ? TILE.FLOWER_GRASS : TILE.GRASS,
    (0.62 + n * 0.18 + (hue - 0.5) * 0.22 + salt) * (0.9 + low * 0.16),
    (0.9 + (1 - n) * 0.1 - (hue - 0.5) * 0.08) * (0.92 + low * 0.12),
    (0.42 + n * 0.14 - (hue - 0.5) * 0.16 + salt * 0.6) * (0.92 + (1 - low) * 0.08),
  );
}

/** Snow thinning to grass across the south band of Frostshore (and the matching atmosphere). */
export function coastChill(spec) {
  if (spec.blend?.s) return (lx, lz) => smoothstep(0, spec.blend.s, W - 1 - lz);
  if (spec.frostNorth) return (lx, lz) => 0.4 * (1 - smoothstep(0, spec.frostNorth, lz));
  return () => 1;
}

/* ------------------------------ dressing ------------------------------ */

const pickM = (arr, n) => (arr && arr.length ? arr[n % arr.length] : null);

function scatter(land, spec, count, tag, tries, fn) {
  let placed = 0;
  for (let n = 0; n < tries && placed < count; n++) {
    const lx = 4 + Math.floor(hash2(n, tag, spec.seed) * (W - 8));
    const lz = 4 + Math.floor(hash2(n, tag + 50, spec.seed) * (W - 8));
    if (fn(lx, lz, n)) placed++;
  }
  return placed;
}

/** Floes and bergs on the frozen sea, and ice heaped along the tide line. */
export function dressFrozenCoast(world, land, spec) {
  const A = world.models.arctic;
  if (!A) return;
  const data = land.data;
  const at = (lx, lz) => [land.x0 + lx + 0.5, land.z0 + lz + 0.5];
  scatter(land, spec, spec.floes || 0, 71, (spec.floes || 0) * 30, (lx, lz, n) => {
    const i = lz * W + lx;
    const h = data.H[i];
    if (data.zone[i] !== ZONE.WATER || h > -0.4 || lx - shoreX(spec, lz) < 6) return false;
    const [x, z] = at(lx, lz);
    if (!world.free(x, z, 3)) return false;
    const big = n % 4 === 0 && A.iceClusters;
    world.putAt(big ? pickM(A.iceClusters, n) : pickM(A.floes, n), x, z, n * 1.7, big ? 1.4 : 0.9 + hash2(n, 3, spec.seed) * 0.5, { y: WATER_Y - (big ? 0.6 : 0.08) });
    world.occupy(x, z, big ? 3 : 2.4);
    return true;
  });
  scatter(land, spec, spec.shoreIce || 0, 72, (spec.shoreIce || 0) * 30, (lx, lz, n) => {
    const i = lz * W + lx;
    const h = data.H[i];
    const dd = lx - shoreX(spec, lz);
    if (data.pathMask[i] || data.zone[i] === ZONE.WATER || dd < -8 || h > 1.6 || h < 0.5) return false;
    const [x, z] = at(lx, lz);
    if (!world.free(x, z, 1.4)) return false;
    world.putAt(n % 3 === 0 ? pickM(A.icicleRows, n) : pickM(A.iceClusters, n), x, z, n * 1.3, 0.6 + hash2(n, 4, spec.seed) * 0.4);
    world.circle(x, z, 0.6);
    world.occupy(x, z, 1.4);
    return true;
  });
  for (const [lx, lz, rot] of spec.igloos || []) {
    const [x, z] = at(lx, lz);
    if (A.igloo && world.free(x, z, 3)) {
      world.putAt(A.igloo[0], x, z, rot, 1);
      world.circle(x, z, 2);
      world.occupy(x, z, 3.5);
      world.lightSpots.push({ x, y: world.heightAt(x, z) + 1, z, color: 0xffb060 });
    }
  }
}

/** Seawind Leas: scattered oak and blossom stands, hedges, flowers, and driftwood on the sand. */
export function dressSeawind(world, land, spec) {
  const m = world.models;
  const J = m.jungle;
  const A = m.arctic;
  const data = land.data;
  const at = (lx, lz) => [land.x0 + lx + 0.5, land.z0 + lz + 0.5];
  const ok = (lx, lz, lo, hi, sand = false) => {
    const i = lz * W + lx;
    const h = data.H[i];
    if (data.pathMask[i] || h < lo || h > hi || data.zone[i] === ZONE.WATER) return false;
    const isSand = data.top[i] === TILE.SAND;
    return sand ? isSand : !isSand;
  };
  const shareProps = world.instanceProps;
  world.instanceProps = true;
  try {
    // Trees in loose groves: a grove noise picks where they gather, so the plain stays open between.
    scatter(land, spec, 74, 1, 1600, (lx, lz, n) => {
      if (!ok(lx, lz, 1.4, 7.2)) return false;
      const grove = fbm((spec.ox + lx) * 0.035, (spec.oz + lz) * 0.035, spec.seed + 5, 3);
      if (grove < 0.52 && hash2(n, 9, spec.seed) > 0.12) return false;
      const [x, z] = at(lx, lz);
      if (!world.free(x, z, 1.7)) return false;
      const top = data.top[lz * W + lx];
      const frosty = top === TILE.SNOW || top === TILE.FROST_GRASS;
      const roll = hash2(n, 4, spec.seed);
      let parts = pickM(m.oaks, n);
      if (frosty) parts = A && roll > 0.4 ? pickM(A.frostPines, n) : pickM(m.snowPines, n);
      else if (roll > 0.84) parts = pickM(m.blossoms, n);
      else if (roll > 0.72) parts = pickM(m.autumn, n);
      else if (roll > 0.6) parts = pickM(m.pines, n);
      world.putAt(parts, x, z, roll * 6, 0.66 + hash2(n, 1, spec.seed) * 0.32);
      world.circle(x, z, 0.4);
      world.occupy(x, z, 1.35);
      world.treeDots.push({ x, z });
      return true;
    });
    scatter(land, spec, 30, 2, 400, (lx, lz, n) => {
      if (!ok(lx, lz, 1.4, 6.5)) return false;
      const [x, z] = at(lx, lz);
      if (!world.free(x, z, 0.8)) return false;
      world.putAt(pickM(m.bushes, n), x, z, n, 0.8 + hash2(n, 2, spec.seed) * 0.3);
      world.circle(x, z, 0.35);
      world.occupy(x, z, 0.7);
      return true;
    });
    scatter(land, spec, 180, 3, 900, (lx, lz, n) => {
      if (!ok(lx, lz, 1.2, 6.5)) return false;
      const [x, z] = at(lx, lz);
      if (!world.free(x, z, 0.45)) return false;
      const top = data.top[lz * W + lx];
      const roll = hash2(n, 5, spec.seed);
      const parts = top === TILE.SNOW || top === TILE.FROST_GRASS ? (A ? pickM(A.frostFlowers, n) : null) : roll > 0.5 ? pickM(m.flowers, n) : pickM(m.tufts, n);
      if (!parts) return false;
      world.putAt(parts, x, z, roll * 6, 1, { cover: true });
      return true;
    });
    scatter(land, spec, 22, 4, 300, (lx, lz, n) => {
      if (!ok(lx, lz, 2, 8.5)) return false;
      const [x, z] = at(lx, lz);
      if (!world.free(x, z, 1)) return false;
      const big = data.H[lz * W + lx] > 5.5;
      world.putAt(big ? pickM(m.boulders, n) : pickM(m.rocks, n), x, z, n, big ? 0.9 : 0.75);
      world.circle(x, z, big ? 0.7 : 0.4);
      world.occupy(x, z, 0.9);
      return true;
    });
    // Reeds round the pond.
    for (let z = 2; z < W - 2; z += 2)
      for (let x = 2; x < W - 2; x += 2) {
        const i = z * W + x;
        if (data.zone[i] === ZONE.WATER || data.top[i] === TILE.SAND) continue;
        let wet = false;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (data.zone[i + dx + dz * W] === ZONE.WATER) wet = true;
        if (!wet || x - shoreX(spec, z) > -16 || hash2(x, z, spec.seed) < 0.45) continue;
        const [wx, wz] = at(x, z);
        if (m.reeds && world.free(wx, wz, 0.4)) world.putAt(m.reeds[(x + z) % m.reeds.length], wx, wz, z * 0.2, 1);
      }
    // The beach: driftwood, shells, rocks and crabs.
    if (J) {
      const beach = [['driftwood', 16, 1.4, 0.5], ['shells', 40, 0.4, 0], ['beachRocks', 14, 1.2, 0.6], ['crabs', 8, 0.4, 0], ['starfish', 10, 0.5, 0]];
      beach.forEach(([key, count, r, collide], k) => {
        scatter(land, spec, count, 20 + k, count * 30, (lx, lz, n) => {
          if (!ok(lx, lz, 0.5, 2.2, true)) return false;
          const [x, z] = at(lx, lz);
          if (!world.free(x, z, r)) return false;
          world.putAt(pickM(J[key], n), x, z, n * 1.9, 1, { cover: !collide });
          if (collide) world.circle(x, z, collide);
          world.occupy(x, z, r);
          return true;
        });
      });
    }
  } finally {
    world.instanceProps = shareProps;
  }
}
