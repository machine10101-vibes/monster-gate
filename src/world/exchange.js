import { VoxelModel, hash2, clamp } from '../engine/voxel.js';
import { W } from './terrain.js';
import { J, bundle } from './models.js';
import { MARKET } from '../data/market.js';

/**
 * The Gilantre Exchange: a walled-in market square just outside Gilantre's east gate, where
 * World 1 hunters list gear, monster parts and goods for each other. The east road forks
 * south-east of the farm pen and climbs gently onto a flat cobbled plaza. The Exchange Hall
 * closes the north side; two rings of tender stalls make a circular market street around a
 * coin fountain; ledger boards, lamps, pennants, carts and crates fill the gaps, and brokers
 * at the hall and the boards open the trading ledger.
 */

export const EXCHANGE = {
  x: MARKET.plaza.x,
  z: MARKET.plaza.z,
  /** Flat cobbles out to this radius. */
  flat: 21,
  /** Grass blends back to the prairie over this width. */
  blend: 7,
  hall: { x: MARKET.plaza.x, z: MARKET.plaza.z - 20, hw: 6.3, hd: 4.4 },
  road: { ax: 497, az: 144, bx: 522, bz: 136.5, half: 2.3 },
};

const TAU = Math.PI * 2;
const NORTH = -Math.PI / 2;

/** HUD area name while standing on the Exchange grounds (the plaza, the hall and the bank around them). */
export function exchangeAreaName(x, z) {
  return exchangeEdge(Number(x), Number(z)) <= EXCHANGE.blend ? 'Gilantre Exchange' : null;
}

/* --------------------------------- terrain --------------------------------- */

function segDist(x, z, r) {
  const vx = r.bx - r.ax;
  const vz = r.bz - r.az;
  const t = clamp(((x - r.ax) * vx + (z - r.az) * vz) / (vx * vx + vz * vz), 0, 1);
  return { d: Math.hypot(x - (r.ax + vx * t), z - (r.az + vz * t)), t };
}

/** Distance outside the hall's ground rectangle (with its steps), 0 inside. */
function hallDist(x, z) {
  const h = EXCHANGE.hall;
  const dx = Math.max(0, Math.abs(x - h.x) - (h.hw + 1.5));
  const dz = Math.max(0, Math.abs(z - h.z) - (h.hd + 1.5));
  return Math.hypot(dx, dz);
}

/** Distance outside the flat ground (plaza disc plus the hall's footing), 0 inside. */
export function exchangeEdge(x, z) {
  return Math.min(Math.max(0, Math.hypot(x - EXCHANGE.x, z - EXCHANGE.z) - EXCHANGE.flat), hallDist(x, z));
}

/** The plaza's level: the prairie's mean height under it, snapped to the half-unit grid. */
export function exchangeLevel(lands) {
  let sum = 0;
  let n = 0;
  for (const land of lands) {
    const H = land.data?.H;
    if (!H) continue;
    for (let lz = 0; lz < W; lz += 2) {
      for (let lx = 0; lx < W; lx += 2) {
        const x = land.x0 + lx + 0.5;
        const z = land.z0 + lz + 0.5;
        if (Math.hypot(x - EXCHANGE.x, z - EXCHANGE.z) > EXCHANGE.flat) continue;
        sum += H[lz * W + lx];
        n++;
      }
    }
  }
  return n ? Math.max(1.5, Math.round((sum / n) * 2) / 2) : 3;
}

/**
 * Height and paint for one cell of the Exchange grounds, or null when the cell is open prairie.
 * `original` is the cell's prairie height; `level` comes from exchangeLevel; `roadBase` is the
 * height the road starts from where it leaves the east road.
 */
export function exchangeShape(x, z, original, level, roadBase = original) {
  const road = segDist(x, z, EXCHANGE.road);
  const edge = exchangeEdge(x, z);
  if (edge <= 0) return { h: level, tag: 'cobble' };
  if (road.d < EXCHANGE.road.half) {
    const s = road.t * road.t * (3 - 2 * road.t);
    const join = clamp(1 - edge / EXCHANGE.blend, 0, 1);
    return { h: roadBase + (level - roadBase) * Math.max(s, join), tag: 'path' };
  }
  if (edge < EXCHANGE.blend) {
    const t = edge / EXCHANGE.blend;
    const s = t * t * (3 - 2 * t);
    return { h: level + (original - level) * s, tag: 'grass' };
  }
  return null;
}

/* --------------------------------- models --------------------------------- */

const STONE = 0xd8cdb4;
const MARBLE = 0xefe9dc;
const GOLD = 0xe2b443;
const ROOF = 0x2f6f73;
const WOOD = 0x7a4e2c;

