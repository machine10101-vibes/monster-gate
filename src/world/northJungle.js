import { fbm, hash2, lerp, smoothstep } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE } from './terrain.js';
import { jungleFeature, paintJungleCell, dressJungle } from './jungle.js';

/**
 * The Northern Jungle: Fernreach (35), Mistvale (36), Vinecrest (25) and Sunfeather (26),
 * the four tiles north of Northleas and Goldmead. Light jungle: open glades of grass and
 * flowers between broadleaf stands, bamboo and palms by the water, with two tribe villages.
 *
 * Passes come in from Northleas, Goldmead and the Endless Field (ring.js cuts them). Each
 * border fades toward its neighbour: meadow green to the south, scorched olive beside
 * Ashen Road and the Endless Field, and cool highland green under Rimefang Mesa.
 */

const TAU = Math.PI * 2;

export const NORTH_JUNGLE_KINDS = ['fernreach', 'mistvale', 'vinecrest', 'sunfeather'];

/** Light jungle: few canopy giants, plenty of understorey and open glades. */
const LIGHT = { giants: 4, broadleaf: 36, palms: 10, bananas: 12, bamboo: 9, bigLeaves: 52, ferns: 56, heliconia: 16, orchids: 20, hibiscus: 14, bushes: 30, mangrove: 3, rocks: 20, boulders: 6 };

export const NORTH_JUNGLE_SPECS = {
  fernreach: {
    banner: ['The Northern Jungle', 'Fernreach'], jungle: true, north: true, shade: 0.02, forest: 0.5, amp: 2.6, base: 3.4, seed: 91,
    rim: {},
    knolls: [[30, 34, 11, 3.2], [124, 118, 9, 2.4], [22, 114, 9, 2.6], [126, 28, 8, 2.6], [52, 70, 6, 1.6]],
    pools: [[34, 92, 9, 7]],
    village: { cx: 92, cz: 66, r: 20, h: 3.6, id: 'leafmask', name: 'Leafmask Village' },
    roads: [
      [[64, 143], [66, 120], [76, 100], [86, 84]],
      [[110, 71], [126, 74], [143, 76]],
      [[88, 48], [82, 30], [72, 0]],
    ],
    edgeBlend: { s: 'meadow', w: 'ash' },
    dress: { ...LIGHT },
  },
  mistvale: {
    banner: ['The Northern Jungle', 'Mistvale'], jungle: true, north: true, shade: 0.03, forest: 0.55, amp: 2.4, base: 3.3, seed: 92,
    rim: {},
    knolls: [[116, 34, 10, 3], [30, 120, 8, 2.2], [122, 116, 9, 2.6], [36, 30, 7, 2]],
    pools: [[96, 92, 18, 12], [40, 44, 8, 6]],
    islands: [[100, 92, 4, 1.4]],
    roads: [
      [[84, 143], [80, 120], [66, 100], [58, 80], [30, 77], [0, 76]],
      [[58, 80], [60, 50], [60, 0]],
    ],
    edgeBlend: { s: 'meadow', e: 'frost' },
    canoe: [80, 100, 0.9],
    dress: { ...LIGHT, palms: 16, mangrove: 8, bamboo: 12, broadleaf: 34 },
  },
  vinecrest: {
    banner: ['The Northern Jungle', 'Vinecrest'], jungle: true, north: true, shade: 0.04, forest: 0.6, amp: 3.2, base: 3.6, seed: 93,
    rim: { n: true },
    knolls: [[34, 40, 12, 4], [110, 44, 11, 3.6], [40, 116, 9, 2.6], [116, 118, 8, 2.4], [74, 30, 8, 2.8]],
    pools: [[106, 96, 8, 6]],
    roads: [
      [[72, 143], [70, 112], [72, 90], [74, 72], [104, 70], [143, 70]],
      [[0, 72], [30, 74], [56, 73], [74, 72]],
    ],
    edgeBlend: { w: 'ash' },
    dress: { ...LIGHT, giants: 6, broadleaf: 42, rocks: 28, boulders: 10, palms: 6 },
  },
  sunfeather: {
    banner: ['The Northern Jungle', 'Sunfeather'], jungle: true, north: true, shade: 0.02, forest: 0.5, amp: 2.6, base: 3.4, seed: 94,
    rim: { n: true, e: true },
    knolls: [[30, 30, 10, 3], [118, 40, 9, 2.8], [28, 118, 9, 2.4], [112, 120, 8, 2.2]],
    pools: [[38, 98, 9, 7]],
    village: { cx: 76, cz: 66, r: 21, h: 3.6, id: 'sunfeather', name: 'Sunfeather Village' },
    roads: [
      [[60, 143], [62, 118], [68, 100], [72, 87]],
      [[0, 70], [30, 70], [55, 68]],
    ],
    edgeBlend: {},
    dress: { ...LIGHT, giants: 5, heliconia: 20, orchids: 24 },
  },
};

