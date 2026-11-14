import { xpForLevel } from './gathering.js';

/** Three postings, refreshed on a timer. Six turn-ins an hour. */
export const BOUNTY_SLOTS = 3;
export const BOUNTY_ROTATE_MS = 10 * 60 * 1000;
export const BOUNTY_HOUR_CAP = 6;
export const BOUNTY_HOUR_MS = 60 * 60 * 1000;

export const TEMPLATES = [
  { id: 'slime', kind: 'kill', type: 'slime', need: 6, minRank: 0, label: 'Gate Slimes' },
  { id: 'boar', kind: 'kill', type: 'boar', need: 4, minRank: 0, label: 'Thorn Boars' },
  { id: 'wraith', kind: 'kill', type: 'wraith', need: 4, minRank: 1, label: 'Gate Wraiths' },
  { id: 'voidslime', kind: 'kill', type: 'voidslime', need: 4, minRank: 1, label: 'Void Slimes' },
  { id: 'budge', kind: 'kill', type: 'budgedragon', need: 2, minRank: 2, label: 'Green Budge Dragons' },
  { id: 'orc', kind: 'kill', type: 'orcscout', need: 3, minRank: 2, label: 'Orc Scouts' },
  { id: 'darksycle', kind: 'kill', type: 'darksycledragon', need: 1, minRank: 3, label: 'Darksycle Dragons' },
  { id: 'demon', kind: 'kill', type: 'demonknight', need: 1, minRank: 4, label: 'Demon Knights' },
  { id: 'holy', kind: 'kill', type: 'holyknight', need: 1, minRank: 4, label: 'Holy Knights' },
  { id: 'copper', kind: 'gather', good: 'copper_ore', need: 4, skill: 'mining', minSkill: 1, label: 'Copper ore' },
  { id: 'iron', kind: 'gather', good: 'iron_ore', need: 3, skill: 'mining', minSkill: 15, label: 'Iron ore' },
  { id: 'coal', kind: 'gather', good: 'coal', need: 3, skill: 'mining', minSkill: 30, label: 'Coal' },
  { id: 'mithril', kind: 'gather', good: 'mithril_ore', need: 2, skill: 'mining', minSkill: 45, label: 'Mithril ore' },
  { id: 'adamite', kind: 'gather', good: 'adamite_ore', need: 2, skill: 'mining', minSkill: 60, label: 'Adamite ore' },
  { id: 'shrimp', kind: 'gather', good: 'shrimp', need: 4, skill: 'fishing', minSkill: 1, label: 'Raw shrimp' },
  { id: 'trout', kind: 'gather', good: 'trout', need: 3, skill: 'fishing', minSkill: 3, label: 'Raw trout' },
  { id: 'birch', kind: 'gather', good: 'birch_logs', need: 4, skill: 'woodcutting', minSkill: 1, label: 'Birch logs' },
  { id: 'oak', kind: 'gather', good: 'oak_logs', need: 3, skill: 'woodcutting', minSkill: 1, label: 'Oak logs' },
  { id: 'maple', kind: 'gather', good: 'maple_logs', need: 2, skill: 'woodcutting', minSkill: 10, label: 'Maple logs' },
  { id: 'pine', kind: 'gather', good: 'pine_logs', need: 4, skill: 'woodcutting', minSkill: 1, label: 'Pine logs' },
  { id: 'redoak', kind: 'gather', good: 'redoak_logs', need: 3, skill: 'woodcutting', minSkill: 28, label: 'Red Oak logs' },
  { id: 'walnut', kind: 'gather', good: 'walnut_logs', need: 2, skill: 'woodcutting', minSkill: 60, label: 'Black Walnut logs' },
  { id: 'ebony', kind: 'gather', good: 'ebony_logs', need: 1, skill: 'woodcutting', minSkill: 96, label: 'Ebony logs' },
];

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

function mix(n) {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  return (n ^ (n >>> 13)) >>> 0;
}

export function bountyXp(skill, level) {
  const lvl = Math.max(1, Math.min(98, level | 0));
  const span = xpForLevel(lvl + 1) - xpForLevel(lvl);
  return Math.max(12, Math.min(220, Math.round(span * 0.04)));
}

export function bountyGold(tmpl, rank, need) {
  const r = Math.max(0, rank | 0);
  const n = Math.max(1, need | 0);
  if (tmpl.kind === 'kill') return 10 + r * 4 + n * 2;
  return 8 + r * 3 + n * 2;
}

export function bountyNeed(tmpl, rank) {
  return tmpl.need + Math.floor(Math.max(0, rank | 0) / 2);
}

export function eligibleTemplates(rank, levels) {
  const r = rank | 0;
  return TEMPLATES.filter((t) => {
    if ((t.minRank | 0) > r) return false;
    if (t.kind === 'gather' && (levels[t.skill] || 1) < (t.minSkill || 1)) return false;
    return true;
  });
}

/** Pick `count` unique templates from the eligible pool using a numeric seed. */
export function pickTemplates(seed, rank, levels, count = BOUNTY_SLOTS) {
  const pool = eligibleTemplates(rank, levels);
  const out = [];
  let s = mix(seed || 1);
  const bag = pool.length ? pool : TEMPLATES.filter((t) => t.minRank === 0);
  for (let i = 0; i < count; i++) {
    const left = bag.filter((t) => !out.includes(t));
    const use = left.length ? left : bag;
    s = mix(s + i * 17 + rank * 3);
    out.push(use[s % use.length]);
  }
  return out;
}

export function makeSlots(seed, rank, levels, goods = {}) {
  return pickTemplates(seed, rank, levels).map((t) => {
    const need = bountyNeed(t, rank);
    const skill = t.kind === 'gather' ? t.skill : 'strength';
    const lvl = levels[skill] || 1;
    return {
      id: t.id,
      kind: t.kind,
      type: t.type || null,
      good: t.good || null,
      skill,
      need,
      n: 0,
      base: t.kind === 'gather' ? (goods[t.good] | 0) : 0,
      gold: bountyGold(t, rank, need),
      xp: bountyXp(skill, lvl),
      label: t.label,
    };
  });
}

function stamp(n) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function hourWindow(now, state) {
  const t = stamp(now) || Date.now();
  const start = stamp(state?.hourAt);
  if (!start || t - start >= BOUNTY_HOUR_MS) return { hourAt: t, hourN: 0 };
  return { hourAt: start, hourN: state.hourN | 0 };
}

export function canClaim(state, now = Date.now()) {
  const hour = hourWindow(now, state);
  return hour.hourN < BOUNTY_HOUR_CAP;
}

export function gatherProgress(slot, have) {
  if (!slot || slot.kind !== 'gather') return 0;
  return Math.max(0, Math.min(slot.need, (have | 0) - (slot.base | 0)));
}
