import { ARMOR_SLOTS, DEF_PER_POINT, DROPS, GEAR, SETS, armorPieces, gearById } from '../data/catalog.js';
import { CLASSES, SKILLS } from '../data/skills.js';

const KEY = 'monster-gate-hunter-v1';

const blank = () => ({
  seen: {},
  kills: {},
  materials: {},
  crafted: {},
  armor: {},
  weapon: null,
  gold: 0,
  stock: {},
});

/** Discoveries, harvested parts, crafted gear and what is worn. Persisted in localStorage. */
export class Progress {
  constructor() {
    this.data = blank();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') this.data = { ...blank(), ...raw };
    } catch {
      /* corrupt save: start fresh */
    }
    this.data.skills = normalizeSkills(this.data.skills);
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable */
    }
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
    return !this.crafted(gear.id) && Object.entries(gear.recipe).every(([m, n]) => this.count(m) >= n);
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
    return armorPieces(setId).every((g) => this.worn(g.id));
  }

  get activeSets() {
    return SETS.filter((s) => this.setComplete(s.id));
  }

  get bonusHp() {
    return this.activeSets.reduce((n, s) => n + s.hp, 0);
  }

  get bonusMana() {
    return this.activeSets.reduce((n, s) => n + s.mana, 0);
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
    return { earned, spent, left: Math.max(0, earned - spent) };
  }

  hasSkill(id) {
    return !!(this.data.skills?.learned && this.data.skills.learned[id]);
  }

  equipped() {
    return (this.data.skills?.equipped || [null, null, null]).slice();
  }

  setClass(id) {
    if (!CLASSES[id] || this.classId === id) return false;
    this.data.skills = { classId: id, learned: {}, equipped: [null, null, null] };
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

  clearLearned() {
    if (!this.classId) return false;
    this.data.skills.learned = {};
    this.data.skills.equipped = [null, null, null];
    this.save();
    return true;
  }
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
  return { classId, learned, equipped };
}
