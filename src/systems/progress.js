import { ARMOR_SLOTS, DEF_PER_POINT, DROPS, GEAR, MATERIALS, SETS, corePieces, gearById } from '../data/catalog.js';
import { CLASSES, SKILLS, attrDef, weaponDef } from '../data/skills.js';
import { GOODS, LEVEL_SKILLS, MAX_LEVEL, SKILL_ORDER, levelForXp, xpForLevel } from '../data/gathering.js';

const ANON_KEY = 'monster-gate-hunter-v1';

export const STORAGE_SLOTS = 30;
const POTION_IDS = new Set(['potion', 'manapotion']);

export function saveKey(address) {
  return address ? `${ANON_KEY}:${address}` : ANON_KEY;
}

function readRaw(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    if (raw && typeof raw === 'object') return raw;
  } catch {
    /* corrupt save */
  }
  return null;
}

const blank = () => ({
  seen: {},
  kills: {},
  materials: {},
  crafted: {},
  armor: {},
  weapon: null,
  gold: 0,
  stock: {},
  xp: {},
  goods: {},
  storage: emptyStorage(),
});

/** Discoveries, harvested parts, crafted gear and what is worn. Persisted for one Klever address. */
export class Progress {
  constructor() {
    this.address = null;
    this.revision = 0;
    this.onCloud = null;
    this.loadRaw(readRaw(ANON_KEY));
  }

  /**
   * Bind the hunt to a wallet address.
   * Returns `loaded` when this browser already has that wallet's hunt,
   * `claimed` when the older unsigned hunt was moved onto the wallet,
   * or `new` when the wallet is starting fresh here.
   */
  useAddress(address) {
    this.address = address;
    const own = readRaw(saveKey(address));
    if (own) {
      this.loadRaw(own);
      return 'loaded';
    }
    const anon = readRaw(ANON_KEY);
    this.loadRaw(anon);
    // Do not stamp savedAt here. The guild record may already hold a newer hunt.
    this.save(false);
    try {
      if (anon && localStorage.getItem(saveKey(address))) localStorage.removeItem(ANON_KEY);
    } catch {
      /* keep the old hunt if storage cannot be updated */
    }
    return anon ? 'claimed' : 'new';
  }

  /** Bind to one character's own hunt. Nothing is claimed from older saves. */
  useCharacter(key) {
    this.address = key;
    this.loadRaw(readRaw(saveKey(key)));
    this.save(false);
  }

  loadRaw(raw) {
    this.data = { ...blank(), ...(raw || {}) };
    this.data.skills = normalizeSkills(this.data.skills);
    this.data.xp = normalizeXp(this.data.xp);
    this.data.goods = normalizeGoods(this.data.goods);
    this.data.hunter = normalizeHunter(this.data.hunter);
    this.data.storage = normalizeStorage(this.data.storage);
    releaseStoredGear(this.data);
  }

  save(echo = true) {
    if (echo) this.data.savedAt = Date.now();
    try {
      localStorage.setItem(saveKey(this.address), JSON.stringify(this.data));
    } catch {
      /* storage unavailable */
    }
    if (echo && this.address && typeof this.onCloud === 'function') {
      try {
        this.onCloud(this.data);
      } catch {
        /* the local hunt is already written */
      }
    }
  }

  rememberHunter(hunter) {
    const next = normalizeHunter(hunter);
    if (!next) return;
    this.data.hunter = next;
    this.save();
  }

  get gold() {
    return this.data.gold | 0;
  }

  setGold(n) {
    this.data.gold = Math.max(0, n | 0);
    this.save();
  }

  hasStock(id) {
    return !!this.data.stock && Object.prototype.hasOwnProperty.call(this.data.stock, id);
  }

  stock(id) {
    return this.data.stock[id] | 0;
  }

  setStock(id, n) {
    if (!this.data.stock) this.data.stock = {};
    this.data.stock[id] = Math.max(0, n | 0);
    this.save();
  }

  seen(id) {
    return !!this.data.seen[id];
  }

  discover(id) {
    if (this.data.seen[id]) return false;
    this.data.seen[id] = true;
    this.save();
    return true;
  }

  kills(id) {
    return this.data.kills[id] || 0;
  }

  count(mat) {
    return this.data.materials[mat] || 0;
  }