function shade(c, k) {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * k));
  const b = Math.min(255, Math.round((c & 255) * k));
  return (r << 16) | (g << 8) | b;
}

/** The Exchange Hall: a columned trading house with a gold coin on its pediment. Faces +z. */
function buildHall() {
  const M = new VoxelModel(104, 80, 76);
  const stone = (x, y, z) => J(STONE, x, y, z, 81, 0.05);
  const marble = (x, y, z) => J(MARBLE, x, y, z, 82, 0.03);
  // Plinth and the broad front steps.
  M.box(0, 0, 0, 104, 4, 66, (x, y, z) => J(0xb9ae98, x, y, z, 83, 0.05));
  for (let s = 0; s < 4; s++) M.box(10 - s * 2, 0, 66 + s * 2, 94 + s * 2, 4 - s, 68 + s * 2, (x, y, z) => J(0xc7bca5, x, y, z, 84, 0.05));
  // The body: thick walls with arched windows on the sides.
  M.box(6, 4, 6, 98, 46, 54, stone);
  M.carve(9, 4, 9, 95, 45, 51);
  for (const wx of [18, 34, 66, 82]) {
    M.box(wx, 18, 52, wx + 6, 34, 54, 0x2a4a6a, true);
    M.box(wx - 1, 34, 52, wx + 7, 36, 55, GOLD);
  }
  for (const wz of [16, 30, 44]) {
    for (const wx of [6, 96]) M.box(wx, 18, wz, wx + 2, 34, wz + 6, 0x2a4a6a, true);
  }
  // Grand doorway with a gold frame and open doors.
  M.box(42, 4, 52, 62, 32, 55, 0x1c140e);
  M.box(40, 4, 54, 42, 34, 56, GOLD);
  M.box(62, 4, 54, 64, 34, 56, GOLD);
  M.box(40, 32, 54, 64, 35, 56, GOLD);
  M.box(36, 4, 55, 42, 30, 56, (x, y, z) => J(0x6a3a22, x, y, z, 85, 0.06));
  M.box(62, 4, 55, 68, 30, 56, (x, y, z) => J(0x6a3a22, x, y, z, 85, 0.06));
  // Portico: six marble columns with gold capitals.
  for (const cx of [8, 24, 40, 60, 76, 92]) {
    M.box(cx - 2, 4, 60, cx + 3, 6, 65, stone);
    M.box(cx - 1, 6, 61, cx + 2, 44, 64, marble);
    M.box(cx - 2, 44, 60, cx + 3, 47, 65, GOLD);
  }
  // Entablature and a gold frieze.
  M.box(2, 47, 4, 102, 52, 66, marble);
  M.box(2, 49, 65, 102, 51, 66, GOLD);
  for (let x = 4; x < 100; x += 6) M.set(x, 50, 66, 0x8a1e1e);
  // Gable roof over body and portico, with the pediment on the front.
  for (let x = 0; x < 104; x++) {
    const top = 52 + Math.floor((52 - Math.abs(x - 51.5)) * 0.42);
    for (let z = 2; z < 68; z++) {
      M.set(x, top, z, J(z % 4 === 0 ? shade(ROOF, 0.85) : ROOF, x, top, z, 86, 0.05));
      M.set(x, top - 1, z, shade(ROOF, 0.7));
    }
    for (let y = 52; y < top - 1; y++) {
      M.set(x, y, 64, marble(x, y, 64));
      M.set(x, y, 4, stone(x, y, 4));
    }
  }
  // The coin of the Exchange in the pediment, and a gold finial.
  for (let y = 52; y < 74; y++) {
    for (let x = 40; x < 64; x++) {
      const d = Math.hypot(x - 51.5, y - 61);
      if (d < 7.5) M.set(x, y, 65, d < 5.5 ? (d < 2 ? 0xfff0b0 : GOLD) : shade(GOLD, 0.75), d < 5.5);
    }
  }
  M.box(50, 74, 34, 54, 80, 38, GOLD, true);
  // Red and gold banners between the outer columns.
  for (const bx of [14, 84]) {
    M.box(bx, 22, 65, bx + 5, 46, 66, 0x8a1e1e);
    M.box(bx + 1, 26, 65, bx + 4, 30, 67, GOLD);
  }
  return bundle([[M, 0.122, 52, 0, 38]]);
}

