import * as THREE from 'three';
import { fbm, hash2, smoothstep, lerp, clamp } from '../engine/voxel.js';
import { TILE, tileUV } from '../engine/materials.js';
import { STARTER } from './tiles.js';

export const W = 144;
export const CENTER = { x: 72, z: 72 };
export const TOWN = { x: 72, z: 76 };
export const GUILD = { x: 72, z: 67 };
export const GATE = { x: 72, z: 33 };
export const WATER_Y = 0.35;
/** Water mesh Y. Shore sand lerps to ~0.3, so the pool sits just under the beach instead of a raised slab. */
export const WATER_SURFACE = 0.28;
export const PLAY_RADIUS = 52;
export const FARM = { x0: 90, z0: 84, x1: 108, z1: 99 };
export const MINE = { x: 98, z: 66, pitR: 5.5, rimR: 10.5, blend: 5.5, rimH: 3, floorH: 1, rampX0: 88, rampHW: 1.5 };
export const LAKE = { x: 54, z: 101, rx: 8.5, rz: 6.2 };
export const DOCK = { x0: 54.9, x1: 66, z: 101, hw: 1.2, y: 1 };

export const PATHS = {
  south: [[72, 82], [72, 90], [75, 100], [70, 112], [72, 125], [72, 140]],
  gate: [[80, 72], [85, 66], [85, 57], [80, 49], [75, 42], [72, 37]],
  east: [[80, 78], [92, 82], [99, 88], [112, 94], [128, 92]],
  west: [[64, 78], [54, 80], [46, 84]],
  forestWest: [[64, 72], [55, 66], [48, 60]],
  mine: [[85, 66], [88.5, 66]],
  lake: [[74.5, 97], [70, 99.5], [66.5, 101]],
};

export const RIVER = [
  [34, 41], [27, 52], [34, 63], [29, 76], [38, 90], [32, 104], [42, 118], [38, 144],
];
export const POND = { x: 34, z: 42, r: 7.5 };

export const ZONE = { FIELD: 0, FOREST: 1, MOUNTAIN: 2, TOWN: 3, WATER: 4, FARM: 5, GATE: 6, MINE: 7, LAKE: 8, SOUTH: 9 };

function segDist(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const t = clamp(((px - ax) * abx + (pz - az) * abz) / (abx * abx + abz * abz), 0, 1);
  const dx = px - (ax + abx * t);
  const dz = pz - (az + abz * t);
  return Math.hypot(dx, dz);
}