  /** Records a kill and rolls the monster's parts. Returns [{id, n}]. */
  harvest(type) {
    this.data.kills[type] = this.kills(type) + 1;
    this.data.seen[type] = true;
    const got = [];
    for (const d of DROPS[type] || []) {
      if (Math.random() > d.chance) continue;
      const n = d.qty[0] + Math.floor(Math.random() * (d.qty[1] - d.qty[0] + 1));
      this.data.materials[d.id] = this.count(d.id) + n;
      got.push({ id: d.id, n });
    }
    this.save();
    return got;
  }

  gearSeen(gear) {
    return this.seen(gear.monster);
  }

  crafted(id) {
    return !!this.data.crafted[id];
  }

  canCraft(gear) {
    if (gear.found) return false;
    return !this.crafted(gear.id) && Object.entries(gear.recipe).every(([m, n]) => this.count(m) >= n);
  }

  /** A dropped weapon joins the bag. The first one is equipped when the hunter has none. */
  grantFound(id) {
    const g = gearById(id);
    if (!g || this.crafted(id)) return false;
    this.data.crafted[id] = true;
    if (g.type === 'weapon' && !this.data.weapon) this.data.weapon = id;
    if (g.type === 'armor' && !this.data.armor[g.slot]) this.data.armor[g.slot] = id;
    this.save();
    return true;
  }

  craft(id) {
    const g = gearById(id);
    if (!g || !this.canCraft(g)) return false;
    for (const [m, n] of Object.entries(g.recipe)) this.data.materials[m] = this.count(m) - n;
    this.data.crafted[id] = true;
    if (g.type === 'armor') this.data.armor[g.slot] = id;
    else this.data.weapon = id;
    this.save();
    return true;
  }

  worn(id) {
    const g = gearById(id);
    if (!g) return false;
    return g.type === 'armor' ? this.data.armor[g.slot] === id : this.data.weapon === id;
  }

  toggleWear(id) {
    const g = gearById(id);
    if (!g || !this.crafted(id)) return;
    if (g.type === 'armor') this.data.armor[g.slot] = this.worn(id) ? null : id;
    else this.data.weapon = this.worn(id) ? null : id;
    this.save();
  }

  /** {helm:'budgeset',...} describing which pieces are on the hero and which set styles them. */
  armorLook() {
    const look = {};
    for (const s of ARMOR_SLOTS) {
      const g = gearById(this.data.armor[s]);
      if (g) look[s] = g.set;
    }
    return look;
  }

  get defense() {
    let d = 0;
    for (const s of ARMOR_SLOTS) {
      const g = gearById(this.data.armor[s]);
      if (g) d += g.def;
    }
    return d;
  }

  get reduction() {
    return Math.min(0.5, this.defense * DEF_PER_POINT);
  }

  setComplete(setId) {
    return corePieces(setId).every((g) => this.worn(g.id));
  }

  get activeSets() {
    return SETS.filter((s) => this.setComplete(s.id));
  }

  /** Worn pieces that carry a stat of their own (spell books). */
  get wornPieces() {
    return ARMOR_SLOTS.map((s) => gearById(this.data.armor[s])).filter(Boolean);
  }

  get bookWorn() {
    return !!gearById(this.data.armor.book);
  }

  /** Summed stat bonuses from complete sets and from individual worn pieces. */
  get gearBonus() {
    const b = { hp: 0, mana: 0, stamina: 0, spell: 0, ranged: 0, crit: 0 };
    for (const s of this.activeSets) for (const k of Object.keys(b)) b[k] += s[k] || 0;
    for (const g of this.wornPieces) if (g.bonus) for (const k of Object.keys(g.bonus)) b[k] = (b[k] || 0) + g.bonus[k];
    return b;
  }

  get bonusHp() {
    return this.gearBonus.hp;
  }

  get bonusMana() {
    return this.gearBonus.mana;
  }

  get weaponItem() {
    const g = gearById(this.data.weapon);
    return g ? g.item : null;
  }

  ownedCount() {
    return GEAR.filter((g) => this.crafted(g.id)).length;
  }

  totalKills() {
    let n = 0;
    for (const v of Object.values(this.data.kills || {})) n += v | 0;
    return n;
  }

  get classId() {
    return this.data.skills?.classId || null;
  }

  get className() {
    return CLASSES[this.classId]?.name || '';
  }

