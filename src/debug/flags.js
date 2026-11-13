/**
 * Tester debug tools. Inert unless the page is opened with ?debug=1,
 * and always inert when ?mmo=1 is also present. Never writes the hunter save.
 * See docs/debug-flags.md.
 */

import { GEAR, MONSTERS, monsterById } from '../data/catalog.js';
import { QUESTS } from '../data/quests.js';
import { PORTAL_IDS } from '../data/portals.js';
import { SKILL_ORDER, xpForLevel } from '../data/gathering.js';
import { freezeSaves } from '../systems/saveio.js';
import { originOf, TILES } from '../world/tiles.js';
import { DEBUG_STARTER_ID, markDebugGranted } from './transient.js';

const MINE = { rampX0: 88, z: 66 };
const OASIS = { x: 0, z: 432, r: 32, shore: 16 };
const SAND_MINE = { x: -74, z: 514 };
/**
 * Dry south shore on the Oasis tile. The hunter stands on the bottom side of
 * the pool relative to the camera so the water sits in the upper-middle of
 * the frame, above --hud-clear-bottom, instead of under the hotbar fade.
 */
const OASIS_DRY = { x: OASIS.x, z: OASIS.z + OASIS.r + 52 };
export const OASIS_CAM = { pitch: 0.30, dist: 22, lookAhead: 20 };
/** ~16 Hunter Blade hits; ~20-30s of steady low-level clicks, faster with auto-attack. */
export const DEBUG_TANK_HP_MUL = 8;
export const DEBUG_TANK_HP_CAP = 160;
export const DEBUG_STARTER_DMG = 9;
export const DEBUG_TANK_AGGRO = 12;
export const DEBUG_TANK_REACH = 2.8;
export const DEBUG_TANK_CADENCE = 1.7;
export const DEBUG_TANK_DMG = 2;

export function oasisHudName(x, z) {
  const d = Math.hypot(Number(x) - OASIS.x, Number(z) - OASIS.z);
  if (d <= OASIS.r + OASIS.shore + 40) return 'Oasis';
  return null;
}

function paramsOf(search) {
  const raw = String(search ?? '');
  const q = raw.startsWith('?') ? raw.slice(1) : raw;
  return new URLSearchParams(q);
}

export const DEBUG_SPOTS = {
  oakhollow: { x: 72, z: 72.5 },
  goldenmeadow: { kind: 'goldmead' },
  greyrock: { x: MINE.rampX0 + 4, z: MINE.z },
  forge: { live: 'forge', x: 86.3, z: 72.8 },
  oasis: { x: OASIS_DRY.x, z: OASIS_DRY.z },
  deepwell: { x: SAND_MINE.x + 22, z: SAND_MINE.z },
  cinderfall: { kind: 'cinderfall' },
  glimmerfrost: { kind: 'glimmerfrost' },
  hellspire: { live: 'demonKeep', kind: 'hellspire' },
  dawnspire: { live: 'holyKeep', kind: 'dawnspire' },
  endlessfield: { live: 'warfield', kind: 'warfield' },
};

export const DEBUG_ALIASES = {
  oak: 'oakhollow',
  town: 'oakhollow',
  goldmead: 'goldenmeadow',
  goldmeadow: 'goldenmeadow',
  'golden meadow': 'goldenmeadow',
  'greyrock pit': 'greyrock',
  greyrockpit: 'greyrock',
  pit: 'greyrock',
  bram: 'forge',
  bramsforge: 'forge',
  "bram's forge": 'forge',
  'brams forge': 'forge',
  greenbowl: 'oasis',
  hellspirekeep: 'hellspire',
  'hellspire keep': 'hellspire',
  dawnspirekeep: 'dawnspire',
  'dawnspire keep': 'dawnspire',
  endless: 'endlessfield',
  warfield: 'endlessfield',
  'endless field': 'endlessfield',
};

export function parseDebugFlags(search = '') {
  const q = paramsOf(search);
  const mmo = q.get('mmo') === '1';
  const wanted = q.get('debug') === '1';
  const enabled = wanted && !mmo;
  const tp = enabled ? String(q.get('tp') || '').trim() : '';
  const unlock = enabled && q.get('unlock') === '1';
  return { enabled, tp, unlock, blocked: wanted && mmo };
}