export function polyDist(px, pz, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    best = Math.min(best, segDist(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  }
  return best;
}

function smoothPath(pts, subdiv = 6) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < subdiv; s++) {
      const t = s / subdiv;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export const SMOOTH_PATHS = Object.fromEntries(Object.entries(PATHS).map(([k, v]) => [k, smoothPath(v)]));
export const SMOOTH_RIVER = smoothPath(RIVER, 8);

/**
 * Build the height data for one world tile.
 * Oakhollow is the starter tile. Southford and the ring around Oakhollow
 * are built beside it. The other tiles stay mapped until they are built.
 */
export function generateTile(tile = STARTER) {
  if (tile?.kind === 'oakhollow') return generateWorld();
  return null;
}

export function generateWorld() {
  const H = new Float32Array(W * W);
  const zone = new Uint8Array(W * W);
  const top = new Uint8Array(W * W);
  const tint = new Float32Array(W * W * 3);
  const pathMask = new Float32Array(W * W);
  const slope = new Float32Array(W * W);
  const forest = new Float32Array(W * W);
  const rampFlag = new Uint8Array(W * W);
  const mineRel = new Uint8Array(W * W);

  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const i = z * W + x;
      const n1 = fbm(x * 0.045 + 10, z * 0.045 + 3, 1, 4);
      const n2 = fbm(x * 0.12, z * 0.12, 2, 3);
      const warp = (fbm(x * 0.05 + 80, z * 0.05 + 20, 7, 3) - 0.5) * 14;

      let h = 1.0 + (n1 - 0.5) * 2.4 + (n2 - 0.5) * 0.7;

      const fm = smoothstep(66, 54, z + (n2 - 0.5) * 12);
      const hf = 3 + (n1 - 0.4) * 9 + (n2 - 0.5) * 2;
      h = lerp(h, hf, fm);

      const dx = x - CENTER.x;
      const dz = z - CENTER.z;
      const d = Math.hypot(dx, dz) + warp;
      const m = smoothstep(46, 64, d);
      const ridge = 1 - Math.abs(2 * fbm(x * 0.05 + 50, z * 0.05 + 9, 9, 4) - 1);
      const mh = m * (13 + 24 * ridge + 6 * (n2 - 0.5));
      h += mh;

      const tdx = (x - TOWN.x) * 0.85;
      const tdz = z - TOWN.z;
      const dt = Math.hypot(tdx, tdz) + (n2 - 0.5) * 3;
      const p = 1 - smoothstep(12, 18, dt);
      h = lerp(h, 3, p);

      const gdist = Math.hypot(x - GATE.x, z - GATE.z);
      const gp = 1 - smoothstep(6, 11, gdist);
      h = lerp(h, 3, gp);

      h = Math.max(h, 0.75);

      const rd = polyDist(x + 0.5, z + 0.5, SMOOTH_RIVER);
      const pd = Math.hypot(x + 0.5 - POND.x, z + 0.5 - POND.z);
      const lakeD = (Math.hypot((x + 0.5 - LAKE.x) / LAKE.rx, (z + 0.5 - LAKE.z) / LAKE.rz) - 1) * ((LAKE.rx + LAKE.rz) / 2);
      const waterD = Math.min(rd - 2.0, pd - POND.r, lakeD);
      const carve = 1 - smoothstep(-0.5, 3.2, waterD);
      h = lerp(h, -0.5 - (lakeD < 0 ? clamp(-lakeD / 4, 0, 1) : 0), carve);

      const mdx = x + 0.5 - MINE.x;
      const mdz = z + 0.5 - MINE.z;
      const mineD = Math.hypot(mdx, mdz);
      h = lerp(h, MINE.rimH, 1 - smoothstep(MINE.rimR, MINE.rimR + MINE.blend, mineD));

      if (x >= FARM.x0 - 2 && x <= FARM.x1 + 2 && z >= FARM.z0 - 2 && z <= FARM.z1 + 2) {
        const fx = Math.max(FARM.x0 - x, x - FARM.x1, FARM.z0 - z, z - FARM.z1, 0);
        h = lerp(h, 1.0, 1 - smoothstep(0, 3, fx));
      }

      const mountainish = m > 0.12;
      h = mountainish ? Math.round(h) : Math.round(h * 2) / 2;
      if (dt < 12.5) h = 3;
      if (gdist < 5.5) h = 3;
      const pitR = MINE.pitR + (n2 - 0.5) * 1.6;
      const rampK = mdx >= MINE.rampX0 - MINE.x && mdx < -MINE.pitR && Math.abs(mdz) <= MINE.rampHW ? Math.floor(mdx - (MINE.rampX0 - MINE.x)) : -1;
      if (mineD < pitR) h = MINE.floorH;
      if (rampK >= 0) h = Math.max(MINE.floorH, MINE.rimH - 0.5 * (rampK + 1));
      H[i] = h;
      rampFlag[i] = rampK >= 0 || (mineD < pitR && mdx < -2 && Math.abs(mdz) <= MINE.rampHW) ? 1 : 0;
      mineRel[i] = mineD < pitR ? 1 : mineD < pitR + 2.2 ? 2 : mineD < MINE.rimR ? 3 : 0;

      let zn = ZONE.FIELD;
      if (m > 0.12) zn = ZONE.MOUNTAIN;
      else if (fm > 0.5) zn = ZONE.FOREST;
      if (dt < 15) zn = ZONE.TOWN;
      if (gdist < 8) zn = ZONE.GATE;
      if (x >= FARM.x0 && x <= FARM.x1 && z >= FARM.z0 && z <= FARM.z1) zn = ZONE.FARM;
      if (mineRel[i]) zn = ZONE.MINE;
      if (h <= 0.5 && waterD < 1.4) zn = lakeD < 1.4 && rd - 2.0 > 1.4 && pd - POND.r > 1.4 ? ZONE.LAKE : ZONE.WATER;
      zone[i] = zn;
    }
  }

  const hAt = (x, z) => H[clamp(z, 0, W - 1) * W + clamp(x, 0, W - 1)];

  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const i = z * W + x;
      const h = H[i];
      slope[i] = Math.max(
        Math.abs(hAt(x + 1, z) - h),
        Math.abs(hAt(x - 1, z) - h),
        Math.abs(hAt(x, z + 1) - h),
        Math.abs(hAt(x, z - 1) - h)
      );

      const cx = x + 0.5;
      const cz = z + 0.5;
      let pm = 0;
      for (const key of Object.keys(SMOOTH_PATHS)) {
        const pdist = polyDist(cx, cz, SMOOTH_PATHS[key]);
        const wid = key === 'south' || key === 'gate' ? 1.9 : 1.4;
        pm = Math.max(pm, 1 - smoothstep(wid - 0.4, wid + 0.4, pdist + (hash2(x, z, 5) - 0.5) * 0.6));
      }
      const tdist = Math.hypot((x - TOWN.x) * 0.85, z - TOWN.z);
      const plaza = Math.hypot(x + 0.5 - TOWN.x, z + 0.5 - TOWN.z) < 5.5 + (hash2(x, z, 9) - 0.5) * 1.2;
      const gateRing = Math.hypot(x + 0.5 - GATE.x, z + 0.5 - GATE.z);
      pathMask[i] = pm > 0.5 || plaza || gateRing < 4.6 ? 1 : 0;
      if (zone[i] === ZONE.WATER) pathMask[i] = 0;
      if (zone[i] === ZONE.FARM) pathMask[i] = 0;

      const jr = hash2(x, z, 77);
      const patch = fbm(x * 0.09 + 3, z * 0.09 + 1, 33, 3);
      let tl = TILE.GRASS;
      let r = 1;
      let g = 1;
      let b = 1;
      const zn = zone[i];
      const fieldTint = [0.92, 1.06, 0.78];
      const forestTint = [0.62, 0.92, 0.82];
      const mix3 = (a, c, t) => [lerp(a[0], c[0], t), lerp(a[1], c[1], t), lerp(a[2], c[2], t)];
      const dn = fbm(x * 0.045 + 10, z * 0.045 + 3, 1, 4);
      const forestAmt = smoothstep(64, 54, z + (fbm(x * 0.12, z * 0.12, 2, 3) - 0.5) * 12);
      forest[i] = forestAmt;
      let t3 = mix3(fieldTint, forestTint, forestAmt);
      const low = fbm(x * 0.02 + 4, z * 0.02, 17, 3);
      const hue = fbm(x * 0.033, z * 0.03, 21, 3);
      const pv = 0.86 + patch * 0.22 + (low - 0.5) * 0.16;
      t3 = [
        t3[0] * pv * (0.92 + hue * 0.18),
        t3[1] * pv * (0.96 + (1 - hue) * 0.06),
        t3[2] * pv * (0.88 + (1 - hue) * 0.2),
      ];

      if (zn === ZONE.MOUNTAIN || h > 8) {
        const high = smoothstep(8, 24, h);
        if (h >= 22) tl = TILE.SNOW;
        else if (slope[i] >= 2 || high > 0.55) tl = hash2(x, z, 4) > 0.8 ? TILE.MOSS_STONE : TILE.STONE;
        else tl = TILE.GRASS;
        const gtint = mix3(t3, [0.78, 0.92, 0.78], high * 0.8);
        [r, g, b] = gtint;
        if (tl === TILE.STONE || tl === TILE.MOSS_STONE) [r, g, b] = [0.95, 0.97, 1.0];
        if (tl === TILE.SNOW) [r, g, b] = [0.9 + patch * 0.08, 0.92 + patch * 0.06, 0.97];
      } else if (zn === ZONE.WATER || zn === ZONE.LAKE || (h <= 0.5 && !mineRel[i])) {
        tl = h <= 0 ? TILE.GRAVEL : TILE.SAND;
        [r, g, b] = [1, 1, 1];
        if (h <= 0.5 && h > 0) tl = TILE.SAND;
      } else if (zn === ZONE.FARM) {
        tl = TILE.FARMLAND;
        [r, g, b] = [1, 1, 1];
      } else if (pathMask[i]) {
        const cobble = zn === ZONE.TOWN || zn === ZONE.GATE;
        const wear = fbm(x * 0.08 + 2, z * 0.08, 44, 2);
        if (cobble) {
          tl = wear < 0.22 ? TILE.GRAVEL : wear > 0.86 && jr > 0.7 ? TILE.DIRT : TILE.COBBLE;
          [r, g, b] = [1.08 + wear * 0.04, 0.92 + jr * 0.05, 0.64 + wear * 0.06];
        } else {
          tl = wear < 0.28 ? TILE.DIRT : TILE.PATH;
          [r, g, b] = [0.96, 0.9 + wear * 0.08, 0.78];
        }
      } else if (pm > 0.12) {
        const k = clamp((pm - 0.12) / 0.4, 0, 1);
        tl = jr > 0.55 ? TILE.DIRT : TILE.PATH;
        [r, g, b] = mix3(t3, [0.86, 0.74, 0.52], 0.35 + k * 0.45);
      } else {
        tl = jr > 0.935 && forestAmt < 0.6 ? TILE.FLOWER_GRASS : TILE.GRASS;
        [r, g, b] = t3;
        if (zn === ZONE.GATE) [r, g, b] = [r * 0.8, g * 0.85, b * 1.0];
      }
      if (mineRel[i]) {
        const roll = hash2(x, z, 61);
        if (rampFlag[i]) {
          tl = TILE.COBBLE;
          [r, g, b] = [1.02, 0.9, 0.7];
          pathMask[i] = 1;
        } else if (mineRel[i] === 1) {
          tl = roll > 0.82 ? TILE.DIRT : TILE.GRAVEL;
          [r, g, b] = [0.88, 0.84, 0.82];
        } else if (mineRel[i] === 2) {
          tl = roll > 0.8 ? TILE.MOSS_STONE : TILE.STONE;
          [r, g, b] = [0.95, 0.95, 0.98];
        } else {
          const rocky = hash2(x >> 1, z >> 1, 62) > 0.55;
          if (rocky && !pathMask[i]) {
            tl = roll > 0.7 ? TILE.GRAVEL : TILE.STONE;
            [r, g, b] = [0.95, 0.95, 0.98];
          }
        }
      }
      const bj = 0.94 + jr * 0.12;
      top[i] = tl;
      tint[i * 3] = r * bj;
      tint[i * 3 + 1] = g * bj;
      tint[i * 3 + 2] = b * bj;
      void dn;
      void tdist;
    }
  }

  return { H, zone, top, tint, pathMask, slope, forest };
}

