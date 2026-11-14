import { fbm, hash2, lerp, clamp, smoothstep } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE } from './terrain.js';
import { keepFrame, raiseKeep } from './keeps.js';

/**
 * The volcanic block: Ashen Road (34), The Endless Field (24), Dawnspire (23), Hellspire (14) and Cinderfall (13).
 * Terrain features and painting live here along with all the dressing; ring.js builds the height fields and stitches edges.
 */

export const K_LAVA = 8;
const TAU = Math.PI * 2;

export const VOLCANIC_SPECS = {
  ashroad: {
    banner: ['Scorched Road', 'Ashen Road'], volcanic: true, shade: 0.12, forest: 0.4, amp: 3, base: 3.6, seed: 61,
    rim: { w: true, e: true },
    blend: { z0: 26, z1: 118 },
    knolls: [[34, 40, 9, 3.4], [112, 36, 9, 3.8], [100, 84, 7, 2.4], [30, 96, 6, 2]],
    lava: [[104, 30, 5.5]],
    roads: [[[72, 143], [74, 100], [70, 60], [72, 0]]],
    dress: { ash: 40, thorns: 24, blooms: 24, spires: 5, rocks: 36, boulders: 10, mounds: 26, vents: 2, logs: 5, bones: 2, oaks: 90 },
  },
  warfield: {
    banner: ['Where Good and Evil Clash', 'The Endless Field'], volcanic: true, shade: 0.04, forest: 0.08, amp: 2.6, base: 3.6, seed: 62,
    rim: { e: true },
    knolls: [[34, 36, 8, 2.8], [112, 112, 9, 3], [118, 40, 7, 2.2], [26, 110, 7, 2.4]],
    lava: [[108, 100, 7], [40, 42, 6]],
    roads: [[[72, 143], [72, 100], [72, 72], [72, 0]], [[0, 72], [36, 72], [72, 72]]],
    dress: { ash: 18, thorns: 18, blooms: 12, spires: 4, rocks: 30, boulders: 8, mounds: 20, vents: 2, logs: 4, bones: 3 },
    battle: true,
  },
  dawnspire: {
    banner: ['Castle of the Holy Knight', 'Dawnspire'], volcanic: true, shade: 0.04, forest: 0.1, amp: 2.4, base: 3.6, seed: 63,
    rim: { w: true, s: true },
    plateau: { cx: 72, cz: 72, hw: 46, hd: 46, h: 3.5, fall: 22 },
    keep: { kind: 'holy', cx: 72, cz: 72, theta: Math.PI / 2 },
    knolls: [[24, 24, 8, 3], [120, 22, 8, 3.2], [124, 124, 7, 2.4]],
    lava: [[18, 114, 6]],
    roads: [[[143, 72], [112, 72]]],
    dress: { ash: 10, thorns: 8, blooms: 10, spires: 3, rocks: 18, boulders: 5, mounds: 12, vents: 0, logs: 2, bones: 0 },
    avenue: { kind: 'holy' },
  },
  hellspire: {
    banner: ['Fortress of the Demon Knight', 'Hellspire'], volcanic: true, shade: 0.06, forest: 0.1, amp: 2.6, base: 3.6, seed: 64,
    rim: { n: true, e: true },
    plateau: { cx: 72, cz: 66, hw: 46, hd: 46, h: 3.5, fall: 22 },
    keep: { kind: 'demon', cx: 72, cz: 66, theta: 0 },
    knolls: [[22, 118, 8, 3], [122, 120, 8, 3.2], [24, 28, 7, 2.4]],
    lava: [[20, 96, 6.5], [124, 100, 6]],
    roads: [[[72, 143], [72, 106]], [[0, 72], [24, 74]]],
    dress: { ash: 12, thorns: 12, blooms: 20, spires: 7, rocks: 22, boulders: 7, mounds: 12, vents: 4, logs: 3, bones: 3 },
    avenue: { kind: 'demon' },
  },
  cinderfall: {
    banner: ['The Smoking Mountain', 'Cinderfall'], volcanic: true, shade: 0.05, forest: 0.08, amp: 2.8, base: 3.6, seed: 65,
    rim: { n: true, w: true },
    cone: { cx: 58, cz: 56, r: 44, top: 17, crater: 10 },
    knolls: [[116, 112, 8, 3.2], [118, 36, 7, 2.6], [16, 132, 8, 2.8]],
    lava: [[108, 88, 6], [18, 74, 5.5]],
    lair: { cx: 48, cz: 104, island: 11, shore: 14, moat: 25, outer: 30, islandH: 6.2, lavaH: 1.15, bankH: 4.8, bridge: 1.46 },
    roads: [[[143, 72], [112, 84], [84, 108], [72, 143]]],
    dress: { ash: 24, thorns: 14, blooms: 24, spires: 8, rocks: 30, boulders: 12, mounds: 16, vents: 6, logs: 4, bones: 3 },
  },
};

