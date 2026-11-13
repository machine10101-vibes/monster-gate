import { fbm, hash2, lerp, clamp, smoothstep } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE } from './terrain.js';
import { buildMineCart, buildMineFrame, buildOrePile } from './gatherModels.js';

/**
 * Tiles 74, 75, 84 and 85, south of Longacre and Southford.
 * Built the same way as the lands around tile 55: a height field, edges copied
 * from the neighbor that was built first, then voxel props dressed on top.
 * Sunspill and Glassroad are the dry north. Deepwell holds the dig. Greenbowl
 * holds the living heart of the oasis. The pool sits on the corner the four share.
 */

const K_WATER = 2;
const K_STONE = 3;
const K_PIT = 7;
const K_RAMP = 8;

export const DESERT_KINDS = ['sunspill', 'glassroad', 'deepwell', 'greenbowl'];

/** World position of the pool, on the corner where the four tiles meet. */
export const OASIS = { x: 0, z: 432, r: 32, shore: 16 };
/**
 * The dig on tile 84. Greyrock Pit is pit 5.5 / rim 10.5.
 * This one is three times that across: pit 16.5, rim 31.5.
 */
export const SAND_MINE = {
  x: -74,
  z: 514,
  pitR: 16.5,
  rimR: 31.5,
  rimH: 4.2,
  floor: 1.2,
  rampHW: 4.5,
};

export const DESERT_SPECS = {
  sunspill: {
    banner: ['The Western Dunes', 'Sunspill'], desert: true, shade: 0.12, forest: 0.05, amp: 1.7, base: 3.3, seed: 74,
    rim: {},
    knolls: [[36, 48, 14, 2.4], [28, 100, 10, 1.8], [90, 40, 12, 2.2], [70, 78, 8, -0.8]],
    roads: [[[72, 0], [78, 36], [96, 78], [118, 112]], [[0, 100], [36, 96], [78, 100], [110, 112]]],
    dress: { cactus: 16, scrub: 28, rocks: 18, buttes: 5, palms: 0, reeds: 0, flowers: 10 },
  },
  glassroad: {
    banner: ['The South Road', 'Glassroad'], desert: true, shade: 0.1, forest: 0.04, amp: 1.6, base: 3.3, seed: 75,
    rim: {},
    knolls: [[100, 46, 13, 2.2], [40, 70, 9, 1.4], [110, 100, 11, 1.8], [80, 30, 7, -0.6]],
    roads: [[[60, 0], [62, 36], [52, 86], [28, 118]]],
    dress: { cactus: 14, scrub: 26, rocks: 16, buttes: 4, palms: 0, reeds: 0, flowers: 12 },
  },
  deepwell: {
    banner: ['The Great Dig', 'Deepwell'], desert: true, shade: 0.08, forest: 0.03, amp: 1.5, base: 3.2, seed: 84,
    rim: {},
    beach: true,
    knolls: [[28, 40, 12, 2.2], [24, 96, 10, 1.6], [110, 70, 8, 1.2]],
    roads: [[[96, 0], [90, 28], [78, 46]]],
    dress: { cactus: 8, scrub: 16, rocks: 12, buttes: 3, palms: 0, reeds: 0, flowers: 4, mine: true },
  },
  greenbowl: {
    banner: ['The Living Water', 'Oasis'], desert: true, shade: 0.06, forest: 0.08, amp: 1.5, base: 3.2, seed: 85,
    rim: {},
    beach: true,
    knolls: [[90, 50, 12, 2], [110, 100, 10, 1.6], [50, 80, 8, 1.2]],
    roads: [[[24, 20], [48, 48], [80, 70], [110, 90]]],
    dress: { cactus: 6, scrub: 12, rocks: 8, buttes: 2, palms: 0, reeds: 0, flowers: 8 },
  },
};

function reslopeBand(H, slope, x0, x1, z0, z1) {
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const i = z * W + x;
      const h = H[i];
      let s = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= W) continue;
        s = Math.max(s, Math.abs(H[nz * W + nx] - h));
      }
      slope[i] = s;
    }
  }
}

