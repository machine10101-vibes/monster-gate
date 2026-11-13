import { Progress, saveKey } from './progress.js';
import { CLASSES } from '../data/skills.js';
import { SKILL_ORDER } from '../data/gathering.js';
import { dropKey, readJson as readStored, writeJson } from './saveio.js';

export const MAX_CHARACTERS = 8;
const META_KEY = 'monster-gate-roster-v1';
const RESTORE_DAYS = 30;
const KEEP_DELETED = 4;

export const SKINS = [0xf1c9a0, 0xd8a070, 0xb8814e, 0x8d5a34, 0x5e3a22];
export const HAIR_COLORS = [0x1c140e, 0x3a281c, 0x6a3a1c, 0xc8a15a, 0xd9d2c0, 0xa8321e, 0x3b5f8a];
export const TUNICS = [0x3d2c22, 0x2f5f9a, 0x9a2f2f, 0x2f7a4a, 0x6a3f9a, 0xc79a2f, 0xd8d2c0];
export const HAIR_STYLES = [
  { id: 'messy', name: 'Messy' },
  { id: 'short', name: 'Short' },
  { id: 'long', name: 'Long' },
  { id: 'bald', name: 'Bald' },
];

export const DEFAULT_LOOK = { skin: 1, hair: 1, style: 0, tunic: 0, beard: false };

const pick = (list, i) => list[Math.max(0, Math.min(list.length - 1, Math.floor(Number(i)) || 0))];
const idx = (list, i) => Math.max(0, Math.min(list.length - 1, Math.floor(Number(i)) || 0));

export function cleanLook(raw) {
  const look = raw && typeof raw === 'object' ? raw : {};
  return {
    skin: idx(SKINS, look.skin),
    hair: idx(HAIR_COLORS, look.hair),
    style: idx(HAIR_STYLES, look.style),
    tunic: idx(TUNICS, look.tunic),
    beard: !!look.beard,
  };
}

function lighten(hex, amount) {
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const c = (hex >> shift) & 255;
    out |= Math.min(255, Math.round(c + (255 - c) * amount)) << shift;
  }
  return out;
}

/** Options for `buildHumanoid` that give a hunter the look picked at creation. */
export function lookOptions(raw, extra = {}) {
  const look = cleanLook(raw);
  const style = pick(HAIR_STYLES, look.style).id;
  const tunic = pick(TUNICS, look.tunic);
  const opts = {
    skin: pick(SKINS, look.skin),
    hair: pick(HAIR_COLORS, look.hair),
    hairStyle: style === 'long' ? 'short' : style,
    tunic,
    tunicLight: lighten(tunic, 0.1),
    beard: look.beard,
    hero: true,
    seed: 3 + look.skin + look.tunic * 2,
  };
  if (style === 'long') opts.hairLen = 6;
  return { ...opts, ...extra };
}

export function cleanName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim();
}

