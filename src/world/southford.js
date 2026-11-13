import * as THREE from 'three';
import { VoxelModel, fbm, hash2, lerp, clamp, smoothstep } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE } from './terrain.js';
import { bundle } from './models.js';

/** Southford sits on the south edge of Oakhollow. World z = local z + SOUTH_Z. */
export const SOUTH_Z = W;

/** Walk-in point, at the foot of the eastern bluff. The cave realm starts here. */
export const CAVE_MOUTH = { x: 104, z: SOUTH_Z + 44 };
/** Where the hunter stands again after leaving the den. */
export const CAVE_OUTSIDE = { x: 96, z: SOUTH_Z + 44 };

const ROAD_X = 60;

function distToSeg(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const t = clamp(((px - ax) * abx + (pz - az) * abz) / (abx * abx + abz * abz || 1), 0, 1);
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

/**
 * Cut a walkable road through the mountain ring on Oakhollow's south edge.
 * The river notch stays wet. The road, just east of it, slopes gently up to
 * the height Southford continues.
 */
export function openSouthPass(data) {
  const { H, zone, top, tint, pathMask, slope, forest } = data;
  for (let z = 114; z < W; z++) {
    const fade = smoothstep(114, 122, z);
    const along = clamp((z - 114) / (W - 1 - 114), 0, 1);
    const floor = Math.round((2.2 + along * 1.0) * 2) / 2;
    for (let x = 44; x <= 78; x++) {
      if (x >= 33 && x <= 43) continue;
      const i = z * W + x;
      const bank = Math.abs(x - ROAD_X);
      const want = bank <= 6 ? floor : floor + (bank - 6) * 0.7;
      const next = lerp(H[i], Math.min(H[i], want), fade);
      H[i] = Math.round(next * 2) / 2;
      const south = z >= 128;
      if (bank <= 5) {
        pathMask[i] = 1;
        top[i] = TILE.PATH;
        zone[i] = south ? ZONE.SOUTH : ZONE.FIELD;
        forest[i] = 0;
        tint[i * 3] = 1;
        tint[i * 3 + 1] = 0.97;
        tint[i * 3 + 2] = 0.86;
      } else if (H[i] < 7.5) {
        top[i] = TILE.GRASS;
        zone[i] = south ? ZONE.SOUTH : ZONE.FIELD;
        forest[i] = 0.04;
        tint[i * 3] = 0.86;
        tint[i * 3 + 1] = 1;
        tint[i * 3 + 2] = 0.72;
      } else {
        top[i] = TILE.STONE;
        zone[i] = ZONE.MOUNTAIN;
        forest[i] = 0;
        tint[i * 3] = 0.92;
        tint[i * 3 + 1] = 0.93;
        tint[i * 3 + 2] = 0.98;
      }
    }
  }
  reslope(H, slope, 112, W - 1, 40, 82);
}

function reslope(H, slope, z0, z1, x0, x1) {
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

/** Hills and hollows scattered through the vale. [x, z, radius, height]. */
const KNOLLS = [
  [18, 62, 9, 7],
  [24, 98, 8, 6],
  [46, 112, 7, 5],
  [74, 100, 6, 4.5],
  [84, 78, 7, 5],
  [96, 118, 8, 6.5],
  [122, 72, 10, 8],
  [130, 108, 8, 6],
  [52, 78, 5, -1.8],
  [108, 96, 6, -1.6],
  [28, 80, 4, -1.2],
  [70, 64, 4, 2.2],
];

function relief(x, z) {
  const broad = fbm(x * 0.032, z * 0.03, 65, 4);
  const mid = fbm(x * 0.085 + 4.2, z * 0.078, 21, 3);
  const fine = fbm(x * 0.17, z * 0.16, 7, 2);
  let h = (broad - 0.4) * 4.6 + (mid - 0.5) * 2.1 + (fine - 0.5) * 0.9;
  for (const [cx, cz, r, amp] of KNOLLS) {
    const d = Math.hypot(x - cx, z - cz) / r;
    if (d < 1) h += amp * (1 - d) * (1 - d);
  }
  return h;
}

function wildHeight(x, z) {
  const bluffD = Math.hypot(x - 112, z - 44);
  const bluffN = fbm(x * 0.18, z * 0.18, 44, 2);
  const bluffR = 14.2 + (bluffN - 0.5) * 5;
  let h = 3.05 + relief(x, z);
  if (bluffD < bluffR) {
    const t = bluffD / bluffR;
    h = Math.max(h, lerp(10.2 + bluffN * 3, 4.4, t * t));
  }
  if (x < 18) h += (18 - x) * 0.55;
  if (x > 128) h += (x - 128) * 0.62;
  if (z > 118) h += (z - 118) * 0.42;
  return Math.max(0.2, h);
}

function riverHeight(z) {
  if (z >= 24 && z <= 40) {
    const edge = Math.min(z - 24, 40 - z) / 4;
    return lerp(0, 1.2, clamp(edge, 0, 1));
  }
  return 0;
}

/** Local Southford height and surface, before it is blended into Oakhollow's edge. */
function valley(x, z) {
  const inCut = x >= 88 && x <= 106 && z >= 37 && z <= 48;
  const cavePath = distToSeg(x, z, 60, 36, 100, 42) <= 4.6;
  const onRoad = Math.abs(x - ROAD_X) <= 5 && z <= 82;
  const ford = z >= 24 && z <= 40;

  if (x >= 34 && x <= 42) {
    const h = riverHeight(z);
    return { h, kind: h < 0.35 ? 'water' : 'ford' };
  }
  if (inCut || cavePath || onRoad) return { h: 3.2, kind: 'path' };
  if (ford && x >= 28 && x < 34) {
    const u = (34 - x) / 6;
    return { h: lerp(1.2, wildHeight(x, z), u), kind: 'grass' };
  }
  if (x > 42 && x < 52) {
    const wet = riverHeight(z);
    const land = wildHeight(x, z);
    const capped = Math.min(land, wet + (x - 42) * 0.7);
    return { h: lerp(wet, capped, (x - 42) / 10), kind: 'grass' };
  }
  const h = wildHeight(x, z);
  return { h, kind: h >= 8 ? 'stone' : h < 0.35 ? 'water' : 'grass' };
}

function paintCell(data, i, h, kind, x, z) {
  const { zone, top, tint, pathMask, forest } = data;
  if (kind === 'water' || h < 0.35) {
    zone[i] = ZONE.WATER;
    top[i] = TILE.SAND;
    tint[i * 3] = 0.72;
    tint[i * 3 + 1] = 0.86;
    tint[i * 3 + 2] = 1;
    return;
  }
  if (kind === 'path' || kind === 'ford') {
    pathMask[i] = 1;
    zone[i] = ZONE.SOUTH;
    top[i] = kind === 'ford' ? TILE.GRAVEL : TILE.PATH;
    forest[i] = 0;
    tint[i * 3] = 1;
    tint[i * 3 + 1] = kind === 'ford' ? 0.94 : 0.97;
    tint[i * 3 + 2] = kind === 'ford' ? 0.84 : 0.86;
    return;
  }
  if (kind === 'stone' || h >= 8) {
    zone[i] = ZONE.MOUNTAIN;
    top[i] = TILE.STONE;
    forest[i] = 0;
    tint[i * 3] = 0.9;
    tint[i * 3 + 1] = 0.91;
    tint[i * 3 + 2] = 0.96;
    return;
  }
  const n = fbm(x * 0.06, z * 0.06, 3, 2);
  const rocky = n < 0.22 && h > 4;
  zone[i] = h >= 8 ? ZONE.MOUNTAIN : ZONE.SOUTH;
  top[i] = rocky ? TILE.GRAVEL : n > 0.68 && h < 5.5 && h > 1.4 ? TILE.FLOWER_GRASS : h > 6.5 ? TILE.MOSS_STONE : TILE.GRASS;
  forest[i] = clamp(0.05 + n * 0.35, 0, 0.5);
  tint[i * 3] = 0.7 + n * 0.28;
  tint[i * 3 + 1] = 0.86 + (1 - n) * 0.2;
  tint[i * 3 + 2] = 0.52 + n * 0.22;
}

/**
 * Southford's heightmap. Row 0 is an exact copy of Oakhollow's south edge
 * so the two meshes share a height.
 */
export function generateSouthford(northRow) {
  const data = {
    H: new Float32Array(W * W),
    zone: new Uint8Array(W * W),
    top: new Uint8Array(W * W),
    tint: new Float32Array(W * W * 3),
    pathMask: new Float32Array(W * W),
    slope: new Float32Array(W * W),
    forest: new Float32Array(W * W),
  };
  for (let z = 0; z < W; z++) {
    const blend = z === 0 ? 0 : smoothstep(0, 14, z);
    for (let x = 0; x < W; x++) {
      const spec = valley(x, z);
      const h = z === 0 ? northRow[x] : Math.round(lerp(northRow[x], spec.h, blend) * 2) / 2;
      data.H[z * W + x] = h;
      const kind = z === 0 ? kindFromEdge(h, spec.kind) : spec.kind;
      paintCell(data, z * W + x, h, kind, x, z);
    }
  }
  // Keep the road and the cave approach at the valley floor once the blend has settled.
  for (let z = 10; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const spec = valley(x, z);
      if (spec.kind !== 'path' && spec.kind !== 'ford') continue;
      const i = z * W + x;
      data.H[i] = Math.round(spec.h * 2) / 2;
      paintCell(data, i, data.H[i], spec.kind, x, z);
    }
  }
  reslope(data.H, data.slope, 0, W - 1, 0, W - 1);
  return data;
}

function kindFromEdge(h, want) {
  if (h < 0.35) return 'water';
  if (want === 'path' || want === 'ford') return want;
  if (h >= 8) return 'stone';
  return 'grass';
}

function buildArch() {
  const m = new VoxelModel(16, 14, 4);
  const stone = (x, y, z) => {
    const band = y === 10 || y === 11 ? 0x6e675c : 0x534c44;
    const moss = y < 2 ? 0x3f5a34 : band;
    return hash2(x, y + z * 3, 4) > 0.82 ? 0x6a6258 : moss;
  };
  m.box(0, 0, 0, 3, 11, 4, stone);
  m.box(13, 0, 0, 16, 11, 4, stone);
  m.box(0, 10, 0, 16, 14, 4, stone);
  m.box(3, 10, 0, 13, 12, 4, (x, y, z) => (hash2(x, z, 6) > 0.7 ? 0x2a2438 : 0x3a342c));
  return bundle([[m, 0.26, 8, 0, 2]]);
}

function onSouthPath(world, x, z) {
  const lx = clamp(Math.floor(x), 0, W - 1);
  const lz = Math.floor(z - SOUTH_Z);
  if (lz < 0 || lz >= W) return false;
  return world.south.pathMask[lz * W + lx] > 0;
}

/** Trees, the ford, and the cave mouth. Called after height queries know about Southford. */
export function dressSouthford(world) {
  const m = world.models;
  const treeOf = (n, h) => {
    const r = hash2(n, 9, 11);
    if (h > 6.2) return m.pines[n % m.pines.length];
    if (r > 0.82) return m.blossoms[n % m.blossoms.length];
    if (r > 0.68) return m.autumn[n % m.autumn.length];
    if (r > 0.55) return m.teal[n % m.teal.length];
    return m.oaks[n % m.oaks.length];
  };
  for (let n = 0; n < 78; n++) {
    const x = 12 + hash2(n, 2, 11) * 118;
    const z = SOUTH_Z + 8 + hash2(n, 5, 11) * 118;
    const h = world.heightAt(x, z);
    if (h < 1.3 || h > 7.4) continue;
    if (onSouthPath(world, x, z)) continue;
    if (Math.hypot(x - CAVE_MOUTH.x, z - CAVE_MOUTH.z) < 9) continue;
    if (!world.free(x, z, 1.7)) continue;
    const s = 0.58 + hash2(n, 4, 11) * 0.28;
    world.putAt(treeOf(n, h), x, z, hash2(n, 1, 11) * 6, s);
    world.circle(x, z, 0.42);
    world.occupy(x, z, 1.35);
    world.treeDots.push({ x, z });
  }
  for (let n = 0; n < 36; n++) {
    const x = 10 + hash2(n, 3, 21) * 122;
    const z = SOUTH_Z + 6 + hash2(n, 8, 21) * 124;
    const h = world.heightAt(x, z);
    if (h < 2.4 || h > 9.5) continue;
    if (onSouthPath(world, x, z)) continue;
    if (Math.hypot(x - CAVE_MOUTH.x, z - CAVE_MOUTH.z) < 7) continue;
    if (!world.free(x, z, 1.1)) continue;
    const big = h > 6.5 && hash2(n, 6, 21) > 0.62;
    const parts = big ? m.boulders[n % m.boulders.length] : m.rocks[n % m.rocks.length];
    world.putAt(parts, x, z, n * 0.7, (big ? 0.85 : 0.55) + hash2(n, 2, 21) * 0.45);
    world.circle(x, z, big ? 0.8 : 0.4);
    world.occupy(x, z, big ? 1.3 : 0.8);
  }
  for (let n = 0; n < 70; n++) {
    const x = 14 + hash2(n, 1, 31) * 112;
    const z = SOUTH_Z + 10 + hash2(n, 4, 31) * 110;
    const h = world.heightAt(x, z);
    if (h < 1.6 || h > 5.8) continue;
    if (onSouthPath(world, x, z)) continue;
    if (!world.free(x, z, 0.6)) continue;
    const roll = hash2(n, 7, 31);
    const parts = roll > 0.72 ? m.bushes[n % m.bushes.length] : roll > 0.4 ? m.flowers[n % m.flowers.length] : m.tufts[n % m.tufts.length];
    world.putAt(parts, x, z, roll * 6, roll > 0.72 ? 0.85 : 1, { cover: roll <= 0.72 });
  }
  for (let z = SOUTH_Z + 4; z < SOUTH_Z + 100; z += 3) {
    for (const x of [32, 44]) {
      if (world.heightAt(x, z) > 1.4) continue;
      if ((world.fishSpots || []).some((f) => f.site === 'river' && Math.hypot(f.standX - x, f.standZ - z) < 2.4)) continue;
      world.putAt(m.reeds[z % m.reeds.length], x, z, z * 0.2, 1);
    }
  }
  const fordZ = SOUTH_Z + 32;
  world.putAt(m.logs[0], 38, fordZ, Math.PI / 2, 0.7, { y: 1.15 });
  world.putAt(m.logs[1], 38, fordZ + 1.1, Math.PI / 2, 0.65, { y: 1.2 });

  const y = world.heightAt(CAVE_MOUTH.x, CAVE_MOUTH.z);
  world.putAt(buildArch(), CAVE_MOUTH.x, CAVE_MOUTH.z, Math.PI / 2, 1, { y });
  world.circle(CAVE_MOUTH.x, CAVE_MOUTH.z - 1.75, 0.85);
  world.circle(CAVE_MOUTH.x, CAVE_MOUTH.z + 1.75, 0.85);
  world.torch(CAVE_MOUTH.x - 1.2, CAVE_MOUTH.z - 2.4, 0xb25cff, m.torchPurple);
  world.torch(CAVE_MOUTH.x - 1.2, CAVE_MOUTH.z + 2.4, 0xb25cff, m.torchPurple);
  world.putAt(m.crystals[0], CAVE_MOUTH.x + 3.2, CAVE_MOUTH.z - 3.4, 0.4, 1.1);
  world.putAt(m.crystals[1], CAVE_MOUTH.x + 2.4, CAVE_MOUTH.z + 3.6, 1.2, 0.9);
  world.circle(CAVE_MOUTH.x + 3.2, CAVE_MOUTH.z - 3.4, 0.45);
  world.circle(CAVE_MOUTH.x + 2.4, CAVE_MOUTH.z + 3.6, 0.4);

  const hole = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 2.5),
    new THREE.MeshBasicMaterial({ color: 0x07060c })
  );
  hole.rotation.y = -Math.PI / 2;
  hole.position.set(CAVE_MOUTH.x + 0.85, y + 1.35, CAVE_MOUTH.z);
  world.group.add(hole);
}
