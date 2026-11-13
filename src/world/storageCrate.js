import { VoxelModel, shade } from '../engine/voxel.js';
import { J } from './models.js';

/**
 * The Oakhollow storage crate. Same voxel scale, timber, stone and teal shingles as the guild hall.
 * Body, lid and pennant are separate so the lid can hinge open and the cloth can move in the wind.
 */

const SIZE = 0.0625;
const SX = 46;
const SY = 34;
const SZ = 34;
const BEAM = 0x3a2415;
const PLANK = 0x93603a;
const PLANK_LIT = 0x9a6a3c;
const IRON = 0x3a3d44;
const GOLD = 0xe6b73c;
const ROOF = [0x3f7d79, 0x4a8c86, 0x356b68, 0x59a19a, 0x8a4b38];
const STONE = [0x8a8f96, 0x9aa0a6, 0x7c8288, 0xa6a39a];

const FONT = {
  S: ['.XXX.', 'X...X', 'X....', '.XXX.', '....X', 'X...X', '.XXX.'],
  T: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'],
  O: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  R: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'],
  E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
};

function partsOf(M, ox, oy, oz) {
  const g = M.build(SIZE, ox, oy, oz);
  const parts = [];
  for (const kind of ['solid', 'glow', 'window']) if (g[kind]) parts.push({ geo: g[kind], kind });
  return parts;
}

function stoneAt(x, y, z, seed) {
  const row = Math.floor(y / 2);
  const col = Math.floor((x + z + (row % 2) * 2) / 4);
  return J(STONE[Math.abs(col * 7 + row) % 4], x, y, z, seed, 0.06);
}

function plankAt(x, y, z, seed, inner) {
  if (y === 12 || y === 13 || y === 22 || y === 23) return J(IRON, x, y, z, seed, 0.05);
  const row = Math.floor((y - 6) / 2);
  let c = row % 2 ? PLANK_LIT : PLANK;
  if ((x + z + row) % 9 === 0) c = shade(c, 0.78);
  if (inner) c = shade(0x4a3018, 0.9);
  return J(c, x, y, z, seed, 0.06);
}

/** Letters sit one voxel proud of the front wall. */
function paintSign(M, seed) {
  const word = 'STORE';
  const bw = word.length * 6 + 4;
  const bx0 = Math.floor((SX - bw) / 2);
  const by0 = 14;
  const fz = SZ - 1;
  M.box(bx0 - 1, by0 - 1, fz - 2, bx0 + bw + 1, by0 + 11, fz + 1, (x, y, z) => J(y % 4 === 0 ? 0x4a2c16 : 0x5a3820, x, y, z, seed, 0.06));
  M.box(bx0 - 2, by0 - 2, fz - 2, bx0 + bw + 2, by0 - 1, fz + 1, 0x2d1c10);
  M.box(bx0 - 2, by0 + 11, fz - 2, bx0 + bw + 2, by0 + 12, fz + 1, 0x2d1c10);
  M.box(bx0 - 2, by0 - 2, fz - 2, bx0 - 1, by0 + 12, fz + 1, 0x2d1c10);
  M.box(bx0 + bw + 1, by0 - 2, fz - 2, bx0 + bw + 2, by0 + 12, fz + 1, 0x2d1c10);
  word.split('').forEach((ch, i) => {
    const g = FONT[ch];
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 5; c++)
        if (g[r][c] === 'X') M.set(bx0 + 2 + i * 6 + c, by0 + 9 - r, fz, J(0xe7d3a3, c, r, i, seed, 0.05));
  });
}

function sideWindow(M, seed, xFace, dir) {
  const wx = 14;
  const wy = 15;
  const ww = 8;
  const hh = 8;
  for (let a = -1; a <= ww; a++) {
    for (let b = -1; b <= hh; b++) {
      const edge = a < 0 || a >= ww || b < 0 || b >= hh;
      const x = xFace + dir * (edge ? 0 : -1);
      const y = wy + b;
      const z = wx + a;
      if (edge) {
        M.set(x, y, z, 0x2d1c10);
        M.set(x + dir, y, z, 0x3a2415);
      } else {
        const mullion = a === 3 || a === 4 || b === 3 || b === 4;
        M.set(x, y, z, mullion ? 0x2d1c10 : 0xffc866, mullion ? false : 2);
      }
    }
  }
  for (const lo of [-4, ww + 1]) {
    for (let a = 0; a < 3; a++)
      for (let b = -1; b <= hh; b++) {
        const col = J(b % 3 === 0 ? shade(ROOF[0], 0.85) : ROOF[1], a, b, wx, seed, 0.06);
        M.set(xFace + dir, wy + b, wx + lo + a, col);
      }
  }
  for (let a = -1; a <= ww; a++) {
    const fc = [0xff6f91, 0xffd23f, 0xffffff, 0xb678f0][Math.abs(a + 4) % 4];
    M.set(xFace + dir, wy - 2, wx + a, J(0x6b4325, a, 0, wx, seed, 0.06));
    M.set(xFace + dir * 2, wy - 1, wx + a, a % 2 ? fc : 0x3f9a4a);
  }
}