const GOODS = {
  blades(M, x, z, k, seed) {
    M.set(x, 12, z, J(k % 2 ? 0x5a3a24 : 0x4a3a2c, x, 12, z, seed, 0.06));
    if (x % 3 === 0 && z === 21) for (let y = 13; y < 20; y++) M.set(x, y, z, y > 14 ? J(0xd7dee6, x, y, z, seed, 0.04) : 0x6a4328);
  },
  helms(M, x, z, k, seed) {
    M.set(x, 12, z, J(0x6a4a30, x, 12, z, seed, 0.06));
    if (x % 5 < 3 && z > 19 && z < 23) {
      const c = [0x9aa3ab, 0xc0904a, 0x6a8ab0][k % 3];
      M.set(x, 13, z, J(c, x, 13, z, seed, 0.06));
      M.set(x, 14, z, J(shade(c, 1.1), x, 14, z, seed, 0.06));
      if (x % 5 === 1) M.set(x, 15, z, 0xb02a2a);
    }
  },
  hides(M, x, z, k, seed) {
    const c = [0xa0703c, 0x7a5434, 0xd8c8a8, 0x5a4438][k % 4];
    M.set(x, 12, z, J(c, x, 12, z, seed, 0.12));
    if ((x + z) % 4 === 0) M.set(x, 13, z, J(shade(c, 0.85), x, 13, z, seed, 0.1));
  },
  scales(M, x, z, k, seed) {
    const c = [0x3aa58a, 0x7a52c8, 0xd0503a, 0x4a8ad8][k % 4];
    M.set(x, 12, z, J(c, x, 12, z, seed, 0.15), (x + z) % 5 === 0);
  },
  gems(M, x, z, k, seed) {
    M.set(x, 12, z, J(0x3a2c4a, x, 12, z, seed, 0.05));
    if ((x * 3 + z) % 4 === 0) {
      const c = [0x5ad8ff, 0xff5a8a, 0x8aff7a, 0xffd23f][k % 4];
      M.set(x, 13, z, c, true);
      if (z % 2) M.set(x, 14, z, shade(c, 1.15), true);
    }
  },
  ore(M, x, z, k, seed) {
    const c = [0xb87333, 0x9aa3ab, 0xe0c25a, 0x5a6470][k % 4];
    M.set(x, 12, z, J(c, x, 12, z, seed, 0.12));
    if ((x + z * 2) % 3 === 0) M.set(x, 13, z, J(c, x, 13, z, seed, 0.12));
  },
  potion(M, x, z, k) {
    if (x % 4 === 1) {
      const col = [0xff4d6a, 0x4ec8ff, 0x7d5cff, 0x5dffa0][k % 4];
      M.set(x, 12, z, 0xdde8f0);
      M.set(x, 13, z, col, true);
      M.set(x, 14, z, col, true);
      if (z === 21) M.set(x, 15, z, 0xc8b48a);
    } else M.set(x, 12, z, 0x6a4328);
  },
  bows(M, x, z, k, seed) {
    M.set(x, 12, z, J(0x5a3a24, x, 12, z, seed, 0.06));
    if (x % 6 === 0 && z === 20) for (let y = 13; y < 21; y++) M.set(x, y, z, J(0x8a5a34, x, y, z, seed, 0.06));
    if (x % 6 === 2 && z === 20) for (let y = 13; y < 21; y++) M.set(x, y, z, 0xe8e0d0);
  },
  shields(M, x, z, k, seed) {
    M.set(x, 12, z, J(0x5a3a24, x, 12, z, seed, 0.06));
    if (z === 23 && x % 7 < 5) {
      const c = [0x8a1e1e, 0x1e4a8a, 0x2a6a3a][Math.floor(x / 7) % 3];
      for (let y = 13; y < 18; y++) M.set(x, y, z, (x % 7 === 2 && y === 15) ? GOLD : J(c, x, y, z, seed, 0.05));
    }
  },
  scrolls(M, x, z, k, seed) {
    M.set(x, 12, z, J(0x6a4328, x, 12, z, seed, 0.06));
    if (z % 2 === 0 && x % 3 !== 0) M.set(x, 13, z, J(0xeee0bc, x, 13, z, seed, 0.05));
    if (z === 20 && x % 3 === 1) M.set(x, 13, z, 0xb02a2a);
  },
  claws(M, x, z, k, seed) {
    M.set(x, 12, z, J(0x4a3a2c, x, 12, z, seed, 0.06));
    if ((x + z) % 3 === 0) {
      M.set(x, 13, z, J(0xeae0c8, x, 13, z, seed, 0.06));
      if (z % 2) M.set(x, 14, z, J(0xd8ccb0, x, 14, z, seed, 0.06));
    }
  },
};
export const STALL_GOODS = Object.keys(GOODS);