/** Volcanic-ness of a cell: 1 on a fully scorched tile, fading to meadow on Ashen Road's south end. */
function volcAmount(spec, z) {
  if (!spec.blend) return 1;
  return 1 - smoothstep(spec.blend.z0, spec.blend.z1, z);
}

function lairFeature(h, x, z, lair) {
  const dx = x - lair.cx;
  const dz = z - lair.cz;
  const d = Math.hypot(dx, dz);
  if (d > lair.outer + 4) return null;
  const ang = Math.atan2(dx, dz);
  let da = ang - lair.bridge;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  const onBridge = Math.abs(da) < 0.28 && d <= lair.outer + 1.5;
  if (d <= lair.island) return { h: lair.islandH, kind: 0 };
  if (onBridge) {
    const u = clamp((d - lair.island) / Math.max(1, lair.outer - lair.island), 0, 1);
    return { h: lerp(lair.islandH, lair.bankH, u), kind: 0 };
  }
  if (d <= lair.shore) {
    const u = (d - lair.island) / Math.max(1, lair.shore - lair.island);
    return { h: lerp(lair.islandH, lair.lavaH + 0.6, u), kind: u > 0.72 ? K_LAVA : 0 };
  }
  if (d <= lair.moat) return { h: lair.lavaH, kind: K_LAVA };
  const u = clamp((d - lair.moat) / Math.max(1, lair.outer - lair.moat), 0, 1);
  const lip = lerp(lair.lavaH + 0.35, lair.bankH, smoothstep(0, 1, u));
  return { h: lerp(lip, h, smoothstep(0.7, 1, u)), kind: 0 };
}

