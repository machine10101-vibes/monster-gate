import { fbm, hash2, lerp, clamp, smoothstep } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE } from './terrain.js';

/**
 * The Arctic block: Snowfall (47), Icewind Reach (48), Rimefang Mesa (37) and Glimmerfrost (38).
 * Terrain features, snow and ice painting, and all of the dressing live here; ring.js builds
 * the height fields and stitches the edges.
 */

export const K_ICE = 7;
const TAU = Math.PI * 2;

const angDiff = (a, b) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

export const ARCTIC_SPECS = {
  snowfall: {
    banner: ['Frozen Meadow', 'Snowfall'], arctic: true, shade: 0.1, forest: 0.5, amp: 2.8, base: 3.6, seed: 47,
    rim: { s: true },
    blend: { w: 52 },
    knolls: [[38, 40, 9, 3.5], [100, 56, 10, 4.2], [60, 108, 8, -1.4], [122, 112, 7, 3], [84, 24, 6, 2.5]],
    ice: [[108, 100, 11, 8], [50, 90, 7, 5]],
    pads: [[74, 78, 9, 3.5], [106, 34, 8, 4]],
    roads: [[[0, 64], [40, 66], [84, 60], [143, 70]]],
    dress: { pines: 150, dead: 10, bushes: 46, flowers: 40, clusters: 12, spires: 3, rocks: 34, boulders: 10, mounds: 46, snowmen: 3 },
    igloos: [[74, 78, 0.5]],
    camp: [106, 34],
  },
  icewind: {
    banner: ['Wind-swept Barrens', 'Icewind Reach'], arctic: true, shade: 0.05, forest: 0.3, amp: 3.8, base: 3.8, seed: 48,
    rim: { e: true, s: true },
    knolls: [[34, 44, 11, 4.6], [100, 40, 10, 4.2], [64, 100, 9, 3.4], [124, 80, 8, 3.8], [30, 110, 7, 2.5]],
    ice: [[100, 104, 15, 10], [40, 112, 8, 6]],
    pads: [[62, 62, 10, 3.8]],
    roads: [[[0, 70], [60, 72], [100, 50], [70, 0]]],
    dress: { pines: 70, dead: 26, bushes: 24, flowers: 24, clusters: 18, spires: 8, rocks: 40, boulders: 16, mounds: 70, snowmen: 1 },
    bones: [[62, 62]],
  },
  rimefang: {
    banner: ['Home of the Yetis', 'Rimefang Mesa'], arctic: true, shade: 0.12, forest: 0.4, amp: 3, base: 3.8, seed: 37,
    rim: { w: true, n: true },
    knolls: [[34, 100, 9, 3.4], [110, 112, 9, 3], [124, 34, 8, 3.4], [28, 34, 7, 2.6]],
    mesa: { cx: 70, cz: 66, rTop: 17, top: 8.5, ramp: 0.3, rampW: 0.55, cliff: 3.4, rampLen: 40 },
    roads: [[[143, 70], [112, 70], [96, 68]]],
    dress: { pines: 110, dead: 14, bushes: 30, flowers: 28, clusters: 14, spires: 6, rocks: 30, boulders: 14, mounds: 40, snowmen: 0 },
    mesaProps: true,
  },
  glimmerfrost: {
    banner: ['Crystal Glacier', 'Glimmerfrost'], arctic: true, shade: 0.04, forest: 0.35, amp: 3.2, base: 3.8, seed: 38,
    rim: { n: true, e: true },
    knolls: [[30, 36, 9, 3.6], [112, 40, 9, 4.2], [30, 110, 8, 3], [118, 110, 8, 3.4]],
    ice: [[92, 62, 21, 14], [40, 100, 10, 7]],
    pads: [[48, 30, 8, 3.8]],
    roads: [[[0, 70], [50, 70], [70, 100], [70, 143]]],
    dress: { pines: 90, dead: 12, bushes: 22, flowers: 40, clusters: 34, spires: 14, rocks: 24, boulders: 10, mounds: 40, snowmen: 2 },
    camp: [48, 30],
  },
};

