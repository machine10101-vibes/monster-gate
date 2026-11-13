import {
  BOUNTY_HOUR_CAP,
  BOUNTY_ROTATE_MS,
  TEMPLATE_BY_ID,
  canClaim,
  hourWindow,
  makeSlots,
} from '../data/bounties.js';

function levelsOf(progress) {
  return {
    mining: progress.level('mining'),
    fishing: progress.level('fishing'),
    woodcutting: progress.level('woodcutting'),
    cooking: progress.level('cooking'),
    strength: progress.level('strength'),
  };
}

function goodsOf(progress) {
  const g = {};
  for (const t of Object.values(TEMPLATE_BY_ID)) if (t.good) g[t.good] = progress.good(t.good);
  return g;
}

/**
 * Mira's rotating postings. Kill counts start at zero when a posting is pinned.
 * Gather counts only nodes, fish and chops after the pin, then consumes the goods.
 */
export class Bounties {
  constructor(progress) {
    this.progress = progress;
    this.rebind();
  }

  rebind() {
    const raw = this.progress.data.bounties;
    this.state = raw && typeof raw === 'object' ? raw : {};
    this.progress.data.bounties = this.state;
    this.ensure(true);
  }

  persist() {
    this.progress.data.bounties = this.state;
    this.progress.save();
  }

  ensure(quiet = false) {
    const now = Date.now();
    const hour = hourWindow(now, this.state);
    this.state.hourAt = hour.hourAt;
    this.state.hourN = hour.hourN;
    const stale = !Array.isArray(this.state.slots) || this.state.slots.length < 1;
    const rotated = Number(this.state.rotatedAt) || 0;
    const due = !rotated || now - rotated >= BOUNTY_ROTATE_MS;
    if (stale || due) this.rotate(now, quiet);
  }

  rotate(now = Date.now(), quiet = false) {
    const rank = this.rank();
    this.state.seed = ((this.state.seed | 0) + 1 + (now & 0xffff)) >>> 0;
    this.state.rotatedAt = now;
    this.state.slots = makeSlots(this.state.seed, rank, levelsOf(this.progress), goodsOf(this.progress));
    this.persist();
    return quiet ? null : { toast: 'The guild board posted new bounties.', hud: true };
  }

  rank() {
    return this.progress.data.hunter?.rank | 0;
  }

  slots() {
    this.ensure(true);
    return this.state.slots || [];
  }

  slot(i) {
    return this.slots()[i] || null;
  }

  remainingClaims() {
    this.ensure(true);
    return Math.max(0, BOUNTY_HOUR_CAP - (this.state.hourN | 0));
  }

  msUntilRotate() {
    this.ensure(true);
    const due = (Number(this.state.rotatedAt) || 0) + BOUNTY_ROTATE_MS;
    return Math.max(0, due - Date.now());
  }

  progressOf(slot) {
    if (!slot) return 0;
    return Math.min(slot.need, slot.n | 0);
  }

  ready(slot) {
    if (!slot || slot.claimed) return false;
    if (this.progressOf(slot) < slot.need) return false;
    if (slot.kind === 'gather' && this.progress.good(slot.good) < slot.need) return false;
    return true;
  }

  onKill(type) {
    this.ensure(true);
    let hit = false;
    for (const slot of this.state.slots || []) {
      if (slot.claimed || slot.kind !== 'kill' || slot.type !== type) continue;
      if ((slot.n | 0) >= slot.need) continue;
      slot.n = (slot.n | 0) + 1;
      hit = true;
    }
    if (hit) this.persist();
    return hit;
  }

  /** Only nodes, fish and chops count. Storage and smelting do not fill a posting. */
  onGather(good, n = 1) {
    if (!good || n < 1) return false;
    this.ensure(true);
    let hit = false;
    for (const slot of this.state.slots || []) {
      if (slot.claimed || slot.kind !== 'gather' || slot.good !== good) continue;
      if ((slot.n | 0) >= slot.need) continue;
      slot.n = Math.min(slot.need, (slot.n | 0) + n);
      hit = true;
    }
    if (hit) this.persist();
    return hit;
  }

  claim(index) {
    this.ensure(true);
    const slot = this.slot(index);
    if (!slot || slot.claimed) return { ok: false, reason: 'gone' };
    if (!this.ready(slot)) return { ok: false, reason: 'short' };
    if (!canClaim(this.state)) return { ok: false, reason: 'cap' };
    if (slot.kind === 'gather') {
      if (!this.progress.takeGood(slot.good, slot.need)) return { ok: false, reason: 'short' };
    }
    const hour = hourWindow(Date.now(), this.state);
    this.state.hourAt = hour.hourAt;
    this.state.hourN = hour.hourN + 1;
    const gold = slot.gold | 0;
    const xp = slot.xp | 0;
    const skill = slot.skill;
    const label = slot.label;
    this.state.slots[index] = this.lockedSlot(slot);
    this.persist();
    const lvl = this.progress.addXp(skill, xp);
    return { ok: true, gold, xp, skill, label, levelled: lvl, left: this.remainingClaims() };
  }

  lockedSlot(old) {
    return {
      id: old.id,
      kind: old.kind,
      type: old.type,
      good: old.good,
      skill: old.skill,
      need: old.need,
      n: old.need,
      base: old.base,
      gold: old.gold,
      xp: old.xp,
      label: old.label,
      claimed: true,
    };
  }
}
