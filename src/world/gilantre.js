import * as THREE from 'three';
import { VoxelModel, hash2, lerp, clamp } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE } from './terrain.js';
import { J, bundle, buildHouse, buildStall } from './models.js';
import { buildSmithy } from './smithy.js';

/**
 * Gilantre sits on the shared corner of tiles 57, 58, 67 and 68.
 * World (432, 144) is that corner. A brick wall and a moat ring the
 * streets. Drawbridges break the moat on the east and the west.
 * Outside the wall the ground stays prairie on the east tiles and
 * forest on the west tiles, the same mix Oakhollow's ring uses.
 *
 * Names below are the ones GPT-6 Luna gave for the town.
 */

export const CX = 432;
export const CZ = 144;
const FLOOR = 3;
const CITY_R = 26;
const MOAT_IN = 33;
const MOAT_OUT = 42;
const BRIDGE = 4.6;

export const GILANTRE_SPOTS = {
  arena: { x: 446, z: 130 },
  westgate: { x: 396, z: 144 },
  eastgate: { x: 468, z: 144 },
  grove: { x: 352, z: 128 },
  oak: { x: 506, z: 156 },
  reed: { x: 486, z: 156 },
  hall: { x: 422, z: 120 },
  smithy: { x: 410, z: 166 },
  forge: { x: 422, z: 154 },
  mine: { x: 408, z: 126 },
  wood: { x: 424, z: 122 },
  potion: { x: 450, z: 162 },
};

const ARENA = GILANTRE_SPOTS.arena;

function quarter(seed, forest, line) {
  return {
    banner: [line, 'Gilantre'],
    shade: 0.02,
    forest,
    amp: 1.45,
    base: 3.45,
    seed,
    rim: {},
    knolls: [[36, 48, 14, 1.6], [108, 78, 16, 1.8], [70, 24, 10, 1.1]],
    roads: [],
  };
}

export const GILANTRE_SPECS = {
  gilantreNw: quarter(57, 0.62, 'West Gate'),
  gilantreNe: quarter(58, 0.32, 'The Arena'),
  gilantreSw: quarter(67, 0.56, 'Ironhaven'),
  gilantreSe: quarter(68, 0.28, 'East Gate'),
};

const BRICKS = [0x8d3a32, 0xa3483c, 0x6e2c28, 0xb85a48, 0x7a342e];

function brickAt(x, y, z, seed) {
  const row = Math.floor(y / 2);
  const col = Math.floor((x + (row % 2) * 2) / 3);
  let c = BRICKS[Math.abs(col + row * 3) % BRICKS.length];
  if (y % 4 === 3) c = 0x5c4038;
  return J(c, x, y, z, seed, 0.05);
}

function stoneAt(x, y, z, seed) {
  const c = [0xc2b8a6, 0xd4cbb8, 0xaea492, 0xe4dcc8][Math.abs(x + y * 3 + z) % 4];
  return J(c, x, y, z, seed, 0.05);
}

let models;