export function arcticFeature(h, x, z, spec) {
  if (spec.mesa) {
    const { cx, cz, rTop, top, ramp, rampW, cliff, rampLen } = spec.mesa;
    const dx = x - cx;
    const dz = z - cz;
    const d = Math.hypot(dx, dz);
    const a = Math.atan2(dz, dx);
    const rt = rTop * (1 + 0.1 * Math.sin(a * 3 + 1.3) + 0.06 * Math.sin(a * 7 + 0.4));
    const da = Math.abs(angDiff(a, ramp));
    const rk = 1 - smoothstep(rampW * 0.55, rampW * 1.2, da);
    const span = lerp(cliff, rampLen, rk);
    if (d < rt + span) {
      const u = clamp((d - rt) / span, 0, 1);
      const e = lerp(u * u * (3 - 2 * u), u, rk);
      return { h: lerp(top, Math.max(h, 3.4), e), kind: 0 };
    }
  }
  if (spec.pads) {
    for (const [cx, cz, r, ph] of spec.pads) {
      const d = Math.hypot(x - cx, z - cz);
      if (d < r * 1.4) return { h: lerp(h, ph, 1 - smoothstep(r * 0.72, r * 1.4, d)), kind: 0 };
    }
  }
  if (spec.ice) {
    for (const [cx, cz, rx, rz] of spec.ice) {
      const wob = (fbm(x * 0.11, z * 0.11, spec.seed + 3, 2) - 0.5) * 0.3;
      const d = Math.hypot((x - cx) / rx, (z - cz) / rz) + wob;
      if (d < 1.38 && h < 10) {
        if (d < 0.82) return { h: 1.5, kind: K_ICE };
        return { h: lerp(1.5, Math.min(h, 3.8), (d - 0.82) / 0.56), kind: 0 };
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

/** Paints one cell of an Arctic tile. `kind` is the feature kind from the height pass. */
export function paintArcticCell(out, H, x, z, kind, isPath, n, spec) {
  const i = z * W + x;
  const h = H[i];
  const slope = localSlope(H, x, z);
  const n2 = fbm(x * 0.09 + 3, z * 0.09, spec.seed + 6, 2);
  const sa0 = spec.blend ? smoothstep(1, spec.blend.w, x) : 1;
  const sa = spec.blend ? clamp(sa0 + (n - 0.5) * 0.75, 0, 1) : 1;
  out.forest[i] = 0;
  const set = (zone, top, r, g, b) => {
    out.zone[i] = zone;
    out.top[i] = top;
    out.tint[i * 3] = r;
    out.tint[i * 3 + 1] = g;
    out.tint[i * 3 + 2] = b;
  };
  if (kind === K_ICE) {
    const sh = 0.86 + n2 * 0.14;
    set(ZONE.FIELD, TILE.ICE, 0.78 * sh, 0.94 * sh, 1);
  } else if (isPath) {
    set(ZONE.FIELD, TILE.PATH, 0.86, 0.9, 0.98);
  } else if (slope >= 1.3 && n > 0.32) {
    set(ZONE.MOUNTAIN, TILE.STONE, 0.84, 0.9, 1);
  } else if (sa < 0.3) {
    const gn = 0.72 + n * 0.26;
    set(spec.forest > 0.4 ? ZONE.FOREST : ZONE.FIELD, TILE.GRASS, gn, 0.9 + (1 - n) * 0.1, 0.55 + n * 0.2);
    out.forest[i] = spec.forest * 0.6 * (1 - sa / 0.3);
  } else if (sa < 0.62) {
    set(ZONE.FIELD, TILE.FROST_GRASS, 0.88 + n * 0.1, 0.98, 0.9 + n * 0.08);
  } else if (h < 3.2 && n2 > 0.74 && spec.seed !== 37) {
    set(ZONE.FIELD, TILE.ICE, 0.8, 0.95, 1);
  } else if (n > 0.9 && slope > 0.4) {
    set(ZONE.FIELD, TILE.STONE, 0.86, 0.92, 1);
  } else {
    const sh = 0.93 + n2 * 0.07;
    set(ZONE.FIELD, TILE.SNOW, sh * (0.97 + n * 0.03), sh, 1);
  }
}

/** Soft frost creeping onto the east edge of Goldmead, so Snowfall blends in. */
export function frostGoldmead(data) {
  const { top, tint, forest } = data;
  const x0 = W - 36;
  for (let z = 0; z < W; z++) {
    for (let x = x0; x < W; x++) {
      const i = z * W + x;
      if (data.pathMask[i]) continue;
      const t = top[i];
      if (t !== TILE.GRASS && t !== TILE.FLOWER_GRASS && t !== TILE.DIRT) continue;
      const ramp = smoothstep(x0, W - 1, x);
      const v = ramp * 0.75 + (fbm(x * 0.12, z * 0.12, 91, 2) - 0.5) * 0.9;
      if (v > 0.62) {
        top[i] = TILE.SNOW;
        tint[i * 3] = 0.95;
        tint[i * 3 + 1] = 0.97;
        tint[i * 3 + 2] = 1;
        forest[i] = 0;
      } else if (v > 0.32) {
        top[i] = TILE.FROST_GRASS;
        tint[i * 3] = 0.88;
        tint[i * 3 + 1] = 0.98;
        tint[i * 3 + 2] = 0.92;
        forest[i] = forest[i] * 0.5;
      }
    }
  }
}

/* ------------------------------ dressing ------------------------------ */

export function dressArctic(world, land, spec) {
  const A = world.models.arctic;
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
  const cellOk = (lx, lz, lo, hi) => {
    const i = lz * W + lx;
    const h = data.H[i];
    return !data.pathMask[i] && h >= lo && h <= hi && data.top[i] !== TILE.ICE;
  };
  const mesa = spec.mesa;
  const onMesaTop = (lx, lz) => {
    if (!mesa) return false;
    return Math.hypot(lx - mesa.cx, lz - mesa.cz) < mesa.rTop * 0.95;
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
  const snowAmt = (lx) => (spec.blend ? smoothstep(4, spec.blend.w, lx) : 1);
  const pad = (lx, lz) => (spec.pads || []).some(([cx, cz, r]) => Math.hypot(lx - cx, lz - cz) < r * 1.2);

  scatter(D.pines, 1, D.pines * 14, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 7.2) || onMesaTop(lx, lz) || pad(lx, lz)) return false;
    const grove = fbm(lx * 0.034, lz * 0.034, seed + 5, 3);
    if (grove < 0.38 + hash2(n, 3, seed) * 0.12) return false;
    if (spec.blend && hash2(n, 8, seed) > snowAmt(lx) + 0.12) {
      const parts = hash2(n, 9, seed) > 0.5 ? M.pines[n % M.pines.length] : M.oaks[n % M.oaks.length];
      const x = land.x0 + lx + 0.5;
      const z = land.z0 + lz + 0.5;
      if (!world.free(x, z, 1.6)) return false;
      world.putAt(parts, x, z, n, 0.62 + hash2(n, 1, seed) * 0.28);
      world.circle(x, z, 0.4);
      world.occupy(x, z, 1.3);
      world.treeDots.push({ x, z });
      return true;
    }
    const v = Math.floor(hash2(n, 4, seed) * A.frostPines.length);
    const s = 0.75 + hash2(n, 2, seed) * 0.75;
    const ok = place(A.frostPines[v], lx, lz, hash2(n, 6, seed) * 6.28, s, { r: 1.5 + s * 0.4, collide: 0.4, occ: 1.1 + s * 0.3 });
    if (ok) world.treeDots.push({ x: land.x0 + lx + 0.5, z: land.z0 + lz + 0.5 });
    return ok;
  });

  scatter(D.dead, 2, D.dead * 20, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 7) || onMesaTop(lx, lz) || pad(lx, lz) || snowAmt(lx) < 0.6) return false;
    return place(A.deadTrees[n % A.deadTrees.length], lx, lz, n * 1.7, 0.85 + hash2(n, 3, seed) * 0.5, { r: 1.2, collide: 0.3, occ: 1.1 });
  });

  scatter(D.bushes, 3, D.bushes * 12, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 7) || pad(lx, lz) || snowAmt(lx) < 0.5) return false;
    return place(A.frostBushes[n % A.frostBushes.length], lx, lz, n, 0.8 + hash2(n, 5, seed) * 0.5, { r: 0.8, collide: 0.35, occ: 0.7 });
  });

  scatter(D.flowers, 4, D.flowers * 12, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 6.5) || snowAmt(lx) < 0.6) return false;
    return place(A.frostFlowers[n % A.frostFlowers.length], lx, lz, n, 1, { r: 0.5, opts: { cover: true }, light: n % 5 === 0 ? [0x7fd0ff, 0.35] : null });
  });

  scatter(D.clusters, 5, D.clusters * 14, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 7.6) || onMesaTop(lx, lz) || pad(lx, lz) || snowAmt(lx) < 0.7) return false;
    const s = 0.8 + hash2(n, 3, seed) * 0.8;
    return place(A.iceClusters[n % A.iceClusters.length], lx, lz, n * 2.1, s, { r: 1.4 * s, collide: 0.7 * s, occ: 1.5 * s, light: n % 3 === 0 ? [0x7fd0ff, 0.9 * s] : null });
  });

  scatter(D.spires, 6, D.spires * 16, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 7.6) || onMesaTop(lx, lz) || pad(lx, lz) || snowAmt(lx) < 0.8) return false;
    const s = 0.9 + hash2(n, 3, seed) * 0.8;
    return place(A.iceSpires[n % A.iceSpires.length], lx, lz, n * 1.3, s, { r: 2.6 * s, collide: 1.0 * s, occ: 2.2 * s });
  });

  scatter(D.rocks, 7, D.rocks * 10, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.4, 8) || pad(lx, lz)) return false;
    return place(A.snowRocks[n % A.snowRocks.length], lx, lz, n, 0.7 + hash2(n, 3, seed) * 0.5, { r: 0.9, collide: 0.5, occ: 0.8 });
  });

  scatter(D.boulders, 8, D.boulders * 12, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.6, 8.2) || pad(lx, lz) || onMesaTop(lx, lz)) return false;
    return place(A.snowBoulders[n % A.snowBoulders.length], lx, lz, n, 0.9 + hash2(n, 3, seed) * 0.5, { r: 1.5, collide: 0.9, occ: 1.4 });
  });

  scatter(D.mounds, 9, D.mounds * 8, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.2, 8) || snowAmt(lx) < 0.7) return false;
    return place(A.snowMounds[n % A.snowMounds.length], lx, lz, n * 0.9, 0.7 + hash2(n, 3, seed) * 0.7, { r: 0.7, opts: { cover: true } });
  });

  scatter(D.snowmen, 10, 200, (lx, lz, n) => {
    if (!cellOk(lx, lz, 2, 5.5) || snowAmt(lx) < 0.9) return false;
    return place(A.snowman[n % A.snowman.length], lx, lz, hash2(n, 2, seed) * 6.28, 1.15, { r: 1.2, collide: 0.5, occ: 1 });
  });

  scatter(5, 11, 120, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.6, 6) || pad(lx, lz) || snowAmt(lx) < 0.7) return false;
    return place(A.frozenLogs[n % A.frozenLogs.length], lx, lz, n * 1.1, 0.9, { r: 1.6, collide: 0.8, occ: 1.4 });
  });

  scatter(3, 12, 100, (lx, lz, n) => {
    if (!cellOk(lx, lz, 1.6, 7) || pad(lx, lz) || snowAmt(lx) < 0.7) return false;
    return place(A.cairn[n % A.cairn.length], lx, lz, n, 0.95 + hash2(n, 3, seed) * 0.3, { r: 1, collide: 0.5, occ: 0.9 });
  });

  for (const [lx, lz, rot] of spec.igloos || []) {
    place(A.igloo[0], lx, lz, rot, 1.2, { r: 3, occ: 5.2 });
    const cx = land.x0 + lx + 0.5;
    const cz = land.z0 + lz + 0.5;
    world.circle(cx, cz, 2.5);
    world.lightSpots.push({ x: cx + Math.sin(rot) * 4.4, y: world.heightAt(cx, cz) + 1, z: cz + Math.cos(rot) * 4.4, color: 0xffb347 });
    for (const [ox, oz, k] of [[-4.5, 3.5, 0], [4.8, 4.6, 1], [-1.5, 7.2, 0]]) {
      place(M.crate[k], Math.round(lx + ox), Math.round(lz + oz), ox, 1.1, { r: 0.8, collide: 0.5, occ: 0.8 });
    }
    place(M.barrel[0], lx + 6, lz - 1, 0.4, 1.1, { r: 0.8, collide: 0.4, occ: 0.7 });
    place(A.snowman[0], lx - 7, lz + 6, 0.6, 1.2, { r: 1.2, collide: 0.5, occ: 1 });
    place(M.sign, lx + 3.2, lz + 9, 0.4, 1.2, { r: 0.8, collide: 0.2, occ: 0.6 });
  }

  if (spec.camp) {
    const [lx, lz] = spec.camp;
    const tent = M.tentFrost;
    place(tent, lx, lz, 0.5, 1.15, { r: 4, occ: 3.4 });
    const wx = land.x0 + lx + 0.5;
    const wz = land.z0 + lz + 0.5;
    world.box(wx + Math.sin(0.5) * 0, wz, 2.1, 2.7);
    place(A.windbreak[0], lx + 6, lz + 2, 1.9, 1.1, { r: 2, occ: 1.6 });
    place(A.frozenLogs[0], lx - 6, lz + 4, 0.2, 0.9, { r: 1.5, occ: 1.2 });
    place(M.crate[1], lx + 3.4, lz + 5, 0.3, 1.2, { r: 0.8, collide: 0.5, occ: 0.8 });
    place(M.barrel[1], lx - 3.2, lz + 5.4, 0.1, 1.1, { r: 0.8, collide: 0.4, occ: 0.7 });
    place(M.orcFire, lx + 1.2, lz + 6.2, 0.4, 0.9, { r: 1, occ: 0.8, light: [0xff9a3a, 0.8] });
    place(A.snowRocks[0], lx + 8, lz + 6, 0.2, 0.9, { r: 1, collide: 0.5, occ: 0.8 });
  }

  for (const [lx, lz] of spec.bones || []) {
    place(A.ribCage[0], lx, lz, 0.4, 1.7, { r: 6, occ: 5 });
    place(A.ribCage[1], lx - 17, lz + 14, 2.2, 1.2, { r: 5, occ: 4 });
    place(A.tusks[0], lx + 11, lz - 4, 0.6, 1.5, { r: 2, collide: 0.5, occ: 1.5 });
    place(A.tusks[1], lx + 13, lz + 4, 3.8, 1.6, { r: 2, collide: 0.5, occ: 1.5 });
    place(A.tusks[0], lx - 12, lz - 7, 2.4, 1.3, { r: 2, collide: 0.5, occ: 1.5 });
  }

  if (spec.mesaProps) dressMesa(world, land, spec, place);
}

