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
      const fieldTint = [1.08, 1.14, 0.86];
      const forestTint = [0.62, 0.9, 0.84];
      const mix3 = (a, c, t) => [lerp(a[0], c[0], t), lerp(a[1], c[1], t), lerp(a[2], c[2], t)];
      const dn = fbm(x * 0.045 + 10, z * 0.045 + 3, 1, 4);
      const forestAmt = smoothstep(64, 54, z + (fbm(x * 0.12, z * 0.12, 2, 3) - 0.5) * 12);
      forest[i] = forestAmt;
      let t3 = mix3(fieldTint, forestTint, forestAmt);
      const pv = 0.9 + patch * 0.28;
      t3 = [t3[0] * pv, t3[1] * pv, t3[2] * pv];

      if (zn === ZONE.MOUNTAIN || h > 8) {
        const high = smoothstep(8, 24, h);
        if (h >= 22) tl = TILE.SNOW;
        else if (slope[i] >= 2 || high > 0.55) tl = hash2(x, z, 4) > 0.8 ? TILE.MOSS_STONE : TILE.STONE;
        else tl = TILE.GRASS;
        const gtint = mix3(t3, [0.78, 0.92, 0.78], high * 0.8);
        [r, g, b] = gtint;
        if (tl === TILE.STONE || tl === TILE.MOSS_STONE) [r, g, b] = [0.95, 0.97, 1.0];
        if (tl === TILE.SNOW) [r, g, b] = [1, 1, 1];
      } else if (zn === ZONE.WATER || zn === ZONE.LAKE || (h <= 0.5 && !mineRel[i])) {
        tl = h <= 0 ? TILE.GRAVEL : TILE.SAND;
        [r, g, b] = [1, 1, 1];
        if (h <= 0.5 && h > 0) tl = TILE.SAND;
      } else if (zn === ZONE.FARM) {
        tl = TILE.FARMLAND;
        [r, g, b] = [1, 1, 1];
      } else if (pathMask[i]) {
        const cobble = zn === ZONE.TOWN || zn === ZONE.GATE;
        tl = cobble ? TILE.COBBLE : TILE.PATH;
        [r, g, b] = cobble ? [1, 1.0, 1.02] : [1, 1, 1];
      } else {
        tl = jr > 0.935 && forestAmt < 0.6 ? TILE.FLOWER_GRASS : TILE.GRASS;
        [r, g, b] = t3;
        if (zn === ZONE.GATE) [r, g, b] = [r * 0.8, g * 0.85, b * 1.0];
      }
      if (mineRel[i]) {
        const roll = hash2(x, z, 61);
        if (rampFlag[i]) {
          tl = TILE.COBBLE;
          [r, g, b] = [0.95, 0.88, 0.8];
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
  [TILE.GRASS]: [TILE.GRASS_SIDE, TILE.DIRT],
  [TILE.FLOWER_GRASS]: [TILE.GRASS_SIDE, TILE.DIRT],
  [TILE.COBBLE]: [TILE.BRICK, TILE.BRICK],
  [TILE.PATH]: [TILE.GRASS_SIDE, TILE.DIRT],
  [TILE.STONE]: [TILE.STONE, TILE.STONE],
  [TILE.MOSS_STONE]: [TILE.STONE, TILE.STONE],
  [TILE.SNOW]: [TILE.SNOW_SIDE, TILE.STONE],
  [TILE.ICE]: [TILE.ICE, TILE.ICE],
  [TILE.FROST_GRASS]: [TILE.GRASS_SIDE, TILE.DIRT],
  [TILE.SAND]: [TILE.SAND, TILE.GRAVEL],
  [TILE.GRAVEL]: [TILE.GRAVEL, TILE.GRAVEL],
  [TILE.DIRT]: [TILE.DIRT, TILE.DIRT],
  [TILE.FARMLAND]: [TILE.DIRT, TILE.DIRT],
};

const CHUNK = 24;

export function buildTerrainMeshes(data, material, opt = {}) {
  const width = opt.width || W;
  const depth = opt.depth || W;
  const ox = opt.ox || 0;
  const oz = opt.oz || 0;
  const { H, top, tint, zone } = data;
  const group = new THREE.Group();
  const hAt = (x, z) => {
    if (x >= 0 && z >= 0 && x < width && z < depth) return H[z * width + x];
    const outside = opt.outside?.(x, z);
    return outside == null ? -3 : outside;
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
          const tl = top[i];
          const tr = tint[i * 3];
          const tg = tint[i * 3 + 1];
          const tb = tint[i * 3 + 2];
          const { u0, u1, vTop, vBot } = uvOf(tl);

          const aoAt = (sx, sz) => {
            const s1 = hAt(x + sx, z) > h + 0.01 ? 1 : 0;
            const s2 = hAt(x, z + sz) > h + 0.01 ? 1 : 0;
            const c = hAt(x + sx, z + sz) > h + 0.01 ? 1 : 0;
            const a = s1 && s2 ? 0 : 3 - (s1 + s2 + c);
            return [0.62, 0.78, 0.9, 1.0][a];
          };
          const corners = [
            [-1, -1],
            [-1, 1],
            [1, 1],
            [1, -1],
          ];
          const aos = corners.map(([sx, sz]) => aoAt(sx, sz));
          const rot = Math.floor(hash2(x, z, 13) * 4);
          const baseUV = [
            [u0, vBot],
            [u0, vTop],
            [u1, vTop],
            [u1, vBot],
          ];
          const uvs = [0, 1, 2, 3].map((k) => baseUV[(k + rot) % 4]);
          const ps = [
            [x + ox, h, z + oz],
            [x + ox, h, z + oz + 1],
            [x + ox + 1, h, z + oz + 1],
            [x + ox + 1, h, z + oz],
          ];
          const cs = aos.map((a) => [tr * a, tg * a, tb * a]);
          if (aos[0] + aos[2] > aos[1] + aos[3]) quad(ps, [0, 1, 0], uvs, cs);
          else {
            quad(
              [ps[1], ps[2], ps[3], ps[0]],
              [0, 1, 0],
              [uvs[1], uvs[2], uvs[3], uvs[0]],
              [cs[1], cs[2], cs[3], cs[0]]
            );
          }

          const sideTiles = SIDE_TILES[tl] || [TILE.STONE, TILE.STONE];
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          for (const [dx, dz] of dirs) {
            const nh = hAt(x + dx, z + dz);
            if (nh >= h) continue;
            const rx = dz;
            const rz = -dx;
            const mx = x + 0.5 + dx * 0.5;
            const mz = z + 0.5 + dz * 0.5;
            const ax = mx - rx * 0.5;
            const az = mz - rz * 0.5;
            const bx = mx + rx * 0.5;
            const bz = mz + rz * 0.5;
            let yt = h;
            let seg = 0;
            const shadeSide = dx !== 0 ? 0.86 : 0.93;
            while (yt > nh + 0.001) {
              const yb = Math.max(nh, yt - 1);
              const len = yt - yb;
              const tile = seg === 0 ? sideTiles[0] : seg < 3 || sideTiles[1] !== TILE.DIRT ? sideTiles[1] : TILE.STONE;
              const t = uvOf(tile);
              const vh = t.vTop;
              const vl = vh - len * (t.vTop - t.vBot);
              const lastSeg = yb <= nh + 0.001;
              const bot = lastSeg ? 0.78 : 0.94;
              const topShade = seg === 0 ? 1.0 : 0.94;
              const sr = tile === TILE.GRASS_SIDE || tile === TILE.SNOW_SIDE ? tr : lerp(1, tr, 0.55);
              const sg = tile === TILE.GRASS_SIDE || tile === TILE.SNOW_SIDE ? tg : lerp(1, tg, 0.55);
              const sb = tile === TILE.GRASS_SIDE || tile === TILE.SNOW_SIDE ? tb : lerp(1, tb, 0.55);
              const jb = 0.94 + hash2(x * 3 + dx, z * 3 + dz, 19 + seg) * 0.12;
              const cTop = [sr * shadeSide * topShade * jb, sg * shadeSide * topShade * jb, sb * shadeSide * topShade * jb];
              const cBot = [sr * shadeSide * bot * jb, sg * shadeSide * bot * jb, sb * shadeSide * bot * jb];
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