function interior(M, seed) {
  M.box(8, 6, 8, 18, 8, 16, (x, y, z) => J(y === 7 ? 0x3f7d79 : 0x2f6a66, x, y, z, seed, 0.05));
  M.box(20, 6, 9, 28, 9, 14, (x, y, z) => J(y === 8 ? GOLD : shade(GOLD, 0.82), x, y, z, seed, 0.04));
  M.box(30, 6, 10, 34, 12, 14, (x, y, z) => J(0x6a8f96, x, y, z, seed, 0.05));
  M.box(31, 9, 11, 33, 11, 13, 0x5dffb0, true);
  M.box(12, 6, 20, 22, 7, 28, (x, y, z) => J(0x5a3820, x, y, z, seed, 0.06));
}

export function buildStorageCrate(seed = 7) {
  const body = new VoxelModel(SX, 44, SZ);
  const ox = SX / 2;
  const oz = SZ / 2;

  body.box(0, 0, 0, SX, 4, SZ, (x, y, z) => stoneAt(x, y, z, seed));
  body.box(1, 4, 1, SX - 1, 6, SZ - 1, (x, y, z) => J(BEAM, x, y, z, seed, 0.07));

  const wall = (x0, z0, x1, z1, inner) => {
    body.box(x0, 6, z0, x1, 27, z1, (x, y, z) => plankAt(x, y, z, seed, inner(x, z)));
  };
  wall(2, 2, SX - 2, 6, (_x, z) => z >= 4);
  wall(2, SZ - 6, SX - 2, SZ - 2, (_x, z) => z < SZ - 5);
  wall(2, 6, 6, SZ - 6, (x) => x >= 4);
  wall(SX - 6, 6, SX - 2, SZ - 6, (x) => x < SX - 5);

  for (const [x0, z0] of [[1, 1], [SX - 7, 1], [1, SZ - 7], [SX - 7, SZ - 7]]) {
    body.box(x0, 4, z0, x0 + 6, 29, z0 + 6, (x, y, z) => J(y % 8 === 0 ? shade(BEAM, 1.15) : BEAM, x, y, z, seed, 0.07));
  }
  body.box(2, 26, 2, SX - 2, 28, SZ - 2, (x, y, z) => J(ROOF[(x + z) % 4], x, y, z, seed, 0.05));

  for (const y of [12, 13, 22, 23]) {
    for (let t = 4; t < SX - 4; t += 6) {
      body.set(t, y, 2, GOLD);
      body.set(t, y, SZ - 3, GOLD);
      body.set(2, y, Math.min(SZ - 4, t), GOLD);
      body.set(SX - 3, y, Math.min(SZ - 4, t), GOLD);
    }
  }

  body.box(20, 8, SZ - 3, 26, 13, SZ, (x, y, z) => J(IRON, x, y, z, seed, 0.04));
  body.box(22, 10, SZ - 1, 24, 12, SZ + 1, GOLD);
  paintSign(body, seed);
  sideWindow(body, seed, SX - 3, 1);
  sideWindow(body, seed, 2, -1);
  interior(body, seed);

  const lid = new VoxelModel(SX + 4, 14, SZ + 6);
  const lox = (SX + 4) / 2;
  const loz = 3;
  for (let x = 1; x < SX + 3; x++) {
    for (let z = 1; z < SZ + 4; z++) {
      const ridge = Math.abs(x - lox);
      const h = Math.max(3, Math.round(9 - ridge * 0.28));
      const edge = z < 3 || z > SZ + 1 || x < 3 || x > SX + 1;
      for (let y = 0; y <= h; y++) {
        let c;
        if (y < 2 || edge) c = J(BEAM, x, y, z, seed, 0.06);
        else {
          const row = Math.floor(ridge / 3);
          c = ROOF[row % ROOF.length];
          if (Math.floor(ridge) % 3 === 0) c = shade(c, 0.75);
          else if (Math.floor(ridge) % 3 === 2) c = shade(c, 1.12);
          c = J(c, x, y, z, seed, 0.05);
        }
        lid.set(x, y, z, c);
      }
    }
  }
  lid.box(8, 0, 0, 14, 5, 4, IRON);
  lid.box(SX - 8, 0, 0, SX - 2, 5, 4, IRON);
  lid.box(lox - 2, 2, SZ + 2, lox + 2, 5, SZ + 5, GOLD);

  const flag = new VoxelModel(18, 14, 3);
  flag.box(0, 4, 0, 2, 12, 2, (x, y, z) => J(BEAM, x, y, z, seed, 0.05));
  for (let y = 2; y < 12; y++) {
    const droop = y < 4 ? 4 - y : 0;
    const len = 14 - Math.floor((y - 2) / 3) - droop;
    for (let x = 2; x < 2 + len; x++) {
      const band = Math.floor(x / 3) % 2 === 0;
      flag.set(x, y, 1, J(band ? 0xf4efe4 : 0xa8452f, x, y, 1, seed, 0.05));
    }
  }

  return {
    size: SIZE,
    body: partsOf(body, ox, 0, oz),
    lid: partsOf(lid, lox, 0, loz),
    flag: partsOf(flag, 0, 2, 1),
    hinge: { x: 0, y: 28 * SIZE, z: (2 - oz) * SIZE },
    flagAt: { x: 0.55, y: 8 * SIZE, z: 22 * SIZE },
  };
}
