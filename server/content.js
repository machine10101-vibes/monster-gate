/**
 * Server-owned World 1 content: tile names, knight / Darksycle spawns,
 * and shared gathering nodes. Coordinates follow the live client
 * (src/world/tiles.js, volcanic.js, keeps.js, cave.js, gatherSite.js,
 * entities/monsters.js). Tree offsets are a simplified grove layout;
 * mine, fish, and boss posts match the client.
 *
 * Combat resolution and inventory credit are TODO: this module syncs
 * spawn positions, HP, and node ready/respawn state only.
 */

import { cleanZone } from './protocol.js';

export const TILE_SIZE = 144;
export const STARTER_TX = 4;
export const STARTER_TZ = 5;

/** Copied from src/world/tiles.js NAMES so zone strings match the map. */
export const TILE_NAMES = [
  ['Frostwall', 'High Ice', 'Snowgate', 'White Pass', 'North Peak', 'Stormhorn', 'Glasscrag', 'Pale Spire', 'Frostspire', 'Last Snow'],
  ['Greymarch', 'Pinehollow', 'Cinderfall', 'Hellspire', 'Northwood', 'Hartwood', 'Ashgrove', 'Elmshade', 'Coldridge', 'Windcrag'],
  ['Fellwatch', 'Bramblewood', 'Dawnspire', 'The Endless Field', 'Gatewood', 'Wyrmwood', 'Darkbough', 'Emberwood', 'Cinderhill', 'Ashfall'],
  ['Riverwatch', 'Silverbend', 'Fernwood', 'Ashen Road', 'Goldglade', 'Meadowrise', 'Rimefang Mesa', 'Glimmerfrost', 'Dusthill', 'Redcrag'],
  ['Westwater', 'Millrace', 'Buttermead', 'Harefield', 'Northleas', 'Goldmead', 'Snowfall', 'Icewind Reach', 'Saltpan', 'Far Leas'],
  ['Westmead', 'Silverrun', 'Mirrormere', 'Brookside', 'Oakhollow', 'Eastleas', 'Old Acre', 'Harrowfen', 'Reedbank', 'Frogmarsh'],
  ['Sandcliff', 'Runmouth', 'Southmead', 'Longacre', 'Southford', 'Hayfield', 'Greenrows', 'Blackfen', 'Broken Arch', 'Old Stones'],
  ['Seagate', 'Shellbeach', 'Dunes', 'Sunspill', 'Glassroad', 'Reedford', 'Saltfen', 'Drowned Hall', 'Sunken Yard', 'Grey Sea'],
  ['Open Water', 'West Deep', 'Pale Shore', 'Deepwell', 'Greenbowl', 'Sedge', 'Ruinwater', 'Black Reef', 'South Deep', 'East Deep'],
  ['Far West', 'Whale Road', 'Glass Sea', 'South Strand', 'Midsea', 'East Strand', 'Kelp', 'Quiet Deep', 'Last Water', 'Far East'],
];

export const STATS = {
  darksycledragon: { name: 'Darksycle Dragon', level: 7, hp: 155, dmg: 5, respawn: 45 },
  demonknight: { name: 'Demon Knight', level: 11, hp: 320, dmg: 5, respawn: 30 },
  holyknight: { name: 'Holy Knight', level: 11, hp: 300, dmg: 5, respawn: 30 },
  keepwarden: { name: 'Keep Warden', level: 12, hp: 420, dmg: 7, respawn: 40 },
};

export const NODE_RESPAWN = {
  copper: 11, tin: 11, iron: 16, coal: 22, mithril: 36, adamant: 48,
  birch: 9, oak: 15, maple: 24,
  shrimp: 8, trout: 8, pikeminnow: 10, salmon: 10,
};

const KEEP_HALF = 34;

function keepFrame(cx, cz, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
}

function tileOrigin(tx, tz) {
  return { x: (tx - STARTER_TX) * TILE_SIZE, z: (tz - STARTER_TZ) * TILE_SIZE };
}

function keepPosts(tx, tz, localCx, localCz, theta) {
  const land = tileOrigin(tx, tz);
  const cx = land.x + localCx + 0.5;
  const cz = land.z + localCz + 0.5;
  const at = keepFrame(cx, cz, theta);
  const H = KEEP_HALF;
  const locals = [[-9, 10], [9, 10], [0, 22], [-16, H + 8], [16, H + 8], [0, H + 16]];
  return { cx, cz, posts: locals.map(([lx, lz]) => at(lx, lz)) };
}

export function zoneAt(x, z, realm) {
  if (realm === 'cave' || (x >= 800 && x < 840 && z >= 800 && z < 832)) return 'cave';
  const tx = STARTER_TX + Math.floor(Number(x) / TILE_SIZE);
  const tz = STARTER_TZ + Math.floor(Number(z) / TILE_SIZE);
  return TILE_NAMES[tz]?.[tx] || 'Oakhollow';
}

export function realmOf(zone) {
  return zone === 'cave' ? 'cave' : 'over';
}

export function spawnPoseFromRow(row, hello = {}) {
  const state = row?.state && typeof row.state === 'object' ? row.state : {};
  const hunter = state.hunter && typeof state.hunter === 'object' ? state.hunter : {};
  const x = Number.isFinite(hunter.x) ? hunter.x : Number.isFinite(row?.x) ? row.x : 72;
  const y = Number.isFinite(hunter.y) ? hunter.y : Number.isFinite(row?.y) ? row.y : 3.2;
  const z = Number.isFinite(hunter.z) ? hunter.z : Number.isFinite(row?.z) ? row.z : 72.5;
  const yaw = Number.isFinite(hunter.yaw) ? hunter.yaw : 0;
  const realm = hunter.realm === 'cave' ? 'cave' : 'over';
  return {
    name: hello.name || row?.name || state.name || 'Hunter',
    x,
    y,
    z,
    yaw,
    move: 0,
    anim: 0,
    held: hello.held || state.held || 'blade',
    sheath: hello.sheath ?? state.sheath ?? null,
    look: hello.look || state.look || null,
    armor: hello.armor || state.armor || {},
    zone: hello.zone && hello.zone !== 'Oakhollow' ? cleanZone(hello.zone) : zoneAt(x, z, realm),
    hp: Number.isFinite(hunter.hp) ? hunter.hp : 20,
    movedAt: 0,
  };
}