function cityModels() {
  if (models) return models;
  const wall = new VoxelModel(28, 46, 8);
  wall.box(0, 0, 0, 28, 36, 8, (x, y, z) => brickAt(x, y, z, 3));
  for (let x = 0; x < 28; x += 4) wall.box(x, 36, 0, x + 2, 44, 8, (a, y, z) => brickAt(a, y, z, 3));
  wall.box(0, 34, 0, 28, 36, 2, (x, y, z) => stoneAt(x, y, z, 4));
  wall.box(0, 34, 6, 28, 36, 8, (x, y, z) => stoneAt(x, y, z, 4));

  const tower = new VoxelModel(18, 68, 18);
  tower.box(0, 0, 0, 18, 54, 18, (x, y, z) => brickAt(x, y, z, 5));
  tower.box(0, 54, 0, 18, 58, 18, (x, y, z) => stoneAt(x, y, z, 5));
  for (let x = 0; x < 18; x += 4) {
    tower.box(x, 58, 0, x + 2, 66, 4, (a, y, z) => brickAt(a, y, z, 5));
    tower.box(x, 58, 14, x + 2, 66, 18, (a, y, z) => brickAt(a, y, z, 5));
  }
  tower.box(6, 40, 0, 12, 48, 2, 0xf2ead0);
  tower.box(7, 42, 0, 11, 46, 2, 0x87b4d4);

  const lintel = new VoxelModel(78, 10, 8);
  lintel.box(0, 0, 0, 78, 8, 8, (x, y, z) => brickAt(x, y, z, 7));
  lintel.box(0, 8, 0, 78, 10, 8, (x, y, z) => stoneAt(x, y, z, 7));

  const deck = new VoxelModel(22, 3, 16);
  deck.box(0, 0, 0, 22, 2, 16, (x, y, z) => J(z % 2 ? 0x8a5a34 : 0xa87244, x, y, z, 9, 0.06));
  deck.box(0, 2, 0, 22, 3, 2, 0x5c3a22);
  deck.box(0, 2, 14, 22, 3, 16, 0x5c3a22);

  const post = new VoxelModel(4, 16, 4);
  post.box(0, 0, 0, 4, 14, 4, (x, y, z) => J(0x6a4328, x, y, z, 11, 0.06));
  post.box(0, 14, 0, 4, 16, 4, 0xc8b070);

  const arch = new VoxelModel(22, 40, 8);
  arch.box(0, 0, 0, 22, 36, 8, (x, y, z) => stoneAt(x, y, z, 13));
  arch.carve(5, 0, 0, 17, 22, 8);
  for (let x = 5; x < 17; x++) {
    const rise = Math.sin(((x - 5) / 12) * Math.PI) * 8;
    arch.carve(x, 0, 0, x + 1, 14 + Math.floor(rise), 8);
  }
  arch.box(0, 34, 0, 22, 40, 8, (x, y, z) => stoneAt(x, y, z, 14));

  const seat = new VoxelModel(16, 14, 12);
  seat.box(0, 0, 0, 16, 4, 12, (x, y, z) => stoneAt(x, y, z, 15));
  seat.box(0, 4, 4, 16, 8, 12, (x, y, z) => stoneAt(x, y, z, 16));
  seat.box(0, 8, 8, 16, 12, 12, (x, y, z) => stoneAt(x, y, z, 17));
  seat.box(1, 4, 5, 5, 5, 7, 0x8a1e1e);
  seat.box(7, 8, 9, 12, 9, 11, 0xc9a14a);

  const bay = new VoxelModel(36, 58, 10);
  bay.box(0, 0, 0, 36, 52, 10, (x, y, z) => stoneAt(x, y, z, 60));
  for (let x = 7; x < 29; x++) {
    const rise = Math.sin(((x - 7) / 22) * Math.PI) * 12;
    const top = 8 + Math.floor(rise);
    bay.carve(x, 0, 0, x + 1, top, 10);
    const voussoir = x % 2 ? 0xe8e0d2 : 0xb7aa96;
    bay.box(x, top, 0, x + 1, top + 2, 10, voussoir);
  }
  bay.box(16, 20, 0, 20, 24, 2, 0xc9a14a);
  bay.box(16, 20, 8, 20, 24, 10, 0xc9a14a);
  bay.box(0, 22, 0, 36, 26, 10, (x, y, z) => stoneAt(x, y, z, 61));
  for (let x = 11; x < 25; x++) {
    const rise = Math.sin(((x - 11) / 14) * Math.PI) * 7;
    const top = 32 + Math.floor(rise);
    bay.carve(x, 28, 0, x + 1, top, 10);
    bay.box(x, top, 0, x + 1, top + 1, 10, x % 2 ? 0xe8e0d2 : 0x8a1e1e);
  }
  bay.box(12, 33, 8, 24, 38, 10, 0x8a1e1e);
  bay.box(14, 34, 8, 22, 37, 10, 0xc9a14a);
  bay.box(0, 48, 0, 36, 52, 10, (x, y, z) => stoneAt(x, y, z, 62));
  bay.box(16, 49, 0, 20, 52, 2, 0xc9a14a);
  for (let x = 0; x < 36; x += 6) bay.box(x, 52, 0, x + 2, 58, 10, (a, y, z) => stoneAt(a, y, z, 63));

  const imperial = new VoxelModel(22, 28, 12);
  imperial.box(0, 0, 0, 22, 8, 12, (x, y, z) => stoneAt(x, y, z, 64));
  imperial.box(2, 8, 2, 20, 16, 10, (x, y, z) => stoneAt(x, y, z, 65));
  imperial.box(4, 10, 1, 18, 15, 4, 0x8a1e1e);
  imperial.box(6, 11, 1, 16, 14, 3, 0xc9a14a);
  imperial.box(1, 16, 1, 21, 18, 11, 0xf2ead0);
  imperial.box(0, 18, 0, 22, 20, 12, 0x8a1e1e);
  imperial.box(3, 20, 4, 5, 26, 6, (x, y, z) => J(0x6a4328, x, y, z, 66, 0.04));
  imperial.box(17, 20, 4, 19, 26, 6, (x, y, z) => J(0x6a4328, x, y, z, 67, 0.04));
  imperial.box(3, 24, 4, 19, 26, 6, 0xc9a14a);

  const banner = new VoxelModel(14, 36, 4);
  banner.box(1, 0, 1, 3, 30, 3, (x, y, z) => J(0x6a4328, x, y, z, 19, 0.05));
  banner.box(3, 20, 1, 13, 29, 3, 0x8a1e1e);
  banner.box(3, 22, 1, 12, 27, 3, 0xa82828);
  banner.box(4, 23, 1, 10, 26, 3, 0xd4c07a);

  const chain = new VoxelModel(36, 10, 3);
  for (let x = 0; x < 36; x++) {
    const y = 7 - Math.round(Math.sin((x / 35) * Math.PI) * 6);
    chain.set(x, y, 1, 0x4a4e56);
    chain.set(x, y + 1, 1, 0x8a9098);
  }

  const cloth = new VoxelModel(12, 18, 3);
  cloth.box(0, 0, 1, 2, 16, 3, (x, y, z) => J(0x6a4328, x, y, z, 21, 0.05));
  cloth.box(0, 14, 0, 12, 16, 3, 0x5c4038);
  for (let y = 6; y < 14; y++) {
    const sag = y > 10 ? 1 : 0;
    cloth.box(2, y - sag, 0, 11, y - sag + 1, 2, y % 2 ? 0x8a1e1e : 0xc9a14a);
  }

  const bench = new VoxelModel(16, 8, 6);
  for (const [x, z] of [[0, 0], [14, 0], [0, 4], [14, 4]]) bench.box(x, 0, z, x + 2, 4, z + 2, 0x5c3a22);
  bench.box(0, 4, 0, 16, 6, 6, (x, y, z) => J(x % 2 ? 0xa87244 : 0x8a5a34, x, y, z, 22, 0.05));
  bench.box(0, 6, 4, 16, 8, 6, 0x6a4328);

  const fountain = new VoxelModel(14, 16, 14);
  fountain.box(1, 0, 1, 13, 4, 13, (x, y, z) => stoneAt(x, y, z, 23));
  fountain.carve(3, 2, 3, 11, 4, 11);
  fountain.box(3, 2, 3, 11, 3, 11, 0x3a8ec4);
  fountain.box(6, 3, 6, 8, 11, 8, (x, y, z) => stoneAt(x, y, z, 24));
  fountain.box(5, 11, 5, 9, 13, 9, 0x7ec8ff, true);
  fountain.box(4, 4, 1, 10, 6, 3, 0x8bc34a);
  fountain.box(4, 4, 11, 10, 6, 13, 0x34c759);

  const cart = new VoxelModel(18, 12, 10);
  cart.box(2, 4, 1, 16, 6, 9, (x, y, z) => J(z % 2 ? 0x8a5a34 : 0xa87244, x, y, z, 25, 0.05));
  cart.box(2, 6, 1, 4, 10, 9, 0x6a4328);
  cart.box(14, 6, 1, 16, 10, 9, 0x6a4328);
  cart.box(4, 6, 1, 14, 9, 3, 0x6a4328);
  cart.box(5, 6, 3, 13, 8, 8, 0xc9a14a);
  for (const x of [2, 15]) {
    for (const z of [0, 7]) {
      cart.box(x, 0, z, x + 2, 5, z + 3, 0x3e4552);
      cart.box(x, 1, z + 1, x + 2, 4, z + 2, 0xf2ead0);
    }
  }

  const canopy = new VoxelModel(20, 12, 14);
  for (const [x, z] of [[0, 0], [18, 0], [0, 12], [18, 12]]) {
    canopy.box(x, 0, z, x + 2, 8, z + 2, (a, y, c) => J(0x6a4328, a, y, c, 26, 0.05));
  }
  canopy.box(0, 8, 0, 20, 10, 14, (x, y, z) => (Math.floor(x / 3) % 2 ? 0xffc107 : 0x8bc34a));
  canopy.box(0, 10, 0, 20, 11, 2, 0x455a64);
  canopy.box(0, 10, 12, 20, 11, 14, 0x455a64);

  const board = new VoxelModel(10, 16, 3);
  board.box(4, 0, 1, 6, 10, 3, (x, y, z) => J(0x6a4328, x, y, z, 27, 0.05));
  board.box(0, 9, 0, 10, 15, 2, 0xf2ead0);
  board.box(1, 10, 0, 9, 14, 2, 0x8a1e1e);
  board.box(3, 11, 0, 7, 13, 2, 0xc9a14a);

  const rack = new VoxelModel(14, 16, 4);
  rack.box(0, 0, 1, 2, 14, 3, 0x6a4328);
  rack.box(12, 0, 1, 14, 14, 3, 0x6a4328);
  rack.box(0, 10, 1, 14, 12, 3, 0x5c4038);
  rack.box(3, 4, 1, 5, 13, 2, 0xd7dbe2);
  rack.box(6, 5, 1, 8, 14, 2, 0xc9a14a);
  rack.box(9, 4, 1, 11, 12, 2, 0x8a9098);

  const column = new VoxelModel(6, 30, 6);
  column.box(1, 0, 1, 5, 26, 5, (x, y, z) => stoneAt(x, y, z, 28));
  column.box(0, 24, 0, 6, 28, 6, (x, y, z) => stoneAt(x, y, z, 29));
  column.box(0, 0, 0, 6, 2, 6, (x, y, z) => stoneAt(x, y, z, 30));

  const quay = new VoxelModel(8, 6, 8);
  quay.box(0, 0, 0, 8, 4, 8, (x, y, z) => stoneAt(x, y, z, 31));
  quay.box(1, 4, 1, 7, 6, 7, (x, y, z) => stoneAt(x, y, z, 32));

  const ore = new VoxelModel(10, 6, 8);
  ore.box(1, 0, 1, 8, 3, 6, (x, y, z) => J(0x6e7680, x, y, z, 33, 0.08));
  ore.box(2, 2, 2, 7, 5, 5, (x, y, z) => J(0xa84828, x, y, z, 34, 0.08));
  ore.box(4, 4, 3, 6, 6, 5, 0xd7c4a4);

  const timber = new VoxelModel(16, 8, 8);
  for (let y = 0; y < 6; y += 2) {
    timber.box(1, y, 1 + (y % 4), 15, y + 2, 3 + (y % 4), (x, yy, z) => J(z % 2 ? 0x8a5a34 : 0xc4a06a, x, yy, z, 35, 0.06));
  }

  const mill = new VoxelModel(16, 28, 16);
  mill.box(5, 0, 5, 11, 16, 11, (x, y, z) => stoneAt(x, y, z, 36));
  mill.box(6, 8, 4, 10, 12, 6, 0x87b4d4);
  mill.box(4, 16, 4, 12, 20, 12, (x, y, z) => J(0x8a4030, x, y, z, 37, 0.05));
  mill.box(6, 20, 6, 10, 23, 10, 0x6a3028);
  mill.box(0, 14, 7, 16, 16, 9, 0xf2ead0);
  mill.box(7, 7, 7, 9, 23, 9, 0xf2ead0);
  mill.box(7, 14, 7, 9, 16, 9, 0x5c4038);

  const gardenArch = new VoxelModel(16, 18, 4);
  gardenArch.box(0, 0, 1, 3, 14, 4, (x, y, z) => stoneAt(x, y, z, 38));
  gardenArch.box(13, 0, 1, 16, 14, 4, (x, y, z) => stoneAt(x, y, z, 39));
  gardenArch.box(0, 13, 1, 16, 16, 4, (x, y, z) => stoneAt(x, y, z, 40));
  for (let x = 2; x < 14; x++) {
    const rise = Math.sin(((x - 2) / 12) * Math.PI) * 3;
    gardenArch.box(x, 10 + Math.floor(rise), 1, x + 1, 13 + Math.floor(rise), 3, 0x3c643c);
  }
  gardenArch.box(1, 4, 0, 3, 12, 2, 0x34c759);
  gardenArch.box(13, 4, 0, 15, 12, 2, 0x8bc34a);

  const laundry = new VoxelModel(22, 10, 4);
  laundry.box(0, 0, 1, 2, 8, 3, (x, y, z) => J(0x6a4328, x, y, z, 42, 0.05));
  laundry.box(20, 0, 1, 22, 8, 3, (x, y, z) => J(0x6a4328, x, y, z, 43, 0.05));
  for (let x = 2; x < 20; x++) laundry.set(x, 7, 2, 0xc8b8a0);
  for (const [x, c] of [[3, 0xf2ead0], [7, 0x8a1e1e], [11, 0x3a6a8a], [15, 0xc9a14a]]) {
    laundry.box(x, 3, 1, x + 3, 7, 3, c);
  }

  const birdbath = new VoxelModel(8, 8, 8);
  birdbath.box(3, 0, 3, 5, 5, 5, (x, y, z) => stoneAt(x, y, z, 45));
  birdbath.box(1, 5, 1, 7, 7, 7, (x, y, z) => stoneAt(x, y, z, 46));
  birdbath.carve(2, 6, 2, 6, 7, 6);
  birdbath.box(2, 6, 2, 6, 7, 6, 0x7ec8ff);

  const statue = new VoxelModel(8, 18, 8);
  statue.box(1, 0, 1, 7, 3, 7, (x, y, z) => stoneAt(x, y, z, 47));
  statue.box(3, 3, 3, 5, 10, 5, (x, y, z) => stoneAt(x, y, z, 48));
  statue.box(2, 10, 2, 6, 14, 6, (x, y, z) => stoneAt(x, y, z, 49));
  statue.box(1, 8, 3, 7, 10, 5, (x, y, z) => stoneAt(x, y, z, 50));
  statue.box(3, 14, 3, 5, 17, 5, 0xe8dcc8);

  const ruinGate = new VoxelModel(14, 12, 4);
  ruinGate.box(0, 0, 1, 2, 10, 3, 0x5c4038);
  ruinGate.box(12, 0, 1, 14, 8, 3, 0x6a4328);
  ruinGate.box(2, 6, 1, 10, 8, 3, 0x964b00);
  ruinGate.box(4, 3, 1, 9, 6, 3, 0x7a4a28);
  ruinGate.box(8, 8, 1, 12, 10, 3, 0x964b00);

  const bell = new VoxelModel(6, 16, 6);
  bell.box(2, 0, 2, 4, 10, 4, (x, y, z) => J(0x6a4328, x, y, z, 53, 0.05));
  bell.box(1, 10, 1, 5, 12, 5, 0x5c4038);
  bell.box(2, 6, 2, 4, 10, 4, 0xc9a14a);
  bell.box(1, 7, 1, 5, 9, 5, 0xb8893a);

  const comb = new VoxelModel(6, 8, 6);
  comb.box(2, 0, 2, 4, 4, 4, (x, y, z) => J(0x6a4328, x, y, z, 52, 0.05));
  comb.box(1, 4, 1, 5, 7, 5, 0xffd700);
  comb.box(2, 5, 0, 4, 7, 2, 0xc9a14a);

  const lantern = new VoxelModel(4, 12, 4);
  lantern.box(1, 0, 1, 3, 8, 3, (x, y, z) => J(0x3e4552, x, y, z, 51, 0.04));
  lantern.box(0, 8, 0, 4, 11, 4, 0xffc870, true);
  lantern.box(1, 11, 1, 3, 12, 3, 0x2a241c);

  const planter = new VoxelModel(8, 6, 6);
  planter.box(0, 0, 0, 8, 3, 6, (x, y, z) => J(0x8a5a34, x, y, z, 44, 0.05));
  planter.box(1, 3, 1, 7, 5, 5, 0x2f8a3f);
  planter.box(2, 5, 2, 4, 6, 4, 0xffd23f);
  planter.box(5, 5, 3, 7, 6, 5, 0xff6f91);

  const larder = new VoxelModel(14, 10, 8);
  larder.box(0, 0, 0, 14, 5, 8, (x, y, z) => J(0x8a5a34, x, y, z, 41, 0.05));
  larder.box(1, 5, 1, 6, 8, 6, 0xc45a3a);
  larder.box(7, 5, 1, 12, 7, 4, 0xf2ead0);
  larder.box(8, 7, 2, 11, 9, 4, 0x34c759);
  larder.box(0, 8, 0, 14, 10, 8, (x, y, z) => (x % 3 === 0 ? 0xffc107 : 0x8a1e1e));

  models = {
    wall: bundle([[wall, 0.075, 14, 0, 4]]),
    tower: bundle([[tower, 0.09, 9, 0, 9]]),
    lintel: bundle([[lintel, 0.16, 39, 0, 4]]),
    deck: bundle([[deck, 0.1, 11, 0, 8]]),
    post: bundle([[post, 0.08, 2, 0, 2]]),
    arch: bundle([[arch, 0.09, 11, 0, 4]]),
    seat: bundle([[seat, 0.1, 8, 0, 6]]),
    bay: bundle([[bay, 0.1, 18, 0, 5]]),
    imperial: bundle([[imperial, 0.1, 11, 0, 6]]),
    banner: bundle([[banner, 0.08, 2, 0, 2]]),
    chain: bundle([[chain, 0.12, 0, 0, 1]]),
    cloth: bundle([[cloth, 0.08, 1, 0, 1]]),
    bench: bundle([[bench, 0.08, 8, 0, 3]]),
    fountain: bundle([[fountain, 0.1, 7, 0, 7]]),
    cart: bundle([[cart, 0.09, 9, 0, 5]]),
    canopy: bundle([[canopy, 0.1, 10, 0, 7]]),
    board: bundle([[board, 0.08, 5, 0, 1]]),
    rack: bundle([[rack, 0.08, 7, 0, 2]]),
    column: bundle([[column, 0.08, 3, 0, 3]]),
    quay: bundle([[quay, 0.12, 4, 0, 4]]),
    ore: bundle([[ore, 0.1, 5, 0, 4]]),
    timber: bundle([[timber, 0.09, 8, 0, 4]]),
    mill: bundle([[mill, 0.11, 8, 0, 8]]),
    gardenArch: bundle([[gardenArch, 0.09, 8, 0, 2]]),
    larder: bundle([[larder, 0.09, 7, 0, 4]]),
    laundry: bundle([[laundry, 0.08, 11, 0, 2]]),
    planter: bundle([[planter, 0.08, 4, 0, 3]]),
    birdbath: bundle([[birdbath, 0.08, 4, 0, 4]]),
    statue: bundle([[statue, 0.08, 4, 0, 4]]),
    lantern: bundle([[lantern, 0.08, 2, 0, 2]]),
    ruinGate: bundle([[ruinGate, 0.09, 7, 0, 2]]),
    comb: bundle([[comb, 0.08, 3, 0, 3]]),
    bell: bundle([[bell, 0.08, 3, 0, 3]]),
  };
  return models;
}