const AWNINGS = [
  [0xc8402f, 0xf2ead3],
  [0x2f8f86, 0xf2ead3],
  [0x5b3d86, 0xe4d4f6],
  [0xd8a22a, 0x6a2a1a],
  [0x2a5a9a, 0xe8eef6],
  [0x3a7a3a, 0xf0e6c0],
  [0x9a2a5a, 0xf6dce6],
  [0x1f2c40, 0xe2b443],
];

/** A tender's stall: posts, a counter with wares, a striped awning, a hanging sign. Faces +z. */
function buildTenderStall(seed, awning, goods) {
  const M = new VoxelModel(40, 42, 28);
  const wood = (x, y, z) => J(WOOD, x, y, z, seed, 0.08);
  for (const [px, pz] of [[2, 2], [35, 2], [2, 23], [35, 23]]) M.box(px, 0, pz, px + 3, 26, pz + 3, wood);
  M.box(3, 0, 18, 37, 12, 25, (x, y, z) => (y > 9 ? J(0x9a6b3d, x, y, z, seed, 0.06) : wood(x, y, z)));
  // Back shelf with more stock, and a crate under it.
  M.box(4, 0, 4, 36, 16, 7, wood);
  for (let x = 5; x < 35; x++) for (let z = 4; z < 7; z++) {
    if ((x + seed) % 3 === 0) M.set(x, 16, z, J(awning[0], x, 16, z, seed, 0.1));
  }
  const paint = GOODS[goods] || GOODS.ore;
  for (let x = 6; x < 34; x++) for (let z = 19; z < 24; z++) paint(M, x, z, Math.floor((x - 6) / 4), seed);
  for (let z = 0; z < 28; z++) {
    const y = 26 + Math.floor((27 - z) * 0.42);
    for (let x = 0; x < 40; x++) {
      const stripe = Math.floor(x / 4) % 2 === 0 ? awning[0] : awning[1];
      M.set(x, y, z, J(stripe, x, y, z, seed, 0.05));
      M.set(x, y - 1, z, J(shade(stripe, 0.85), x, y - 1, z, seed, 0.05));
    }
  }
  for (let x = 0; x < 40; x++) {
    const stripe = Math.floor(x / 4) % 2 === 0 ? awning[0] : awning[1];
    M.set(x, 25 + (x % 4 === 1 || x % 4 === 2 ? -1 : 0), 27, shade(stripe, 0.9));
  }
  // Hanging sign board with a gold coin, on the right front post.
  M.box(32, 18, 27, 40, 23, 28, (x, y, z) => J(0x5a3a24, x, y, z, seed, 0.05));
  M.box(35, 19, 27, 38, 22, 28, GOLD);
  return bundle([[M, 0.1, 20, 0, 14]]);
}

/** A ledger board: a framed notice wall covered in posted listings. Faces +z. */
function buildLedgerBoard() {
  const M = new VoxelModel(44, 40, 6);
  const wood = (x, y, z) => J(0x5a3a24, x, y, z, 91, 0.07);
  M.box(1, 0, 2, 4, 36, 5, wood);
  M.box(40, 0, 2, 43, 36, 5, wood);
  M.box(2, 10, 2, 42, 34, 4, (x, y, z) => J(0xa07a4a, x, y, z, 92, 0.08));
  M.box(1, 34, 1, 43, 37, 5, wood);
  M.box(14, 37, 2, 30, 40, 4, GOLD);
  M.box(2, 9, 2, 42, 10, 5, wood);
  for (let y = 12; y < 32; y += 5) {
    for (let x = 4; x < 40; x += 5) {
      const r = hash2(x, y, 93);
      if (r < 0.15) continue;
      const c = r > 0.85 ? 0xf6d0a0 : r > 0.7 ? 0xd8e8f6 : 0xf0e6cc;
      M.box(x, y, 4, x + 4, y + 4, 5, c);
      M.set(x + 1, y + 2, 5, 0x6a5a4a);
      M.set(x + 2, y + 1, 5, 0x6a5a4a);
      M.set(x + 2, y + 3, 5, r > 0.5 ? 0xb02a2a : 0x2a5ab0);
    }
  }
  return bundle([[M, 0.1, 22, 0, 3]]);
}

/** A tall pennant pole. Faces +z; the flag streams toward +x. */
function buildPennant(color, trim) {
  const M = new VoxelModel(14, 54, 3);
  M.box(0, 0, 1, 2, 54, 3, (x, y, z) => J(0x6a4328, x, y, z, 94, 0.06));
  M.box(0, 52, 0, 2, 54, 3, GOLD);
  for (let y = 36; y < 51; y++) {
    const len = Math.max(1, Math.floor(12 - Math.abs(y - 43.5) * 1.5));
    for (let x = 2; x < 2 + len; x++) M.set(x, y, 1, x === 2 + len - 1 || y === 36 || y === 50 ? trim : color);
  }
  return bundle([[M, 0.1, 1, 0, 2]]);
}