function stampPass(data, visit) {
  const { H, zone, top, tint, pathMask, forest, slope } = data;
  let x0 = W;
  let x1 = 0;
  let z0 = W;
  let z1 = 0;
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const hit = visit(x, z, H[z * W + x]);
      if (!hit) continue;
      const i = z * W + x;
      H[i] = Math.round(Math.min(H[i], hit.h) * 2) / 2;
      if (hit.path) {
        pathMask[i] = 1;
        zone[i] = ZONE.FIELD;
        top[i] = TILE.PATH;
        forest[i] = 0;
        tint[i * 3] = 0.96;
        tint[i * 3 + 1] = 0.84;
        tint[i * 3 + 2] = 0.52;
      }
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
  }
  if (x1 >= x0) reslopeBand(H, slope, Math.max(0, x0 - 1), Math.min(W - 1, x1 + 1), Math.max(0, z0 - 1), Math.min(W - 1, z1 + 1));
}

/** A road through Southford's south rim, on the vale road (x = 60), down into Glassroad. */
export function openSouthfordDesert(data) {
  stampPass(data, (x, z, h) => {
    if (z < W - 48) return null;
    const bank = Math.abs(x - 60);
    if (bank > 26) return null;
    const fade = smoothstep(W - 48, W - 20, z);
    const floor = 3.6;
    const want = bank <= 8 ? floor : floor + (bank - 8) * 0.42;
    return { h: lerp(h, Math.min(h, want), fade), path: bank <= 6 };
  });
}

/** A gap in Longacre's south rim so the fields open onto Sunspill. */
export function openLongacreSouth(data) {
  if (!data) return;
  stampPass(data, (x, z, h) => {
    if (z < W - 40) return null;
    const bank = Math.abs(x - 72);
    if (bank > 28) return null;
    const fade = smoothstep(W - 40, W - 16, z);
    const floor = 4.0;
    const want = bank <= 5 ? floor : floor + (bank - 5) * 0.55;
    return { h: lerp(h, want, fade), path: bank <= 5 };
  });
}

/** A gap in the Dunes east rim where the beach road leaves for the desert. */
export function openDunesEast(data) {
  if (!data) return;
  stampPass(data, (x, z, h) => {
    if (x < W - 40) return null;
    const bank = Math.abs(z - 100);
    if (bank > 22) return null;
    const fade = smoothstep(W - 40, W - 16, x);
    const floor = 3.2;
    const want = bank <= 5 ? floor : floor + (bank - 5) * 0.5;
    return { h: lerp(h, want, fade), path: bank <= 5 };
  });
}

function oasisAt(x, z, h) {
  const d = Math.hypot(x - OASIS.x, z - OASIS.z);
  if (d < OASIS.r) return { h: 0, kind: K_WATER };
  if (d < OASIS.r + OASIS.shore) {
    const t = (d - OASIS.r) / OASIS.shore;
    return { h: lerp(0.7, Math.min(h, 3.1), t * t), kind: 0 };
  }
  return null;
}

function mineAt(x, z, h) {
  const dx = x + 0.5 - SAND_MINE.x;
  const dz = z + 0.5 - SAND_MINE.z;
  const d = Math.hypot(dx, dz);
  const { pitR, rimR, rimH, floor, rampHW } = SAND_MINE;
  const ramp = dz < -pitR && dz > -(rimR + 8) && Math.abs(dx) < rampHW;
  if (ramp) {
    const t = clamp((-dz - pitR) / (rimR + 8 - pitR), 0, 1);
    return { h: lerp(floor, rimH, t), kind: K_RAMP };
  }
  if (d < pitR) return { h: floor, kind: K_PIT };
  if (d < rimR) {
    const wall = floor + Math.min(rimH - floor, (d - pitR) * 1.35);
    return { h: Math.max(Math.min(h, rimH), wall), kind: K_STONE };
  }
  if (d < rimR + 10) return { h: lerp(rimH, h, (d - rimR) / 10), kind: 0 };
  return null;
}

function beachAt(spec, lz, h) {
  if (!spec.beach || lz < 108) return null;
  const t = clamp((lz - 108) / 30, 0, 1);
  const sea = lerp(2.4, -0.8, t);
  const dune = (fbm(spec.ox * 0.01, lz * 0.08, spec.seed, 2) - 0.5) * 0.6 * (1 - t);
  return { h: lerp(h, sea + dune, smoothstep(0, 1, t)), kind: lz > 130 ? K_WATER : 0 };
}