function snap(h) {
  return Math.round(h * 2) / 2;
}

function reslope(H, slope) {
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const i = z * W + x;
      const h = H[i];
      let s = 0;
      if (x + 1 < W) s = Math.max(s, Math.abs(H[i + 1] - h));
      if (x > 0) s = Math.max(s, Math.abs(H[i - 1] - h));
      if (z + 1 < W) s = Math.max(s, Math.abs(H[i + W] - h));
      if (z > 0) s = Math.max(s, Math.abs(H[i - W] - h));
      slope[i] = s;
    }
  }
}

function paintCell(data, i, tag) {
  const h = data.H[i];
  const { zone, top, tint, pathMask, forest } = data;
  if (tag === 'path') {
    zone[i] = ZONE.FIELD;
    top[i] = TILE.PATH;
    pathMask[i] = 1;
    forest[i] = 0;
    tint[i * 3] = 0.86;
    tint[i * 3 + 1] = 0.78;
    tint[i * 3 + 2] = 0.7;
    return;
  }
  if (tag === 'cobble') {
    zone[i] = ZONE.FIELD;
    top[i] = TILE.COBBLE;
    pathMask[i] = 1;
    forest[i] = 0;
    const warm = (i % 7) === 0;
    tint[i * 3] = warm ? 0.98 : 0.86;
    tint[i * 3 + 1] = warm ? 0.9 : 0.84;
    tint[i * 3 + 2] = warm ? 0.78 : 0.76;
    return;
  }
  if (tag === 'farm') {
    zone[i] = ZONE.FIELD;
    top[i] = TILE.FARMLAND;
    pathMask[i] = 0;
    forest[i] = 0;
    tint[i * 3] = 0.72;
    tint[i * 3 + 1] = 0.9;
    tint[i * 3 + 2] = 0.42;
    return;
  }
  if (tag === 'meadow') {
    zone[i] = ZONE.FIELD;
    top[i] = TILE.FLOWER_GRASS;
    pathMask[i] = 0;
    forest[i] = 0;
    tint[i * 3] = 0.78;
    tint[i * 3 + 1] = 0.98;
    tint[i * 3 + 2] = 0.52;
    return;
  }
  if (tag === 'sand') {
    zone[i] = ZONE.FIELD;
    top[i] = TILE.SAND;
    pathMask[i] = 1;
    forest[i] = 0;
    tint[i * 3] = 0.92;
    tint[i * 3 + 1] = 0.84;
    tint[i * 3 + 2] = 0.62;
    return;
  }
  if (tag === 'water' || h < 0.35) {
    zone[i] = ZONE.WATER;
    top[i] = TILE.SAND;
    pathMask[i] = 0;
    forest[i] = 0;
    tint[i * 3] = 0.55;
    tint[i * 3 + 1] = 0.72;
    tint[i * 3 + 2] = 0.78;
    return;
  }
  if (h >= 8) {
    zone[i] = ZONE.MOUNTAIN;
    top[i] = TILE.STONE;
    pathMask[i] = 0;
    forest[i] = 0;
    tint[i * 3] = 0.9;
    tint[i * 3 + 1] = 0.91;
    tint[i * 3 + 2] = 0.97;
    return;
  }
  zone[i] = ZONE.FIELD;
  top[i] = TILE.GRASS;
  pathMask[i] = 0;
  forest[i] = Math.min(forest[i] || 0.2, 0.45);
  tint[i * 3] = 0.78;
  tint[i * 3 + 1] = 0.92;
  tint[i * 3 + 2] = 0.58;
}

function borderPin(pin) {
  for (let x = 0; x < W; x++) {
    pin[x] = 1;
    pin[(W - 1) * W + x] = 1;
  }
  for (let z = 0; z < W; z++) {
    pin[z * W] = 1;
    pin[z * W + W - 1] = 1;
  }
}