/** The road arch at the fork: two stone pillars, a beam, and the Exchange's coin. Faces +z. */
function buildArch() {
  const M = new VoxelModel(64, 58, 8);
  const stone = (x, y, z) => J(STONE, x, y, z, 95, 0.05);
  M.box(0, 0, 1, 8, 46, 7, stone);
  M.box(56, 0, 1, 64, 46, 7, stone);
  M.box(0, 44, 0, 64, 50, 8, (x, y, z) => J(0x7a4e2c, x, y, z, 96, 0.06));
  M.box(0, 49, 0, 64, 50, 8, GOLD);
  M.box(18, 34, 3, 46, 44, 5, (x, y, z) => J(0x2a3a50, x, y, z, 97, 0.04));
  for (let y = 0; y < 58; y++) for (let x = 24; x < 40; x++) {
    const d = Math.hypot(x - 31.5, y - 53);
    if (d < 5) M.set(x, y, 4, d < 3.5 ? GOLD : shade(GOLD, 0.75), d < 3.5);
  }
  for (let x = 21; x < 44; x += 3) M.box(x, 37, 5, x + 2, 41, 6, 0xf0e6cc);
  for (const lx of [2, 58]) {
    M.box(lx, 46, 2, lx + 4, 52, 6, 0x3a2c1c);
    M.box(lx + 1, 47, 3, lx + 3, 51, 5, 0xffd080, true);
  }
  return bundle([[M, 0.1, 32, 0, 4]]);
}

/** A round fountain with a gold coin spinning on its spire (the spire, at least, stays put). */
function buildCoinFountain() {
  const M = new VoxelModel(44, 40, 44);
  const stone = (x, y, z) => J(0xcfc5ae, x, y, z, 98, 0.05);
  for (let z = 0; z < 44; z++) for (let x = 0; x < 44; x++) {
    const d = Math.hypot(x - 21.5, z - 21.5);
    if (d < 22 && d >= 19) for (let y = 0; y < 6; y++) M.set(x, y, z, stone(x, y, z));
    else if (d < 19) {
      M.set(x, 0, z, stone(x, 0, z));
      M.set(x, 1, z, J(0x3a8ac8, x, 1, z, 99, 0.08));
      M.set(x, 2, z, J(0x5ab0e8, x, 2, z, 99, 0.1));
      M.set(x, 3, z, J(0x6ac0f0, x, 3, z, 99, 0.12));
      if (d > 7 && hash2(x, z, 100) > 0.93) M.set(x, 4, z, GOLD, true);
    }
    if (d < 5) for (let y = 0; y < 18; y++) M.set(x, y, z, stone(x, y, z));
    if (d < 9 && d >= 7.5) for (let y = 10; y < 13; y++) M.set(x, y, z, stone(x, y, z));
    if (d < 7.5) M.set(x, 12, z, J(0x6ac0f0, x, 12, z, 101, 0.1));
  }
  for (let y = 18; y < 38; y++) for (let x = 12; x < 32; x++) {
    const d = Math.hypot(x - 21.5, y - 28);
    if (d < 9) {
      M.set(x, y, 21, d < 7 ? GOLD : shade(GOLD, 0.7), d < 7);
      M.set(x, y, 22, d < 7 ? shade(GOLD, 0.9) : shade(GOLD, 0.7));
    }
  }
  return bundle([[M, 0.1, 22, 0, 22]]);
}

/** Sacks of grain and spice heaped by a stall. */
function buildSacks(seed) {
  const M = new VoxelModel(14, 10, 10);
  const cols = [0xd8c08a, 0xc8a060, 0xb84a2a, 0xe0d0a0];
  for (const [x0, z0, c] of [[0, 0, 0], [6, 1, 1], [3, 5, 2], [8, 5, 3]]) {
    const col = cols[(c + seed) % 4];
    M.box(x0, 0, z0, x0 + 6, 6, z0 + 5, (x, y, z) => J(col, x, y, z, seed, 0.08));
    M.box(x0 + 1, 6, z0 + 1, x0 + 5, 8, z0 + 4, (x, y, z) => J(shade(col, 0.9), x, y, z, seed, 0.08));
  }
  return bundle([[M, 0.1, 7, 0, 5]]);
}