/** Where the jungle meets each neighbour, the ground colour it fades toward. */
const BLEND = {
  meadow: { tint: [0.66, 0.9, 0.42], keep: 0.35, span: 34 },
  ash: { tint: [0.6, 0.56, 0.38], keep: 0.3, span: 30 },
  frost: { tint: [0.72, 0.88, 0.74], keep: 0.45, span: 30 },
};

function edgeDist(side, x, z) {
  if (side === 's') return W - 1 - z;
  if (side === 'n') return z;
  if (side === 'w') return x;
  return W - 1 - x;
}

/** 0..1 how far a cell has faded into each neighbour's ground, with a little noise so the line wanders. */
function blendAt(spec, x, z) {
  const out = [];
  for (const [side, kind] of Object.entries(spec.edgeBlend || {})) {
    const b = BLEND[kind];
    const wob = (fbm((spec.ox + x) * 0.05, (spec.oz + z) * 0.05, spec.seed + 31, 2) - 0.5) * 14;
    const t = 1 - smoothstep(0, b.span, edgeDist(side, x, z) + wob);
    if (t > 0) out.push([b, t]);
  }
  return out;
}

/** Jungle that thins toward a meadow or scorched border: 1 deep in, falling near the edge. */
export function northDensity(spec) {
  return (lx, lz) => {
    let d = 1;
    for (const [b, t] of blendAt(spec, lx, lz)) d = Math.min(d, 1 - (1 - b.keep) * t);
    return d;
  };
}

export function northFeature(h, x, z, spec) {
  const v = spec.village;
  let out = null;
  if (v) {
    const d = Math.hypot(x - v.cx, z - v.cz);
    if (d < v.r + 12) {
      out = { h: lerp(v.h, h, smoothstep(v.r - 2, v.r + 12, d)), kind: 0 };
      h = out.h;
    }
  }
  const j = jungleFeature(h, x, z, spec);
  return j || out;
}

export function paintNorthCell(out, H, x, z, kind, isPath, n, spec) {
  paintJungleCell(out, H, x, z, kind, isPath, n, spec);
  const i = z * W + x;
  if (out.zone[i] === ZONE.WATER || isPath) return;
  const gx = spec.ox + x;
  const gz = spec.oz + z;
  const v = spec.village;
  if (v) {
    const d = Math.hypot(x - v.cx, z - v.cz);
    if (d < v.r + 1) {
      // Packed earth in the plaza, worn grass toward the palisade, a ring of trodden path inside it.
      const nB = fbm(gx * 0.21, gz * 0.21 + 7, spec.seed + 5, 2);
      const worn = d < v.r - 5 || (d > v.r - 3.5 && d < v.r - 1.5);
      out.forest[i] = 0;
      out.zone[i] = ZONE.FIELD;
      if (worn || nB > 0.62) {
        out.top[i] = nB > 0.7 ? TILE.PATH : TILE.DIRT;
        out.tint[i * 3] = 0.86 + nB * 0.1;
        out.tint[i * 3 + 1] = 0.74 + nB * 0.08;
        out.tint[i * 3 + 2] = 0.54;
      } else {
        out.top[i] = TILE.GRASS;
        out.tint[i * 3] = 0.62 + nB * 0.1;
        out.tint[i * 3 + 1] = 0.82;
        out.tint[i * 3 + 2] = 0.4;
      }
      return;
    }
  }
  const blends = blendAt(spec, x, z);
  if (!blends.length) return;
  for (const [b, t] of blends) {
    const k = t * 0.9;
    out.tint[i * 3] = lerp(out.tint[i * 3], b.tint[0], k);
    out.tint[i * 3 + 1] = lerp(out.tint[i * 3 + 1], b.tint[1], k);
    out.tint[i * 3 + 2] = lerp(out.tint[i * 3 + 2], b.tint[2], k);
    out.forest[i] *= 1 - t * 0.6;
    if (t > 0.55 && out.top[i] === TILE.MOSS_STONE && H[i] < 8) out.top[i] = TILE.GRASS;
    // Dry, bare patches on the low ground toward Ashen Road; the stone ridge itself is left as stone.
    if (b === BLEND.ash && t > 0.45 && out.zone[i] !== ZONE.MOUNTAIN && H[i] < 7 && fbm(gx * 0.12, gz * 0.12, spec.seed + 41, 2) > 0.6) out.top[i] = TILE.DIRT;
  }
}