export function nameProblem(raw, roster = null, ignoreId = null) {
  const name = cleanName(raw);
  if (name.length < 2) return 'Names need at least 2 letters.';
  if (name.length > 14) return 'Names can be 14 characters at most.';
  if (!/^[A-Za-z][A-Za-z' -]*$/.test(name)) return 'Use letters, spaces, hyphens and apostrophes only.';
  if (roster?.chars.some((c) => c.id !== ignoreId && c.name.toLowerCase() === name.toLowerCase())) {
    return 'You already have a character with that name.';
  }
  return '';
}

function defaultName(label) {
  const base = String(label || '').split('@')[0].replace(/[^A-Za-z' -]+/g, ' ').trim();
  const titled = base.replace(/\b([a-z])/g, (m) => m.toUpperCase()).slice(0, 14).trim();
  return titled.length >= 2 ? titled : 'Hunter';
}

function readJson(key, roster) {
  const got = readStored(key);
  if (got.corrupt && roster) roster.saveWarning = key;
  return got.data;
}

function newId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function plainChar(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = cleanName(raw.name).slice(0, 14);
  if (!name || typeof raw.id !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(raw.id)) return null;
  return {
    id: raw.id,
    name,
    look: cleanLook(raw.look),
    createdAt: Number(raw.createdAt) || 0,
    playedAt: Number(raw.playedAt) || 0,
    fav: !!raw.fav,
  };
}

/** What the character list and the lineup show about a saved hunt. */
export function summarize(hunt) {
  const p = new Progress();
  p.loadRaw(hunt);
  const classId = p.classId;
  const def = CLASSES[classId];
  const level = Math.max(1, p.totalLevel - SKILL_ORDER.length + 1);
  return {
    level,
    classId,
    className: def?.name || 'Unsworn',
    color: def?.color || '#aeb6c8',
    rank: Math.max(0, Math.min(6, Number(p.data.hunter?.rank) || 0)),
    realm: p.data.hunter?.realm || 'over',
    armor: p.armorLook(),
    held: p.weaponItem?.held || 'blade',
    kills: p.totalKills(),
    gold: p.gold,
  };
}

export const RANK_LETTERS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

/**
 * Every hunter that belongs to one account. Each keeps its own hunt in the browser,
 * and the whole roster rides along in the single record the guild keeps per account.
 * It also stands in for a hunt when the cloud sync code pulls and pushes that record.
 */
export class Roster {
  constructor(owner, label = '') {
    this.owner = owner;
    this.label = label;
    this.chars = [];
    this.deleted = [];
    this.last = null;
    this.savedAt = 0;
    this.revision = 0;
    this.saveWarning = null;
    this.load();
  }

  charKey(id) {
    return `${this.owner}#${id}`;
  }

  huntKey(id) {
    return saveKey(this.charKey(id));
  }

  hunt(id) {
    return readJson(this.huntKey(id), this) || null;
  }

  load() {
    const meta = readJson(`${META_KEY}:${this.owner}`, this);
    this.chars = [];
    this.deleted = [];
    this.last = null;
    this.savedAt = 0;
    if (meta && Array.isArray(meta.chars)) {
      for (const raw of meta.chars) {
        const c = plainChar(raw);
        if (c && !this.chars.some((o) => o.id === c.id)) this.chars.push(c);
      }
      for (const raw of Array.isArray(meta.deleted) ? meta.deleted : []) {
        const c = plainChar(raw);
        if (c) this.deleted.push({ ...c, deletedAt: Number(raw.deletedAt) || 0, hunt: raw.hunt && typeof raw.hunt === 'object' ? raw.hunt : null });
      }
      this.last = this.chars.some((c) => c.id === meta.last) ? meta.last : this.chars[0]?.id || null;
      this.savedAt = Number(meta.savedAt) || 0;
    } else {
      this.migrate();
    }
    this.prune();
    for (const c of this.chars) this.savedAt = Math.max(this.savedAt, Number(this.hunt(c.id)?.savedAt) || 0);
  }

  /** Hunts saved before characters existed become the account's first character. */
  migrate() {
    const own = readJson(saveKey(this.owner), this);
    const anon = own ? null : readJson(saveKey(null), this);
    const old = own || anon;
    if (!old) return;
    const name = defaultName(this.label);
    const c = { id: newId(), name, look: { ...DEFAULT_LOOK }, createdAt: Number(old.savedAt) || Date.now(), playedAt: Number(old.savedAt) || 0 };
    writeJson(this.huntKey(c.id), old);
    this.chars = [c];
    this.last = c.id;
    this.savedAt = Number(old.savedAt) || 0;
    this.persist();
    dropKey(own ? saveKey(this.owner) : saveKey(null));
  }

  prune() {
    const cutoff = Date.now() - RESTORE_DAYS * 86_400_000;
    this.deleted = this.deleted.filter((d) => d.deletedAt > cutoff).slice(0, KEEP_DELETED);
  }

  persist() {
    writeJson(`${META_KEY}:${this.owner}`, {
      v: 1,
      last: this.last,
      savedAt: this.savedAt,
      chars: this.chars,
      deleted: this.deleted,
    });
  }

  touch(at) {
    const n = Number(at);
    if (Number.isFinite(n) && n > this.savedAt) this.savedAt = n;
  }

  get(id) {
    return this.chars.find((c) => c.id === id) || null;
  }

  summary(id) {
    return summarize(this.hunt(id));
  }

  get full() {
    return this.chars.length >= MAX_CHARACTERS;
  }

  create({ name, look, classId }) {
    const problem = nameProblem(name, this);
    if (problem) throw new Error(problem);
    if (this.full) throw new Error('This account already holds ' + MAX_CHARACTERS + ' characters.');
    if (!CLASSES[classId]) throw new Error('Choose a path for this hunter.');
    const now = Date.now();
    const c = { id: newId(), name: cleanName(name), look: cleanLook(look), createdAt: now, playedAt: 0 };
    const p = new Progress();
    p.loadRaw(null);
    p.address = this.charKey(c.id);
    p.setClass(classId);
    p.save();
    this.chars.push(c);
    this.last = c.id;
    this.touch(p.data.savedAt || now);
    this.persist();
    return c;
  }

  setLast(id) {
    if (!this.get(id) || this.last === id) return;
    this.last = id;
    this.persist();
  }

  setFav(id, on) {
    const c = this.get(id);
    if (!c) return;
    c.fav = !!on;
    this.touch(Date.now());
    this.persist();
  }

  played(id) {
    const c = this.get(id);
    if (!c) return;
    c.playedAt = Date.now();
    this.last = id;
    this.touch(c.playedAt);
    this.persist();
  }

  remove(id) {
    const i = this.chars.findIndex((c) => c.id === id);
    if (i < 0) return false;
    const [c] = this.chars.splice(i, 1);
    this.deleted.unshift({ ...c, deletedAt: Date.now(), hunt: this.hunt(id) });
    dropKey(this.huntKey(id));
    this.prune();
    if (this.last === id) this.last = this.chars[0]?.id || null;
    this.touch(Date.now());
    this.persist();
    return true;
  }

  canRestore() {
    return this.deleted.length > 0 && !this.full;
  }

  restore() {
    if (!this.canRestore()) return null;
    const d = this.deleted.shift();
    let name = d.name;
    for (let n = 2; this.chars.some((c) => c.name.toLowerCase() === name.toLowerCase()); n++) name = `${d.name.slice(0, 12)} ${n}`;
    const c = { id: d.id, name, look: d.look, createdAt: d.createdAt, playedAt: d.playedAt, fav: !!d.fav };
    if (this.chars.some((o) => o.id === c.id)) c.id = newId();
    writeJson(this.huntKey(c.id), d.hunt || {});
    this.chars.push(c);
    this.last = c.id;
    this.touch(Date.now());
    this.persist();
    return c;
  }

  /* --------------------- the record the guild keeps --------------------- */

  get data() {
    return {
      savedAt: this.savedAt,
      roster: {
        v: 1,
        last: this.last,
        chars: this.chars.map((c) => ({ ...c, hunt: this.hunt(c.id) })),
        deleted: this.deleted,
      },
    };
  }

  loadRaw(raw) {
    if (raw?.roster && Array.isArray(raw.roster.chars)) {
      const keep = new Set();
      const next = [];
      for (const entry of raw.roster.chars.slice(0, MAX_CHARACTERS)) {
        const c = plainChar(entry);
        if (!c || keep.has(c.id)) continue;
        keep.add(c.id);
        next.push(c);
        if (entry.hunt && typeof entry.hunt === 'object') writeJson(this.huntKey(c.id), entry.hunt);
        else dropKey(this.huntKey(c.id));
      }
      for (const old of this.chars) if (!keep.has(old.id)) dropKey(this.huntKey(old.id));
      this.chars = next;
      this.deleted = [];
      for (const entry of Array.isArray(raw.roster.deleted) ? raw.roster.deleted : []) {
        const c = plainChar(entry);
        if (c) this.deleted.push({ ...c, deletedAt: Number(entry.deletedAt) || 0, hunt: entry.hunt && typeof entry.hunt === 'object' ? entry.hunt : null });
      }
      this.last = next.some((c) => c.id === raw.roster.last) ? raw.roster.last : next[0]?.id || null;
      this.savedAt = Number(raw.savedAt) || 0;
      this.prune();
      this.persist();
      return;
    }
    if (raw && typeof raw === 'object' && !this.chars.length) {
      const c = { id: newId(), name: defaultName(this.label), look: { ...DEFAULT_LOOK }, createdAt: Number(raw.savedAt) || Date.now(), playedAt: 0 };
      writeJson(this.huntKey(c.id), raw);
      this.chars = [c];
      this.last = c.id;
      this.savedAt = Number(raw.savedAt) || 0;
      this.persist();
    }
  }

  /** True when this browser holds a character the guild record should know about. */
  hasLocalProgress() {
    return this.chars.length > 0 || this.deleted.length > 0;
  }

  /**
   * Fold a guild record into this roster.
   * Each character keeps the hunt with the later savedAt.
   * A character that exists on only one side is kept.
   * An empty roster on this device does not count as newer than a saved hunt.
   */
  mergeFrom(raw) {
    if (!raw || typeof raw !== 'object') {
      return { replaced: false, push: this.hasLocalProgress(), replacedIds: [] };
    }
    if (!(raw.roster && Array.isArray(raw.roster.chars))) {
      if (!this.hasLocalProgress()) {
        this.loadRaw(raw);
        return { replaced: this.chars.length > 0, push: false, replacedIds: this.chars.map((c) => c.id) };
      }
      return { replaced: false, push: true, replacedIds: [] };
    }
    return this.mergeRoster(raw);
  }

  mergeRoster(raw) {
    const remoteChars = [];
    const seen = new Set();
    for (const entry of raw.roster.chars.slice(0, MAX_CHARACTERS)) {
      const c = plainChar(entry);
      if (!c || seen.has(c.id)) continue;
      seen.add(c.id);
      remoteChars.push({
        char: c,
        hunt: entry.hunt && typeof entry.hunt === 'object' ? entry.hunt : null,
      });
    }
    const remoteDeleted = [];
    for (const entry of Array.isArray(raw.roster.deleted) ? raw.roster.deleted : []) {
      const c = plainChar(entry);
      if (!c) continue;
      remoteDeleted.push({
        ...c,
        deletedAt: Number(entry.deletedAt) || 0,
        hunt: entry.hunt && typeof entry.hunt === 'object' ? entry.hunt : null,
      });
    }
    const stamp = (hunt) => Number(hunt?.savedAt) || 0;
    const deletedAt = (list, id) => {
      const d = list.find((x) => x.id === id);
      return d ? Number(d.deletedAt) || 0 : 0;
    };
    let tookRemote = false;
    let localAhead = false;
    const replacedIds = [];

    for (const d of remoteDeleted) {
      const local = this.get(d.id);
      if (!local) continue;
      const localAt = stamp(this.hunt(d.id));
      if (d.deletedAt >= localAt && d.deletedAt >= deletedAt(this.deleted, d.id)) {
        this.chars = this.chars.filter((c) => c.id !== d.id);
        dropKey(this.huntKey(d.id));
        tookRemote = true;
        replacedIds.push(d.id);
      }
    }

    for (const remote of remoteChars) {
      const id = remote.char.id;
      const remoteAt = stamp(remote.hunt);
      const localGone = deletedAt(this.deleted, id);
      if (localGone > remoteAt && localGone >= deletedAt(remoteDeleted, id)) {
        localAhead = true;
        continue;
      }
      if (!this.get(id) && deletedAt(remoteDeleted, id) >= remoteAt && deletedAt(remoteDeleted, id) > 0) continue;

      const local = this.get(id);
      if (!local) {
        if (this.chars.length >= MAX_CHARACTERS) {
          const localOnly = this.chars
            .filter((c) => !seen.has(c.id))
            .map((c) => ({ c, at: stamp(this.hunt(c.id)) }))
            .sort((a, b) => a.at - b.at);
          if (!localOnly.length || remoteAt < localOnly[0].at) {
            localAhead = true;
            continue;
          }
          const drop = localOnly[0].c;
          this.chars = this.chars.filter((c) => c.id !== drop.id);
          dropKey(this.huntKey(drop.id));
        }
        if (remote.hunt) writeJson(this.huntKey(id), remote.hunt);
        else dropKey(this.huntKey(id));
        this.chars.push(remote.char);
        this.deleted = this.deleted.filter((d) => d.id !== id);
        tookRemote = true;
        replacedIds.push(id);
        continue;
      }

      const localAt = stamp(this.hunt(id));
      if (remote.hunt && remoteAt > localAt) {
        writeJson(this.huntKey(id), remote.hunt);
        local.name = remote.char.name;
        local.look = remote.char.look;
        local.fav = remote.char.fav;
        if (remote.char.playedAt > local.playedAt) local.playedAt = remote.char.playedAt;
        tookRemote = true;
        replacedIds.push(id);
      } else if (localAt > remoteAt || (!remote.hunt && this.hunt(id))) {
        localAhead = true;
      } else if (!this.hunt(id) && remote.hunt) {
        writeJson(this.huntKey(id), remote.hunt);
        tookRemote = true;
        replacedIds.push(id);
      }
    }

    for (const c of this.chars) if (!seen.has(c.id)) localAhead = true;

    const active = new Set(this.chars.map((c) => c.id));
    const beforeDeleted = this.deleted.map((d) => `${d.id}:${d.deletedAt}`).join('|');
    const deleted = new Map();
    for (const d of [...this.deleted, ...remoteDeleted]) {
      if (active.has(d.id)) continue;
      const prev = deleted.get(d.id);
      if (!prev || d.deletedAt >= prev.deletedAt) deleted.set(d.id, d);
    }
    this.deleted = [...deleted.values()].sort((a, b) => b.deletedAt - a.deletedAt);
    const afterDeleted = this.deleted.map((d) => `${d.id}:${d.deletedAt}`).join('|');
    if (afterDeleted !== beforeDeleted) {
      const remoteIds = new Set(remoteDeleted.map((d) => `${d.id}:${d.deletedAt}`));
      const localIds = new Set(beforeDeleted ? beforeDeleted.split('|') : []);
      if (this.deleted.some((d) => remoteIds.has(`${d.id}:${d.deletedAt}`) && !localIds.has(`${d.id}:${d.deletedAt}`))) tookRemote = true;
      if ([...localIds].some((id) => id && !remoteIds.has(id))) localAhead = true;
    }

    if (!this.chars.some((c) => c.id === this.last)) {
      const remoteLast = raw.roster.last;
      this.last = this.chars.some((c) => c.id === remoteLast) ? remoteLast : this.chars[0]?.id || null;
    }
    const remoteAt = Number(raw.savedAt) || 0;
    let newest = localAhead ? Math.max(this.savedAt, remoteAt) : remoteAt;
    for (const c of this.chars) newest = Math.max(newest, stamp(this.hunt(c.id)));
    this.savedAt = newest;
    this.prune();
    this.persist();
    return { replaced: tookRemote, push: localAhead, replacedIds };
  }

  save() {
    this.persist();
  }

  /**
   * Bring in characters saved on this browser under an older account id.
   * Those hunts were stored before the account lived in the database.
   */
  absorbOwner(owner) {
    if (!owner || owner === this.owner) return { replaced: false, push: false, replacedIds: [] };
    const other = new Roster(owner, this.label);
    if (!other.chars.length && !other.deleted.length) return { replaced: false, push: false, replacedIds: [] };
    return this.mergeFrom(other.data);
  }
}