export function canonicalSpot(raw) {
  const k = String(raw || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (!k) return '';
  const compact = k.replace(/\s+/g, '');
  if (DEBUG_SPOTS[k]) return k;
  if (DEBUG_SPOTS[compact]) return compact;
  if (DEBUG_ALIASES[k]) return DEBUG_ALIASES[k];
  if (DEBUG_ALIASES[compact]) return DEBUG_ALIASES[compact];
  return '';
}

function tileCenter(kind) {
  const tile = TILES.find((t) => t.kind === kind);
  if (!tile) return null;
  const o = originOf(tile);
  return { x: o.x + 72, z: o.z + 72 };
}

/** Resolve a tp key to world x/z. `world` is optional (tests use baked fallbacks). */
export function resolveSpot(raw, world) {
  const id = canonicalSpot(raw);
  if (!id) return null;
  const spec = DEBUG_SPOTS[id];
  if (spec.live && world) {
    const live = world[spec.live];
    if (live && Number.isFinite(Number(live.x)) && Number.isFinite(Number(live.z))) {
      return { id, x: Number(live.x), z: Number(live.z) };
    }
  }
  if (spec.kind) {
    const c = tileCenter(spec.kind);
    if (c) return { id, ...c };
  }
  if (spec.x != null && spec.z != null) return { id, x: spec.x, z: spec.z };
  return null;
}

export function debugSpotKeys() {
  return Object.keys(DEBUG_SPOTS);
}

function showBadge() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('debug-badge')) return;
  const el = document.createElement('div');
  el.id = 'debug-badge';
  el.textContent = 'DEBUG';
  el.title = 'Tester session. The hunter save is not written.';
  document.body.appendChild(el);
  document.body.classList.add('debug-session');
}

export function grantDebugUnlock(progress, journal) {
  if (!progress?.data) return;
  progress.data.seen = { ...progress.data.seen };
  for (const m of MONSTERS) progress.data.seen[m.id] = true;
  progress.data.kills = { ...progress.data.kills };
  for (const m of MONSTERS) {
    if (m.id === 'chicken') continue;
    progress.data.kills[m.id] = Math.max(progress.data.kills[m.id] | 0, 8);
  }
  progress.data.crafted = { ...progress.data.crafted };
  for (const g of GEAR) progress.data.crafted[g.id] = true;
  progress.data.armor = {
    helm: 'darkhelm',
    chest: 'darkchest',
    arms: 'darkarms',
    legs: 'darklegs',
    boots: 'darkboots',
    shield: 'darkshield',
  };
  progress.data.weapon = 'ashenbrand';
  progress.data.xp = { ...progress.data.xp };
  const xp = xpForLevel(40);
  for (const id of SKILL_ORDER) progress.data.xp[id] = Math.max(progress.data.xp[id] || 0, xp);
  progress.data.gold = Math.max(progress.data.gold | 0, 8000);
  progress.data.portals = [...new Set([...(progress.data.portals || []), ...PORTAL_IDS])];
  if (journal?.state) {
    journal.state.quests = journal.state.quests || {};
    for (const q of QUESTS) {
      const prev = journal.state.quests[q.id] || {};
      const keep = q.id === 'keepassault';
      journal.state.quests[q.id] = {
        started: true,
        done: !keep,
        step: keep ? 1 : q.steps.length,
        n: prev.n | 0,
        pages: Array.isArray(prev.pages) ? prev.pages : [],
        unseen: false,
        choice: prev.choice ?? null,
      };
    }
    if (journal.progress?.data) journal.progress.data.journal = journal.state;
  }
}

const ZONE_MOBS = {
  oakhollow: ['slime', 'boar'],
  town: ['slime', 'boar'],
  goldenmeadow: ['slime', 'boar'],
  field: ['slime', 'boar'],
  whispering: ['boar', 'slime'],
  forest: ['boar', 'slime'],
  greystone: ['boar', 'slime'],
  gate: ['slime', 'voidslime', 'wraith'],
  southford: ['slime', 'boar'],
  oasis: ['scorpion', 'sandworm'],
  greenbowl: ['scorpion', 'sandworm'],
  sunspill: ['scorpion', 'sandworm'],
  glassroad: ['scorpion', 'sandworm'],
  deepwell: ['scorpion', 'sandworm'],
  mirrormere: ['tiger', 'raptor', 'pirate'],
  brookside: ['boar', 'slime'],
  silverrun: ['tiger', 'raptor'],
  runmouth: ['cursedpirate', 'pirate'],
  longacre: ['boar', 'slime'],
  cinderfall: ['demonknight'],
  hellspire: ['demonknight'],
  glimmerfrost: ['snowyeti'],
  dawnspire: ['holyknight'],
  endlessfield: ['keepwarden'],
  warfield: ['keepwarden'],
  goldmead: ['slime', 'boar'],
  cave: ['slime', 'wraith'],
  rift: ['voidslime', 'wraith'],
};