/* ------------------------------ villages ------------------------------ */

const pickM = (arr, n) => (arr && arr.length ? arr[n % arr.length] : null);
const angWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Where each road leaves the plaza, as an angle around the village centre. */
function gateAngles(spec) {
  const v = spec.village;
  const out = [];
  for (const road of spec.roads) {
    for (const p of [road[0], road[road.length - 1]]) {
      const d = Math.hypot(p[0] - v.cx, p[1] - v.cz);
      if (Math.abs(d - v.r) < 4) out.push(Math.atan2(p[1] - v.cz, p[0] - v.cx));
    }
  }
  return out;
}

const VILLAGERS = {
  leafmask: [
    {
      id: 'leafmask-chief', name: 'Chief Orrin Leafmask', title: 'Chief', head: true, look: { skin: 0x7a4a30, hair: 0x1a120e, hairStyle: 'short', beard: true, tunic: 0x9a2a1e, sleeve: 0x7a4a30, pants: 0x5a3c22, boots: 0x7a4a30, belt: true, bracer: true, seed: 91 },
      lines: [
        'You came up through the pass from Northleas. Few walk that far north.',
        'We are the Leafmask. We carve our faces from the bark of the old trees so the jungle knows us.',
        'Sunfeather Village lies north and east, past Mistvale. Our cousins. Tell them Orrin sends greeting.',
      ],
    },
    {
      id: 'leafmask-carver', name: 'Tama', title: 'Carver', stand: [-5, 3], look: { skin: 0x8a5a3a, hair: 0x241810, hairStyle: 'short', hairLen: 8, tunic: 0xc8642a, sleeve: 0x8a5a3a, pants: 0x6a4a2c, boots: 0x8a5a3a, seed: 92 },
      lines: [
        'Every face on the totem is an ancestor. The top one with the wings watches the sky for storms.',
        'Ashen Road is just over the west ridge. When the wind turns, the leaves there taste of smoke.',
      ],
    },
    {
      id: 'leafmask-forager', name: 'Kiri', title: 'Forager', roam: true, look: { skin: 0x6e4430, hair: 0x1a120e, hairStyle: 'short', hairLen: 10, tunic: 0x1f8a7a, sleeve: 0x6e4430, pants: 0x5a3c22, boots: 0x6e4430, seed: 93 },
      lines: [
        'The bananas by the fence are ripe. The ones in the deep jungle belong to the monkeys.',
        'Follow the path south and the trees open into Northleas pasture. It feels too quiet there.',
      ],
    },
    {
      id: 'leafmask-child', name: 'Pip', title: 'Child', roam: true, scale: 0.72, look: { skin: 0x8a5a3a, hair: 0x241810, hairStyle: 'short', tunic: 0xe0a83a, sleeve: 0x8a5a3a, pants: 0x6a4a2c, boots: 0x8a5a3a, seed: 94 },
      lines: ['Are you a monster hunter? Show me your sword! No, wait, do not.'],
    },
  ],
  sunfeather: [
    {
      id: 'sunfeather-elder', name: 'Elder Maku Sunfeather', title: 'Elder', head: true, look: { skin: 0x6e4430, hair: 0xd8d4cc, hairStyle: 'short', beard: true, tunic: 0xe0a83a, sleeve: 0x6e4430, pants: 0x5a3c22, boots: 0x6e4430, belt: true, seed: 95 },
      lines: [
        'Welcome to Sunfeather, hunter. We wear the feathers of birds that fly over the mesa to the east.',
        'Snow on one side, fire on the other, and the jungle green between. The spirits like a balance.',
        'Rest by our fire. The drum keeps the night animals at the tree line.',
      ],
    },
    {
      id: 'sunfeather-drummer', name: 'Ra', title: 'Drummer', stand: [4.6, 3.6], look: { skin: 0x5a3a28, hair: 0x1a120e, hairStyle: 'short', tunic: 0xa8281e, sleeve: 0x5a3a28, pants: 0x4a3420, boots: 0x5a3a28, bracer: true, seed: 96 },
      lines: [
        'One beat for the morning, two for the hunt, three when someone has come home.',
        'You hear that echo off the ridge? That is Rimefang answering.',
      ],
    },
    {
      id: 'sunfeather-weaver', name: 'Lani', title: 'Weaver', roam: true, look: { skin: 0x7a4a30, hair: 0x2a1a10, hairStyle: 'short', hairLen: 10, tunic: 0x2a7ad8, sleeve: 0x7a4a30, pants: 0x6a4a2c, boots: 0x7a4a30, seed: 97 },
      lines: [
        'The baskets are bamboo from Mistvale. Soak it in the pond first or it splits.',
        'Leafmask carve wood, we weave. Between us, we build everything you see.',
      ],
    },
    {
      id: 'sunfeather-scout', name: 'Tiko', title: 'Scout', roam: true, look: { skin: 0x6e4430, hair: 0x1a120e, hairStyle: 'short', tunic: 0x2aa85a, sleeve: 0x6e4430, pants: 0x4a3420, boots: 0x6e4430, bracer: true, seed: 98 },
      lines: [
        'West of here the Endless Field still rings with steel. We do not go there.',
        'The pass by the ridge road takes you down to the battlefield, if you must.',
      ],
    },
  ],
};

