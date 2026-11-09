import * as THREE from 'three';
import { VoxelModel, hash2, lerp, clamp, smoothstep } from '../engine/voxel.js';
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

/** Local Southford height and surface, before it is blended into Oakhollow's edge. */
function valley(x, z) {
  const bluff = Math.hypot(x - 112, z - 44);
  const inCut = x >= 88 && x <= 106 && z >= 37 && z <= 48;
  const cavePath = distToSeg(x, z, 60, 36, 100, 42) <= 4.6;
  const onRoad = Math.abs(x - ROAD_X) <= 5 && z <= 82;
  const river = x >= 34 && x <= 42;
  const ford = z >= 24 && z <= 40;

  if (river) {
    if (ford) {
      const edge = Math.min(z - 24, 40 - z) / 4;
      const h = lerp(0, 1.2, clamp(edge, 0, 1));
      return { h, kind: h < 0.35 ? 'water' : 'ford' };
    }
    return { h: 0, kind: 'water' };
  }
  if (ford && x >= 28 && x < 34) {
    const u = (34 - x) / 6;
    return { h: lerp(1.2, 3.2, u), kind: 'grass' };
  }
  if (inCut || cavePath || onRoad) return { h: 3.2, kind: 'path' };
  if (x > 42 && x < 54) {
    const u = (x - 42) / 12;
    const wet = ford ? 1.2 : 0;
    return { h: lerp(wet, 3.2, u), kind: 'grass' };
  }
  if (bluff < 16) {
    const h = lerp(12.5, 4.4, bluff / 16);
    return { h, kind: h >= 8 ? 'stone' : 'grass' };
  }
  let h = 3.3 + Math.sin(x * 0.08) * 0.4 + Math.cos(z * 0.055 + 1.7) * 0.35;
  if (x < 22) h += (22 - x) * 0.42;
  if (x > 126) h += (x - 126) * 0.5;
  if (z > 112) h += (z - 112) * 0.34;
  return { h, kind: h >= 8 ? 'stone' : 'grass' };
}

function paintCell(data, i, h, kind) {
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
  zone[i] = ZONE.SOUTH;
  top[i] = TILE.GRASS;
  forest[i] = 0.14;
  tint[i * 3] = 0.84;
  tint[i * 3 + 1] = 1;
  tint[i * 3 + 2] = 0.7;
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
      paintCell(data, z * W + x, h, kind);
    }
  }
  // Keep the road and the cave approach at the valley floor once the blend has settled.
  for (let z = 10; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const spec = valley(x, z);
      if (spec.kind !== 'path' && spec.kind !== 'ford') continue;
      const i = z * W + x;
      data.H[i] = Math.round(spec.h * 2) / 2;
      paintCell(data, i, data.H[i], spec.kind);
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

/** Trees, the ford, and the cave mouth. Called after height queries know about Southford. */
export function dressSouthford(world) {
  const m = world.models;
  const oak = m.oaks[0];
  const birch = m.blossoms[0];
  for (let n = 0; n < 34; n++) {
    const x = 16 + hash2(n, 2, 11) * 108;
    const z = SOUTH_Z + 6 + hash2(n, 5, 11) * 96;
    const h = world.heightAt(x, z);
    if (h < 1.2 || h > 6.2) continue;
    if (world.south.pathMask[Math.floor(z - SOUTH_Z) * W + clamp(Math.floor(x), 0, W - 1)]) continue;
    if (Math.hypot(x - CAVE_MOUTH.x, z - CAVE_MOUTH.z) < 8) continue;
    if (!world.free(x, z, 1.6)) continue;
    const parts = hash2(n, 9, 11) > 0.72 ? birch : oak;
    const s = 0.62 + hash2(n, 4, 11) * 0.18;
    world.putAt(parts, x, z, hash2(n, 1, 11) * 6, s);
    world.circle(x, z, 0.45);
    world.occupy(x, z, 1.3);
    world.treeDots.push({ x, z });
  }
  for (let n = 0; n < 16; n++) {
    const x = 14 + hash2(n, 3, 21) * 116;
    const z = SOUTH_Z + 8 + hash2(n, 8, 21) * 100;
    const h = world.heightAt(x, z);
    if (h < 3.6 || h > 8) continue;
    if (!world.free(x, z, 1.2)) continue;
    world.putAt(m.rocks[n % m.rocks.length], x, z, n, 0.8 + hash2(n, 2, 21) * 0.5);
    world.circle(x, z, 0.55);
    world.occupy(x, z, 1);
  }
  for (let z = SOUTH_Z + 4; z < SOUTH_Z + 100; z += 3) {
    for (const x of [32, 44]) {
      if (world.heightAt(x, z) > 1.4) continue;
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