/** Carve the shared pool, the dig, and the south shore. Borders owned by another biome stay put. */
export function carveDesert(lands) {
  const locked = (kind, x, z) => {
    if (kind === 'sunspill' && (z === 0 || x === 0)) return true;
    if (kind === 'glassroad' && z === 0) return true;
    return false;
  };
  for (const land of lands) {
    const spec = { ...DESERT_SPECS[land.kind], ox: land.x0, oz: land.z0 };
    const { H, zone, top, tint, pathMask, forest, slope } = land.data;
    for (let z = 0; z < W; z++) {
      for (let x = 0; x < W; x++) {
        if (locked(land.kind, x, z)) continue;
        const i = z * W + x;
        const wx = land.x0 + x;
        const wz = land.z0 + z;
        let h = H[i];
        let feat = oasisAt(wx, wz, h) || mineAt(wx, wz, h) || beachAt(spec, z, h);
        if (!feat) continue;
        h = Math.round(feat.h * 2) / 2;
        H[i] = h;
        const n = fbm(x * 0.05, z * 0.05, spec.seed + 2, 2);
        paintDesertCell({ zone, top, tint, forest }, H, x, z, feat.kind, false, n, spec, i);
        if (feat.kind === K_WATER || feat.kind === K_PIT) pathMask[i] = 0;
        if (feat.kind === K_RAMP) pathMask[i] = 1;
      }
    }
    // A road that starts in the pool keeps the pool's height and cuts a stream
    // out through the sand. Lift that wash back to dry ground. The pool, the
    // south sea, and the river mouth copied off Southford stay wet.
    for (let z = 0; z < W; z++) {
      for (let x = 0; x < W; x++) {
        if (locked(land.kind, x, z)) continue;
        const i = z * W + x;
        if (H[i] >= 0.7) continue;
        const wx = land.x0 + x;
        const wz = land.z0 + z;
        if (Math.hypot(wx - OASIS.x, wz - OASIS.z) < OASIS.r) continue;
        if (spec.beach && z > 118) continue;
        if (land.kind === 'glassroad' && z < 18 && x > 26 && x < 52) continue;
        H[i] = pathMask[i] ? 2 : 1.6;
        const n = fbm(x * 0.05, z * 0.05, spec.seed + 2, 2);
        paintDesertCell({ zone, top, tint, forest }, H, x, z, 0, pathMask[i] > 0, n, spec, i);
      }
    }
    reslopeBand(H, slope, 0, W - 1, 0, W - 1);
  }
  // The pool, the beach and the dry-wash lift are carved after the edges were
  // copied, so the shared desert borders are written back from the tile that
  // was built first.
  const by = Object.fromEntries(lands.map((l) => [l.kind, l.data]));
  const copyEdge = (dst, src, axis, dstAt, srcAt) => {
    for (let i = 0; i < W; i++) {
      const di = axis === 'x' ? i * W + dstAt : dstAt * W + i;
      const si = axis === 'x' ? i * W + srcAt : srcAt * W + i;
      dst.H[di] = src.H[si];
      dst.zone[di] = src.zone[si];
      dst.top[di] = src.top[si];
      dst.pathMask[di] = src.pathMask[si];
      dst.forest[di] = src.forest[si];
      dst.slope[di] = src.slope[si];
      dst.tint[di * 3] = src.tint[si * 3];
      dst.tint[di * 3 + 1] = src.tint[si * 3 + 1];
      dst.tint[di * 3 + 2] = src.tint[si * 3 + 2];
    }
  };
  copyEdge(by.glassroad, by.sunspill, 'x', 0, W - 1);
  copyEdge(by.deepwell, by.sunspill, 'z', 0, W - 1);
  copyEdge(by.greenbowl, by.glassroad, 'z', 0, W - 1);
  copyEdge(by.greenbowl, by.deepwell, 'x', 0, W - 1);
  reslopeBand(by.glassroad.H, by.glassroad.slope, 0, 2, 0, W - 1);
  reslopeBand(by.deepwell.H, by.deepwell.slope, 0, W - 1, 0, 2);
  reslopeBand(by.greenbowl.H, by.greenbowl.slope, 0, W - 1, 0, 2);
  reslopeBand(by.greenbowl.H, by.greenbowl.slope, 0, 2, 0, W - 1);
}