function dressVillage(world, land, spec, J) {
  const v = spec.village;
  const data = land.data;
  const cx = land.x0 + v.cx + 0.5;
  const cz = land.z0 + v.cz + 0.5;
  const gates = gateAngles(spec);
  const nearGate = (a, w) => gates.some((g) => Math.abs(angWrap(a - g)) < w);
  const ptAt = (a, r) => [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  const onPath = (x, z) => {
    const lx = Math.floor(x - land.x0);
    const lz = Math.floor(z - land.z0);
    return lx < 0 || lz < 0 || lx >= W || lz >= W || data.pathMask[lz * W + lx] === 1;
  };
  const put = (parts, x, z, rot, scale, o = {}) => {
    if (!parts) return false;
    if (o.free !== false && !world.free(x, z, o.r ?? 1)) return false;
    world.putAt(parts, x, z, rot, scale, o.opts);
    if (o.collide) world.circle(x, z, o.collide);
    if (o.occ) world.occupy(x, z, o.occ);
    if (o.light) world.lightSpots.push({ x, y: world.heightAt(x, z) + o.light[1], z, color: o.light[0] });
    return true;
  };
  // Doors face the centre of the plaza; a model faces +z, so turn it toward (cx, cz).
  const facing = (x, z) => Math.atan2(cx - x, cz - z);
  const tribe = (world.tribe ||= { villages: [], smoke: [], folk: [] });
  const info = { id: v.id, name: v.name, x: cx, z: cz, r: v.r };
  tribe.villages.push(info);

  // The fire at the heart, with its smoke, a drum and two totems.
  put(pickM(J.tribeFirePit, 0), cx, cz, 0, 1, { r: 1.6, collide: 0.9, occ: 2, light: [0xffa040, 1.4] });
  tribe.smoke.push({ x: cx, y: world.heightAt(cx, cz) + 1.2, z: cz });
  put(pickM(J.tribeDrum, 0), cx + 3.2, cz + 2.6, 0.4, 1, { r: 0.8, collide: 0.6, occ: 0.9 });
  // Log benches around the fire where the village gathers in the evening.
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + 0.3;
    const [x, z] = ptAt(a, 2.9);
    put(pickM(J.tribeBench, 0), x, z, -a - Math.PI / 2, 1, { r: 0.5, collide: 0.45, occ: 0.6 });
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    const [x, z] = ptAt(a, 4.6);
    if (!onPath(x, z)) put(pickM(J.tikiTorch, 0), x, z, 0, 1, { r: 0.4, collide: 0.15, occ: 0.4, light: [0xffa040, 2.3] });
  }

  // The longhouse sits on the side away from the main road, facing in.
  const main = gates[0] ?? 0;
  const lhA = main + Math.PI;
  const [lhx, lhz] = ptAt(lhA, v.r - 7.5);
  const lhRot = facing(lhx, lhz);
  put(pickM(J.tribeLonghouse, 0), lhx, lhz, lhRot, 1, { r: 3, free: false });
  for (const s of [-2.6, 0, 2.6]) {
    const x = lhx + Math.cos(lhRot) * s;
    const z = lhz - Math.sin(lhRot) * s;
    world.circle(x, z, 2.2);
  }
  world.occupy(lhx, lhz, 6.5);
  // Totems flank the longhouse door.
  for (const s of [-1, 1]) {
    const fx = lhx + Math.sin(lhRot) * 4.6 + Math.cos(lhRot) * s * 3.2;
    const fz = lhz + Math.cos(lhRot) * 4.6 - Math.sin(lhRot) * s * 3.2;
    put(pickM(J.tribeTotem, s > 0 ? 0 : 1), fx, fz, lhRot, 1, { r: 0.7, collide: 0.45, occ: 0.8 });
  }

  // Huts around the ring, skipping the gates and the longhouse.
  let hutN = 0;
  const slots = 13;
  for (let k = 0; k < slots; k++) {
    const a = main + ((k + 0.5) / slots) * TAU;
    if (nearGate(a, 0.42) || Math.abs(angWrap(a - lhA)) < 0.62) continue;
    const rr = v.r - 6 + ((k * 7) % 3) * 0.6;
    const [x, z] = ptAt(a, rr);
    if (onPath(x, z)) continue;
    const stilt = (k + v.cx) % 3 === 0;
    const parts = stilt ? pickM(J.tribeStiltHut, k) : pickM(J.tribeHut, k);
    if (!put(parts, x, z, facing(x, z), 0.94 + (k % 3) * 0.05, { r: 3.2, collide: 2.3, occ: 3.4 })) continue;
    hutN++;
    // A cluster of pots or a drying rack beside some of the doors.
    const side = a + (k % 2 ? 0.28 : -0.28);
    const [px, pz] = ptAt(side, rr - 3.6);
    if (k % 3 === 1) put(pickM(J.tribeRack, 0), px, pz, facing(px, pz) + Math.PI / 2, 1, { r: 1.4, collide: 0.5, occ: 1.4 });
    else put(pickM(J.tribePots, 0), px, pz, a, 1, { r: 0.9, collide: 0.5, occ: 0.9 });
  }
  info.huts = hutN;
  // A woodpile against the longhouse side, and lush planting along the inside of the fence.
  {
    const [wx, wz] = [lhx + Math.cos(lhRot) * 6.4, lhz - Math.sin(lhRot) * 6.4];
    put(pickM(J.tribeWoodpile, 0), wx, wz, lhRot, 1, { r: 1.4, collide: 0.9, occ: 1.5 });
  }
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * TAU + 0.07;
    if (nearGate(a, 0.3)) continue;
    const [x, z] = ptAt(a, v.r - 1 + (k % 3) * 0.5);
    if (onPath(x, z)) continue;
    const kind = k % 4;
    const parts = kind === 0 ? pickM(J.heliconia, k) : kind === 1 ? pickM(J.tropBush, k) : kind === 2 ? pickM(J.ferns, k) : pickM(J.bigLeaves, k);
    put(parts, x, z, k * 1.3, 0.85, { r: 0.7, occ: 0.6, opts: { cover: true } });
  }

  // Palisade ring with gates where the roads come in.
  const R = v.r + 1.5;
  const segLen = 4.3;
  const nSeg = Math.round((TAU * R) / segLen);
  for (let k = 0; k < nSeg; k++) {
    const a = (k / nSeg) * TAU;
    if (nearGate(a, 0.24)) continue;
    const [x, z] = ptAt(a, R);
    if (onPath(x, z)) continue;
    world.putAt(pickM(J.tribePalisade, 0), x, z, -a - Math.PI / 2, 1);
    world.circle(x, z, 1.1);
    world.circle(x + Math.sin(a) * 1.5, z - Math.cos(a) * 1.5, 0.7);
    world.circle(x - Math.sin(a) * 1.5, z + Math.cos(a) * 1.5, 0.7);
    world.occupy(x, z, 2.2);
  }
  for (const g of gates) {
    const [x, z] = ptAt(g, R + 0.4);
    world.putAt(pickM(J.tribeGate, 0), x, z, -g - Math.PI / 2, 1);
    for (const s of [-1, 1]) {
      const px = x - Math.sin(g) * s * 2.75;
      const pz = z + Math.cos(g) * s * 2.75;
      world.circle(px, pz, 0.35);
      const [tx, tz] = [px + Math.cos(g) * 1.6, pz + Math.sin(g) * 1.6];
      world.putAt(pickM(J.tikiTorch, 0), tx, tz, 0, 1);
      world.circle(tx, tz, 0.15);
      world.lightSpots.push({ x: tx, y: world.heightAt(tx, tz) + 2.3, z: tz, color: 0xffa040 });
    }
    world.occupy(x, z, 3.4);
  }

  // A banana garden just outside the fence, away from the gates.
  for (let k = 0; k < 10; k++) {
    const a = lhA + 0.9 + (k / 10) * 1.3;
    if (nearGate(a, 0.35)) continue;
    const [x, z] = ptAt(a, R + 3.5 + (k % 2) * 2);
    if (!onPath(x, z)) put(pickM(J.bananas, k), x, z, k, 0.85, { r: 1, collide: 0.28, occ: 0.9 });
  }

  // Villagers: the elder and the drummer stand; the rest wander the plaza.
  const roam = [{ x0: cx - 9, z0: cz - 9, x1: cx + 9, z1: cz + 9 }];
  for (const p of VILLAGERS[v.id] || []) {
    const spot = 'tribe-' + p.id;
    // The head of the village waits at the longhouse door; others stand at their posts or wander.
    let [sx, sz] = p.stand ? [cx + p.stand[0], cz + p.stand[1]] : [cx + (hash2(p.look.seed, 1, 3) - 0.5) * 10, cz + (hash2(p.look.seed, 2, 3) - 0.5) * 10];
    if (p.head) [sx, sz] = [lhx + Math.sin(lhRot) * 6.4, lhz + Math.cos(lhRot) * 6.4];
    world.npcSpots[spot] = { x: sx, z: sz };
    tribe.folk.push({
      id: p.id,
      name: p.name,
      title: p.title,
      spot,
      yaw: Math.atan2(cx - sx, cz - sz),
      roam: p.roam ? roam : null,
      scale: p.scale,
      look: p.look,
      lines: p.lines,
    });
  }
}