function shaveNear(data, pin) {
  const H = data.H;
  const dist = new Int16Array(W * W);
  dist.fill(-1);
  const q = [];
  for (let i = 0; i < pin.length; i++) {
    if (!pin[i]) continue;
    dist[i] = 0;
    q.push(i);
  }
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi];
    if (dist[i] >= 20) continue;
    const x = i % W;
    const z = (i / W) | 0;
    for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
      if (nx < 0 || nz < 0 || nx >= W || nz >= W) continue;
      const j = nz * W + nx;
      if (dist[j] >= 0) continue;
      dist[j] = dist[i] + 1;
      q.push(j);
    }
  }
  for (let iter = 0; iter < 28; iter++) {
    for (const j of q) {
      if (pin[j]) continue;
      const x = j % W;
      const z = (j / W) | 0;
      let cap = H[j];
      let floor = -99;
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
        if (nx < 0 || nz < 0 || nx >= W || nz >= W) continue;
        const n = nz * W + nx;
        cap = Math.min(cap, H[n] + 0.5);
        const border = nx === 0 || nz === 0 || nx === W - 1 || nz === W - 1;
        if (pin[n] && border) floor = Math.max(floor, H[n] - 0.5);
      }
      let h = Math.min(H[j], cap);
      if (h < floor) h = floor;
      H[j] = h;
    }
  }
}

function retintChanged(data, before) {
  for (let i = 0; i < data.H.length; i++) {
    if (Math.abs(data.H[i] - before[i]) < 0.02 && !data.pathMask[i]) continue;
    data.H[i] = snap(data.H[i]);
    paintCell(data, i, data.pathMask[i] ? 'path' : 'grass');
  }
  reslope(data.H, data.slope);
}

function cutRoad(data, pin, pts, half, endH) {
  const H = data.H;
  const x0 = Math.round(pts[0][0]);
  const z0 = Math.round(pts[0][1]);
  const startH = H[z0 * W + x0];
  const samples = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
    for (let s = 0; s <= n; s++) samples.push([ax + ((bx - ax) * s) / n, az + ((bz - az) * s) / n, (i + s / n) / (pts.length - 1)]);
  }
  for (const [x, z, t] of samples) {
    const h = lerp(startH, endH, t);
    for (let dz = -half; dz <= half; dz++) {
      for (let dx = -half; dx <= half; dx++) {
        if (dx * dx + dz * dz > half * half) continue;
        const xx = Math.round(x + dx);
        const zz = Math.round(z + dz);
        if (xx <= 0 || zz <= 0 || xx >= W || zz >= W) continue;
        const i = zz * W + xx;
        H[i] = h;
        pin[i] = 1;
        data.pathMask[i] = 1;
      }
    }
  }
}

function fillPad(data, pin, x0, x1, z0, z1) {
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      if (x <= 0 || z < 0 || x >= W || z >= W) continue;
      const i = z * W + x;
      data.H[i] = FLOOR;
      pin[i] = 1;
      data.pathMask[i] = 1;
    }
  }
}

/** A walkable lane from Eastleas and Hayfield onto the west drawbridge. */
export function openGilantreWest(eastleas, hayfield) {
  const beforeE = Float32Array.from(eastleas.H);
  const beforeH = Float32Array.from(hayfield.H);
  const pinE = new Uint8Array(W * W);
  const pinH = new Uint8Array(W * W);
  borderPin(pinE);
  borderPin(pinH);
  cutRoad(eastleas, pinE, [[70, 70], [98, 102], [122, 122], [136, 132]], 6, FLOOR);
  fillPad(eastleas, pinE, 116, W - 1, 122, W - 1);
  shaveNear(eastleas, pinE);
  for (let x = 0; x < W; x++) {
    hayfield.H[x] = eastleas.H[(W - 1) * W + x];
    hayfield.pathMask[x] = eastleas.pathMask[(W - 1) * W + x];
    pinH[x] = 1;
  }
  cutRoad(hayfield, pinH, [[70, 60], [102, 36], [124, 18], [136, 10]], 6, FLOOR);
  fillPad(hayfield, pinH, 116, W - 1, 0, 18);
  shaveNear(hayfield, pinH);
  for (let x = 0; x < W; x++) {
    hayfield.H[x] = eastleas.H[(W - 1) * W + x];
    hayfield.pathMask[x] = eastleas.pathMask[(W - 1) * W + x];
  }
  retintChanged(eastleas, beforeE);
  retintChanged(hayfield, beforeH);
  for (let x = 0; x < W; x++) {
    const s = (W - 1) * W + x;
    hayfield.H[x] = eastleas.H[s];
    hayfield.pathMask[x] = eastleas.pathMask[s];
    hayfield.zone[x] = eastleas.zone[s];
    hayfield.top[x] = eastleas.top[s];
    hayfield.forest[x] = eastleas.forest[s];
    hayfield.tint[x * 3] = eastleas.tint[s * 3];
    hayfield.tint[x * 3 + 1] = eastleas.tint[s * 3 + 1];
    hayfield.tint[x * 3 + 2] = eastleas.tint[s * 3 + 2];
  }
  reslope(hayfield.H, hayfield.slope);
}

function landBy(lands, kind) {
  return lands.find((l) => l.kind === kind);
}

function copySeam(src, dst, dstKind, read, write) {
  for (let n = 0; n < W; n++) {
    const d = write(n);
    const lx = d % W;
    const lz = (d / W) | 0;
    if (locked(dstKind, lx, lz)) continue;
    const s = read(n);
    dst.H[d] = src.H[s];
    dst.zone[d] = src.zone[s];
    dst.top[d] = src.top[s];
    dst.pathMask[d] = src.pathMask[s];
    dst.forest[d] = src.forest[s];
    dst.tint[d * 3] = src.tint[s * 3];
    dst.tint[d * 3 + 1] = src.tint[s * 3 + 1];
    dst.tint[d * 3 + 2] = src.tint[s * 3 + 2];
  }
}

function tagAt(dx, dz, r, original) {
  const bridge = Math.abs(dz) < BRIDGE && Math.abs(dx) > CITY_R && Math.abs(dx) < MOAT_OUT + 6;
  const westRoad = dz > -BRIDGE && dz < BRIDGE && dx < -MOAT_OUT;
  const eastRoad = dz > -BRIDGE && dz < BRIDGE && dx > MOAT_OUT && dx < 78;
  if (r < CITY_R) {
    const ax = dx - (ARENA.x - CX);
    const az = dz - (ARENA.z - CZ);
    if ((ax * ax) / (5.4 * 5.4) + (az * az) / (4.3 * 4.3) < 1) return { h: FLOOR, tag: 'sand' };
    return { h: FLOOR, tag: 'cobble' };
  }
  if (r < MOAT_IN) return { h: FLOOR, tag: 'cobble' };
  if (bridge) return { h: FLOOR, tag: 'path' };
  if (r < MOAT_OUT) return { h: 0, tag: 'water' };
  if (westRoad) {
    const t = clamp((Math.abs(dx) - MOAT_OUT) / 90, 0, 1);
    return { h: lerp(FLOOR, original, t), tag: 'path' };
  }
  if (eastRoad) {
    const t = clamp((dx - MOAT_OUT) / 28, 0, 1);
    return { h: lerp(FLOOR, original, t), tag: t > 0.82 ? 'grass' : 'path' };
  }
  if (r < 56) {
    const t = clamp((r - MOAT_OUT) / 14, 0, 1);
    return { h: lerp(0.9, original, t), tag: 'grass' };
  }
  return null;
}

function locked(kind, lx, lz) {
  if (kind === 'gilantreNw' && (lx === 0 || lz === 0)) return true;
  if (kind === 'gilantreNe' && lz === 0) return true;
  if (kind === 'gilantreSw' && lx === 0) return true;
  return false;
}

/** Flatten the city, dig the moat, and keep the stitched borders. */
export function carveGilantre(lands) {
  const four = ['gilantreNw', 'gilantreNe', 'gilantreSw', 'gilantreSe'].map((k) => landBy(lands, k)).filter(Boolean);
  if (four.length !== 4) return;
  const original = new Map(four.map((l) => [l, Float32Array.from(l.data.H)]));
  const touched = new Map(four.map((l) => [l, new Uint8Array(W * W)]));
  for (const land of four) {
    const data = land.data;
    const base = original.get(land);
    for (let lz = 0; lz < W; lz++) {
      for (let lx = 0; lx < W; lx++) {
        if (locked(land.kind, lx, lz)) continue;
        const dx = land.x0 + lx + 0.5 - CX;
        const dz = land.z0 + lz + 0.5 - CZ;
        const hit = tagAt(dx, dz, Math.hypot(dx, dz), base[lz * W + lx]);
        if (!hit) continue;
        const i = lz * W + lx;
        data.H[i] = hit.h;
        paintCell(data, i, hit.tag);
        touched.get(land)[i] = hit.tag === 'water' ? 2 : 1;
      }
    }
  }
  for (const land of four) {
    const data = land.data;
    const pin = touched.get(land);
    for (let i = 0; i < pin.length; i++) if (locked(land.kind, i % W, (i / W) | 0)) pin[i] = 1;
    shaveNear(data, pin);
    for (let i = 0; i < data.H.length; i++) {
      const lx = i % W;
      const lz = (i / W) | 0;
      if (locked(land.kind, lx, lz)) continue;
      if (!pin[i] && Math.abs(data.H[i] - original.get(land)[i]) < 0.02) continue;
      if (pin[i] === 2) continue;
      data.H[i] = snap(data.H[i]);
      if (!data.pathMask[i] && data.zone[i] !== ZONE.WATER) paintCell(data, i, 'grass');
    }
    reslope(data.H, data.slope);
  }
  const nw = landBy(four, 'gilantreNw');
  const ne = landBy(four, 'gilantreNe');
  const sw = landBy(four, 'gilantreSw');
  const se = landBy(four, 'gilantreSe');
  copySeam(nw.data, ne.data, 'gilantreNe', (n) => n * W + (W - 1), (n) => n * W);
  copySeam(nw.data, sw.data, 'gilantreSw', (n) => (W - 1) * W + n, (n) => n);
  copySeam(ne.data, se.data, 'gilantreSe', (n) => (W - 1) * W + n, (n) => n);
  copySeam(sw.data, se.data, 'gilantreSe', (n) => n * W + (W - 1), (n) => n * W);
  for (const land of four) {
    paintCountry(land);
    reslope(land.data.H, land.data.slope);
  }
}