function duneAt(x, z, h, spec) {
  const edge = Math.min(x, z, W - 1 - x, W - 1 - z);
  const fade = smoothstep(10, 28, edge);
  const wave = Math.sin((z + spec.seed * 3) * 0.085) * 1.15 + Math.sin((x + z * 0.35) * 0.06) * 0.55;
  return { h: Math.min(h + wave * fade, Math.max(h, 6)), kind: 0 };
}

export function desertFeature(h, x, z, spec) {
  const wx = spec.ox + x;
  const wz = spec.oz + z;
  return oasisAt(wx, wz, h) || mineAt(wx, wz, h) || beachAt(spec, z, h) || duneAt(x, z, h, spec);
}

function sandTint(n, crest) {
  return [0.95 + n * 0.12 + crest, 0.78 + n * 0.08, 0.42 + n * 0.06];
}

export function paintDesertCell(out, H, x, z, kind, isPath, n, spec, index) {
  const { zone, top, tint, forest } = out;
  const i = index ?? z * W + x;
  const h = H[i];
  const wx = (spec.ox ?? 0) + x;
  const wz = (spec.oz ?? 0) + z;
  const pool = Math.hypot(wx - OASIS.x, wz - OASIS.z);
  const green = pool < OASIS.r + OASIS.shore + 18;
  const north = z < 34 ? 1 - smoothstep(8, 34, z) : 0;
  forest[i] = 0;
  if (kind === K_WATER || h < 0.35) {
    zone[i] = ZONE.WATER;
    top[i] = TILE.SAND;
    const w = hash2(wx, wz, 85);
    const foam = hash2(wx + 17, wz + 41, 85);
    const deep = pool < OASIS.r * 0.42;
    tint[i * 3] = (deep ? 0.18 : 0.34) + w * 0.22 + foam * 0.08;
    tint[i * 3 + 1] = (deep ? 0.48 : 0.66) + w * 0.18 + (1 - foam) * 0.05;
    tint[i * 3 + 2] = (deep ? 0.44 : 0.58) + w * 0.16 + foam * 0.1;
    return;
  }
  if (kind === K_PIT) {
    zone[i] = ZONE.MINE;
    top[i] = TILE.DARK_STONE;
    tint[i * 3] = 0.72;
    tint[i * 3 + 1] = 0.62;
    tint[i * 3 + 2] = 0.48;
    return;
  }
  if (kind === K_RAMP || isPath || kind === 1) {
    zone[i] = ZONE.FIELD;
    top[i] = TILE.PATH;
    tint[i * 3] = 0.98;
    tint[i * 3 + 1] = 0.86;
    tint[i * 3 + 2] = 0.55;
    return;
  }
  if (kind === K_STONE || h >= 7.2) {
    zone[i] = ZONE.MOUNTAIN;
    top[i] = TILE.STONE;
    tint[i * 3] = 0.92 + n * 0.08;
    tint[i * 3 + 1] = 0.74;
    tint[i * 3 + 2] = 0.48;
    return;
  }
  if (green && h < 4.2) {
    zone[i] = ZONE.FIELD;
    top[i] = n > 0.62 ? TILE.FLOWER_GRASS : TILE.GRASS;
    const g = 1 - smoothstep(OASIS.r + OASIS.shore, OASIS.r + OASIS.shore + 18, pool);
    tint[i * 3] = lerp(0.86, 0.55, g);
    tint[i * 3 + 1] = lerp(0.78, 0.95, g);
    tint[i * 3 + 2] = lerp(0.4, 0.38, g);
    return;
  }
  zone[i] = ZONE.FIELD;
  const crest = h > 4.2 ? 0.12 : 0;
  top[i] = h < 1.6 ? TILE.SAND : n < 0.18 ? TILE.DIRT : TILE.SAND;
  const [r, g, b] = sandTint(n, crest);
  tint[i * 3] = lerp(r, 0.7, north * 0.45);
  tint[i * 3 + 1] = lerp(g, 0.9, north * 0.55);
  tint[i * 3 + 2] = lerp(b, 0.4, north * 0.2);
}