export function volcanicFeature(h, x, z, spec) {
  if (spec.lair) {
    const carved = lairFeature(h, x, z, spec.lair);
    if (carved) return carved;
  }
  if (spec.plateau) {
    const { cx, cz, hw, hd, h: ph, fall } = spec.plateau;
    const dx = Math.max(0, Math.abs(x - cx) - hw);
    const dz = Math.max(0, Math.abs(z - cz) - hd);
    const d = Math.hypot(dx, dz);
    if (d < fall) return { h: lerp(ph, h, smoothstep(0, fall, d)), kind: 0 };
  }
  if (spec.cone) {
    const { cx, cz, r, top, crater } = spec.cone;
    const a = Math.atan2(z - cz, x - cx);
    const wob = 1 + 0.08 * Math.sin(a * 3 + 1.1) + 0.05 * Math.sin(a * 7);
    const d = Math.hypot(z - cz, x - cx) / wob;
    if (d < r) {
      const t = 1 - d / r;
      const body = lerp(h, top, Math.pow(t, 1.15));
      if (d < crater) {
        if (d < crater * 0.62) return { h: top - 3.6, kind: K_LAVA };
        return { h: lerp(top - 3.6, top + 0.4, (d - crater * 0.62) / (crater * 0.38)), kind: 0 };
      }
      return { h: Math.max(h, body), kind: 0 };
    }
  }
  if (spec.lava) {
    for (const [cx, cz, r] of spec.lava) {
      const wob = (fbm(x * 0.13, z * 0.13, spec.seed + 3, 2) - 0.5) * 0.4;
      const d = Math.hypot(x - cx, z - cz) / r + wob;
      if (d < 1.5) {
        if (d < 0.78) return { h: 1.2, kind: K_LAVA };
        return { h: lerp(1.5, Math.min(h, 3.8), (d - 0.78) / 0.72), kind: 0 };
      }
    }
  }
  return null;
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

function lavaGlow(spec, x, z) {
  let g = 0;
  const pools = spec.lava || [];
  for (let k = 0; k < pools.length; k++) {
    const [cx, cz, r] = pools[k];
    g = Math.max(g, 1 - smoothstep(r * 0.9, r * 2.1, Math.hypot(x - cx, z - cz)));
  }
  if (spec.cone) {
    const { cx, cz, crater } = spec.cone;
    g = Math.max(g, 1 - smoothstep(crater * 0.7, crater * 2.4, Math.hypot(x - cx, z - cz)));
  }
  return g;
}

/** Paints one cell of a volcanic tile. World-space noise keeps the five tiles one continuous wasteland. */
export function paintVolcanicCell(out, H, x, z, kind, isPath, n, spec) {
  const i = z * W + x;
  const h = H[i];
  const slope = localSlope(H, x, z);
  const gx = (spec.ox || 0) + x;
  const gz = (spec.oz || 0) + z;
  const nA = fbm(gx * 0.045 + 7, gz * 0.045, 71, 3);
  const nB = fbm(gx * 0.11, gz * 0.11 + 5, 72, 2);
  const v0 = volcAmount(spec, z);
  const v = clamp(v0 + (nB - 0.5) * 0.7 * (v0 > 0.02 && v0 < 0.98 ? 1 : 0), 0, 1);
  const glow = lavaGlow(spec, x, z);
  out.forest[i] = 0;
  const set = (zone, top, r, g, b) => {
    out.zone[i] = zone;
    out.top[i] = top;
    out.tint[i * 3] = r;
    out.tint[i * 3 + 1] = g;
    out.tint[i * 3 + 2] = b;
  };
  const keep = spec.keep;
  let frame = null;
  if (keep) frame = spec.frame || (spec.frame = keepFrame(keep.cx, keep.cz, keep.theta || 0));
  const [lx, lz] = frame ? frame.local(x, z) : [999, 999];
  const inCourt = Math.abs(lx) < 31.5 && Math.abs(lz) < 31.5;
  const inGateway = Math.abs(lx) < 4.2 && lz >= 31.5 && lz < 46;
  const nearWall = Math.abs(lx) < 40 && Math.abs(lz) < 40;

  if (kind === K_LAVA) {
    const fl = 0.92 + nB * 0.3;
    set(ZONE.FIELD, TILE.LAVA, 1.55 * fl, 1.2 * fl, 0.85);
    return;
  }
  if (inCourt || inGateway) {
    if (keep.kind === 'holy') {
      const chk = ((x >> 2) + (z >> 2)) & 1;
      set(ZONE.FIELD, TILE.FLAGSTONE, 0.94 + chk * 0.04 + nB * 0.04, 0.96 + chk * 0.03, 1);
    } else {
      const vein = nA > 0.7 && (x + z) % 5 === 0;
      if (vein) set(ZONE.FIELD, TILE.CINDER, 1.3, 1.1, 1);
      else set(ZONE.FIELD, TILE.OBSIDIAN, 0.95 + nB * 0.12, 0.95 + nB * 0.1, 1.04);
    }
    return;
  }
  if (isPath) {
    if (v > 0.55) set(ZONE.FIELD, TILE.GRAVEL, 0.5 + nB * 0.08, 0.47 + nB * 0.06, 0.5 + nB * 0.06);
    else set(ZONE.FIELD, TILE.PATH, 0.86, 0.86, 0.8);
    return;
  }
  if (keep && nearWall && lz > 0) {
    if (keep.kind === 'holy' && nB > 0.62) {
      set(ZONE.FIELD, TILE.ASH, 0.98, 0.98, 1.06);
      return;
    }
  }
  const rocky = h >= 8 || (slope >= 1.3 && n > 0.32);
  if (v < 0.5 && rocky) {
    set(ZONE.MOUNTAIN, TILE.STONE, 0.86 + v * 0.12, 0.88 + v * 0.08, 0.96);
    return;
  }
  if (v < 0.5) {
    const dry = v / 0.5;
    const gn = 0.72 + n * 0.26;
    out.forest[i] = spec.forest * 0.6 * (1 - dry);
    if (dry < 0.28) set(spec.forest > 0.35 ? ZONE.FOREST : ZONE.FIELD, TILE.GRASS, gn * (1 - dry * 1.4), (0.88 + (1 - n) * 0.16) * (1 - dry * 0.9), (0.5 + n * 0.2) * (1 - dry * 1.2));
    else if (dry < 0.62) set(ZONE.FIELD, TILE.DIRT, 0.62 + n * 0.12, 0.56 + n * 0.08, 0.5);
    else set(ZONE.FIELD, nB > 0.55 ? TILE.ASH : TILE.GRAVEL, 0.62, 0.6, 0.6);
    return;
  }
  const warm = glow * 0.55;
  if (h >= 8 || (slope >= 1.3 && nA > 0.3)) {
    const crackle = nB > 0.8 && slope > 0.5;
    if (crackle) set(ZONE.MOUNTAIN, TILE.CINDER, 1.2, 1.05, 1);
    else set(ZONE.MOUNTAIN, TILE.BASALT, 0.92 + nB * 0.2 + warm, 0.92 + nB * 0.16 + warm * 0.25, 1);
    return;
  }
  if (glow > 0.62 && nB > 0.25) {
    set(ZONE.FIELD, TILE.CINDER, 1.1 + warm * 0.6, 1.0 + warm * 0.2, 0.95);
    return;
  }
  const dryAmt = (v - 0.5) / 0.5;
  if (nA < 0.4) set(ZONE.FIELD, TILE.ASH, 0.92 + nB * 0.2 + warm * 0.5, 0.92 + nB * 0.14 + warm * 0.1, 0.96 + nB * 0.1);
  else if (nA > 0.76 && nB > 0.5) set(ZONE.FIELD, TILE.CINDER, 1.05 + warm * 0.4, 1, 0.98);
  else set(ZONE.FIELD, TILE.BASALT, 0.95 + nB * 0.25 + warm, 0.92 + nB * 0.18 + warm * 0.28, 1.02 + nB * 0.1);
  void dryAmt;
}

/** Ember glow and ash haze: 0 on the old meadow, 1 in the deep wasteland. */
export function emberAmount(spec) {
  if (!spec.blend) return () => 1;
  return (lx, lz) => smoothstep(0, 1, volcAmount(spec, lz) * 1.2);
}

/* ------------------------------ dressing ------------------------------ */

export function dressVolcanic(world, land, spec) {
  const V = world.models.volcanic;
  const M = world.models;
  const data = land.data;
  const seed = spec.seed;
  const D = spec.dress;
  const place = (parts, lx, lz, rot, scale, o = {}) => {
    const x = land.x0 + lx + 0.5;
    const z = land.z0 + lz + 0.5;
    if (!world.free(x, z, o.r ?? 1)) return false;
    world.putAt(parts, x, z, rot, scale, o.opts);
    if (o.collide) world.circle(x, z, o.collide);
    if (o.occ) world.occupy(x, z, o.occ);
    if (o.light) world.lightSpots.push({ x, y: world.heightAt(x, z) + o.light[1], z, color: o.light[0] });
    return true;
  };
  const frame = spec.keep ? keepFrame(spec.keep.cx, spec.keep.cz, spec.keep.theta || 0) : null;
  const reserved = (lx, lz) => {
    if (!frame) return false;
    const [a, b] = frame.local(lx, lz);
    return Math.abs(a) < 46 && b > -46 && b < 74;
  };
  const cellOk = (lx, lz, lo, hi) => {
    const i = lz * W + lx;
    const h = data.H[i];
    const t = data.top[i];
    if (spec.lair && Math.hypot(lx - spec.lair.cx, lz - spec.lair.cz) < spec.lair.outer + 1) return false;
    return !data.pathMask[i] && h >= lo && h <= hi && t !== TILE.LAVA && !reserved(lx, lz);
  };
  const scatter = (count, tag, tries, fn) => {
    let placed = 0;
    for (let n = 0; n < tries && placed < count; n++) {
      const lx = 5 + Math.floor(hash2(n, tag, seed) * (W - 10));
      const lz = 5 + Math.floor(hash2(n, tag + 50, seed) * (W - 10));
      if (fn(lx, lz, n)) placed++;
    }
    return placed;
  };
  const vAt = (lz) => volcAmount(spec, lz);

  for (const pool of spec.lava || []) {
    const [lx, lz, r] = pool;
    const x = land.x0 + lx + 0.5;
    const z = land.z0 + lz + 0.5;
    world.circle(x, z, r * 0.8);
    world.occupy(x, z, r * 1.3);
    world.lightSpots.push({ x, y: 1.9, z, color: 0xff6a1a });
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + 0.3;
      place(V.rocks[k % V.rocks.length], Math.round(lx + Math.cos(a) * r * 1.25), Math.round(lz + Math.sin(a) * r * 1.25), a, 0.8 + (k % 3) * 0.25, { r: 1, collide: 0.5, occ: 0.8 });
    }
  }
  if (spec.lair) {
    const L = spec.lair;
    const x = land.x0 + L.cx + 0.5;
    const z = land.z0 + L.cz + 0.5;
    world.volcanumLair = { x, z, r: L.island };
    world.lightSpots.push({ x, y: L.islandH + 2.4, z, color: 0xff6a1a });
    world.lightSpots.push({ x: x + 6, y: L.lavaH + 1.2, z, color: 0xff5a12 });
    world.lightSpots.push({ x: x - 6, y: L.lavaH + 1.2, z, color: 0xff8a24 });
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      let da = a - L.bridge;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      if (Math.abs(da) < 0.42) continue;
      const rad = L.outer - 1.2;
      place(V.obsidianSpires[k % 3], Math.round(L.cx + Math.sin(a) * rad), Math.round(L.cz + Math.cos(a) * rad), a, 1.15 + (k % 3) * 0.25, { r: 2, collide: 0.8, occ: 1.6, light: k % 4 === 0 ? [0xff6a1a, 2.2] : null });
    }
    for (let k = 0; k < 5; k++) {
      const a = L.bridge + Math.PI + (k - 2) * 0.35;
      place(V.boulders[k % 2], Math.round(L.cx + Math.sin(a) * (L.island - 2.2)), Math.round(L.cz + Math.cos(a) * (L.island - 2.2)), a, 0.7, { r: 1.2, collide: 0.6, occ: 1 });
    }
  }
  if (spec.cone) {
    const { cx, cz, crater } = spec.cone;
    const x = land.x0 + cx + 0.5;
    const z = land.z0 + cz + 0.5;
    world.circle(x, z, crater * 0.58);
    world.occupy(x, z, crater * 1.6);
    world.lightSpots.push({ x, y: world.heightAt(x, z) + 3, z, color: 0xff7a24 });
    world.lightSpots.push({ x: x + 6, y: world.heightAt(x, z) + 3, z: z + 4, color: 0xff5a14 });
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU;
      place(V.obsidianSpires[k % 3], Math.round(cx + Math.cos(a) * crater * 1.5), Math.round(cz + Math.sin(a) * crater * 1.5), a, 0.9 + (k % 4) * 0.2, { r: 2, collide: 0.9, occ: 2 });
    }
  }

  scatter(D.oaks || 0, 1, (D.oaks || 0) * 14, (lx, lz, n) => {
    const v = vAt(lz);
    if (!cellOk(lx, lz, 1.4, 7.2) || v > 0.7) return false;
    if (hash2(n, 8, seed) > 1 - v * 1.2 + 0.12) return false;
    const dying = v > 0.3;
    const parts = dying ? V.ashTrees[n % V.ashTrees.length] : M.oaks[n % M.oaks.length];
    const x = land.x0 + lx + 0.5;
    const z = land.z0 + lz + 0.5;
    if (!world.free(x, z, 1.6)) return false;
    world.putAt(parts, x, z, n, dying ? 0.85 + hash2(n, 1, seed) * 0.4 : 0.62 + hash2(n, 1, seed) * 0.28);
    world.circle(x, z, 0.4);
    world.occupy(x, z, 1.3);
    world.treeDots.push({ x, z });
    return true;
  });

  scatter(D.ash, 2, D.ash * 20, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 8.5) || vAt(lz) < 0.4) return false;
    const grove = fbm(lx * 0.04, lz * 0.04, seed + 5, 3);
    if (grove < 0.34 + hash2(n, 3, seed) * 0.12) return false;
    const ok = place(V.ashTrees[n % V.ashTrees.length], lx, lz, n * 1.7, 0.8 + hash2(n, 3, seed) * 0.6, { r: 1.4, collide: 0.35, occ: 1.2 });
    if (ok) world.treeDots.push({ x: land.x0 + lx + 0.5, z: land.z0 + lz + 0.5 });
    return ok;
  });
  scatter(D.thorns, 3, D.thorns * 12, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 7) || vAt(lz) < 0.4) return false;
    return place(V.thornBushes[n % 3], lx, lz, n, 0.8 + hash2(n, 5, seed) * 0.5, { r: 0.8, collide: 0.35, occ: 0.7 });
  });
  scatter(D.blooms, 4, D.blooms * 12, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 6.5) || vAt(lz) < 0.5) return false;
    return place(V.emberBlooms[n % 3], lx, lz, n, 1.1, { r: 0.5, opts: { cover: true }, light: n % 6 === 0 ? [0xff7a24, 0.35] : null });
  });
  scatter(D.spires, 5, D.spires * 16, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 7.6) || vAt(lz) < 0.7) return false;
    const s = 0.9 + hash2(n, 3, seed) * 0.9;
    return place(V.obsidianSpires[n % 3], lx, lz, n * 1.3, s, { r: 2.6 * s, collide: 1.0 * s, occ: 2.2 * s, light: n % 3 === 0 ? [0xff6a1a, 1.6 * s] : null });
  });
  scatter(D.rocks, 6, D.rocks * 10, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 8.4)) return false;
    return place(V.rocks[n % 4], lx, lz, n, 0.7 + hash2(n, 3, seed) * 0.5, { r: 0.9, collide: 0.5, occ: 0.8 });
  });
  scatter(D.boulders, 7, D.boulders * 12, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 8.4)) return false;
    return place(V.boulders[n % 2], lx, lz, n, 0.9 + hash2(n, 3, seed) * 0.5, { r: 1.6, collide: 1.0, occ: 1.5 });
  });
  scatter(D.mounds, 8, D.mounds * 8, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 8.4)) return false;
    return place(V.ashMounds[n % 4], lx, lz, n * 0.9, 0.8 + hash2(n, 3, seed) * 0.7, { r: 0.7, opts: { cover: true } });
  });
  scatter(D.vents, 9, D.vents * 40, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 6) || vAt(lz) < 0.8) return false;
    return place(V.vents[n % 2], lx, lz, n, 1.1 + hash2(n, 3, seed) * 0.4, { r: 2.4, collide: 1.2, occ: 2, light: [0xff6a1a, 1.5] });
  });
  scatter(D.logs, 10, D.logs * 24, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 7) || vAt(lz) < 0.4) return false;
    return place(V.logs[n % 2], lx, lz, n * 1.1, 0.95, { r: 1.8, collide: 0.8, occ: 1.4 });
  });
  scatter(D.bones, 11, D.bones * 40, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 7) || vAt(lz) < 0.5) return false;
    return place(V.ribs[n % 2], lx, lz, n * 1.3, 1.0, { r: 5, collide: 0.8, occ: 4 });
  });

  if (spec.battle) dressBattle(world, land, spec, place, cellOk, scatter);
  if (spec.keep) {
    const info = raiseKeep(world, land, spec.keep);
    if (spec.keep.kind === 'demon') world.demonKeep = info;
    else world.holyKeep = info;
    dressAvenue(world, land, spec, place);
  }
}

