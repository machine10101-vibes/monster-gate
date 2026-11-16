import { ARMOR_SLOTS, DEF_PER_POINT, DROPS, GEAR, MATERIALS, SETS, corePieces, gearById } from '../data/catalog.js';
import { CLASSES, SKILLS, attrDef, weaponDef } from '../data/skills.js';
import { ARROW_TYPES, GOODS, HEADS_PER_BAR, LEVEL_SKILLS, MAX_LEVEL, QUIVER_MAX, SHAFTS_PER_LOG, SHAFT_FROM_LOG, SHAFT_IDS, SKILL_ORDER, SMELTS, levelForXp, xpForLevel } from '../data/gathering.js';
import { aliasGearId, aliasGoodId } from '../data/metals.js';
import { PORTAL_IDS } from '../data/portals.js';
import { readJson, savesFrozen } from './saveio.js';
import { huntSavePayload, stripDebugGrantedInPlace } from '../debug/transient.js';
import {
  BAG_SLOTS,
  MAX_STACK,
  bagSlotsFrom,
  roomForCount,
  stackSlots,
  storageStackSlots,
} from './stacks.js';

export const ANON_KEY = 'monster-gate-hunter-v1';

export const STORAGE_SLOTS = 30;
export { BAG_SLOTS, MAX_STACK } from './stacks.js';
const POTION_IDS = new Set(['potion', 'manapotion']);

export function saveKey(address) {
  return address ? `${ANON_KEY}:${address}` : ANON_KEY;
}

function readRaw(key, into) {
  const got = readJson(key);
  if (got.corrupt && into) into.saveWarning = key;
  return got.data;
}

/** Class pick grants 2 points. One more every 8 slayer kills. Chickens do not count. */
export const SKILL_POINT_PER_KILLS = 8;

export function skillPointsEarned(classId, kills, chicken) {
  if (!classId) return 0;
  return 2 + Math.floor(Math.max(0, (kills | 0) - (chicken | 0)) / SKILL_POINT_PER_KILLS);
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
  portals: [],
  ammo: null,
  quiverLoad: { id: null, n: 0 },
});

/** Discoveries, harvested parts, crafted gear and what is worn. Persisted for one Klever address. */
export class Progress {
  constructor() {
    this.address = null;
    this.revision = 0;
    this.onCloud = null;
    this.saveWarning = null;
    this.sessionOnly = false;
    this.loadRaw(readRaw(ANON_KEY, this));
  }

  /**
   * Bind the hunt to a wallet address.
   * Returns `loaded` when this browser already has that wallet's hunt,
   * `claimed` when the older unsigned hunt was moved onto the wallet,
   * or `new` when the wallet is starting fresh here.
   */
  useAddress(address) {
    this.address = address;
    const own = readRaw(saveKey(address), this);
    if (own) {
      this.loadRaw(own);
      return 'loaded';
    }
    const anon = readRaw(ANON_KEY, this);
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
    this.loadRaw(readRaw(saveKey(key), this));
    this.save(false);
  }

  loadRaw(raw) {
    this.data = { ...blank(), ...(raw || {}) };
    this.data.skills = normalizeSkills(this.data.skills);
    this.data.xp = normalizeXp(this.data.xp);
    this.data.goods = normalizeGoods(this.data.goods);
    this.data.materials = normalizeMaterials(this.data.materials);
    migrateGearIds(this.data);
    if (!this.data.crafted || typeof this.data.crafted !== 'object') this.data.crafted = {};
    this.data.crafted.knife = true;
    this.data.hunter = normalizeHunter(this.data.hunter);
    this.data.storage = normalizeStorage(this.data.storage);
    this.data.portals = normalizePortals(this.data.portals);
    this.data.ammo = normalizeAmmo(this.data.ammo);
    this.data.quiverLoad = normalizeLoad(this.data.quiverLoad);
    releaseStoredGear(this.data);
    stripDebugGrantedInPlace(this.data);
  }