/** Trees of the neighbouring land near each border, so the treeline changes gradually. */
function dressEdges(world, land, spec) {
  const m = world.models;
  const V = m.volcanic;
  const data = land.data;
  for (let n = 0; n < 160; n++) {
    const lx = 4 + Math.floor(hash2(n, 61, spec.seed) * (W - 8));
    const lz = 4 + Math.floor(hash2(n, 62, spec.seed) * (W - 8));
    const i = lz * W + lx;
    const h = data.H[i];
    if (data.pathMask[i] || h < 1.4 || h > 8 || data.zone[i] === ZONE.WATER) continue;
    if (spec.village && Math.hypot(lx - spec.village.cx, lz - spec.village.cz) < spec.village.r + 4) continue;
    for (const [b, t] of blendAt(spec, lx, lz)) {
      if (hash2(n, 63, spec.seed) > t * 0.8) continue;
      const x = land.x0 + lx + 0.5;
      const z = land.z0 + lz + 0.5;
      if (!world.free(x, z, 1.8)) continue;
      let parts = null;
      if (b === BLEND.meadow) parts = pickM(m.oaks, n);
      else if (b === BLEND.frost) parts = pickM(m.pines, n);
      else if (b === BLEND.ash && V) parts = hash2(n, 64, spec.seed) > 0.5 ? pickM(V.ashTrees, n) : pickM(V.thornBushes, n);
      if (!parts) continue;
      world.putAt(parts, x, z, n * 1.3, 0.85 + hash2(n, 65, spec.seed) * 0.3);
      world.circle(x, z, 0.45);
      world.occupy(x, z, 1.6);
      world.treeDots.push({ x, z });
      break;
    }
  }
}

