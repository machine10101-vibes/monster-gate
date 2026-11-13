/**
 * Character state for the world server.
 *
 * Field names follow the local hunt JSON in src/systems/progress.js so a
 * guest or account save can be imported once. Convenience aliases
 * (position, inventory, equipment, bank, quests) are accepted on write
 * and flattened back to those local-save names.
 */

import { ARMOR_SLOTS, GEAR, MATERIALS, MONSTERS, gearById } from '../../src/data/catalog.js';
import {
  ARROW_TYPES,
  GOODS,
  MAX_LEVEL,
  QUIVER_MAX,
  SKILL_ORDER,
  xpForLevel,
} from '../../src/data/gathering.js';
import { PORTAL_IDS } from '../../src/data/portals.js';
import { QUESTS } from '../../src/data/quests.js';
import { CLASSES, SKILLS } from '../../src/data/skills.js';
import { invalid } from './errors.js';
import { cleanName, nameProblem, requireName } from './names.js';

export const STORAGE_SLOTS = 30;
export const SKILL_POINT_PER_KILLS = 8;
export const MAX_GOLD = 1_000_000;
export const MAX_STACK = 99_999;
export const MAX_KILLS = 10_000;
export const MAX_STATE_BYTES = 262_144;
export const MAX_HP = 200;
export const MAX_MANA = 400;
export const MAX_STAMINA = 400;
export const DEFAULT_POS = { zone: 'over', x: 72, y: 3, z: 72.5, yaw: 0 };
export const WORLD_BOUNDS = { minX: -800, maxX: 1000, minY: -40, maxY: 120, minZ: -800, maxZ: 900 };
export const ZONES = new Set(['over', 'cave']);
export const POTION_IDS = new Set(['potion', 'manapotion']);
export const LOOK_LIMITS = { skin: 5, hair: 7, style: 4, tunic: 7 };
export const DEFAULT_LOOK = { skin: 1, hair: 1, style: 0, tunic: 0, beard: false };

const GEAR_IDS = new Set(GEAR.map((g) => g.id));
const MONSTER_IDS = new Set(MONSTERS.map((m) => m.id));
const MATERIAL_IDS = new Set(Object.keys(MATERIALS));
const GOOD_IDS = new Set(Object.keys(GOODS));
const XP_CAP = xpForLevel(MAX_LEVEL);

const clampNum = (n, lo, hi, fallback = 0) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(hi, Math.max(lo, v));
};

const clampInt = (n, lo, hi, fallback = 0) => Math.round(clampNum(n, lo, hi, fallback));

export function skillPointsEarned(classId, kills, chicken) {
  if (!classId) return 0;
  return 2 + Math.floor(Math.max(0, (kills | 0) - (chicken | 0)) / SKILL_POINT_PER_KILLS);
}

export function blankState(name = 'Hunter', look = DEFAULT_LOOK) {
  const pos = { ...DEFAULT_POS };
  return {
    name: cleanName(name).slice(0, 14) || 'Hunter',
    look: cleanLook(look),
    gold: 0,
    xp: {},
    goods: {},
    materials: {},
    stock: {},
    storage: emptyStorage(),
    armor: {},
    weapon: null,
    ammo: null,
    quiverLoad: { id: null, n: 0 },
    skills: { classId: null, learned: {}, equipped: [null, null, null], attrs: {}, weapons: {} },
    seen: {},
    kills: {},
    crafted: { knife: true },
    portals: [],
    journal: { quests: {}, activity: [], challengeNew: 0 },
    hunter: {
      x: pos.x,
      z: pos.z,
      yaw: pos.yaw,
      hp: 20,
      mana: 32,
      stamina: 100,
      rank: 0,
      quest: null,
      realm: pos.zone,
    },
    last_seen: null,
    importedAt: null,
    savedAt: 0,
  };
}