const SIDE_TILES = {
  [TILE.GRASS]: [TILE.GRASS_SIDE, TILE.GRASS_SIDE],
  [TILE.FLOWER_GRASS]: [TILE.GRASS_SIDE, TILE.GRASS_SIDE],
  [TILE.COBBLE]: [TILE.BRICK, TILE.BRICK],
  [TILE.PATH]: [TILE.GRASS_SIDE, TILE.GRASS_SIDE],
  [TILE.STONE]: [TILE.STONE, TILE.STONE],
  [TILE.MOSS_STONE]: [TILE.STONE, TILE.STONE],
  [TILE.SNOW]: [TILE.SNOW_SIDE, TILE.SNOW_SIDE],
  [TILE.ICE]: [TILE.ICE, TILE.ICE],
  [TILE.FROST_GRASS]: [TILE.SNOW_SIDE, TILE.SNOW_SIDE],
  [TILE.BASALT]: [TILE.BASALT, TILE.BASALT],
  [TILE.ASH]: [TILE.ASH, TILE.BASALT],
  [TILE.LAVA]: [TILE.LAVA, TILE.CINDER],
  [TILE.CINDER]: [TILE.CINDER, TILE.BASALT],
  [TILE.OBSIDIAN]: [TILE.OBSIDIAN, TILE.OBSIDIAN],
  [TILE.FLAGSTONE]: [TILE.FLAGSTONE, TILE.FLAGSTONE],
  [TILE.SAND]: [TILE.SAND, TILE.SAND],
  [TILE.GRAVEL]: [TILE.GRAVEL, TILE.GRAVEL],
  [TILE.DIRT]: [TILE.DIRT, TILE.DIRT],
  [TILE.FARMLAND]: [TILE.DIRT, TILE.DIRT],
};