  skillPoints() {
    const earned = (this.classId ? 2 : 0) + Math.floor(this.totalKills() / 2);
    let spent = 0;
    const learned = this.data.skills?.learned || {};
    for (const id of Object.keys(learned)) {
      if (learned[id] && SKILLS[id]) spent += SKILLS[id].cost;
    }
    const attrs = this.data.skills?.attrs || {};
    for (const id of Object.keys(attrs)) {
      if (attrDef(this.classId, id)) spent += attrs[id] | 0;
    }
    const weapons = this.data.skills?.weapons || {};
    for (const id of Object.keys(weapons)) {
      if (weaponDef(this.classId, id)) spent += weapons[id] | 0;
    }
    return { earned, spent, left: Math.max(0, earned - spent) };
  }

  attrRank(id) {
    return (this.data.skills?.attrs && this.data.skills.attrs[id]) || 0;
  }

  raiseAttr(id) {
    const def = attrDef(this.classId, id);
    if (!def) return false;
    const rank = this.attrRank(id);
    if (rank >= def.max) return false;
    if (this.skillPoints().left < 1) return false;
    if (!this.data.skills.attrs) this.data.skills.attrs = {};
    this.data.skills.attrs[id] = rank + 1;
    this.save();
    return true;
  }

  weaponRank(id) {
    return (this.data.skills?.weapons && this.data.skills.weapons[id]) || 0;
  }

  raiseWeapon(id) {
    const def = weaponDef(this.classId, id);
    if (!def) return false;
    const rank = this.weaponRank(id);
    if (rank >= def.max) return false;
    if (this.skillPoints().left < 1) return false;
    if (!this.data.skills.weapons) this.data.skills.weapons = {};
    this.data.skills.weapons[id] = rank + 1;
    this.save();
    return true;
  }

  hasSkill(id) {
    return !!(this.data.skills?.learned && this.data.skills.learned[id]);
  }

  equipped() {
    return (this.data.skills?.equipped || [null, null, null]).slice();
  }

  setClass(id) {
    if (!CLASSES[id] || this.classId === id) return false;
    this.data.skills = { classId: id, learned: {}, equipped: [null, null, null], attrs: {}, weapons: {} };
    this.save();
    return true;
  }

  learn(id) {
    const sk = SKILLS[id];
    const s = this.data.skills;
    if (!sk || sk.classId !== s.classId || s.learned[id]) return false;
    if (sk.req && !s.learned[sk.req]) return false;
    if (this.skillPoints().left < sk.cost) return false;
    s.learned[id] = true;
    this.save();
    return true;
  }

  equip(slot, id) {
    if (slot < 0 || slot > 2) return false;
    const s = this.data.skills;
    if (id == null) {
      s.equipped[slot] = null;
      this.save();
      return true;
    }
    const sk = SKILLS[id];
    if (!sk || !s.learned[id] || sk.kind === 'passive') return false;
    for (let i = 0; i < 3; i++) if (s.equipped[i] === id) s.equipped[i] = null;
    s.equipped[slot] = id;
    this.save();
    return true;
  }

  /* ----------------------------- skill levels ----------------------------- */
  xp(id) {
    return this.data.xp[id] || 0;
  }

  level(id) {
    return levelForXp(this.xp(id));
  }

  /** Adds XP and returns the new level when the skill levelled up, otherwise 0. */
  addXp(id, amount) {
    if (!LEVEL_SKILLS[id] || !(amount > 0)) return 0;
    const before = this.level(id);
    const total = Math.min(xpForLevel(MAX_LEVEL), this.xp(id) + amount);
    this.data.xp[id] = Math.round(total * 10) / 10;
    this.save();
    const after = this.level(id);
    return after > before ? after : 0;
  }

  get totalLevel() {
    return SKILL_ORDER.reduce((n, id) => n + this.level(id), 0);
  }

  get totalXp() {
    return SKILL_ORDER.reduce((n, id) => n + this.xp(id), 0);
  }

  /* ---------------------------- gathered goods ---------------------------- */
  good(id) {
    return this.data.goods[id] | 0;
  }

  addGood(id, n = 1) {
    if (!GOODS[id]) return;
    this.data.goods[id] = this.good(id) + n;
    this.save();
  }