function landKindOf(game, x, z) {
  const land = game?.world?.landAt?.(x, z);
  return String(land?.kind || land?.banner?.[1] || '').toLowerCase();
}

export function monsterIsHostile(id) {
  const type = String(id || '');
  if (!type || type === 'chicken') return false;
  const cat = monsterById(type);
  if (cat?.style === 'Passive') return false;
  return true;
}

function firstHostile(list, rank = 0) {
  const ids = (list || []).filter(monsterIsHostile);
  if (!ids.length) return 'slime';
  return ids[Math.min(ids.length - 1, rank > 4 ? ids.length - 1 : rank > 1 ? 1 : 0)] || ids[0];
}

/** Level-appropriate hostile monster id for the hunter's current zone. Never a chicken. */
export function pickDebugMonsterType(game) {
  const p = game?.player?.pos;
  const x = p?.x ?? 72;
  const z = p?.z ?? 73;
  const rank = Math.max(0, game?.rank | 0);
  const realm = game?.world?.realm;
  if (realm === 'cave') return 'slime';
  if (realm === 'rift') return 'voidslime';
  const kind = landKindOf(game, x, z);
  const zoneName = String(game?.zone ?? game?.hud?.el?.area?.textContent ?? '').toLowerCase();
  const compact = zoneName.replace(/\s+/g, '');
  const key = kind || compact;
  const names = Object.keys(ZONE_MOBS).sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (key.includes(name) || zoneName.includes(name) || compact.includes(name)) {
      return firstHostile(ZONE_MOBS[name], rank);
    }
  }
  const zn = game?.world?.zoneAt?.(x, z);
  if (zn === 6) return 'slime';
  if (zn === 1) return 'boar';
  return 'slime';
}

function spawnOffset(game) {
  const p = game.player.pos;
  const yaw = Number(game.player.yaw) || 0;
  const camYaw = Number(game.cam?.yaw ?? yaw);
  const awayX = -Math.sin(camYaw);
  const awayZ = -Math.cos(camYaw);
  const faceX = Math.sin(yaw);
  const faceZ = Math.cos(yaw);
  const x = awayX * 0.7 + faceX * 0.3;
  const z = awayZ * 0.7 + faceZ * 0.3;
  const len = Math.hypot(x, z) || 1;
  return { x: x / len, z: z / len, from: p };
}

export function debugSpawnSpot(game) {
  if (!game?.player?.pos) return null;
  const { x: ux, z: uz, from: p } = spawnOffset(game);
  let spot = null;
  for (const dist of [2.0, 2.2, 2.4, 2.6, 1.8]) {
    const x = p.x + ux * dist;
    const z = p.z + uz * dist;
    const w = game.world;
    if (w?.playable && !w.playable(x, z)) continue;
    if (w?.isWater?.(x, z)) continue;
    spot = { x, z, dist };
    break;
  }
  if (!spot) spot = { x: p.x + ux * 2.2, z: p.z + uz * 2.2, dist: 2.2 };
  return spot;
}

/** Equip the Hunter Blade for this debug session only. Never persisted. */
export function ensureDebugStarterWeapon(game) {
  if (!game?.debug || debugOnlineBlocked(game) || !game.progress?.data) return null;
  const data = game.progress.data;
  if (data.weapon && data.weapon !== DEBUG_STARTER_ID) return null;
  data.crafted = { ...(data.crafted || {}) };
  data.crafted[DEBUG_STARTER_ID] = true;
  data.weapon = DEBUG_STARTER_ID;
  markDebugGranted(data, { weapon: DEBUG_STARTER_ID });
  game.applyGear?.(false);
  game.selectSlot?.(0, true);
  return { id: DEBUG_STARTER_ID, name: 'Hunter Blade' };
}

export function setDebugAutoAttack(game, on) {
  if (!game?.debug || debugOnlineBlocked(game)) return false;
  game.debug.autoAttack = !!on;
  return game.debug.autoAttack;
}

