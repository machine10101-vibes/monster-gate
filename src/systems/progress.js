import { ARMOR_SLOTS, DEF_PER_POINT, DROPS, GEAR, SET, armorPieces, gearById } from '../data/catalog.js';

const KEY = 'monster-gate-hunter-v1';

const blank = () => ({
  seen: {},
  kills: {},
  materials: {},
  crafted: {},
  armor: {},
  weapon: null,
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
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable */
    }
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

  /** {helm:true,...} describing which pieces are on the hero. */
  armorLook() {
    const look = {};
    for (const s of ARMOR_SLOTS) if (this.data.armor[s]) look[s] = true;
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

  get setComplete() {
    return armorPieces().every((g) => this.worn(g.id));
  }

  get bonusHp() {
    return this.setComplete ? SET.hp : 0;
  }

  get weaponItem() {
    const g = gearById(this.data.weapon);
    return g ? g.item : null;
  }

  ownedCount() {
    return GEAR.filter((g) => this.crafted(g.id)).length;
  }
}
