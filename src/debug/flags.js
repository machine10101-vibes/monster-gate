/**
 * Tester debug tools. Inert unless the page is opened with ?debug=1.
 * Never writes the hunter save. See docs/debug-flags.md.
 */

import { GEAR, MONSTERS } from '../data/catalog.js';
import { QUESTS } from '../data/quests.js';
import { PORTAL_IDS } from '../data/portals.js';
import { SKILL_ORDER, xpForLevel } from '../data/gathering.js';
import { freezeSaves } from '../systems/saveio.js';
import { originOf, TILES } from '../world/tiles.js';

const MINE = { rampX0: 88, z: 66 };
const OASIS = { x: 0, z: 432 };
const SAND_MINE = { x: -74, z: 514 };

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
  oasis: { x: OASIS.x + 12, z: OASIS.z },
  deepwell: { x: SAND_MINE.x + 22, z: SAND_MINE.z },
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
  const enabled = q.get('debug') === '1';
  const tp = enabled ? String(q.get('tp') || '').trim() : '';
  const unlock = enabled && q.get('unlock') === '1';
  return { enabled, tp, unlock };
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
}

/**
 * Mount debug tools. No-ops unless ?debug=1.
 * Freezes hunter/roster writes for the rest of the session.
 */
export function attachDebug(game, search) {
  const src = search ?? (typeof location !== 'undefined' ? location.search : '');
  const flags = parseDebugFlags(src);
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
  return flags;
}