export function dressDesert(world, land, spec) {
  if (!world.desert) {
    world.desert = { lands: [], oasis: OASIS, mine: SAND_MINE };
  }
  world.desert.lands.push(land);
  const J = world.models.jungle;
  const D = world.models.desert;
  const m = world.models;
  const data = land.data;
  const seed = spec.seed;
  const X = (lx) => land.x0 + lx + 0.5;
  const Z = (lz) => land.z0 + lz + 0.5;

  const blocked = (lx, lz, rad) => {
    if (lx < 3 || lz < 3 || lx > W - 4 || lz > W - 4) return true;
    const i = lz * W + lx;
    const h = data.H[i];
    if (data.pathMask[i]) return true;
    const zn = data.zone[i];
    if (zn === ZONE.WATER || zn === ZONE.MINE) return true;
    if (h < 0.7 || h > 7.4) return true;
    const x = X(lx);
    const z = Z(lz);
    if (!world.free(x, z, rad)) return true;
    return false;
  };

  const drop = (parts, lx, lz, rot, scale, rad) => {
    if (!parts || blocked(lx, lz, rad)) return false;
    const x = X(lx);
    const z = Z(lz);
    world.putAt(parts, x, z, rot, scale);
    if (rad > 0.4) {
      world.circle(x, z, rad * 0.55);
      world.occupy(x, z, rad);
    }
    return true;
  };

  const count = spec.dress;
  let n = 0;
  const scatter = (total, rad, place) => {
    let put = 0;
    for (let k = 0; k < total * 8 && put < total; k++) {
      const lx = 6 + Math.floor(hash2(k, n, seed) * (W - 12));
      const lz = 6 + Math.floor(hash2(k, n + 3, seed) * (W - 12));
      if (place(lx, lz, k)) put++;
    }
    n += 1;
    return put;
  };

  scatter(count.cactus, 1.1, (lx, lz, k) => drop(D.cactus[k % D.cactus.length], lx, lz, k, 0.85 + hash2(k, 1, seed) * 0.4, 0.7));
  scatter(count.scrub, 0.6, (lx, lz, k) => drop(D.scrub[k % D.scrub.length], lx, lz, k * 0.7, 0.8 + hash2(k, 2, seed) * 0.35, 0.45));
  scatter(count.rocks, 0.8, (lx, lz, k) => {
    const big = hash2(k, 4, seed) > 0.72;
    return drop(big ? m.boulders[k % m.boulders.length] : m.rocks[k % m.rocks.length], lx, lz, k, big ? 0.8 : 0.65, big ? 0.9 : 0.45);
  });
  scatter(count.buttes, 1.4, (lx, lz, k) => drop(D.buttes[k % D.buttes.length], lx, lz, k * 0.4, 0.9 + hash2(k, 5, seed) * 0.5, 1.3));
  scatter(count.flowers, 0.3, (lx, lz, k) => {
    const i = lz * W + lx;
    if (data.zone[i] !== ZONE.FIELD) return false;
    if (Math.hypot(X(lx) - OASIS.x, Z(lz) - OASIS.z) > OASIS.r + OASIS.shore + 14) return false;
    return drop(m.flowers[k % m.flowers.length], lx, lz, k, 0.9, 0.25);
  });

  // A ring of palms, reeds and grass around the living water.
  for (let a = 0; a < 28; a++) {
    const ang = (a / 28) * Math.PI * 2 + hash2(a, 8, seed) * 0.15;
    const rad = OASIS.r + 4 + hash2(a, 9, seed) * 10;
    const x = OASIS.x + Math.cos(ang) * rad;
    const z = OASIS.z + Math.sin(ang) * rad;
    const lx = Math.round(x - land.x0 - 0.5);
    const lz = Math.round(z - land.z0 - 0.5);
    if (lx < 4 || lz < 4 || lx > W - 5 || lz > W - 5) continue;
    const palm = hash2(a, 2, seed) > 0.45 ? J.palms[a % J.palms.length] : J.palmsShort[a % J.palmsShort.length];
    drop(palm, lx, lz, ang, 0.85 + hash2(a, 3, seed) * 0.25, 1.15);
  }
  for (let a = 0; a < 40; a++) {
    const ang = (a / 40) * Math.PI * 2;
    const rad = OASIS.r + 1.2 + (a % 3);
    const x = OASIS.x + Math.cos(ang) * rad;
    const z = OASIS.z + Math.sin(ang) * rad;
    const lx = Math.round(x - land.x0 - 0.5);
    const lz = Math.round(z - land.z0 - 0.5);
    if (lx < 2 || lz < 2 || lx > W - 3 || lz > W - 3) continue;
    const wx = X(lx);
    const wz = Z(lz);
    if (data.zone[lz * W + lx] === ZONE.WATER) continue;
    if (world.free(wx, wz, 0.35)) world.putAt(m.reeds[a % m.reeds.length], wx, wz, ang, 1);
  }

  if (spec.beach) {
    for (let k = 0; k < 14; k++) {
      const lx = 8 + Math.floor(hash2(k, 6, seed) * (W - 16));
      const lz = 112 + Math.floor(hash2(k, 7, seed) * 16);
      drop(k % 2 ? J.driftwood[k % J.driftwood.length] : D.scrub[k % D.scrub.length], lx, lz, k, 0.9, 0.4);
    }
  }

  if (count.mine) dressMine(world, land, D, m);
}