let models = null;
export function exchangeModels() {
  if (models) return models;
  models = {
    hall: buildHall(),
    board: buildLedgerBoard(),
    arch: buildArch(),
    fountain: buildCoinFountain(),
    stalls: STALL_GOODS.map((g, i) => buildTenderStall(110 + i, AWNINGS[i % AWNINGS.length], g)),
    pennants: [
      buildPennant(0x8a1e1e, GOLD),
      buildPennant(0x1e4a8a, 0xf0e6cc),
      buildPennant(0x2a6a3a, GOLD),
      buildPennant(0xd8a22a, 0x6a2a1a),
      buildPennant(0x5b3d86, 0xf0e6cc),
    ],
    sacks: [buildSacks(1), buildSacks(2)],
  };
  return models;
}

/* --------------------------------- people --------------------------------- */

const BROKERS = [
  {
    id: 'odila', name: 'Odila Vane', title: 'Exchange Broker', at: [0, -12.6], service: 'exchange',
    look: { skin: 0xd8a882, hair: 0x2a1a14, hairStyle: 'long', tunic: 0x1f2c40, sleeve: 0xe2b443, pants: 0x2a2420, boots: 0x1c1612, belt: true, seed: 140 },
    lines: [
      'Welcome to the Gilantre Exchange. Search every listing on World 1, buy what you need, list what you do not.',
      'The house takes five coins in a hundred when something sells. Nothing if it does not.',
    ],
  },
  {
    id: 'tobin', name: 'Tobin Ledger', title: 'Ledger Keeper', at: [-9.4, -8.6], service: 'exchange',
    look: { skin: 0xc89870, hair: 0x8a8e94, hairStyle: 'short', beard: true, tunic: 0x365d75, sleeve: 0xe4d2b0, pants: 0x40352c, boots: 0x30251b, hat: 'cap', hatColor: 0x1f2c40, seed: 141 },
    lines: [
      'Every lot on this board is a hunter waiting for gold. Use the filters, you will be here all day otherwise.',
      'Listings stand three days. Unsold lots come back to you at collection.',
    ],
  },
  {
    id: 'mirela', name: 'Mirela Quill', title: 'Exchange Clerk', at: [9.4, -8.6], service: 'exchange',
    look: { skin: 0xb07850, hair: 0x5a2a1a, hairStyle: 'long', tunic: 0x6a3030, sleeve: 0xf0e6cc, pants: 0x3a2c22, boots: 0x2a1e16, belt: true, seed: 142 },
    lines: [
      'Sold something? Your gold waits here until you collect it, less the house fee.',
      'Check the going rate before you price. A fair lot sells by supper.',
    ],
  },
];

const HAWKERS = [
  { id: 'brann', name: 'Brann', title: 'Scale tender', at: [14.6, 4], lines: ['Budgefang scale, fresh off the plains! Find it on the ledger.', 'Volcanum hide, warm to the touch. Ask the brokers.'], look: { skin: 0xc58a5e, hair: 0x1a120e, beard: true, tunic: 0x3a7a3a, sleeve: 0x6a5438, pants: 0x3a342c, boots: 0x2a241c, seed: 143 } },
  { id: 'yeva', name: 'Yeva', title: 'Gem tender', at: [-14.6, 4], lines: ['Crystals from the deep wells! Shine like a coin.', 'Everything here is on the ledger. Search for what you need.'], look: { skin: 0xe0b890, hair: 0xd8a040, hairStyle: 'long', tunic: 0x5b3d86, sleeve: 0xe4d4f6, pants: 0x2a2440, boots: 0x1c1830, seed: 144 } },
];

const SHOPPERS = [
  ['pell', 'Pell', 'Hunter', 0x8a5a34, 0x4a3a2c, 145, ['I came for a helm and I am leaving with three.']],
  ['sorn', 'Sorn', 'Hunter', 0x2a5a9a, 0x2a2420, 146, ['Someone listed Snow Yeti fur under the going rate. Gone in a breath.']],
  ['ilsa', 'Ilsa', 'Trader', 0x9a2a5a, 0x3a2c22, 147, ['Price per unit, always check the price per unit.']],
  ['dov', 'Dov', 'Porter', 0x6a5438, 0x3a342c, 148, ['These crates do not carry themselves.']],
  ['marra', 'Marra', 'Hunter', 0x3a7a3a, 0x40352c, 149, ['I sold a Darksycle blade this morning. Paid for a week of potions.']],
  ['quint', 'Quint', 'Collector', 0xd8a22a, 0x2a2420, 150, ['I collect monster parts. Every family, every grade.']],
  ['tamsin', 'Tamsin', 'Hunter', 0x1f2c40, 0x30251b, 151, ['The fee is fair. The Exchange keeps the lots safe until they sell.']],
  ['oren', 'Oren', 'Apprentice', 0xc8402f, 0x3a2c22, 152, ['My master sent me for copper ore. Lots of copper ore.']],
  ['vela', 'Vela', 'Hunter', 0x2f8f86, 0x2a2420, 153, ['Filter by monster, then by level. That is how you find good gear.']],
  ['hask', 'Hask', 'Hunter', 0x5a4438, 0x1c1612, 154, ['Busiest square this side of the moat.']],
];