/** Shallow patch onto a previous hunt so partial world-server writes keep bag/xp. */
export function mergeState(base, patch) {
  const src = base && typeof base === 'object' ? base : {};
  const next = { ...src, ...patch };
  for (const key of ['hunter', 'xp', 'goods', 'materials', 'stock', 'armor', 'kills', 'seen', 'crafted', 'look']) {
    if (patch?.[key] && typeof patch[key] === 'object' && !Array.isArray(patch[key]) && src[key] && typeof src[key] === 'object') {
      next[key] = { ...src[key], ...patch[key] };
    }
  }
  if (patch?.skills && src.skills) {
    next.skills = {
      ...src.skills,
      ...patch.skills,
      learned: { ...(src.skills.learned || {}), ...(patch.skills.learned || {}) },
      attrs: { ...(src.skills.attrs || {}), ...(patch.skills.attrs || {}) },
      weapons: { ...(src.skills.weapons || {}), ...(patch.skills.weapons || {}) },
    };
  }
  if (patch?.journal && src.journal) {
    next.journal = {
      ...src.journal,
      ...patch.journal,
      quests: { ...(src.journal.quests || {}), ...(patch.journal.quests || {}) },
    };
  }
  if (patch?.inventory && src) {
    next.goods = { ...(src.goods || {}), ...(patch.inventory.goods || next.goods || {}) };
    next.materials = { ...(src.materials || {}), ...(patch.inventory.materials || next.materials || {}) };
    next.stock = { ...(src.stock || {}), ...(patch.inventory.stock || next.stock || {}) };
  }
  return next;
}

export function sanitizeState(raw, { importMode = false } = {}) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw invalid('Character state must be an object.');
  }
  const hunt = unwrapHunt(raw);
  const pos = readPosition(hunt);
  const inv = readInventory(hunt);
  const name = readName(hunt.name, importMode);
  const kills = normalizeKills(hunt.kills);
  const skills = clampSkills(normalizeSkills(hunt.skills), kills, importMode);
  const crafted = normalizeCrafted(hunt.crafted);
  const equipment = readEquipment(hunt, crafted);
  const journal = normalizeJournal(hunt.journal || hunt, importMode);
  const hunter = normalizeHunter(hunt.hunter, pos);
  const state = {
    name,
    look: cleanLook(hunt.look),
    gold: clampInt(hunt.gold, 0, MAX_GOLD, 0),
    xp: normalizeXp(hunt.xp),
    goods: inv.goods,
    materials: inv.materials,
    stock: inv.stock,
    storage: normalizeStorage(hunt.bank || hunt.storage),
    armor: equipment.armor,
    weapon: equipment.weapon,
    ammo: equipment.ammo,
    quiverLoad: equipment.quiverLoad,
    skills,
    seen: normalizeSeen(hunt.seen, kills),
    kills,
    crafted,
    portals: normalizePortals(hunt.portals),
    journal,
    hunter,
    last_seen: normalizeTime(hunt.last_seen),
    importedAt: hunt.importedAt ? clampInt(hunt.importedAt, 0, Date.now() + 60_000, 0) || null : null,
    savedAt: clampInt(hunt.savedAt, 0, Date.now() + 60_000, 0),
  };
  assertSize(state);
  return state;
}

/** Pull a single hunt out of a Progress blob or a roster-shaped guild record. */
export function extractLocalHunt(localSaveJson) {
  const raw = parseSave(localSaveJson);
  if (raw.roster && Array.isArray(raw.roster.chars)) {
    const chars = raw.roster.chars.filter((c) => c && typeof c === 'object');
    const lastId = raw.roster.last;
    const chosen = chars.find((c) => c.id === lastId) || chars[0];
    if (!chosen) throw invalid('That roster has no characters to import.');
    const hunt = chosen.hunt && typeof chosen.hunt === 'object' && !Array.isArray(chosen.hunt)
      ? chosen.hunt
      : {};
    return {
      ...hunt,
      name: chosen.name,
      look: chosen.look,
      savedAt: Number(hunt.savedAt) || Number(raw.savedAt) || 0,
    };
  }
  if (raw.progress && typeof raw.progress === 'object' && !Array.isArray(raw.progress)) {
    return { ...raw.progress, name: raw.name, look: raw.look };
  }
  return raw;
}

export function columnsFromState(state) {
  const hunter = state.hunter || {};
  return {
    name: state.name,
    zone: hunter.realm === 'cave' ? 'cave' : 'over',
    x: hunter.x,
    y: Number.isFinite(Number(hunter.y)) ? Number(hunter.y) : DEFAULT_POS.y,
    z: hunter.z,
    gold: state.gold | 0,
    last_seen: state.last_seen,
    imported_at: state.importedAt ? new Date(state.importedAt).toISOString() : null,
  };
}