export function dressNorthJungle(world, land, spec) {
  const J = world.models.jungle;
  if (!J) return;
  const shareProps = world.instanceProps;
  world.instanceProps = true;
  try {
    if (spec.village) dressVillage(world, land, spec, J);
    if (spec.canoe && J.tribeCanoe) {
      const [lx, lz, rot] = spec.canoe;
      const x = land.x0 + lx + 0.5;
      const z = land.z0 + lz + 0.5;
      if (world.free(x, z, 2)) {
        world.putAt(J.tribeCanoe[0], x, z, rot, 1);
        world.circle(x, z, 0.8);
        world.occupy(x, z, 2.6);
      }
    }
    dressEdges(world, land, spec);
  } finally {
    world.instanceProps = shareProps;
  }
  dressJungle(world, land, { ...spec, density: northDensity(spec) });
}

/** Atmosphere drift near the scorched and frozen borders (smoke haze by Ashen Road, chill under Rimefang). */
export function northEmber(spec) {
  return spec.edgeBlend?.w === 'ash' ? (lx) => 0.3 * (1 - smoothstep(0, 30, lx)) : () => 0;
}

export function northChill(spec) {
  return spec.edgeBlend?.e === 'frost' ? (lx) => 0.3 * smoothstep(W - 31, W - 1, lx) : () => 0;
}