export function persistStateFromSession(session) {
  const realm = realmOf(session.zone);
  return {
    name: session.name,
    look: session.look,
    armor: session.armor && typeof session.armor === 'object' ? session.armor : {},
    hunter: {
      x: session.x,
      y: session.y,
      z: session.z,
      yaw: session.yaw,
      hp: session.hp,
      realm,
    },
  };
}

function monster(id, type, x, z, y, zone, extras = {}) {
  const stats = STATS[type];
  return {
    id,
    type,
    name: stats.name,
    x,
    y: y ?? 3.2,
    z,
    yaw: extras.yaw || 0,
    hp: stats.hp,
    maxHp: stats.hp,
    level: stats.level,
    dmg: stats.dmg,
    zone,
    respawn: stats.respawn,
    respawnAt: 0,
    homeX: x,
    homeZ: z,
    homeY: y ?? 3.2,
  };
}

export function createMonsters() {
  const list = [];
  const demon = keepPosts(3, 1, 72, 66, 0); // Hellspire
  demon.posts.forEach((p, i) => {
    list.push(monster(`demonknight_${i}`, 'demonknight', p[0], p[1], 3.6, 'Hellspire'));
  });
  const holy = keepPosts(2, 2, 72, 72, Math.PI / 2); // Dawnspire
  holy.posts.forEach((p, i) => {
    list.push(monster(`holyknight_${i}`, 'holyknight', p[0], p[1], 3.6, 'Dawnspire'));
  });
  const war = tileOrigin(3, 2);
  list.push(monster('keepwarden_0', 'keepwarden', war.x + 72.5, war.z + 72.5, 3.6, 'The Endless Field'));
  list.push(monster('darksycle_0', 'darksycledragon', 820, 810, 3, 'cave'));
  return list;
}

function node(id, kind, type, x, z, y, zone, respawn) {
  return {
    id, kind, type, x, z, y: y ?? 2, zone,
    ready: true, respawn: respawn ?? NODE_RESPAWN[type] ?? 12, respawnAt: 0,
  };
}

function mineRocks() {
  const MINE = { x: 98, z: 66 };
  const spots = [
    { type: 'copper', a: -62, r: 3.7 },
    { type: 'copper', a: 4, r: 3.9 },
    { type: 'copper', a: 66, r: 3.7 },
    { type: 'tin', a: -124, r: 3.5 },
    { type: 'tin', a: 126, r: 3.5 },
    { type: 'iron', a: 180, r: 2.4 },
  ];
  return spots.map((spot, i) => {
    const ang = (spot.a * Math.PI) / 180;
    const x = MINE.x + Math.cos(ang) * spot.r;
    const z = MINE.z + Math.sin(ang) * spot.r;
    return node(`ore_${spot.type}_${i}`, 'mine', spot.type, x, z, 1, 'Oakhollow', NODE_RESPAWN[spot.type]);
  });
}

function groveTrees() {
  const groves = [
    { type: 'birch', x: 50, z: 74, count: 5 },
    { type: 'oak', x: 48, z: 63, count: 4 },
    { type: 'maple', x: 43, z: 54, count: 4 },
  ];
  const offsets = [[0, 0], [3.2, 1.4], [-2.8, 2.6], [2.4, -3.1], [-3.4, -1.8]];
  const out = [];
  for (const grove of groves) {
    for (let i = 0; i < grove.count; i++) {
      const [dx, dz] = offsets[i];
      out.push(node(
        `tree_${grove.type}_${i}`,
        'chop',
        grove.type,
        grove.x + dx,
        grove.z + dz,
        3,
        'Oakhollow',
        NODE_RESPAWN[grove.type],
      ));
    }
  }
  return out;
}

function fishSpots() {
  const lake = [
    { kind: 'net', type: 'shrimp', x: 56.6, z: 98.6 },
    { kind: 'net', type: 'shrimp', x: 60.4, z: 103.4 },
    { kind: 'rod', type: 'trout', x: 51.9, z: 101 },
    { kind: 'rod', type: 'trout', x: 57.6, z: 105.6 },
  ].map((s, i) => node(`fish_lake_${i}`, s.kind, s.type, s.x, s.z, 0.35, 'Oakhollow', NODE_RESPAWN[s.type]));
  const river = [
    { kind: 'net', type: 'pikeminnow', z: 190.5, x: 42.9 },
    { kind: 'rod', type: 'salmon', z: 207.5, x: 41.2 },
    { kind: 'net', type: 'pikeminnow', z: 224.5, x: 42.9 },
    { kind: 'rod', type: 'salmon', z: 241.5, x: 41.2 },
    { kind: 'net', type: 'pikeminnow', z: 258.5, x: 42.9 },
    { kind: 'rod', type: 'salmon', z: 272.5, x: 41.2 },
  ].map((s, i) => node(`fish_river_${i}`, s.kind, s.type, s.x, s.z, 0.35, 'Southford', NODE_RESPAWN[s.type]));
  return [...lake, ...river];
}

export function createNodes() {
  return [...mineRocks(), ...groveTrees(), ...fishSpots()];
}