export function characterView(row) {
  if (!row) return null;
  const state = sanitizeState(row.state || blankState(row.name));
  if (row.name) state.name = requireName(row.name);
  return {
    userId: row.user_id,
    name: state.name,
    version: Number(row.version) || 1,
    zone: row.zone || state.hunter.realm,
    x: Number.isFinite(Number(row.x)) ? Number(row.x) : state.hunter.x,
    y: Number.isFinite(Number(row.y)) ? Number(row.y) : DEFAULT_POS.y,
    z: Number.isFinite(Number(row.z)) ? Number(row.z) : state.hunter.z,
    gold: Number.isFinite(Number(row.gold)) ? Number(row.gold) : state.gold,
    last_seen: row.last_seen || state.last_seen,
    importedAt: row.imported_at ? Date.parse(row.imported_at) || state.importedAt : state.importedAt,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    state,
  };
}

function parseSave(value) {
  if (typeof value === 'string') {
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw invalid('Local save JSON could not be parsed.');
    }
    return parseSave(parsed);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw invalid('Local save must be a JSON object.');
  }
  return value;
}

function unwrapHunt(raw) {
  if (raw.roster || raw.progress) return extractLocalHunt(raw);
  return raw;
}

function readName(value, importMode) {
  if (!value) return 'Hunter';
  if (!importMode) return requireName(value);
  try {
    return requireName(value);
  } catch {
    const cleaned = cleanName(value).replace(/[^A-Za-z' -]/g, '').trim().slice(0, 14);
    return nameProblem(cleaned) ? 'Hunter' : cleaned;
  }
}

function readPosition(raw) {
  const pos = raw.position && typeof raw.position === 'object' ? raw.position : {};
  const hunter = raw.hunter && typeof raw.hunter === 'object' ? raw.hunter : {};
  const zoneRaw = pos.zone || hunter.realm || raw.zone || DEFAULT_POS.zone;
  const zone = ZONES.has(zoneRaw) ? zoneRaw : DEFAULT_POS.zone;
  const x = clampNum(pos.x ?? hunter.x ?? raw.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX, DEFAULT_POS.x);
  const y = clampNum(pos.y ?? hunter.y ?? raw.y, WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY, DEFAULT_POS.y);
  const z = clampNum(pos.z ?? hunter.z ?? raw.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ, DEFAULT_POS.z);
  const yaw = clampNum(pos.yaw ?? hunter.yaw ?? raw.yaw, -Math.PI * 4, Math.PI * 4, 0);
  return { zone, x, y, z, yaw };
}

function readInventory(raw) {
  const bag = raw.inventory && typeof raw.inventory === 'object' ? raw.inventory : raw;
  return {
    goods: normalizeGoods(bag.goods),
    materials: normalizeCountMap(bag.materials, MATERIAL_IDS),
    stock: normalizeCountMap(bag.stock, POTION_IDS, 99),
  };
}

function readEquipment(raw, crafted) {
  const gear = raw.equipment && typeof raw.equipment === 'object' ? raw.equipment : raw;
  const armor = {};
  const src = gear.armor && typeof gear.armor === 'object' ? gear.armor : {};
  for (const slot of ARMOR_SLOTS) {
    const id = src[slot];
    const g = gearById(id);
    if (g && g.type === 'armor' && g.slot === slot && crafted[id]) armor[slot] = id;
  }
  const weaponId = gear.weapon;
  const weaponGear = gearById(weaponId);
  const weapon = weaponGear && weaponGear.type === 'weapon' && crafted[weaponId] ? weaponId : null;
  const ammo = ARROW_TYPES.includes(gear.ammo) ? gear.ammo : null;
  const quiverLoad = normalizeLoad(gear.quiverLoad, ammo);
  return { armor, weapon, ammo, quiverLoad };
}

function normalizeHunter(raw, pos) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const quest = src.quest && typeof src.quest === 'object' ? src.quest : null;
  const text = quest ? String(quest.text || '').slice(0, 80) : '';
  return {
    x: pos.x,
    y: pos.y,
    z: pos.z,
    yaw: pos.yaw,
    hp: clampInt(src.hp, 0, MAX_HP, 20),
    mana: clampInt(src.mana, 0, MAX_MANA, 32),
    stamina: clampInt(src.stamina, 0, MAX_STAMINA, 100),
    rank: clampInt(src.rank, 0, 6, 0),
    quest: text ? { text, n: clampInt(quest.n, 0, 999, 0), total: clampInt(quest.total, 1, 99, 5) } : null,
    realm: pos.zone,
  };
}

function normalizeXp(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const id of SKILL_ORDER) {
      const n = Number(raw[id]);
      if (n > 0 && Number.isFinite(n)) out[id] = Math.min(XP_CAP, Math.round(n * 10) / 10);
    }
  }
  return out;
}