  takeGood(id, n = 1) {
    if (!GOODS[id] || this.good(id) < n) return false;
    this.data.goods[id] = this.good(id) - n;
    this.save();
    return true;
  }

  totalGoods() {
    return Object.values(this.data.goods).reduce((a, b) => a + (b | 0), 0);
  }

  /* ------------------------------ storage crate ------------------------------ */
  storedGear(id) {
    return this.data.storage.some((s) => s && s.k === 'gear' && s.id === id);
  }

  storageUsed() {
    return this.data.storage.filter(Boolean).length;
  }

  canFitStorage(k, id) {
    if (k !== 'gear' && this.data.storage.some((s) => s && s.k === k && s.id === id)) return true;
    if (k === 'gear' && this.storedGear(id)) return false;
    return this.data.storage.some((s) => !s);
  }

  /** Merge into an existing stack, or take the first empty slot. Gear always uses its own slot. */
  putStorage(k, id, n) {
    n = n | 0;
    if (n < 1 || !this.canFitStorage(k, id)) return false;
    const slots = this.data.storage;
    if (k !== 'gear') {
      const have = slots.find((s) => s && s.k === k && s.id === id);
      if (have) {
        have.n += n;
        this.save();
        return true;
      }
    }
    const at = slots.findIndex((s) => !s);
    slots[at] = { k, id, n: k === 'gear' ? 1 : n };
    this.save();
    return true;
  }

  /** Pull up to n from a slot. Omit n to take the whole stack. */
  pullStorage(index, n) {
    const s = this.data.storage[index];
    if (!s) return null;
    const take = n == null ? s.n : Math.min(s.n, n | 0);
    if (take < 1) return null;
    const out = { k: s.k, id: s.id, n: take };
    s.n -= take;
    if (s.n <= 0) this.data.storage[index] = null;
    this.save();
    return out;
  }

  clearLearned() {
    if (!this.classId) return false;
    this.data.skills.learned = {};
    this.data.skills.equipped = [null, null, null];
    this.data.skills.attrs = {};
    this.data.skills.weapons = {};
    this.save();
    return true;
  }
}

function normalizeHunter(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const x = Number(raw.x);
  const z = Number(raw.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const quest = raw.quest && typeof raw.quest === 'object' ? raw.quest : {};
  const text = String(quest.text || '').slice(0, 80);
  return {
    x,
    z,
    yaw: Number.isFinite(Number(raw.yaw)) ? Number(raw.yaw) : 0,
    hp: Math.max(0, raw.hp | 0),
    mana: Math.max(0, raw.mana | 0),
    stamina: Math.max(0, raw.stamina | 0),
    rank: Math.max(0, Math.min(6, raw.rank | 0)),
    quest: text ? { text, n: Math.max(0, quest.n | 0), total: Math.max(1, quest.total | 0 || 5) } : null,
    realm: raw.realm === 'cave' ? 'cave' : 'over',
  };
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

function normalizeXp(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const id of SKILL_ORDER) {
      const n = Number(raw[id]);
      if (n > 0 && isFinite(n)) out[id] = Math.min(xpForLevel(MAX_LEVEL), n);
    }
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
  n = Math.min(n, 99999);
  if (k === 'good' && GOODS[id]) return { k, id, n };
  if (k === 'part' && MATERIALS[id]) return { k, id, n };
  if (k === 'potion' && POTION_IDS.has(id)) return { k, id, n };
  if (k === 'gear' && gearById(id)) return { k, id, n: 1 };
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
        have.n = Math.min(99999, have.n + entry.n);
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

function releaseStoredGear(data) {
  if (!data.armor) data.armor = {};
  for (const s of data.storage) {
    if (!s || s.k !== 'gear' || !data.crafted?.[s.id]) {
      if (s && s.k === 'gear' && !data.crafted?.[s.id]) {
        const at = data.storage.indexOf(s);
        if (at >= 0) data.storage[at] = null;
      }
      continue;
    }
    const g = gearById(s.id);
    if (!g) continue;
    if (g.type === 'weapon' && data.weapon === s.id) data.weapon = null;
    if (g.type === 'armor' && data.armor[g.slot] === s.id) data.armor[g.slot] = null;
  }
}

function normalizeGoods(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const id of Object.keys(GOODS)) {
      const n = raw[id] | 0;
      if (n > 0) out[id] = n;
    }
  }
  return out;
}