/** Farm strips on the east prairie and flowers in the west clearings. Heights stay put. */
function paintCountry(land) {
  const data = land.data;
  const seed = GILANTRE_SPECS[land.kind]?.seed || 57;
  for (let z = 2; z < W - 2; z++) {
    for (let x = 2; x < W - 2; x++) {
      const i = z * W + x;
      if (data.pathMask[i] || data.zone[i] !== ZONE.FIELD) continue;
      const h = data.H[i];
      if (h < 1.15 || h > 6.8) continue;
      const dx = land.x0 + x + 0.5 - CX;
      const dz = land.z0 + z + 0.5 - CZ;
      const r = Math.hypot(dx, dz);
      if (r < MOAT_OUT + 1.5 || r > 102) continue;
      if (Math.abs(dz) < 9 && Math.abs(dx) > 16) continue;
      const roll = hash2(x, z, seed);
      if (dx > 12 && roll > 0.38 && ((Math.floor(dx / 7) + Math.floor(dz / 5)) % 2) === 0) paintCell(data, i, 'farm');
      else if (dx < -10 && roll > 0.7) paintCell(data, i, 'meadow');
    }
  }
  for (let i = 0; i < data.zone.length; i++) {
    if (data.zone[i] !== ZONE.FOREST) continue;
    data.tint[i * 3] = Math.min(1, data.tint[i * 3] * 0.82 + 0.06);
    data.tint[i * 3 + 1] = Math.min(1, data.tint[i * 3 + 1] * 0.88);
    data.tint[i * 3 + 2] = Math.min(1, data.tint[i * 3 + 2] * 0.75 + 0.05);
  }
}

/** True when this curtain angle is the east or west drawbridge mouth. */
function gateMouth(a) {
  const rel = Math.atan2(Math.sin(a), Math.cos(a));
  return Math.abs(rel) < 0.2 || Math.abs(Math.abs(rel) - Math.PI) < 0.2;
}

function inArena(x, z, pad) {
  const ax = x - ARENA.x;
  const az = z - ARENA.z;
  return (ax * ax) / ((12 + pad) * (12 + pad)) + (az * az) / ((10 + pad) * (10 + pad)) < 1;
}

function onRoad(x, z) {
  if (Math.abs(z - CZ) < 5.4 && Math.abs(x - CX) < 48) return true;
  if (Math.abs(x - CX) < 4.4 && Math.abs(z - CZ) < 26) return true;
  return false;
}

function onSand(x, z) {
  const ax = x - ARENA.x;
  const az = z - ARENA.z;
  return (ax * ax) / (5.8 * 5.8) + (az * az) / (4.6 * 4.6) < 1;
}

function canDress(world, x, z, r, limit = 28) {
  if (onRoad(x, z) || onSand(x, z)) return false;
  if (Math.hypot(x - CX, z - CZ) > limit) return false;
  return world.free(x, z, r);
}

function drop(world, parts, x, z, rot, scale, r, limit = 28) {
  if (!canDress(world, x, z, r, limit)) return false;
  world.putAt(parts, x, z, rot, scale);
  world.circle(x, z, Math.max(0.2, r * 0.7));
  if (r > 0.35) world.occupy(x, z, r);
  return true;
}

function dressWall(world, parts) {
  const radius = 29.2;
  const seg = 28 * 0.075;
  const count = Math.round((Math.PI * 2 * radius) / (seg * 0.82));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = CX + Math.cos(a) * radius;
    const z = CZ + Math.sin(a) * radius;
    if (gateMouth(a)) continue;
    world.putAt(parts.wall, x, z, a + Math.PI / 2, 1);
    world.circle(x, z, 0.92);
    world.occupy(x, z, 1.05);
    if (i % 7 === 0) {
      const bx = CX + Math.cos(a) * 27.6;
      const bz = CZ + Math.sin(a) * 27.6;
      world.putAt(parts.cloth, bx, bz, a + Math.PI / 2, 1, { y: world.heightAt(bx, bz) + 2.35 });
    }
    if (i % 5 === 2) world.torch(CX + Math.cos(a) * 27.8, CZ + Math.sin(a) * 27.8, 0xffa040);
  }
  for (const sign of [-1, 1]) {
    for (const side of [-1, 1]) {
      const x = CX + sign * Math.cos(0.3) * radius;
      const z = CZ + side * Math.sin(0.3) * radius;
      world.putAt(parts.tower, x, z, sign > 0 ? -Math.PI / 2 : Math.PI / 2, 1);
      world.circle(x, z, 1.05);
      world.occupy(x, z, 1.25);
      world.lightSpots.push({ x, y: world.heightAt(x, z) + 4.6, z, color: 0xffc870 });
      world.putAt(parts.wall, CX + sign * 27.6, CZ + side * 5.05, 0, 1);
      world.circle(CX + sign * 27.6, CZ + side * 5.05, 0.45);
    }
    const lx = CX + sign * 28.4;
    world.putAt(parts.lintel, lx, CZ, Math.PI / 2, 1.38, { y: world.heightAt(lx, CZ) + 2.55 });
    world.putAt(parts.chain, CX + sign * 26.2, CZ - 2.4, sign > 0 ? 0.15 : Math.PI - 0.15, 1, { y: world.heightAt(CX + sign * 26, CZ) + 1.2 });
    world.putAt(parts.chain, CX + sign * 26.2, CZ + 2.4, sign > 0 ? -0.15 : Math.PI + 0.15, 1, { y: world.heightAt(CX + sign * 26, CZ) + 1.2 });
    for (let i = 0; i < 8; i++) {
      const x = CX + sign * (24.5 + i * 2.35);
      world.putAt(parts.deck, x, CZ - 1.5, sign > 0 ? 0 : Math.PI, 1);
      world.putAt(parts.deck, x, CZ + 1.5, sign > 0 ? 0 : Math.PI, 1);
      if (i % 2 === 0) {
        world.putAt(parts.post, x, CZ - 3.6, 0, 1);
        world.putAt(parts.post, x, CZ + 3.6, 0, 1);
        world.circle(x, CZ - 3.6, 0.16);
        world.circle(x, CZ + 3.6, 0.16);
      }
    }
  }
}

function arenaMouth(a) {
  const rel = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
  return Math.abs(rel) < 0.38;
}

/** Points spaced by arc length around an ellipse, so the arches meet. */
function ellipseRing(rx, rz, count) {
  const steps = 720;
  let len = 0;
  let px = rx;
  let pz = 0;
  const samples = [[0, rx, 0, 0]];
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const z = Math.sin(a) * rz;
    len += Math.hypot(x - px, z - pz);
    samples.push([a, x, z, len]);
    px = x;
    pz = z;
  }
  const gap = len / count;
  const pts = [];
  let cursor = 0;
  for (let n = 0; n < count; n++) {
    let pick = samples[0];
    for (const s of samples) if (s[3] >= cursor) { pick = s; break; }
    pts.push({ a: pick[0], x: pick[1], z: pick[2] });
    cursor += gap;
  }
  return pts;
}

function dressArena(world, parts) {
  const rx = 9.05;
  const rz = 7.35;
  let bayN = 0;
  for (const p of ellipseRing(rx, rz, 15)) {
    if (arenaMouth(p.a)) continue;
    const x = ARENA.x + p.x;
    const z = ARENA.z + p.z;
    if (Math.hypot(x - CX, z - CZ) > 28.4) continue;
    world.putAt(parts.bay, x, z, p.a + Math.PI / 2, 1);
    world.circle(x, z, 0.7);
    world.occupy(x, z, 0.9);
    if (bayN % 2 === 0) {
      world.putAt(parts.banner, x, z, p.a, 0.9, { y: world.heightAt(x, z) + 3.1 });
    }
    bayN++;
  }
  const rows = [[6.15, 4.95, 22], [7.45, 6.0, 26]];
  for (const [sx, sz, count] of rows) {
    for (const p of ellipseRing(sx, sz, count)) {
      if (arenaMouth(p.a)) continue;
      const rel = Math.atan2(Math.sin(p.a + Math.PI / 2), Math.cos(p.a + Math.PI / 2));
      if (Math.abs(rel) < 0.4) continue;
      const x = ARENA.x + p.x;
      const z = ARENA.z + p.z;
      world.putAt(parts.seat, x, z, p.a + Math.PI, 1);
      world.circle(x, z, 0.42);
    }
  }
  for (const p of ellipseRing(8.15, 6.55, 10)) {
    if (arenaMouth(p.a)) continue;
    const x = ARENA.x + p.x;
    const z = ARENA.z + p.z;
    if (Math.hypot(x - CX, z - CZ) > 28) continue;
    world.putAt(parts.column, x, z, p.a, 0.85);
    world.circle(x, z, 0.22);
  }
  for (const p of ellipseRing(5.55, 4.45, 18)) {
    if (arenaMouth(p.a)) continue;
    const x = ARENA.x + p.x;
    const z = ARENA.z + p.z;
    world.putAt(parts.quay, x, z, p.a, 0.7);
    world.circle(x, z, 0.16);
  }
  const boxZ = ARENA.z - 6.4;
  world.putAt(parts.imperial, ARENA.x, boxZ, Math.PI, 1);
  world.circle(ARENA.x, boxZ, 0.7);
  world.occupy(ARENA.x, boxZ, 1.05);
  world.putAt(parts.banner, ARENA.x - 2.2, boxZ - 0.4, 0.4, 0.9, { y: world.heightAt(ARENA.x, boxZ) + 1.8 });
  world.putAt(parts.banner, ARENA.x + 2.2, boxZ - 0.4, -0.4, 0.9, { y: world.heightAt(ARENA.x, boxZ) + 1.8 });
  world.putAt(parts.rack, ARENA.x - 3.6, ARENA.z + 6.5, 0.15, 1);
  world.putAt(parts.rack, ARENA.x + 3.6, ARENA.z + 6.5, -0.15, 1);
  world.circle(ARENA.x - 3.6, ARENA.z + 6.5, 0.35);
  world.circle(ARENA.x + 3.6, ARENA.z + 6.5, 0.35);
  world.torch(ARENA.x - 2.4, ARENA.z + 7.1, 0xffa040);
  world.torch(ARENA.x + 2.4, ARENA.z + 7.1, 0xffc870);
}