const SKINS = [0xd8a882, 0xc58a5e, 0xe0b890, 0xb07850, 0x8a5a3a, 0xf0c8a0];
const HAIRS = [0x2a1a14, 0x5a2a1a, 0xd8a040, 0x1a120e, 0x8a8e94, 0x6a4a2a];

function placePeople(world) {
  const P = EXCHANGE;
  world.npcSpots ||= {};
  const folk = [];
  const add = (p, sx, sz, extra = {}) => {
    const spot = 'exchange-' + p.id;
    world.npcSpots[spot] = { x: sx, z: sz };
    folk.push({ id: 'exchange_' + p.id, name: p.name, title: p.title, spot, yaw: Math.atan2(P.x - sx, P.z - sz), look: p.look, lines: p.lines, service: p.service, roam: null, ...extra });
  };
  for (const b of BROKERS) add(b, P.x + b.at[0], P.z + b.at[1], b.id === 'odila' ? { yaw: 0 } : {});
  for (const h of HAWKERS) add(h, P.x + h.at[0], P.z + h.at[1]);
  const roam = [{ x0: P.x - 14, z0: P.z - 8, x1: P.x + 14, z1: P.z + 15 }];
  SHOPPERS.forEach(([id, name, title, tunic, pants, seed, lines], i) => {
    const look = { skin: SKINS[i % SKINS.length], hair: HAIRS[(i * 5) % HAIRS.length], hairStyle: i % 3 === 0 ? 'long' : 'short', beard: i % 4 === 1, tunic, sleeve: shade(tunic, 1.25), pants, boots: 0x2a1e16, belt: i % 2 === 0, seed };
    const a = (i / SHOPPERS.length) * TAU;
    add({ id, name, title, look, lines }, P.x + Math.cos(a) * 13.6, P.z + 3 + Math.sin(a) * 9, { roam });
  });
  world.exchange.folk = folk;
}

/* --------------------------------- dressing --------------------------------- */

/** Angles (from the plaza centre, atan2 of dz, dx) of the gaps: the hall approach and the road mouth. */
const ROAD_ANGLE = Math.atan2(EXCHANGE.road.bz - EXCHANGE.z, EXCHANGE.road.bx - EXCHANGE.x);
const angGap = (a, center, w) => Math.abs(Math.atan2(Math.sin(a - center), Math.cos(a - center))) < w;