function normalizeGoods(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    const src = { ...raw };
    const oldShafts = src.arrow_shaft | 0;
    if (oldShafts > 0) src.birch_shaft = (src.birch_shaft | 0) + oldShafts;
    for (const id of GOOD_IDS) {
      const n = clampInt(src[id], 0, MAX_STACK, 0);
      if (n > 0) out[id] = n;
    }
  }
  return out;
}

function normalizeCountMap(raw, allowed, cap = MAX_STACK) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const id of allowed) {
      const n = clampInt(raw[id], 0, cap, 0);
      if (n > 0) out[id] = n;
    }
  }
  return out;
}

function normalizeKills(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const id of MONSTER_IDS) {
      const n = clampInt(raw[id], 0, MAX_KILLS, 0);
      if (n > 0) out[id] = n;
    }
  }
  return out;
}

function normalizeSeen(raw, kills) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const id of MONSTER_IDS) {
      if (raw[id] || kills[id]) out[id] = true;
    }
  } else {
    for (const id of Object.keys(kills)) out[id] = true;
  }
  return out;
}

function normalizeCrafted(raw) {
  const out = { knife: true };
  if (raw && typeof raw === 'object') {
    for (const id of GEAR_IDS) {
      if (raw[id]) out[id] = true;
    }
  }
  return out;
}

function normalizeSkills(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const classId = CLASSES[src.classId] ? src.classId : null;
  const learned = {};
  if (classId && src.learned && typeof src.learned === 'object') {
    for (const path of CLASSES[classId].paths) {
      for (const skill of path.skills) {
        if (!src.learned[skill.id]) break;
        learned[skill.id] = true;
      }
    }
  }
  const equipped = [null, null, null];
  const used = new Set();
  if (Array.isArray(src.equipped)) {
    for (let i = 0; i < 3; i++) {
      const id = src.equipped[i];
      const sk = SKILLS[id];
      if (!sk || !learned[id] || sk.kind === 'passive' || used.has(id)) continue;
      used.add(id);
      equipped[i] = id;
    }
  }
  const attrs = {};
  if (classId && src.attrs && typeof src.attrs === 'object') {
    for (const def of CLASSES[classId].attributes || []) {
      const n = src.attrs[def.id] | 0;
      if (n > 0) attrs[def.id] = Math.min(def.max, n);
    }
  }
  const weapons = {};
  if (classId && src.weapons && typeof src.weapons === 'object') {
    for (const def of CLASSES[classId].weapons || []) {
      const n = src.weapons[def.id] | 0;
      if (n > 0) weapons[def.id] = Math.min(def.max, n);
    }
  }
  return { classId, learned, equipped, attrs, weapons };
}

function clampSkills(skills, kills, importMode) {
  if (!skills.classId) return skills;
  const total = Object.values(kills).reduce((n, v) => n + (v | 0), 0);
  const chicken = kills.chicken | 0;
  const earned = skillPointsEarned(skills.classId, total, chicken);
  let spent = 0;
  const kept = {};
  for (const path of CLASSES[skills.classId].paths) {
    for (const skill of path.skills) {
      if (!skills.learned[skill.id]) break;
      if (spent + skill.cost > earned) break;
      kept[skill.id] = true;
      spent += skill.cost;
    }
  }
  const attrs = {};
  for (const def of CLASSES[skills.classId].attributes || []) {
    let n = skills.attrs[def.id] | 0;
    while (n > 0 && spent + 1 > earned) n -= 1;
    if (n > 0) {
      attrs[def.id] = n;
      spent += n;
    }
  }
  const weapons = {};
  for (const def of CLASSES[skills.classId].weapons || []) {
    let n = skills.weapons[def.id] | 0;
    while (n > 0 && spent + 1 > earned) n -= 1;
    if (n > 0) {
      weapons[def.id] = n;
      spent += n;
    }
  }
  const equipped = [null, null, null];
  const used = new Set();
  for (let i = 0; i < 3; i++) {
    const id = skills.equipped[i];
    const sk = SKILLS[id];
    if (!sk || !kept[id] || sk.kind === 'passive' || used.has(id)) continue;
    used.add(id);
    equipped[i] = id;
  }
  if (importMode && spent > earned) {
    return { classId: skills.classId, learned: {}, equipped: [null, null, null], attrs: {}, weapons: {} };
  }
  return { classId: skills.classId, learned: kept, equipped, attrs, weapons };
}