export function tickDebugAutoAttack(game) {
  if (!game?.debug?.autoAttack || debugOnlineBlocked(game)) return false;
  if (game.uiBlocking || !game.started) return false;
  const P = game.player;
  if (!P || P.dead) return false;
  if (P.state === 'attack' || P.state === 'roll' || P.state === 'stagger' || P.state === 'use') return false;
  const from = P.pos || P;
  const it = game.carried?.(game.items?.[game.sel]) || game.items?.[game.sel] || {};
  const reach = Number(it.reach) || 2.6;
  let m = game.nearestMonster?.(reach + 2.4, from);
  if (!m || m.dead) {
    m = (game.monsters || []).find((row) => row?.debugTank && !row.dead) || null;
  }
  if (!m || m.dead) return false;
  if (!m.debugTank && !monsterIsHostile(m.type)) return false;
  const d = Math.hypot(m.x - from.x, m.z - from.z) || 1;
  P.yaw = Math.atan2((m.x - from.x) / d, (m.z - from.z) / d);
  game.doAttack?.();
  return true;
}

export function debugTankHp(base) {
  const n = Math.round(Math.max(1, Number(base) || 18) * DEBUG_TANK_HP_MUL);
  return Math.min(n, DEBUG_TANK_HP_CAP);
}

/** Steady Hunter Blade swings until the tank is dead. Auto-attack is faster. */
export function debugTankKillBudget(hp, { dmg = DEBUG_STARTER_DMG, swingSec = 1.5 } = {}) {
  const swings = Math.ceil(Math.max(1, Number(hp) || 1) / Math.max(1, dmg));
  return { swings, sec: swings * swingSec };
}

/** Always drop a coin on a debug tank so testers see the normal kill/loot path. */
export function grantDebugTankLoot(game, mon) {
  if (!mon?.debugTank || !game) return false;
  const x = Number(mon.x) || 0;
  const y = (Number(mon.y) || 0) + 0.6;
  const z = Number(mon.z) || 0;
  game.dropCoin?.(x, y, z, 4);
  return true;
}

/** World 1 replies with this code if a debug frame ever reaches the socket. */
export const DEBUG_ONLINE_CODE = 'debug';

export function debugOnlineBlocked(game, search) {
  if (game?.mmo || game?.worldView) return true;
  const src = search ?? (typeof location !== 'undefined' ? location.search : '');
  return parseDebugFlags(src).blocked;
}

export function debugOnlineReject() {
  return { ok: false, code: DEBUG_ONLINE_CODE, message: 'Debug tools are offline only.' };
}

export function applyDebugTank(mon) {
  if (!mon) return mon;
  const base = Math.max(1, Number(mon.maxHp || mon.hp || 18));
  const hp = debugTankHp(base);
  mon.maxHp = hp;
  mon.hp = hp;
  mon.debugTank = true;
  mon.debugSpawn = true;
  mon.puppet = false;
  const prev = mon.def || {};
  mon.def = {
    ...prev,
    aggro: Math.max(Number(prev.aggro) || 0, DEBUG_TANK_AGGRO),
    dmg: Math.max(1, Math.min(Number(prev.dmg) || DEBUG_TANK_DMG, DEBUG_TANK_DMG)),
    gold: prev.gold || [3, 6],
  };
  mon.state = 'chase';
  mon.cd = 0.2;
  mon.tankCd = 0.25;
  mon.hitCd = 0;
  const label = String(mon.name || 'Monster').replace(/ \(tank\)$/i, '');
  mon.name = `${label} (tank)`;
  return mon;
}

/** Dedicated melee loop so tank spawns hit even if type-specific AI never connects. */
export function tickDebugTank(game, dt = 1 / 60) {
  if (!game?.debug || debugOnlineBlocked(game)) return 0;
  const P = game.player;
  if (!P || P.dead) return 0;
  let hits = 0;
  for (const m of game.monsters || []) {
    if (!m?.debugTank || m.dead) continue;
    if (m.state === 'idle' || m.state === 'wander' || !m.state) m.state = 'chase';
    const px = P.pos?.x ?? P.x;
    const pz = P.pos?.z ?? P.z;
    const dist = Math.hypot((px ?? 0) - m.x, (pz ?? 0) - m.z);
    const aggro = Number(m.def?.aggro) || DEBUG_TANK_AGGRO;
    if (dist > aggro) continue;
    m.tankCd = (Number(m.tankCd) || 0) - dt;
    if (dist > DEBUG_TANK_REACH) continue;
    if (m.tankCd > 0) continue;
    m.tankCd = DEBUG_TANK_CADENCE;
    const dmg = Math.max(1, Number(m.def?.dmg) || DEBUG_TANK_DMG);
    if (typeof P.hurt === 'function') P.hurt(dmg, m.x, m.z, 4);
    else if (P.hp != null) P.hp = Math.max(0, Number(P.hp) - dmg);
    hits += 1;
  }
  return hits;
}