const PATH_EDGE = { SNOW: 0, SAND: 1, ASH: 2, GRASS: 3 };

/** Path (and frost-grass) sides follow the neighbouring biome, not always a grass strip. */
export function sideTilesFor(tl, top, width, depth, x, z) {
  if (tl !== TILE.PATH && tl !== TILE.FROST_GRASS) return SIDE_TILES[tl] || [TILE.STONE, TILE.STONE];
  let snow = 0;
  let sand = 0;
  let ash = 0;
  let grass = 0;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
    const nx = x + dx;
    const nz = z + dz;
    if (nx < 0 || nz < 0 || nx >= width || nz >= depth) continue;
    const nt = top[nz * width + nx];
    if (nt === TILE.PATH || nt === TILE.COBBLE || nt === TILE.GRAVEL) continue;
    if (nt === TILE.SNOW || nt === TILE.ICE || nt === TILE.FROST_GRASS) snow++;
    else if (nt === TILE.SAND) sand++;
    else if (nt === TILE.ASH || nt === TILE.BASALT || nt === TILE.CINDER || nt === TILE.LAVA || nt === TILE.OBSIDIAN) ash++;
    else grass++;
  }
  const kind = snow >= sand && snow >= ash && snow >= grass ? PATH_EDGE.SNOW
    : sand >= ash && sand >= grass ? PATH_EDGE.SAND
      : ash >= grass ? PATH_EDGE.ASH
        : PATH_EDGE.GRASS;
  if (kind === PATH_EDGE.SNOW) return [TILE.SNOW_SIDE, TILE.SNOW_SIDE];
  if (kind === PATH_EDGE.SAND) return [TILE.SAND, TILE.SAND];
  if (kind === PATH_EDGE.ASH) return [TILE.ASH, TILE.BASALT];
  if (tl === TILE.FROST_GRASS) return [TILE.SNOW_SIDE, TILE.SNOW_SIDE];
  return [TILE.GRASS_SIDE, TILE.GRASS_SIDE];
}