/** `kit` is Gilantre's prop kit (benches, carts). */
export function dressExchange(world, kit = {}) {
  const K = exchangeModels();
  const P = EXCHANGE;
  const m = world.models;
  const placed = { stalls: 0, boards: 0, lamps: 0, pennants: 0 };
  world.exchange = { x: P.x, z: P.z, r: P.flat, hall: { ...P.hall }, folk: [], placed };
  const at = (a, r) => [P.x + Math.cos(a) * r, P.z + Math.sin(a) * r];
  const face = (x, z) => Math.atan2(P.x - x, P.z - z);
  const put = (parts, x, z, rot, scale, o = {}) => {
    if (!parts) return false;
    if (o.check !== false && !world.free(x, z, o.r ?? 0.8)) return false;
    world.putAt(parts, x, z, rot, scale, o.opts);
    if (o.collide) world.circle(x, z, o.collide);
    if (o.occ) world.occupy(x, z, o.occ);
    return true;
  };

  // The hall closes the north side; its steps come down toward the fountain.
  const H = P.hall;
  world.putAt(K.hall, H.x, H.z, 0, 1);
  world.box(H.x, H.z - 0.4, H.hw, H.hd - 0.2);
  world.occupy(H.x, H.z, 8.5);
  world.lightSpots.push({ x: H.x, y: world.heightAt(H.x, H.z) + 3.6, z: H.z + H.hd + 0.6, color: 0xffd27a });

  // The coin fountain at the heart, benches around it.
  put(K.fountain, P.x, P.z + 1, 0, 1, { check: false, collide: 2.1, occ: 3.4 });
  world.lightSpots.push({ x: P.x, y: world.heightAt(P.x, P.z) + 3, z: P.z + 1, color: 0xffe08a });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    const [x, z] = [P.x + Math.cos(a) * 4.6, P.z + 1 + Math.sin(a) * 4.6];
    put(kit.bench, x, z, Math.atan2(P.x - x, P.z + 1 - z), 1, { r: 0.4, collide: 0.4, occ: 0.7 });
  }

  // Ledger boards beside the hall steps, where the brokers stand.
  for (const sx of [-1, 1]) {
    if (put(K.board, P.x + sx * 9.4, P.z - 10.4, 0, 1, { check: false, collide: 0.9, occ: 2.4 })) placed.boards++;
  }

  // Inner ring of stalls, facing out onto the market street; outer ring facing in.
  let g = 0;
  const stall = (a, r, outward) => {
    if (angGap(a, NORTH, 0.62) || angGap(a, ROAD_ANGLE, 0.34)) return;
    const [x, z] = at(a, r);
    const rot = face(x, z) + (outward ? Math.PI : 0);
    if (!world.free(x, z, 1.6)) return;
    world.putAt(K.stalls[g % K.stalls.length], x, z, rot, 1);
    g++;
    world.circle(x, z, 1.4);
    world.occupy(x, z, 2.1);
    placed.stalls++;
  };
  for (const off of [0.72, 1.1, 1.84, 2.22, 2.96, 4.36, 4.74, 5.42]) stall(NORTH + off, 11, true);
  for (let off = 0.7; off < TAU - 0.7; off += 0.272) stall(NORTH + off, 17.2, false);

  // Lamps along the market street, between the rings.
  for (let off = 0.55; off < TAU - 0.5; off += 0.62) {
    const [x, z] = at(NORTH + off, 14.1);
    if (!world.free(x, z, 0.3)) continue;
    world.lamp(x, z);
    world.occupy(x, z, 0.4);
    placed.lamps++;
  }

  // Pennants ring the rim; crates, barrels and sacks behind the outer stalls.
  let pi = 0;
  for (let off = 0.2; off < TAU - 0.1; off += 0.21) {
    const a = NORTH + off;
    if (angGap(a, NORTH, 0.5) || angGap(a, ROAD_ANGLE, 0.22)) continue;
    const [x, z] = at(a, 20.2);
    if (put(K.pennants[pi % K.pennants.length], x, z, -a, 1, { r: 0.2, collide: 0.12, occ: 0.3 })) {
      pi++;
      placed.pennants++;
    }
  }
  for (let k = 0; k < 30; k++) {
    const a = NORTH + 0.6 + hash2(k, 7, 160) * (TAU - 1.2);
    if (angGap(a, ROAD_ANGLE, 0.36)) continue;
    const [x, z] = at(a, 18.9 + hash2(k, 8, 161) * 1.0);
    const roll = hash2(k, 9, 162);
    const parts = roll > 0.66 ? m.crate?.[k % 2] : roll > 0.33 ? m.barrel?.[k % 2] : K.sacks[k % 2];
    put(parts, x, z, roll * 6, 1, { r: 0.45, collide: 0.35, occ: 0.5 });
  }

  // Carts by the road mouth, unloading for the tenders.
  for (const [dx, dz, rot] of [[-15.6, 9.6, 0.9], [-6.2, 18.4, 2.4]]) {
    put(kit.cart, P.x + dx, P.z + dz, rot, 0.9, { r: 1.2, collide: 0.9, occ: 1.6 });
  }

  // The arch where the Exchange road leaves the east road, and a sign for travellers.
  const R = P.road;
  const ax = R.ax + (R.bx - R.ax) * 0.38;
  const az = R.az + (R.bz - R.az) * 0.38;
  const along = Math.atan2(R.bx - R.ax, R.bz - R.az);
  world.putAt(K.arch, ax, az, along, 1);
  const px = Math.cos(along);
  const pz = -Math.sin(along);
  world.circle(ax + px * 2.9, az + pz * 2.9, 0.45);
  world.circle(ax - px * 2.9, az - pz * 2.9, 0.45);
  world.occupy(ax, az, 3.4);
  world.lightSpots.push({ x: ax, y: world.heightAt(ax, az) + 4.8, z: az, color: 0xffd080 });
  if (m.sign && world.free(R.ax - 1.5, R.az + 3, 0.5)) {
    world.putAt(m.sign, R.ax - 1.5, R.az + 3, 2.2, 1.05);
    world.circle(R.ax - 1.5, R.az + 3, 0.2);
  }

  // Keep trees and tufts off the square.
  for (let k = 0; k < 10; k++) {
    const [x, z] = at((k / 10) * TAU, 12);
    world.occupy(x, z, 9.5);
  }
  world.occupy(P.x, P.z, 9);

  placePeople(world);
}
