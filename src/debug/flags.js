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
/** Dry south-east shore on the Oasis (greenbowl) tile, pool in view to the north-west. */
const OASIS_DRY = { x: OASIS.x + 14, z: OASIS.z + OASIS.r + OASIS.shore + 8 };

export function oasisHudName(x, z) {
  const d = Math.hypot(Number(x) - OASIS.x, Number(z) - OASIS.z);
  if (d <= OASIS.r + OASIS.shore + 18) return 'Oasis';
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
  for (const dist of [2.6, 2.2, 3.0, 3.4, 2.0]) {
    const x = p.x + ux * dist;
    const z = p.z + uz * dist;
    const w = game.world;
    if (w?.playable && !w.playable(x, z)) continue;
    if (w?.isWater?.(x, z)) continue;
    spot = { x, z, dist };
    break;
  }
  if (!spot) spot = { x: p.x + ux * 2.6, z: p.z + uz * 2.6, dist: 2.6 };
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
  if (!P || P.dead || P.state !== 'idle') return false;
  const reach = Number(game.carried?.(game.items?.[game.sel])?.reach) || 2.6;
  const m = game.nearestMonster?.(reach + 0.35, P.pos);
  if (!m || !monsterIsHostile(m.type)) return false;
  const d = Math.hypot(m.x - P.pos.x, m.z - P.pos.z) || 1;
  P.yaw = Math.atan2((m.x - P.pos.x) / d, (m.z - P.pos.z) / d);
  game.doAttack?.();
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

export function spawnDebugMonster(game, search) {
  if (debugOnlineBlocked(game, search)) return debugOnlineReject();
  if (!game?.debug || !game.spawner?.spawn || !game.player?.pos) return null;
  ensureDebugStarterWeapon(game);
  const type = pickDebugMonsterType(game) || 'slime';
  const hostile = monsterIsHostile(type) ? type : 'slime';
  const spot = debugSpawnSpot(game);
  const mon = game.spawner.spawn(hostile, spot.x, spot.z, true);
  if (game.cam) game.cam.pitch = Math.max(Number(game.cam.pitch) || 0, 0.92);
  game.hud?.toast?.(`DEBUG · ${mon?.name || hostile}`, 1800);
  return mon;
}

function bindDebugSpawn(game) {
  if (game._debugSpawnBound) return;
  game._debugSpawnBound = true;
  game.debugSpawn = () => spawnDebugMonster(game);
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'F9' || e.repeat) return;
    if (!game.debug || debugOnlineBlocked(game)) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    spawnDebugMonster(game);
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
  if (spot.id === 'oasis') {
    const yaw = Math.atan2(OASIS.x - spot.x, OASIS.z - spot.z);
    game.player.yaw = yaw;
    if (game.cam) {
      game.cam.targetYaw = yaw + Math.PI;
      game.cam.yaw = yaw + Math.PI;
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