  save(echo = true) {
    if (this.sessionOnly || savesFrozen()) return;
    if (echo) this.data.savedAt = Date.now();
    const payload = huntSavePayload(this.data);
    if (echo) payload.savedAt = this.data.savedAt;
    try {
      localStorage.setItem(saveKey(this.address), JSON.stringify(payload));
    } catch {
      /* storage unavailable */
    }
    if (echo && this.address && typeof this.onCloud === 'function') {
      try {
        this.onCloud(payload);
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

  knownPortals() {
    return this.data.portals || [];
  }

  knowsPortal(id) {
    return this.knownPortals().includes(id);
  }

  /** Write a discovered portal into the tome. Returns false when it was already there. */
  rememberPortal(id) {
    if (!PORTAL_IDS.has(id) || this.knowsPortal(id)) return false;
    this.data.portals = this.knownPortals().concat(id);
    this.save();
    return true;
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

  /** Records a kill and rolls the monster's parts. Returns {got, leftover}. */
  harvest(type) {
    this.data.kills[type] = this.kills(type) + 1;
    this.data.seen[type] = true;
    const got = [];
    const leftover = [];
    for (const d of DROPS[type] || []) {
      if (Math.random() > d.chance) continue;
      const n = d.qty[0] + Math.floor(Math.random() * (d.qty[1] - d.qty[0] + 1));
      const added = GOODS[d.id] ? this.addGood(d.id, n, false) : this.addPart(d.id, n, false);
      if (added) got.push({ id: d.id, n: added });
      if (added < n) leftover.push({ id: d.id, n: n - added, k: GOODS[d.id] ? 'good' : 'part' });
    }
    this.save();
    return { got, leftover };
  }

  gearSeen(gear) {
    if (gear.monster === 'smith') return true;
    return this.seen(gear.monster);
  }

  crafted(id) {
    return !!this.data.crafted[id];
  }

  recipeReady(gear) {
    if (!gear || gear.found || this.crafted(gear.id)) return false;
    return Object.entries(gear.recipe).every(([m, n]) => this.stockOf(m) >= n);
  }

  wouldFitCraft(gear) {
    const spendGoods = {};
    const spendParts = {};
    for (const [m, n] of Object.entries(gear.recipe || {})) {
      if (GOODS[m]) spendGoods[m] = -(n | 0);
      else spendParts[m] = -(n | 0);
    }
    return this.wouldFit({ goods: spendGoods, materials: spendParts, gear: 1 });
  }

  canCraft(gear) {
    if ((gear.reqSmith | 0) > this.level('smithing')) return false;
    return this.recipeReady(gear) && this.wouldFitCraft(gear);
  }

  craftLock(gear) {
    if (!gear || gear.found) return 'found';
    if (this.crafted(gear.id)) return 'crafted';
    const need = gear.reqSmith | 0;
    if (need && this.level('smithing') < need) return `smith:${need}`;
    if (!this.recipeReady(gear)) return 'parts';
    if (!this.wouldFitCraft(gear)) return 'full';
    return '';
  }

  /** Monster parts and smelted goods share a recipe. */
  stockOf(id) {
    return GOODS[id] ? this.good(id) : this.count(id);
  }

  /** A dropped weapon joins the bag. The first one is equipped when the hunter has none. */
  grantFound(id) {
    const g = gearById(id);
    if (!g || this.crafted(id)) return false;
    if (!this.fitsBag(this.bagSlotsUsed() + 1)) return false;
    this.data.crafted[id] = true;
    if (this.meetsReq(g)) {
      if (g.type === 'weapon' && !this.data.weapon) this.data.weapon = id;
      if (g.type === 'armor' && !this.data.armor[g.slot]) this.data.armor[g.slot] = id;
    }
    this.save();
    return true;
  }

  craft(id) {
    const g = gearById(id);
    if (!g || !this.canCraft(g)) return false;
    this._filling = true;
    for (const [m, n] of Object.entries(g.recipe)) {
      if (GOODS[m]) this.data.goods[m] = this.good(m) - n;
      else this.data.materials[m] = this.count(m) - n;
    }
    this._filling = false;
    this.data.crafted[id] = true;
    if (this.meetsReq(g)) {
      if (g.type === 'armor') this.data.armor[g.slot] = id;
      else if (g.type === 'weapon') this.data.weapon = id;
    }
    if (g.forgeXp > 0) this.addXp('smithing', g.forgeXp);
    this.save();
    if (g.slot === 'quiver') {
      if (!this.data.ammo && this.good('iron_arrow') > 0) this.data.ammo = 'iron_arrow';
      this.refillQuiver();
    }
    return true;
  }

  worn(id) {
    const g = gearById(id);
    if (!g) return false;
    return g.type === 'armor' ? this.data.armor[g.slot] === id : this.data.weapon === id;
  }

  meetsReq(gear) {
    const need = gear?.reqLevel | 0;
    if (!need) return true;
    return this.level('strength') >= need;
  }

  toggleWear(id) {
    const g = gearById(id);
    if (!g || !this.crafted(id)) return false;
    const off = this.worn(id);
    if (!off && !this.meetsReq(g)) return false;
    if (g.slot === 'quiver' && off && !this.quiverFitsBag()) return false;
    if (g.type === 'armor') this.data.armor[g.slot] = off ? null : id;
    else this.data.weapon = off ? null : id;
    this.save();
    if (g.slot === 'quiver') {
      if (off) this.dumpQuiver();
      else {
        if (!this.data.ammo && this.good('iron_arrow') > 0) this.data.ammo = 'iron_arrow';
        this.refillQuiver();
      }
    }
    return true;
  }

  /**
   * Unequip a crafted piece and take it out of the bag so it can be tossed.
   * The carving knife is a starting tool and cannot leave the hunt.
   */
  releaseCrafted(id) {
    if (!id || id === 'knife' || !this.crafted(id) || this.storedGear(id)) return false;
    const g = gearById(id);
    if (!g) return false;
    if (this.worn(id) && !this.toggleWear(id)) return false;
    delete this.data.crafted[id];
    this.save();
    return true;
  }

  /** {helm:'budgeset',...} describing which pieces are on the hero and which set styles them. */
  armorLook() {
    const look = {};
    for (const s of ARMOR_SLOTS) {
      if (s === 'quiver') continue;
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
    const earned = skillPointsEarned(this.classId, this.totalKills(), this.kills('chicken'));
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

  bagSlotsUsed() {
    const stored = this.data.storage.filter((s) => s && s.k === 'gear').map((s) => s.id);
    return bagSlotsFrom({
      goods: this.data.goods,
      materials: this.data.materials,
      crafted: this.data.crafted,
      storedGear: stored,
    });
  }

  fitsBag(nextUsed) {
    const used = this.bagSlotsUsed();
    if (nextUsed <= used) return true;
    return nextUsed <= BAG_SLOTS;
  }

  roomFor(kind, id) {
    const current = kind === 'good' ? this.good(id) : this.count(id);
    const used = this.bagSlotsUsed();
    const remaining = Math.max(0, BAG_SLOTS - used);
    return roomForCount(current, remaining);
  }

  wouldFit({ goods = {}, materials = {}, gear = 0 } = {}) {
    const nextGoods = { ...this.data.goods };
    const nextMats = { ...this.data.materials };
    for (const [id, d] of Object.entries(goods)) {
      const n = (nextGoods[id] | 0) + (d | 0);
      if (n < 0) return false;
      if (n) nextGoods[id] = n;
      else delete nextGoods[id];
    }
    for (const [id, d] of Object.entries(materials)) {
      const n = (nextMats[id] | 0) + (d | 0);
      if (n < 0) return false;
      if (n) nextMats[id] = n;
      else delete nextMats[id];
    }
    const stored = this.data.storage.filter((s) => s && s.k === 'gear').map((s) => s.id);
    const after = bagSlotsFrom({
      goods: nextGoods,
      materials: nextMats,
      crafted: this.data.crafted,
      storedGear: stored,
    }) + (gear | 0);
    return this.fitsBag(after);
  }

  addGood(id, n = 1, echo = true) {
    n = n | 0;
    if (!GOODS[id] || n < 1) return 0;
    const add = GOODS[id].session ? n : Math.min(n, this.roomFor('good', id));
    if (add < 1) return 0;
    this.data.goods[id] = this.good(id) + add;
    if (echo) this.save();
    if (!this._filling && this.data.armor?.quiver && ARROW_TYPES.includes(id) && (id === this.data.ammo || !this.data.ammo)) {
      if (!this.data.ammo) this.data.ammo = id;
      this.refillQuiver();
    }
    return add;
  }

  addPart(id, n = 1, echo = true) {
    n = n | 0;
    if (!MATERIALS[id] || n < 1) return 0;
    const add = Math.min(n, this.roomFor('part', id));
    if (add < 1) return 0;
    this.data.materials[id] = this.count(id) + add;
    if (echo) this.save();
    return add;
  }

  takeGood(id, n = 1) {
    if (!GOODS[id] || this.good(id) < n) return false;
    this.data.goods[id] = this.good(id) - n;
    if (!this.data.goods[id]) delete this.data.goods[id];
    this.save();
    return true;
  }

  takePart(id, n = 1) {
    if (!MATERIALS[id] || this.count(id) < n) return false;
    this.data.materials[id] = this.count(id) - n;
    if (!this.data.materials[id]) delete this.data.materials[id];
    this.save();
    return true;
  }

  /** How many times a smelt recipe can run with the current bag. */
  smeltCan(id) {
    const rec = SMELTS[id];
    if (!rec) return 0;
    if ((rec.level | 0) > this.level('smithing')) return 0;
    const byIng = rec.ins.reduce((n, [good, need]) => Math.min(n, Math.floor(this.good(good) / need)), 999);
    let n = 0;
    while (n < byIng) {
      const goods = {};
      for (const [good, need] of rec.ins) goods[good] = -need * (n + 1);
      goods[rec.out] = rec.n * (n + 1);
      if (!this.wouldFit({ goods })) break;
      n += 1;
    }
    return n;
  }

  smeltLocked(id) {
    const rec = SMELTS[id];
    if (!rec) return 'unknown';
    if ((rec.level | 0) > this.level('smithing')) return `smith:${rec.level}`;
    if (this.smeltCan(id) < 1) return 'parts';
    return '';
  }

  /** Run a named smelt. Pass `all` to drain the bag. */
  smelt(id, all = false) {
    const rec = SMELTS[id];
    const can = this.smeltCan(id);
    const n = all ? can : Math.min(1, can);
    if (!rec || n < 1) return 0;
    for (const [good, need] of rec.ins) this.takeGood(good, need * n);
    this.addGood(rec.out, rec.n * n);
    if (rec.xp > 0) this.addXp('smithing', rec.xp * n);
    return n * rec.n;
  }

  /** Starter copper smelt. Pass `all` to run the whole stack. */
  smeltBars(all = false) {
    return this.smelt('copper', all);
  }

  /** One iron bar becomes fifteen arrowheads. */
  forgeHeads(all = false) {
    let n = 0;
    const cap = all ? this.good('iron_bar') : Math.min(1, this.good('iron_bar'));
    while (n < cap) {
      if (!this.wouldFit({ goods: { iron_bar: -(n + 1), arrowhead: HEADS_PER_BAR * (n + 1) } })) break;
      n += 1;
    }
    if (n < 1) return 0;
    this.takeGood('iron_bar', n);
    this.addGood('arrowhead', n * HEADS_PER_BAR);
    return n * HEADS_PER_BAR;
  }

  craftKnife() {
    if (this.crafted('knife') || this.good('iron_bar') < 1) return false;
    if (!this.wouldFit({ goods: { iron_bar: -1 } })) return false;
    this.takeGood('iron_bar', 1);
    this.data.crafted.knife = true;
    this.save();
    return true;
  }

  /** One log becomes fifteen shafts of that wood. The carving knife is part of the starting kit. */
  carveShafts(logId, all = false) {
    const shaftId = SHAFT_FROM_LOG[logId];
    if (!this.crafted('knife') || !shaftId) return 0;
    let n = 0;
    const cap = all ? this.good(logId) : Math.min(1, this.good(logId));
    while (n < cap) {
      const goods = { [logId]: -(n + 1), [shaftId]: SHAFTS_PER_LOG * (n + 1) };
      if (!this.wouldFit({ goods })) break;
      n += 1;
    }
    if (n < 1) return 0;
    this.takeGood(logId, n);
    this.addGood(shaftId, n * SHAFTS_PER_LOG);
    return n * SHAFTS_PER_LOG;
  }

  /** One arrowhead, one shaft and one feather become one iron arrow, then the quiver tops itself up. */
  fletchArrows(shaftId, all = false) {
    if (!SHAFT_IDS.includes(shaftId)) return 0;
    const cap = Math.min(this.good('arrowhead'), this.good(shaftId), this.good('feather'));
    let n = 0;
    const want = all ? cap : Math.min(1, cap);
    while (n < want) {
      const goods = {
        arrowhead: -(n + 1),
        [shaftId]: -(n + 1),
        feather: -(n + 1),
        iron_arrow: n + 1,
      };
      if (!this.wouldFit({ goods })) break;
      n += 1;
    }
    if (n < 1) return 0;
    this.takeGood('arrowhead', n);
    this.takeGood(shaftId, n);
    this.takeGood('feather', n);
    this.addGood('iron_arrow', n);
    return n;
  }

  /**
   * True when every loaded arrow can return to the bag without passing 40 slots.
   * `extraSlots` covers a quiver that is about to leave the bag, freeing its slot.
   */
  quiverFitsBag(extraSlots = 0) {
    const load = this.data.quiverLoad;
    if (!load?.id || !(load.n > 0)) return true;
    const free = Math.max(0, BAG_SLOTS - this.bagSlotsUsed()) + (extraSlots | 0);
    return roomForCount(this.good(load.id), free) >= load.n;
  }

  /** Put the chosen arrow into the quiver, up to 99, pulling from the bag. */
  refillQuiver() {
    if (this._filling || !this.data.armor?.quiver) return true;
    this._filling = true;
    try {
      const type = this.data.ammo;
      if (!type || !ARROW_TYPES.includes(type)) return true;
      const load = this.data.quiverLoad;
      const before = load.n;
      const ammoBefore = this.data.ammo;
      if (load.id && load.id !== type && load.n > 0) {
        if (this.roomFor('good', load.id) < load.n) return false;
        this.data.goods[load.id] = this.good(load.id) + load.n;
        load.n = 0;
        load.id = null;
      }
      load.id = type;
      this.data.ammo = type;
      const room = QUIVER_MAX - load.n;
      const take = Math.min(room, this.good(type));
      if (take > 0) {
        this.data.goods[type] = this.good(type) - take;
        if (!this.data.goods[type]) delete this.data.goods[type];
        load.n += take;
      }
      if (load.n !== before || ammoBefore !== type) this.save();
      return true;
    } finally {
      this._filling = false;
    }
  }

  /** Empty the quiver back into the bag. Arrows that do not fit stay loaded. */
  dumpQuiver() {
    this._filling = true;
    const load = this.data.quiverLoad;
    if (load?.id && load.n > 0) {
      const back = Math.min(load.n, this.roomFor('good', load.id));
      if (back > 0) this.data.goods[load.id] = this.good(load.id) + back;
      load.n -= back;
      if (load.n <= 0) {
        load.n = 0;
        load.id = null;
      }
    }
    this._filling = false;
    this.save();
    return !(this.data.quiverLoad.n > 0);
  }

  /** Choose which arrow the quiver draws. The same choice again clears it. */
  setAmmo(id) {
    if (!ARROW_TYPES.includes(id)) return false;
    if (this.data.ammo === id) {
      if (!this.quiverFitsBag()) return false;
      this.dumpQuiver();
      this.data.ammo = null;
      this.save();
      return true;
    }
    const load = this.data.quiverLoad;
    if (load?.id && load.id !== id && load.n > 0 && this.roomFor('good', load.id) < load.n) return false;
    this.data.ammo = id;
    this.refillQuiver();
    this.save();
    return true;
  }

  hasArrow() {
    if (!this.data.armor?.quiver) return false;
    this.refillQuiver();
    return (this.data.quiverLoad.n | 0) > 0;
  }

  /** Spend one loaded arrow, then top the quiver back up from the bag. */
  drawArrow() {
    if (!this.hasArrow()) return false;
    this.data.quiverLoad.n -= 1;
    this.save();
    this.refillQuiver();
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
    return this.data.storage.reduce((n, s) => n + storageStackSlots(s), 0);
  }

  /** How many of this stack the crate can still take. Gear is 1 or 0. */
  roomInStorage(k, id, n = 1) {
    n = n | 0;
    if (n < 1) return 0;
    if (k === 'gear') return this.canFitStorage(k, id, 1) ? 1 : 0;
    const have = this.data.storage.find((s) => s && s.k === k && s.id === id);
    if (!have && !this.data.storage.some((s) => !s)) return 0;
    const current = have?.n | 0;
    const partial = current % MAX_STACK === 0 ? 0 : MAX_STACK - (current % MAX_STACK);
    const free = Math.max(0, STORAGE_SLOTS - this.storageUsed());
    return Math.min(n, partial + free * MAX_STACK);
  }

  canFitStorage(k, id, n = 1) {
    n = n | 0;
    if (n < 1) return false;
    if (k === 'gear') {
      if (this.storedGear(id)) return false;
      if (!this.data.storage.some((s) => !s)) return false;
      return this.storageUsed() < STORAGE_SLOTS;
    }
    const have = this.data.storage.find((s) => s && s.k === k && s.id === id);
    const current = have?.n | 0;
    const extra = stackSlots(current + n) - stackSlots(current);
    if (!have && !this.data.storage.some((s) => !s)) return false;
    if (extra < 1) return true;
    return this.storageUsed() + extra <= STORAGE_SLOTS;
  }

  /** Merge into an existing stack, or take the first empty slot. Gear always uses its own slot. */
  putStorage(k, id, n) {
    n = n | 0;
    if (n < 1 || !this.canFitStorage(k, id, n)) return false;
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
  const rawId = typeof item.id === 'string' ? item.id : '';
  const id = k === 'good' ? aliasGoodId(rawId) : k === 'gear' ? aliasGearId(rawId) : rawId;
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

function normalizeAmmo(id) {
  return ARROW_TYPES.includes(id) ? id : null;
}

function normalizeLoad(raw) {
  const q = raw && typeof raw === 'object' ? raw : {};
  const id = ARROW_TYPES.includes(q.id) ? q.id : null;
  const n = Math.max(0, Math.min(QUIVER_MAX, q.n | 0));
  return { id, n: id ? n : 0 };
}

function normalizeMaterials(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const id of Object.keys(MATERIALS)) {
      const n = raw[id] | 0;
      if (n > 0) out[id] = n;
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
    for (const [rawId, n] of Object.entries(src)) {
      const id = aliasGoodId(rawId);
      const got = n | 0;
      if (got > 0 && GOODS[id]) out[id] = (out[id] | 0) + got;
    }
  }
  return out;
}

function migrateGearIds(data) {
  if (data.crafted && typeof data.crafted === 'object') {
    const next = { ...data.crafted };
    for (const id of Object.keys(data.crafted)) {
      const live = aliasGearId(id);
      if (live !== id) {
        if (data.crafted[id]) next[live] = true;
        delete next[id];
      }
    }
    data.crafted = next;
  }
  if (data.armor && typeof data.armor === 'object') {
    for (const slot of Object.keys(data.armor)) {
      const id = data.armor[slot];
      if (typeof id === 'string') data.armor[slot] = aliasGearId(id);
    }
  }
  if (typeof data.weapon === 'string') data.weapon = aliasGearId(data.weapon);
}