const CHUNK = 24;

export function buildTerrainMeshes(data, material, opt = {}) {
  const width = opt.width || W;
  const depth = opt.depth || W;
  const ox = opt.ox || 0;
  const oz = opt.oz || 0;
  const { H, top, tint, zone } = data;
  const group = new THREE.Group();
  const smooth = !!opt.smooth || !!data.smooth;
  const hAt = (x, z) => {
    if (x >= 0 && z >= 0 && x < width && z < depth) return H[z * width + x];
    const outside = opt.outside?.(x, z);
    return outside == null ? -3 : outside;
  };
  const cornerH = (x, z) => {
    let s = 0;
    let n = 0;
    for (const dx of [-1, 0]) {
      for (const dz of [-1, 0]) {
        const h = hAt(x + dx, z + dz);
        if (h == null || h < -2.5) continue;
        s += h;
        n += 1;
      }
    }
    return n ? s / n : hAt(Math.max(0, Math.min(width - 1, x)), Math.max(0, Math.min(depth - 1, z)));
  };
  const cliffCell = (x, z) => {
    if (x < 0 || z < 0 || x >= width || z >= depth) return true;
    const i = z * width + x;
    const zn = zone[i];
    return zn === ZONE.WATER || zn === ZONE.MINE || zn === ZONE.LAKE || H[i] < WATER_Y + 0.02;
  };
  const chunks = [];

  const uvCache = {};
  const uvOf = (t) => (uvCache[t] ??= tileUV(t));

  for (let cz = 0; cz < depth; cz += CHUNK) {
    for (let cx = 0; cx < width; cx += CHUNK) {
      const pos = [];
      const nor = [];
      const uv = [];
      const col = [];
      const idx = [];

      const quad = (p, n, uvs, cols) => {
        const base = pos.length / 3;
        for (let k = 0; k < 4; k++) {
          pos.push(p[k][0], p[k][1], p[k][2]);
          nor.push(n[0], n[1], n[2]);
          uv.push(uvs[k][0], uvs[k][1]);
          col.push(cols[k][0], cols[k][1], cols[k][2]);
        }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      };

      for (let z = cz; z < Math.min(depth, cz + CHUNK); z++) {
        for (let x = cx; x < Math.min(width, cx + CHUNK); x++) {
          const i = z * width + x;
          const h = H[i];
          const zn = zone[i];
          const tl = top[i];
          const tr = tint[i * 3];
          const tg = tint[i * 3 + 1];
          const tb = tint[i * 3 + 2];
          const { u0, u1, vTop, vBot } = uvOf(tl);

          const grassy = tl === TILE.GRASS || tl === TILE.FLOWER_GRASS;
          const aoAt = (sx, sz) => {
            const lift = grassy ? 1.4 : (smooth ? 0.85 : 0.55);
            const s1 = hAt(x + sx, z) > h + lift ? 1 : 0;
            const s2 = hAt(x, z + sz) > h + lift ? 1 : 0;
            const c = hAt(x + sx, z + sz) > h + lift ? 1 : 0;
            const a = s1 && s2 ? 0 : 3 - (s1 + s2 + c);
            return [0.62, 0.78, 0.9, 1.0][a];
          };
          const corners = [
            [-1, -1],
            [-1, 1],
            [1, 1],
            [1, -1],
          ];
          const aos = grassy ? [1, 1, 1, 1] : corners.map(([sx, sz]) => aoAt(sx, sz));
          const rot = grassy ? 0 : Math.floor(hash2(x, z, 13) * 4);
          const baseUV = [
            [u0, vBot],
            [u0, vTop],
            [u1, vTop],
            [u1, vBot],
          ];
          const uvs = [0, 1, 2, 3].map((k) => baseUV[(k + rot) % 4]);
          const roll = smooth && !cliffCell(x, z);
          let y00 = roll ? cornerH(x, z) : h;
          let y01 = roll ? cornerH(x, z + 1) : h;
          let y11 = roll ? cornerH(x + 1, z + 1) : h;
          let y10 = roll ? cornerH(x + 1, z) : h;
          const skirtOk = (nt) => nt >= 0 && nt !== TILE.LAVA;
          const tileAt = (tx, tz) => {
            if (tx < 0 || tz < 0 || tx >= width || tz >= depth) return -1;
            return top[tz * width + tx];
          };
          const inTile = (cx, cz) => cx >= 0 && cz >= 0 && cx < width && cz < depth;
          const weldCorner = (vx, vz) => {
            let y = h;
            if (!skirtOk(tl)) return y;
            for (const [cx, cz] of [[vx - 1, vz - 1], [vx - 1, vz], [vx, vz - 1], [vx, vz]]) {
              if (cx === x && cz === z) continue;
              // Never weld across a tile border. Neighbour tiles have their
              // own mesh, so a shared T-junction showed fog 0xbfe0f4 as a
              // pale-blue triangle at 1920x1200 / Social (Brookside BL).
              if (!inTile(cx, cz)) continue;
              const nh = hAt(cx, cz);
              const drop = h - nh;
              // Cap at 1 wu even on water. Welding a 2–4 wu brook/lagoon drop
              // into a ramp leaves paper-thin sky spikes at grazing angles
              // (pass 40, x 60-90 y 690-750). Skirts close those walls.
              if (drop <= 0 || drop > 1.001) continue;
              // Never weld into the pool — a 0.4–1 wu shore/island drop
              // became a sky-coloured sliver at the waterline. Leave mines
              // welding; those 1 wu ramps are the oak tent terrace.
              if (nh < WATER_Y + 0.02) continue;
              if (!skirtOk(tileAt(cx, cz))) continue;
              y = Math.min(y, nh);
            }
            return y;
          };
          if (!roll) {
            y00 = weldCorner(x, z);
            y01 = weldCorner(x, z + 1);
            y11 = weldCorner(x + 1, z + 1);
            y10 = weldCorner(x + 1, z);
          }
          const border = x === 0 || z === 0 || x === width - 1 || z === depth - 1;
          const pad = grassy ? (border ? 0.04 : 0.015) : 0;
          const ps = [
            [x + ox - pad, y00, z + oz - pad],
            [x + ox - pad, y01, z + oz + 1 + pad],
            [x + ox + 1 + pad, y11, z + oz + 1 + pad],
            [x + ox + 1 + pad, y10, z + oz - pad],
          ];
          const e1x = ps[1][0] - ps[0][0];
          const e1y = ps[1][1] - ps[0][1];
          const e1z = ps[1][2] - ps[0][2];
          const e2x = ps[3][0] - ps[0][0];
          const e2y = ps[3][1] - ps[0][1];
          const e2z = ps[3][2] - ps[0][2];
          let nx = e1y * e2z - e1z * e2y;
          let ny = e1z * e2x - e1x * e2z;
          let nz = e1x * e2y - e1y * e2x;
          const nl = Math.hypot(nx, ny, nz) || 1;
          const topN = [nx / nl, ny / nl, nz / nl];
          const cs = aos.map((a) => [tr * a, tg * a, tb * a]);
          const wetTop = zn === ZONE.WATER || zn === ZONE.LAKE;
          // Lakebed tops sit under the water plane. Drawing them made a teal
          // slab at the lagoon shore and sky holes at the palm island.
          if (!wetTop) {
            // Grazing grass ramps pick the hemi sky colour (pale blue). Keep
            // the quad but light it as a ground face.
            if (grassy && topN[1] < 0.55) {
              topN[0] = 0;
              topN[1] = 1;
              topN[2] = 0;
            }
            if (!grassy && aos[0] + aos[2] > aos[1] + aos[3]) quad(ps, topN, uvs, cs);
            else if (!grassy) {
              quad(
                [ps[1], ps[2], ps[3], ps[0]],
                topN,
                [uvs[1], uvs[2], uvs[3], uvs[0]],
                [cs[1], cs[2], cs[3], cs[0]]
              );
            } else quad(ps, topN, uvs, cs);
          }

          if (wetTop) continue;

          const sideTiles = sideTilesFor(tl, top, width, depth, x, z);
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          const edgeY = [
            [y10, y11],
            [y00, y01],
            [y01, y11],
            [y00, y10],
          ];
          for (let di = 0; di < dirs.length; di++) {
            const [dx, dz] = dirs[di];
            const nCellX = x + dx;
            const nCellZ = z + dz;
            const offTile = !inTile(nCellX, nCellZ);
            let nh = hAt(nCellX, nCellZ);
            const voidEdge = offTile && (nh == null || nh < -2.4);
            // Matching neighbour height still needs a lip: both meshes meet
            // at the integer seam with no overlap, so grazing cameras see
            // the fog colour through the T-junction.
            if (offTile) {
              if (voidEdge) nh = -1.6;
              else if (!(nh < h - 0.02)) nh = h - 0.14;
            }
            if (!offTile && nh >= h) continue;
            if (roll && !offTile && !cliffCell(nCellX, nCellZ)) continue;
            const nextWater = offTile || cliffCell(nCellX, nCellZ) || cliffCell(x, z);
            // Interior welded ramps stay skirt-less so the meadow reads smooth.
            // Tile-border cells still get a wall — those are the grazing
            // sky triangles at dist=36 / 1920x1200 (Brookside south edge).
            if (!offTile && !border && !nextWater && edgeY[di][0] <= nh + 0.001 && edgeY[di][1] <= nh + 0.001) continue;
            const rx = dz;
            const rz = -dx;
            const mx = x + 0.5 + dx * (offTile ? (voidEdge ? 1.15 : 0.72) : 0.54);
            const mz = z + 0.5 + dz * (offTile ? (voidEdge ? 1.15 : 0.72) : 0.54);
            const ax = mx - rx * 0.5;
            const az = mz - rz * 0.5;
            const bx = mx + rx * 0.5;
            const bz = mz + rz * 0.5;
            let yt = h + (nextWater ? 0.04 : 0.02);
            let seg = 0;
            const shadeSide = dx !== 0 ? 0.86 : 0.93;
            while (yt > nh + 0.001) {
              const yb = Math.max(nh - (nextWater ? 0.28 : 0.08), yt - 1);
              const len = yt - yb;
              const tile = seg === 0 ? sideTiles[0] : seg < 3 || sideTiles[1] !== TILE.DIRT ? sideTiles[1] : TILE.STONE;
              const t = uvOf(tile);
              const vh = t.vTop;
              const vl = vh - len * (t.vTop - t.vBot);
              const lastSeg = yb <= nh + 0.001;
              const matchTop = tile === TILE.GRASS_SIDE || tile === TILE.SNOW_SIDE || tile === TILE.SAND;
              const bot = matchTop ? 0.96 : (lastSeg ? 0.78 : 0.94);
              const topShade = seg === 0 ? 1.0 : 0.94;
              const lip = matchTop ? (dx !== 0 ? 0.97 : 0.99) : shadeSide;
              const sr = matchTop ? tr : lerp(1, tr, 0.55);
              const sg = matchTop ? tg : lerp(1, tg, 0.55);
              const sb = matchTop ? tb : lerp(1, tb, 0.55);
              const jb = 0.94 + hash2(x * 3 + dx, z * 3 + dz, 19 + seg) * 0.12;
              const cTop = [sr * lip * topShade * jb, sg * lip * topShade * jb, sb * lip * topShade * jb];
              const cBot = [sr * lip * bot * jb, sg * lip * bot * jb, sb * lip * bot * jb];
              quad(
                [
                  [ax + ox, yb, az + oz],
                  [bx + ox, yb, bz + oz],
                  [bx + ox, yt, bz + oz],
                  [ax + ox, yt, az + oz],
                ],
                [dx, 0, dz],
                [
                  [t.u0, vl],
                  [t.u1, vl],
                  [t.u1, vh],
                  [t.u0, vh],
                ],
                [cBot, cBot, cTop, cTop]
              );
              yt = yb;
              seg++;
            }
            if (offTile) {
              const out = voidEdge ? 8 : 4;
              const ay = h - 0.05;
              const xA = x + ox + (dx === 1 ? 1.08 : dx === -1 ? -out : 0);
              const xB = x + ox + (dx === 1 ? 1 + out : dx === -1 ? -0.08 : 1);
              const zA = z + oz + (dz === 1 ? 1.08 : dz === -1 ? -out : 0);
              const zB = z + oz + (dz === 1 ? 1 + out : dz === -1 ? -0.08 : 1);
              const tu = uvOf(tl);
              const ac = [tr * 0.96, tg * 0.96, tb * 0.96];
              quad(
                [
                  [xA, ay, zA],
                  [xB, ay, zA],
                  [xB, ay, zB],
                  [xA, ay, zB],
                ],
                [0, 1, 0],
                [
                  [tu.u0, tu.vBot],
                  [tu.u1, tu.vBot],
                  [tu.u1, tu.vTop],
                  [tu.u0, tu.vTop],
                ],
                [ac, ac, ac, ac]
              );
            }
          }
        }
      }

      if (!pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
      g.computeBoundingSphere();
      g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      chunks.push(mesh);
    }
  }
  void zone;
  return group;
}