function house(world, spec) {
  const parts = buildHouse({
    w: spec.w,
    d: spec.d,
    wh: spec.wh || 22,
    seed: spec.seed,
    wall: spec.wall,
    roof: spec.roof,
    shutters: spec.shutters,
    sign: spec.sign || null,
    pitch: spec.pitch || 1.05,
    chimney: spec.chimney !== false,
  });
  world.putAt(parts, spec.x, spec.z, spec.rot || 0, 1);
  const turned = spec.rot && Math.abs(spec.rot) > 0.2;
  const hw = (turned ? spec.d : spec.w) * 0.42;
  const hd = (turned ? spec.w : spec.d) * 0.42;
  world.box(spec.x, spec.z, hw, hd);
  world.occupy(spec.x, spec.z, Math.max(hw, hd) + 0.4);
}

function dressTown(world, parts) {
  const m = world.models;
  const roofs = {
    rust: [0xa8452f, 0xb9553a, 0x93402c, 0xc66443, 0x7d3a2b],
    gold: [0xc9a14a, 0xd9b45a, 0xb88f3c, 0xe6c76a, 0xa8802f],
    moss: [0x4f7f3a, 0x5d9444, 0x44702f, 0x6aa650, 0x3d5f2b],
    slate: [0x5c6370, 0x6a7280, 0x4a5160, 0x7d8694, 0x3e4552],
  };
  house(world, { x: 422, z: 120, w: 8, d: 5, seed: 57, wall: 0x8d4038, roof: roofs.rust, shutters: 0xd4c07a, sign: 'GILANTRE', pitch: 1.02 });
  house(world, { x: 408, z: 158, w: 5, d: 4, seed: 58, wall: 0x6e4634, roof: roofs.slate, shutters: 0x8d4038, rot: 0 });
  house(world, { x: 436, z: 156, w: 4, d: 5, seed: 59, wall: 0xc4b49a, roof: roofs.gold, shutters: 0x3f6f86, rot: Math.PI });
  house(world, { x: 418, z: 136, w: 4, d: 4, seed: 60, wall: 0x9a6a3c, roof: roofs.moss, shutters: 0xa8452f });
  house(world, { x: 454, z: 146, w: 4, d: 4, seed: 61, wall: 0x8a5a34, roof: roofs.rust, shutters: 0x4a8c86, rot: -Math.PI / 2 });

  const sx = GILANTRE_SPOTS.smithy.x;
  const sz = GILANTRE_SPOTS.smithy.z;
  const sy = world.heightAt(sx, sz);
  const g = new THREE.Group();
  g.name = 'ironhaven';
  g.position.set(sx, sy, sz);
  g.rotation.y = Math.PI;
  for (const p of buildSmithy(57)) {
    const mat = p.kind === 'solid' ? world.mats.solid : p.kind === 'glow' ? world.mats.glow : world.mats.window;
    const mesh = new THREE.Mesh(p.geo, mat);
    mesh.castShadow = p.kind === 'solid';
    mesh.receiveShadow = p.kind === 'solid';
    g.add(mesh);
  }
  world.group.add(g);
  world.box(sx, sz, 2.4, 2.1);
  world.occupy(sx, sz, 2.8);
  world.lightSpots.push({ x: sx, y: sy + 1.6, z: sz - 1.4, color: 0xff9a3a });
  world.gilantreSmithy = { x: sx, y: sy, z: sz - 1.6, name: 'Ironhaven', group: g };

  const fx = GILANTRE_SPOTS.forge.x;
  const fz = GILANTRE_SPOTS.forge.z;
  const fy = world.heightAt(fx, fz);
  world.putAt(m.forge, fx, fz, 0.4, 1.15);
  world.box(fx, fz, 0.85, 1.15);
  world.putAt(m.anvil, fx + 1.6, fz + 0.2, 0.5, 1);
  world.circle(fx + 1.6, fz + 0.2, 0.4);
  world.lightSpots.push({ x: fx + 0.4, y: fy + 0.9, z: fz, color: 0xff7a22 });
  world.gilantreForge = { x: fx, y: fy, z: fz, name: 'Ironhaven Forge' };

  const stalls = [
    { spot: GILANTRE_SPOTS.mine, seed: 4, awning: [0x6e7680, 0xd7c4a4], goods: 'pick', rot: 0 },
    { spot: GILANTRE_SPOTS.wood, seed: 5, awning: [0x6a8a3a, 0xe7d3a3], goods: 'timber', rot: 0 },
    { spot: GILANTRE_SPOTS.potion, seed: 6, awning: [0x5b3d86, 0xe4d4f6], goods: 'potion', rot: Math.PI },
  ];
  for (const s of stalls) {
    world.putAt(buildStall(s.seed, s.awning, s.goods), s.spot.x, s.spot.z, s.rot, 1);
    world.box(s.spot.x, s.spot.z, 1.8, 1.3);
    world.occupy(s.spot.x, s.spot.z, 2);
  }
  const px = GILANTRE_SPOTS.potion.x;
  const pz = GILANTRE_SPOTS.potion.z - 1.8;
  const py = world.heightAt(px, pz);
  world.putAt(m.cauldron, px, pz, 0.2, 1.1);
  world.circle(px, pz, 0.4);
  world.lightSpots.push({ x: px, y: py + 0.7, z: pz, color: 0x5dffb0 });
  world.gilantreAlchemy = { x: px, y: py, z: pz, name: "Lyra's Stall" };

  drop(world, parts.fountain, 418, 132, 0.3, 1, 1.15);
  drop(world, parts.gardenArch, 424, 128, 0.2, 1, 0.7);
  drop(world, parts.larder, 436, 128, 0.4, 1, 0.85);
  drop(world, parts.laundry, 428, 158, 0.15, 1, 0.45);
  drop(world, parts.birdbath, 412, 132, 0.4, 1, 0.4);
  drop(world, parts.bell, 416, 124, 0.2, 1, 0.35);
  const statueA = 2.3;
  drop(world, parts.statue, CX + Math.cos(statueA) * 31, CZ + Math.sin(statueA) * 31, statueA, 1, 0.45, 33);
  for (const x of [420, 432, 444]) drop(world, parts.lantern, x, 137.6, 0, 1, 0.25);
  for (const [x, z] of [[416, 140], [432, 140], [446, 148], [420, 154], [438, 154]]) {
    drop(world, parts.planter, x, z, 0.2, 1, 0.35);
  }
  drop(world, parts.canopy, 430, 130, 0.15, 1, 1.3);
  drop(world, parts.cart, 456, 156, -0.6, 1, 1.15);
  drop(world, parts.board, 412, 138, -0.5, 1, 0.35);
  drop(world, parts.board, 452, 150, 0.8, 1, 0.35);
  drop(world, parts.ore, GILANTRE_SPOTS.mine.x + 2.2, GILANTRE_SPOTS.mine.z + 1.4, 0.4, 1, 0.55, 34);
  drop(world, parts.timber, GILANTRE_SPOTS.wood.x + 2.4, GILANTRE_SPOTS.wood.z - 1.2, 0.2, 1, 0.6, 32);
  for (const x of [414, 424, 438, 448]) {
    drop(world, parts.bench, x, 137, 0, 1, 0.55);
    drop(world, parts.bench, x, 151, Math.PI, 1, 0.55);
  }
  house(world, { x: 422, z: 168, w: 4, d: 3, seed: 71, wall: 0xc4b49a, roof: roofs.gold, shutters: 0x8a1e1e });
  house(world, { x: 440, z: 168, w: 4, d: 3, seed: 72, wall: 0x6e4634, roof: roofs.slate, shutters: 0x34c759, rot: Math.PI });

  world.putAt(m.well, CX, CZ + 2.2, 0.2, 1);
  world.circle(CX, CZ + 2.2, 0.85);
  world.occupy(CX, CZ + 2.2, 1.1);
  world.putAt(m.sign, GILANTRE_SPOTS.westgate.x - 2, CZ - 5.2, -0.4, 1.15);
  world.putAt(m.sign, GILANTRE_SPOTS.eastgate.x + 2, CZ - 5.2, 0.6, 1.15);

  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    world.lamp(CX + i * 8, CZ - 5.4);
    world.lamp(CX + i * 8, CZ + 5.4);
    world.lamp(CX - 5.4, CZ + i * 8);
    world.lamp(CX + 5.4, CZ + i * 8);
  }
  world.lamp(ARENA.x - 3.4, ARENA.z + 12.2);
  world.lamp(ARENA.x + 3.4, ARENA.z + 12.2);

  for (let n = 0; n < 14; n++) {
    const x = 414 + hash2(n, 2, 57) * 36;
    const z = 134 + hash2(n, 5, 57) * 22;
    if (Math.hypot(x - CX, z - CZ) > 22) continue;
    if (inArena(x, z, 1)) continue;
    if (Math.abs(x - CX) < 3 || Math.abs(z - CZ) < 3) continue;
    if (!world.free(x, z, 0.6)) continue;
    const roll = hash2(n, 1, 57);
    if (roll > 0.66) world.putAt(m.crate[n % 2], x, z, roll * 4, 1);
    else if (roll > 0.33) world.putAt(m.barrel[n % 2], x, z, roll * 4, 1);
    else world.putAt(m.pots[n % 4], x, z, roll * 4, 1);
    world.circle(x, z, 0.32);
  }
  for (let n = 0; n < 18; n++) {
    const a = hash2(n, 3, 58) * Math.PI * 2;
    const rad = 8 + hash2(n, 6, 58) * 12;
    const x = CX + Math.cos(a) * rad;
    const z = CZ + Math.sin(a) * rad;
    if (inArena(x, z, 0)) continue;
    if (!world.free(x, z, 0.4)) continue;
    world.putAt(n % 2 ? m.flowers[n % m.flowers.length] : m.tufts[n % m.tufts.length], x, z, a, 1, { cover: true });
  }
}