function dressAvenue(world, land, spec, place) {
  const V = world.models.volcanic;
  const demon = spec.keep.kind === 'demon';
  const F = keepFrame(spec.keep.cx, spec.keep.cz, spec.keep.theta || 0);
  const lightColor = demon ? 0xff6a1a : 0x7fc4ff;
  for (let k = 0; k < 6; k++) {
    for (const s of [-1, 1]) {
      const lz = 44 + k * 10;
      const [x, z] = F.at(s * 6.4, lz);
      const lx = Math.round(x - land.x0 - 0.5);
      const lzz = Math.round(z - land.z0 - 0.5);
      if (lx < 4 || lzz < 4 || lx > W - 5 || lzz > W - 5) continue;
      if (k % 2 === 0) {
        place(demon ? V.obeliskDemon[0] : V.obeliskHoly[0], lx, lzz, k, 0.9, { r: 1.4, collide: 0.8, occ: 1.4, light: [lightColor, 4.2] });
      } else {
        place(demon ? V.stakesDemon[(k >> 1) % 2] : V.stakesHoly[(k >> 1) % 2], lx, lzz, s * k, 0.8, { r: 0.9, collide: 0.3, occ: 0.8, light: [lightColor, 4.4] });
      }
    }
  }
}

function dressBattle(world, land, spec, place, cellOk, scatter) {
  world.warfield = { x: land.x0 + 72.5, z: land.z0 + 72.5 };
  const V = world.models.volcanic;
  const seed = spec.seed;
  const holySide = (lx, lz) => Math.hypot(lx - 0, lz - 72) < Math.hypot(lx - 72, lz - 0) + (hash2(lx, lz, seed) - 0.5) * 22;
  const pick = (holy, demon, n) => (holy ? holy : demon)[n % (holy ? holy : demon).length];
  const roadish = (lx, lz) => Math.abs(lx - 72) < 5 || Math.abs(lz - 72) < 5;

  scatter(34, 20, 700, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 7.4) || roadish(lx, lz)) return false;
    const hs = holySide(lx, lz);
    return place(hs ? V.swordsHoly[n % 3] : V.swordsDemon[n % 3], lx, lz, hash2(n, 2, seed) * 6.28, 0.62 + hash2(n, 3, seed) * 0.3, { r: 1.2, collide: 0.3, occ: 0.8 });
  });
  scatter(14, 21, 400, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 7.4)) return false;
    const hs = holySide(lx, lz);
    return place(hs ? V.shieldsHoly[n % 2] : V.shieldsDemon[n % 2], lx, lz, hash2(n, 2, seed) * 6.28, 1.0, { r: 1, collide: 0.4, occ: 0.8 });
  });
  scatter(12, 22, 400, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 7.4)) return false;
    const hs = holySide(lx, lz);
    return place(hs ? V.armorHoly[n % 2] : V.armorDemon[n % 2], lx, lz, hash2(n, 2, seed) * 6.28, 1.0, { r: 1.4, collide: 0.8, occ: 1.1 });
  });
  scatter(12, 23, 400, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 7.4) || roadish(lx, lz)) return false;
    const hs = holySide(lx, lz);
    return place(hs ? V.bannersHoly[n % 2] : V.bannersDemon[n % 2], lx, lz, hash2(n, 2, seed) * 6.28, 0.7, { r: 1.2, collide: 0.35, occ: 1, light: n % 3 === 0 ? [hs ? 0x7fc4ff : 0xff6a1a, 4] : null });
  });
  scatter(6, 24, 300, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 6.5) || roadish(lx, lz)) return false;
    const hs = holySide(lx, lz);
    if (hs) return place(V.ballistaHoly[0], lx, lz, hash2(n, 2, seed) * 6.28, 1.0, { r: 3, collide: 1.5, occ: 2.5 });
    return place(n % 2 ? V.ballistaDemon[0] : V.catapults[n % 2], lx, lz, hash2(n, 2, seed) * 6.28, 0.95, { r: 4, collide: 2, occ: 3 });
  });
  scatter(3, 25, 200, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 6.5) || roadish(lx, lz)) return false;
    return place(V.catapults[n % 2], lx, lz, hash2(n, 2, seed) * 6.28, 1.0, { r: 4, collide: 2, occ: 3 });
  });
  scatter(10, 26, 300, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 7)) return false;
    const hs = holySide(lx, lz);
    return place(hs ? V.stakesHoly[n % 2] : V.stakesDemon[n % 2], lx, lz, n, 0.6, { r: 0.9, collide: 0.3, occ: 0.8 });
  });
  scatter(6, 27, 300, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 7)) return false;
    return place(V.skulls[n % 2], lx, lz, n, 1.0, { r: 1.5, collide: 0.5, occ: 1.2 });
  });
  void pick;
}