function dressMesa(world, land, spec, place) {
  const A = world.models.arctic;
  const { cx, cz, rTop, ramp } = spec.mesa;
  const wx = land.x0 + cx + 0.5;
  const wz = land.z0 + cz + 0.5;
  world.yetiPeak = { x: wx, z: wz, r: rTop };

  const nests = [[0, 0, 0.3, 1.25], [-8.2, 6, 2.2, 1], [8.4, -5.5, 4.1, 1.05], [-3.4, -9.8, 5.3, 0.95]];
  nests.forEach(([ox, oz, rot, sc], k) => {
    const lx = Math.round(cx + ox);
    const lz = Math.round(cz + oz);
    place(A.yetiNest[k % 2], lx, lz, rot, sc, { r: 3, light: [0x7fd0ff, 1.2] });
  });
  const ring = 10;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * TAU + 0.2;
    const r = rTop * (0.9 + 0.05 * Math.sin(i * 2.3));
    const lx = Math.round(cx + Math.cos(a) * r);
    const lz = Math.round(cz + Math.sin(a) * r);
    if (Math.abs(angDiff(a, ramp)) < 0.5) continue;
    place(A.iceSpires[i % A.iceSpires.length], lx, lz, i * 1.4, 1.1 + (i % 3) * 0.28, { r: 2, collide: 1.1, occ: 2.4 });
  }
  for (const [ox, oz, rot] of [[-11, -4, 0.8], [10.5, 8, 2.9], [2, 12.5, 1.4], [-4, -13, 0.1]]) {
    place(A.ribCage[ox < 0 ? 1 : 0], Math.round(cx + ox), Math.round(cz + oz), rot, 1.1, { r: 4, occ: 3 });
  }
  for (const [ox, oz, rot] of [[5, 5, 0.4], [-6, 1, 2.2], [3, -7, 1.1], [-9, -9, 3.3], [9, 4, 4.6]]) {
    place(A.tusks[rot > 2 ? 1 : 0], Math.round(cx + ox), Math.round(cz + oz), rot, 1.3, { r: 1.8, collide: 0.4, occ: 1.4 });
  }
  for (let i = 0; i < 6; i++) {
    const a = i * 1.07 + 0.4;
    place(A.iceClusters[i % 4], Math.round(cx + Math.cos(a) * 11), Math.round(cz + Math.sin(a) * 11), i, 1.1, { r: 2, collide: 0.8, occ: 1.6, light: i % 2 ? [0x7fd0ff, 1] : null });
  }
  for (let i = 0; i < 7; i++) {
    const t = 26 + i * 8;
    const side = i % 2 ? 1 : -1;
    const a = ramp + side * 0.12;
    const lx = Math.round(cx + Math.cos(a) * t);
    const lz = Math.round(cz + Math.sin(a) * t) + side * 3;
    place(A.cairn[i % 2], lx, lz, i, 1.1, { r: 1.2, collide: 0.5, occ: 1 });
  }
  for (const [off, k] of [[-4.5, 0], [4.5, 1]]) {
    const a = ramp;
    const lx = Math.round(cx + Math.cos(a) * 44 - Math.sin(a) * off);
    const lz = Math.round(cz + Math.sin(a) * 44 + Math.cos(a) * off);
    place(A.tusks[k], lx, lz, 1.2 + k, 1.9, { r: 2, collide: 0.5, occ: 1.6 });
  }
}