function dressWild(world, land) {
  const m = world.models;
  const spec = GILANTRE_SPECS[land.kind];
  const data = land.data;
  let trees = 0;
  for (let n = 0; n < 280 && trees < 70; n++) {
    const lx = 8 + Math.floor(hash2(n, 2, spec.seed) * (W - 16));
    const lz = 8 + Math.floor(hash2(n, 5, spec.seed) * (W - 16));
    const i = lz * W + lx;
    const h = data.H[i];
    if (data.pathMask[i] || data.zone[i] === ZONE.WATER || h < 1.15 || h > 7.4) continue;
    const x = land.x0 + lx + 0.5;
    const z = land.z0 + lz + 0.5;
    if (Math.hypot(x - CX, z - CZ) < 48) continue;
    if (!world.free(x, z, 1.5)) continue;
    const roll = hash2(n, 4, spec.seed);
    const wooded = (data.forest[i] || 0) > 0.28;
    if (!wooded) {
      if (data.top[i] === TILE.FARMLAND && roll > 0.4) {
        world.putAt(m.wheat[n % m.wheat.length], x, z, roll * 4, 1, { cover: true });
      } else if (data.top[i] === TILE.FLOWER_GRASS || roll > 0.55) {
        const parts = roll > 0.8 ? m.flowers[n % m.flowers.length] : m.tuftsGold[n % m.tuftsGold.length];
        world.putAt(parts, x, z, roll * 6, 1, { cover: true });
      } else if (roll < 0.12) {
        world.putAt(m.rocks[n % m.rocks.length], x, z, roll * 5, 0.8 + roll, { cover: true });
      }
      continue;
    }
    if (roll < 0.22) {
      const floor = roll < 0.08 ? m.ferns[n % m.ferns.length] : roll < 0.14 ? m.bushes[n % m.bushes.length] : m.mushRed[n % m.mushRed.length];
      world.putAt(floor, x + 0.8, z - 0.4, roll * 4, 1, { cover: true });
    }
    if (roll > 0.9 && world.free(x + 1.4, z + 0.6, 0.4)) {
      world.putAt(roll > 0.95 ? m.logs[n % m.logs.length] : m.stumps[n % m.stumps.length], x + 1.4, z + 0.6, roll * 3, 1);
      world.circle(x + 1.4, z + 0.6, 0.3);
    }
    let parts = m.oaks[n % m.oaks.length];
    if (roll > 0.78) parts = m.pines[n % m.pines.length];
    else if (roll > 0.62) parts = m.blossoms[n % m.blossoms.length];
    world.putAt(parts, x, z, roll * 6, 0.66 + hash2(n, 1, spec.seed) * 0.36);
    world.circle(x, z, 0.38);
    world.occupy(x, z, 1.25);
    world.treeDots.push({ x, z });
    trees++;
  }
  for (let n = 0; n < 36; n++) {
    const a = hash2(n, 8, spec.seed) * Math.PI * 2;
    const rad = MOAT_IN + 0.8 + hash2(n, 3, spec.seed) * (MOAT_OUT - MOAT_IN - 1.6);
    const x = CX + Math.cos(a) * rad;
    const z = CZ + Math.sin(a) * rad;
    if (x < land.x0 + 1 || z < land.z0 + 1 || x >= land.x0 + W - 1 || z >= land.z0 + W - 1) continue;
    if (Math.abs(z - CZ) < BRIDGE + 1.4 && Math.abs(x - CX) > 20) continue;
    if (world.heightAt(x, z) > 0.45) continue;
    world.putAt(m.reeds[n % m.reeds.length], x, z, a, 1, { y: 0.36, cover: true });
    if (n % 3 === 0) world.putAt(m.lily[n % m.lily.length], x + 0.8, z - 0.5, a, 1, { y: 0.22, cover: true });
  }
  for (let n = 0; n < 48; n++) {
    const a = (n / 48) * Math.PI * 2;
    const rad = n % 2 === 0 ? MOAT_IN - 0.4 : MOAT_OUT + 0.6;
    const x = CX + Math.cos(a) * rad;
    const z = CZ + Math.sin(a) * rad;
    if (Math.abs(z - CZ) < BRIDGE + 2 && Math.abs(x - CX) > 18) continue;
    if (x < land.x0 + 2 || z < land.z0 + 2 || x >= land.x0 + W - 2 || z >= land.z0 + W - 2) continue;
    world.putAt(partsQuay(world), x, z, a, 1, { y: 0.15 });
    world.circle(x, z, 0.45);
  }
}

function partsQuay(world) {
  return cityModels().quay;
}

function mushrooms(world, x, z) {
  const m = world.models;
  const kinds = [...m.mushRed, ...m.mushBrown, ...m.mushPurple, ...m.bigMush];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const px = x + Math.cos(a) * (1.2 + (i % 3) * 0.45);
    const pz = z + Math.sin(a) * (1.2 + (i % 3) * 0.45);
    if (Math.abs(pz - CZ) < 8) continue;
    world.putAt(kinds[i % kinds.length], px, pz, a, i % 3 === 0 ? 1.15 : 0.9, { cover: true });
  }
}

function cluster(world, x, z, n, scale) {
  const m = world.models;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = 2.2 + (i % 3);
    const px = x + Math.cos(a) * rad;
    const pz = z + Math.sin(a) * rad;
    if (!world.free(px, pz, 1.1)) continue;
    world.putAt(i % 2 ? m.oaks[i % m.oaks.length] : m.pines[i % m.pines.length], px, pz, a, scale);
    world.circle(px, pz, 0.36);
    world.occupy(px, pz, 1.15);
    world.treeDots.push({ x: px, z: pz });
  }
}

const ROAM = [
  { x0: 424, z0: 136, x1: 442, z1: 150 },
  { x0: 416, z0: 140, x1: 430, z1: 152 },
];