function normalizeJournal(raw, importMode = false) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const quests = {};
  const srcQuests = src.quests && typeof src.quests === 'object' ? src.quests : {};
  for (const q of QUESTS) {
    const row = srcQuests[q.id];
    if (!row || typeof row !== 'object') continue;
    let step = clampInt(row.step, 0, q.steps.length, 0);
    const done = !!row.done && step >= q.steps.length;
    if (!done && step >= q.steps.length) step = Math.max(0, q.steps.length - 1);
    if (importMode && !row.done && !row.started && step === 0) continue;
    const maxN = q.steps[Math.max(0, Math.min(q.steps.length, step) - 1)]?.count || 99;
    quests[q.id] = {
      started: !!row.started || done || step > 0,
      done,
      step,
      n: clampInt(row.n, 0, Math.max(1, maxN), 0),
      pages: Array.isArray(row.pages)
        ? row.pages.filter((p) => typeof p === 'string').map((p) => p.slice(0, 400)).slice(0, 24)
        : [],
      unseen: !!row.unseen,
      choice: typeof row.choice === 'string' ? row.choice.slice(0, 32) : null,
    };
  }
  const activity = Array.isArray(src.activity)
    ? src.activity
        .filter((a) => a && typeof a.title === 'string' && typeof a.text === 'string')
        .slice(0, 32)
        .map((a) => ({ title: a.title.slice(0, 80), text: a.text.slice(0, 400) }))
    : [];
  return {
    quests,
    activity,
    challengeNew: clampInt(src.challengeNew, 0, 99, 0),
  };
}

function normalizePortals(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const id of raw) {
    if (typeof id === 'string' && PORTAL_IDS.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

function emptyStorage() {
  return Array.from({ length: STORAGE_SLOTS }, () => null);
}

function storageEntry(item) {
  if (!item || typeof item !== 'object') return null;
  const k = item.k;
  const id = typeof item.id === 'string' ? item.id : '';
  let n = item.n | 0;
  if (!id || n < 1) return null;
  n = Math.min(n, MAX_STACK);
  if (k === 'good' && GOOD_IDS.has(id)) return { k, id, n };
  if (k === 'part' && MATERIAL_IDS.has(id)) return { k, id, n };
  if (k === 'potion' && POTION_IDS.has(id)) return { k, id, n: Math.min(n, 99) };
  if (k === 'gear' && GEAR_IDS.has(id)) return { k, id, n: 1 };
  return null;
}

function normalizeStorage(raw) {
  const slots = emptyStorage();
  if (!Array.isArray(raw)) return slots;
  const positioned = raw.length === STORAGE_SLOTS;
  let cursor = 0;
  for (let i = 0; i < raw.length && cursor < STORAGE_SLOTS; i++) {
    const entry = storageEntry(raw[i]);
    if (!entry) {
      if (positioned) cursor = i + 1;
      continue;
    }
    if (entry.k !== 'gear') {
      const have = slots.find((s) => s && s.k === entry.k && s.id === entry.id);
      if (have) {
        have.n = Math.min(MAX_STACK, have.n + entry.n);
        if (positioned) cursor = i + 1;
        continue;
      }
    } else if (slots.some((s) => s && s.k === 'gear' && s.id === entry.id)) {
      if (positioned) cursor = i + 1;
      continue;
    }
    const at = positioned ? i : slots.findIndex((s) => !s);
    if (at < 0 || at >= STORAGE_SLOTS) break;
    slots[at] = entry;
    cursor = at + 1;
  }
  return slots;
}

function normalizeLoad(raw, ammo) {
  const q = raw && typeof raw === 'object' ? raw : {};
  const id = ARROW_TYPES.includes(q.id) ? q.id : ammo;
  const n = clampInt(q.n, 0, QUIVER_MAX, 0);
  return { id: id || null, n: id ? n : 0 };
}

function cleanLook(raw) {
  const look = raw && typeof raw === 'object' ? raw : {};
  const idx = (key) => clampInt(look[key], 0, LOOK_LIMITS[key] - 1, DEFAULT_LOOK[key]);
  return {
    skin: idx('skin'),
    hair: idx('hair'),
    style: idx('style'),
    tunic: idx('tunic'),
    beard: !!look.beard,
  };
}

function normalizeTime(value) {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(clampInt(value, 0, Date.now() + 60_000, Date.now())).toISOString();
  }
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return null;
  return new Date(clampInt(t, 0, Date.now() + 60_000, Date.now())).toISOString();
}

function assertSize(state) {
  const bytes = Buffer.byteLength(JSON.stringify(state), 'utf8');
  if (bytes > MAX_STATE_BYTES) throw invalid('Character state is too large.');
}