export function spawnDebugMonster(game, search, opts = {}) {
  if (debugOnlineBlocked(game, search)) return debugOnlineReject();
  if (!game?.debug || !game.spawner?.spawn || !game.player?.pos) return null;
  ensureDebugStarterWeapon(game);
  const type = pickDebugMonsterType(game) || 'slime';
  const hostile = monsterIsHostile(type) ? type : 'slime';
  const spot = debugSpawnSpot(game);
  const mon = game.spawner.spawn(hostile, spot.x, spot.z, true);
  if (opts.tank) applyDebugTank(mon);
  if (mon) mon.debugSpawn = true;
  if (game.cam) game.cam.pitch = Math.max(Number(game.cam.pitch) || 0, 0.92);
  game.hud?.toast?.(`DEBUG · ${mon?.name || hostile}`, 1800);
  return mon;
}

function bindDebugSpawn(game) {
  if (game._debugSpawnBound) return;
  game._debugSpawnBound = true;
  game.debugSpawn = (opts) => spawnDebugMonster(game, undefined, opts);
  game.debugSpawnTank = () => spawnDebugMonster(game, undefined, { tank: true });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'F9' || e.repeat) return;
    if (!game.debug || debugOnlineBlocked(game)) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    spawnDebugMonster(game, undefined, { tank: !!e.shiftKey });
  });
}

export function teleportDebug(game, raw) {
  const spot = resolveSpot(raw, game?.world);
  if (!spot || !game?.player?.pos) return null;
  if (game.world && game.world.realm && game.world.realm !== 'over') {
    game.world.realm = 'over';
    if (game.world.group) game.world.group.visible = true;
    if (game.world.cave?.group) game.world.cave.group.visible = false;
    if (game.world.rift?.group) game.world.rift.group.visible = false;
    if (game.sky) game.sky.indoors = false;
  }
  const y = game.world?.heightAt?.(spot.x, spot.z) ?? 3.2;
  game.player.pos.set(spot.x, y, spot.z);
  if (game.cam) game.cam.lookAhead = 0;
  if (spot.id === 'oasis') {
    const yaw = Math.atan2(OASIS.x - spot.x, OASIS.z - spot.z);
    game.player.yaw = yaw;
    if (game.cam) {
      game.cam.targetYaw = yaw + Math.PI;
      game.cam.yaw = yaw + Math.PI;
      game.cam.pitch = OASIS_CAM.pitch;
      game.cam.targetDist = OASIS_CAM.dist;
      game.cam.dist = OASIS_CAM.dist;
      game.cam.lookAhead = OASIS_CAM.lookAhead;
    }
  }
  game.player.syncObj?.();
  game.snapCamera?.();
  game.world?.revealAround?.(spot.x, spot.z, 64);
  game.hud?.toast?.(`DEBUG · ${spot.id}`, 2200);
  return spot;
}

function applySession(game, flags) {
  if (flags.unlock) {
    grantDebugUnlock(game.progress, game.journal);
    game.rebindFromProgress?.();
  }
  if (flags.tp) teleportDebug(game, flags.tp);
  ensureDebugStarterWeapon(game);
}

/**
 * Mount debug tools. No-ops unless ?debug=1.
 * Freezes hunter/roster writes for the rest of the session.
 */
export function attachDebug(game, search) {
  const src = search ?? (typeof location !== 'undefined' ? location.search : '');
  const flags = parseDebugFlags(src);
  if (flags.blocked) {
    console.warn('[Monster Gate] Debug flags (?debug=1, &tp=, &unlock=1, spawn, F9) are ignored while ?mmo=1 is present, so the world-view session is not teleported, unlocked, spawned, or badged. World 1 rejects debug messages with error code debug.');
    return null;
  }
  if (!flags.enabled) return null;
  freezeSaves(true);
  if (game.progress) game.progress.sessionOnly = true;
  game.debug = flags;
  showBadge();
  const start = game.start?.bind(game);
  if (start && !game._debugStartWrapped) {
    game._debugStartWrapped = true;
    game.start = (...args) => {
      start(...args);
      if (game.started) applySession(game, flags);
    };
  }
  if (game.started) applySession(game, flags);
  if (typeof window !== 'undefined') bindDebugSpawn(game);
  return flags;
}