const PEOPLE = [
  {
    id: 'grimbold',
    name: 'Grimbold Ironfist',
    title: 'Blacksmith',
    spot: 'grimbold',
    service: 'forge',
    x: 418, z: 156, yaw: 0.4,
    look: { skin: 0xc58a5e, hair: 0x1a120e, hairStyle: 'short', beard: true, tunic: 0x6a3030, sleeve: 0x4a4038, apron: 0x2e2c2a, pants: 0x2a2420, boots: 0x1c1612, bracer: true, seed: 57 },
    lines: [
      'Ironhaven is the hall. The anvil out front is mine. Bring bars if you want a weapon, the same as Bram asks on the pit road.',
      'The wall keeps the prairie out. It does not keep a bad edge out. Mind the heat.',
    ],
  },
  {
    id: 'ragnar',
    name: 'Ragnar Stonebeard',
    title: 'Mining tools',
    spot: 'ragnar',
    x: 408, z: 129.2, yaw: 2.4,
    look: { skin: 0xd0a078, hair: 0x8a8e94, hairStyle: 'short', beard: true, tunic: 0x4a5560, sleeve: 0x6a5438, pants: 0x3a342c, boots: 0x2a241c, hat: 'cap', hatColor: 0x3a4048, seed: 58 },
    lines: [
      'Picks, lanterns, and a head that stays on. The iron on this bench is for rock, not for boasting.',
      'Greyrock, Deepwell, the ash country. A pick from Gilantre works in all of them. Yours already does, if you have been swinging it.',
    ],
  },
  {
    id: 'elara',
    name: 'Elara Moonwhisper',
    title: 'Woodworking tools',
    spot: 'elara',
    x: 424, z: 125.4, yaw: 1.2,
    look: { skin: 0xf0c8a4, hair: 0x6a3a28, hairStyle: 'short', hairLen: 8, tunic: 0x3f6a38, sleeve: 0xe4d2b0, pants: 0x4a3a2c, boots: 0x3a2a1c, belt: true, seed: 59, eye: 0x3a6a40 },
    lines: [
      'The axe on the bench is for trees. Birch and oak to start, maple when your arm learns the difference.',
      'I mark the timber before anyone else claims it. The east road has one with my cut in the bark.',
    ],
  },
  {
    id: 'lyra',
    name: 'Lyra Swiftfoot',
    title: 'Potions',
    spot: 'lyra',
    service: 'alchemy',
    x: 450, z: 158.6, yaw: -1.6,
    look: { skin: 0xe8c0a0, hair: 0x243044, hairStyle: 'short', hairLen: 7, tunic: 0x3a2460, sleeve: 0x4c3278, apron: 0x1d3a32, pants: 0x241c30, boots: 0x1a141c, hat: 'hood', hatColor: 0x2a1848, belt: true, seed: 60, eye: 0x3ecf7a },
    lines: [
      'Draughts and philters. The fumes are the same work Lira does. I dry the herbs she does not have time for.',
      'The reed on the east bank is the one I cut. Look, do not pull. The water tells you if the moat is still clean.',
    ],
  },
  {
    id: 'marcellus',
    name: 'Marcellus Valerius',
    title: 'Arena master',
    spot: 'marcellus',
    x: 446, z: 142.4, yaw: -0.2,
    look: { skin: 0xe0b090, hair: 0x2a2218, hairStyle: 'short', tunic: 0xf2efe6, sleeve: 0xe6e0d4, vest: true, strap: 0x8a1e1e, pants: 0x4a3030, boots: 0x2a1c18, belt: true, seed: 61, eye: 0x4a3828 },
    lines: [
      'The bowl is older than the wall. Walk onto the sand if you want to know whether the gate turns you around.',
      'Steel and skill. The crowd will tell you which one you brought. I only keep the doors.',
    ],
  },
  {
    id: 'thrain',
    name: 'Thrain Blackwood',
    title: 'Citizen',
    spot: 'thrain',
    x: 430, z: 140, yaw: 1.1,
    roam: ROAM,
    look: { skin: 0xc89870, hair: 0x241810, hairStyle: 'short', beard: true, tunic: 0x3a3a40, sleeve: 0x5a4030, pants: 0x2c2824, boots: 0x1e1814, seed: 62 },
    lines: [
      'The guards count heads at the bridges. They do not count grudges.',
      'Stay on the cobbles after dark. The moat looks shallow and it is not.',
    ],
  },
  {
    id: 'elwynn',
    name: 'Elwynn Starseeker',
    title: 'Citizen',
    spot: 'elwynn',
    x: 436, z: 146, yaw: -0.6,
    roam: ROAM,
    look: { skin: 0xf2d0b0, hair: 0xd8d2c8, hairStyle: 'short', hairLen: 7, tunic: 0x2f4f6a, sleeve: 0xe8dcc8, pants: 0x3a342c, boots: 0x2a2420, hat: 'hood', hatColor: 0x243848, seed: 63 },
    lines: [
      'There is stone under the arena that was not cut by us. I have not found the stair, and Marcellus will not lend me a lamp.',
      'If you stand on the sand, look at the lowest course of blocks. The joints are older than the seats.',
    ],
  },
  {
    id: 'gwyneth',
    name: 'Gwyneth Earthsong',
    title: 'Citizen',
    spot: 'gwyneth',
    x: 428, z: 148, yaw: 2.2,
    roam: ROAM,
    look: { skin: 0xe8b892, hair: 0x6a4428, hairStyle: 'short', hairLen: 8, tunic: 0xb8452f, sleeve: 0xf0e2c8, pants: 0x3d4f78, boots: 0x3a2a1f, hat: 'straw', seed: 64 },
    lines: [
      'The fields outside the west bridge are thin this season. Something in the grass is eating the roots.',
      'Walk out to the trees and tell me if the soil is bare. I will not cross the moat with a basket.',
    ],
  },
  {
    id: 'osta',
    name: 'Osta',
    title: 'Gate guard',
    spot: 'osta',
    x: 412, z: 138.2, yaw: -0.8,
    look: { skin: 0xd8b090, hair: 0x3a2a20, hairStyle: 'short', tunic: 0x8a9098, sleeve: 0x6a5438, pants: 0x3a342c, boots: 0x2a221c, hat: 'cap', hatColor: 0x4a4038, bracer: true, seed: 65 },
    lines: ['West bridge is down. Do not try the moat. The reeds hide the drop.', 'Name and business, if you have either. Gilantre counts who comes in.'],
  },
  {
    id: 'bren',
    name: 'Bren',
    title: 'Gate guard',
    spot: 'bren',
    x: 452, z: 138.2, yaw: -2.4,
    look: { skin: 0xc8a080, hair: 0x241c16, hairStyle: 'short', beard: true, tunic: 0x8a9098, sleeve: 0x5a4634, pants: 0x2e2a26, boots: 0x1c1612, hat: 'cap', hatColor: 0x3e3a36, seed: 66 },
    lines: ['East bridge. Prairie that way, forest if you keep north of the road.', 'The arena is inside, on the north side of the well. Marcellus is loud enough to follow.'],
  },
];

function placePeople(world) {
  if (!world.npcSpots) world.npcSpots = {};
  world.townsfolk = [];
  for (const p of PEOPLE) {
    world.npcSpots[p.spot] = { x: p.x, z: p.z };
    world.townsfolk.push({
      id: p.id,
      name: p.name,
      title: p.title,
      spot: p.spot,
      yaw: p.yaw,
      service: p.service,
      roam: p.roam,
      look: p.look,
      lines: p.lines,
    });
  }
}

/** Buildings, the wall, the arena, and the prairie and forest outside it. */
export function dressGilantre(world) {
  if (!world.lands?.some((l) => l.kind === 'gilantreNw')) return;
  const parts = cityModels();
  dressWall(world, parts);
  dressArena(world, parts);
  dressTown(world, parts);
  for (const land of world.lands) if (String(land.kind || '').startsWith('gilantre')) dressWild(world, land);
  cluster(world, GILANTRE_SPOTS.grove.x, GILANTRE_SPOTS.grove.z, 9, 0.95);
  const m = world.models;
  if (world.free(502, 112, 1.4) && Math.abs(112 - CZ) > 10) {
    world.putAt(cityModels().mill, 502, 112, 0.6, 1);
    world.circle(502, 112, 0.7);
    world.occupy(502, 112, 1.3);
  }
  mushrooms(world, 360, 108);
  mushrooms(world, 348, 156);
  const kit = cityModels();
  for (const [x, z, rot] of [[376, 150, 0.4], [358, 96, -0.6]]) {
    if (!world.free(x, z, 0.8) || Math.abs(z - CZ) < 8) continue;
    world.putAt(kit.ruinGate, x, z, rot, 1);
    world.circle(x, z, 0.4);
    world.occupy(x, z, 0.7);
  }
  for (const [x, z] of [[354, 120], [342, 140], [370, 86], [336, 168], [382, 170]]) {
    if (Math.abs(z - CZ) < 8) continue;
    world.putAt(kit.comb, x, z, 0.5, 1, { cover: true });
  }
  for (const [x, z] of [[350, 132], [366, 158], [338, 112]]) {
    if (!world.free(x, z, 0.4)) continue;
    world.putAt(m.crystals[0], x, z, 0.3, 0.7);
    world.circle(x, z, 0.2);
  }
  if (world.free(374, 122, 0.6)) {
    world.putAt(cityModels().timber, 374, 122, 0.7, 0.65);
    world.circle(374, 122, 0.35);
  }
  if (world.free(368, 118, 1.6)) {
    world.putAt(m.giants[0], 368, 118, 0.8, 1.15);
    world.circle(368, 118, 0.7);
    world.occupy(368, 118, 1.5);
    world.treeDots.push({ x: 368, z: 118 });
  }
  if (world.free(492, 128, 0.8)) {
    world.putAt(m.scarecrow, 492, 128, 0.4, 1);
    world.circle(492, 128, 0.35);
    world.occupy(492, 128, 0.5);
  }
  world.fenceLine(478, 108, 512, 108);
  world.fenceLine(512, 108, 512, 124);
  world.fenceLine(512, 124, 478, 124);
  world.fenceLine(478, 124, 478, 108);
  for (const [x, z] of [[486, 122], [498, 136], [504, 118]]) {
    if (!world.free(x, z, 0.6) || Math.abs(z - CZ) < 8) continue;
    world.putAt(m.hay, x, z, 0.5, 1.2);
    world.circle(x, z, 0.4);
  }
  const oak = GILANTRE_SPOTS.oak;
  world.putAt(world.models.oaks[0], oak.x, oak.z, 0.4, 1.2);
  world.circle(oak.x, oak.z, 0.45);
  world.occupy(oak.x, oak.z, 1.3);
  world.treeDots.push({ x: oak.x, z: oak.z });
  world.putAt(world.models.sign, oak.x + 1.5, oak.z + 0.4, 0.8, 1.05);
  placePeople(world);
  world.gilantre = { ...GILANTRE_SPOTS };
}