function dressMine(world, land, D, m) {
  const { x: cx, z: cz, pitR, rimR, rampHW } = SAND_MINE;
  const place = (parts, x, z, rot, scale, rad, must) => {
    const tries = must ? [[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5], [7, 3], [-7, 3]] : [[0, 0]];
    for (const [dx, dz] of tries) {
      const px = x + dx;
      const pz = z + dz;
      if (!world.free(px, pz, rad * 0.55)) continue;
      world.putAt(parts, px, pz, rot, scale);
      world.circle(px, pz, rad * 0.5);
      world.occupy(px, pz, rad);
      return [px, pz];
    }
    if (!must) return null;
    world.putAt(parts, x, z, rot, scale);
    world.occupy(x, z, rad);
    return [x, z];
  };
  // Greyrock has one gantry, one cart and one ore pile. Deepwell has three of each,
  // and each one is three times that gantry's size.
  const frames = [
    [cx, cz - rimR - 8, 0.15],
    [cx + rimR + 6, cz + 2, 1.15],
    [cx - rimR - 6, cz + 4, -0.85],
  ];
  frames.forEach(([x, z, rot], i) => {
    const at = place(buildMineFrame(8 + i), x, z, rot, 4.35, 3.4, true);
    world.lightSpots.push({ x: at[0], y: world.heightAt(at[0], at[1]) + 8, z: at[1], color: 0xffb347 });
  });
  const carts = [
    [cx, cz - pitR - 8, 0.1],
    [cx + 14, cz - rimR + 1, 0.5],
    [cx - 12, cz - rimR + 3, -0.4],
  ];
  carts.forEach(([x, z, rot], i) => place(buildMineCart(5 + i), x, z, rot, 3.3, 1.8, true));
  const piles = [
    [cx + rimR * 0.55, cz - rimR * 0.2],
    [cx - rimR * 0.45, cz + rimR * 0.4],
    [cx + 6, cz + rimR + 4],
  ];
  piles.forEach(([x, z], i) => place(buildOrePile(3 + i), x, z, i * 0.6, 3.6, 2.2, true));
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    const x = cx + Math.cos(ang) * (rimR - 1.5);
    const z = cz + Math.sin(ang) * (rimR - 1.5);
    if (Math.abs(x - cx) < rampHW + 1 && z < cz - pitR) continue;
    if (!world.free(x, z, 0.4)) continue;
    world.torch(x, z, 0xffb060);
  }
  // A miners' yard north of the ramp: tents, crates, an anvil.
  const yardZ = cz - rimR - 10;
  place(D.tent, cx - 8, yardZ, 0.2, 1.15, 1.6);
  place(D.tent, cx + 7, yardZ - 1, -0.4, 1.05, 1.5);
  place(m.crate[0], cx - 3, yardZ + 2, 0.3, 1.2, 0.6);
  place(m.crate[1], cx - 1.4, yardZ + 2.4, 0.8, 1.1, 0.55);
  place(m.barrel[0], cx + 3, yardZ + 1.5, 0.2, 1.1, 0.45);
  place(m.anvil, cx + 5.5, yardZ + 1.2, 0.6, 1.2, 0.5);
  world.lightSpots.push({ x: cx, y: world.heightAt(cx, yardZ) + 1.6, z: yardZ, color: 0xffa040 });
  world.sandMine = { x: cx, z: cz, r: rimR };
}
