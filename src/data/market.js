import { GEAR, MATERIALS, DROPS, MONSTERS, SLOT_LABEL, WEAPON_LABEL, gearById } from './catalog.js';
import { GOODS } from './gathering.js';

/**
 * The Gilantre Exchange: rules and the trade catalog, shared by the World 1 server (which
 * enforces them) and the client (which explains them). Everything that can change hands is
 * described once here, so a search on either side means the same thing.
 */

export const MARKET = {
  feeBp: 500,
  maxActive: 20,
  maxPrice: 1_000_000,
  maxQty: 9999,
  hours: 72,
  pageSize: 24,
  /** The Exchange plaza outside Gilantre's east gate, in world units. Trading happens within reach of it. */
  plaza: { x: 532, z: 120, r: 30 },
  reach: 46,
};

export const feeFor = (price) => Math.floor((Math.max(0, price | 0) * MARKET.feeBp) / 10000);
export const payoutFor = (price) => Math.max(0, (price | 0) - feeFor(price));

export const CATEGORIES = [
  { id: 'all', label: 'Everything' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'material', label: 'Monster parts' },
  { id: 'good', label: 'Goods' },
];

export const GOOD_KIND_LABEL = { ore: 'Ore', bar: 'Bars', fish: 'Fish', log: 'Logs', part: 'Fletching', arrow: 'Arrows', loot: 'Treasure' };

const FAMILY_NAME = Object.fromEntries(MONSTERS.map((m) => [m.id, m.name]));
FAMILY_NAME.smith = 'Smithed metal';

/** material id -> the monster whose drops include it */
const MATERIAL_FAMILY = {};
for (const [monster, drops] of Object.entries(DROPS)) for (const d of drops) if (MATERIALS[d.id] && !MATERIAL_FAMILY[d.id]) MATERIAL_FAMILY[d.id] = monster;

function describe(kind, id) {
  if (kind === 'gear') {
    const g = gearById(id);
    if (!g || g.starter || g.monster === 'starter' || id === 'knife') return null;
    const weapon = g.type === 'weapon';
    return {
      kind,
      id,
      name: g.name,
      category: weapon ? 'weapon' : 'armor',
      sub: weapon ? g.wtype : g.slot,
      subLabel: weapon ? WEAPON_LABEL[g.wtype] || g.wtype : SLOT_LABEL[g.slot] || g.slot,
      family: g.monster,
      familyLabel: FAMILY_NAME[g.monster] || g.monster,
      level: g.reqLevel || 1,
      value: Math.max(1, Math.round(Object.values(g.recipe || {}).reduce((a, n) => a + n, 0) * 12)),
      desc: g.desc || '',
      stack: false,
    };
  }
  if (kind === 'material') {
    const m = MATERIALS[id];
    if (!m) return null;
    const fam = MATERIAL_FAMILY[id] || '';
    return { kind, id, name: m.name, category: 'material', sub: fam, subLabel: FAMILY_NAME[fam] || 'Monster part', family: fam, familyLabel: FAMILY_NAME[fam] || '', level: 1, value: m.price ? m.price * 2 : 10, desc: m.desc || '', stack: true };
  }
  if (kind === 'good') {
    const g = GOODS[id];
    if (!g || g.session || id.startsWith('__')) return null;
    return { kind, id, name: g.name, category: 'good', sub: g.kind, subLabel: GOOD_KIND_LABEL[g.kind] || g.kind, family: '', familyLabel: '', level: 1, value: g.price || 1, desc: g.desc || '', stack: true };
  }
  return null;
}

/** Every item that may be listed, built once. */
export const TRADEABLE = [
  ...GEAR.map((g) => describe('gear', g.id)),
  ...Object.keys(MATERIALS).map((id) => describe('material', id)),
  ...Object.keys(GOODS).map((id) => describe('good', id)),
].filter(Boolean);

const BY_KEY = new Map(TRADEABLE.map((t) => [t.kind + ':' + t.id, t]));
export const tradeable = (kind, id) => BY_KEY.get(kind + ':' + id) || null;

/** Families that actually have something tradeable, for the filter list. */
export const FAMILIES = [...new Set(TRADEABLE.map((t) => t.family).filter(Boolean))].map((id) => ({ id, label: FAMILY_NAME[id] || id })).sort((a, b) => a.label.localeCompare(b.label));

/** Sub-filters for each category (weapon type, armor slot, part family, goods kind). */
export function subsFor(category) {
  const seen = new Map();
  for (const t of TRADEABLE) if (t.category === category && t.sub && !seen.has(t.sub)) seen.set(t.sub, t.subLabel);
  return [...seen].map(([id, label]) => ({ id, label }));
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Turns a search box and filters into the catalog entries they allow. Words must all match
 * the name, family or type; filters narrow by category, sub-type, family and level band.
 */
export function matchItems({ q = '', category = 'all', sub = '', family = '', minLevel = 0, maxLevel = 0 } = {}) {
  const words = norm(q).split(' ').filter(Boolean).slice(0, 6);
  return TRADEABLE.filter((t) => {
    if (category && category !== 'all' && t.category !== category) return false;
    if (sub && t.sub !== sub) return false;
    if (family && t.family !== family) return false;
    if (minLevel && t.level < minLevel) return false;
    if (maxLevel && t.level > maxLevel) return false;
    if (!words.length) return true;
    const hay = norm(`${t.name} ${t.familyLabel} ${t.subLabel} ${t.category}`);
    return words.every((w) => hay.includes(w));
  });
}

export const SORTS = [
  { id: 'price', label: 'Lowest price' },
  { id: 'price_desc', label: 'Highest price' },
  { id: 'unit', label: 'Best price each' },
  { id: 'new', label: 'Newest' },
];

/** Checks a listing request against the rules. Returns an error code or null. */
export function listingProblem({ kind, id, qty, price } = {}) {
  const t = tradeable(kind, id);
  if (!t) return 'market_item';
  if (!Number.isInteger(qty) || qty < 1 || qty > MARKET.maxQty || (!t.stack && qty !== 1)) return 'market_qty';
  if (!Number.isInteger(price) || price < 1 || price > MARKET.maxPrice) return 'market_price';
  return null;
}

export const MARKET_ERRORS = {
  market_item: 'That item cannot be traded on the Exchange.',
  market_qty: 'Choose a quantity you hold. Gear sells one piece at a time.',
  market_price: 'Set a price between 1 and 1,000,000 gold.',
  market_not_owned: 'Your World 1 inventory does not hold that many. Items earned in solo play stay in your own save.',
  market_limit: `You already have ${MARKET.maxActive} listings open. Collect or cancel one first.`,
  market_gone: 'That listing has already sold or expired.',
  market_own: 'That is your own listing.',
  market_gold: 'Not enough World 1 gold for that.',
  market_have_gear: 'You already own that piece.',
  market_full: 'You cannot carry any more of that item.',
  market_far: 'Visit the Gilantre Exchange, outside the city\'s east gate, to trade.',
  market_offline: 'The Exchange trades on World 1. Sign in and go online to buy and sell.',
  market_busy: 'The Exchange is busy. Try again in a moment.',
  market_unavailable: 'The Exchange is closed right now. Try again later.',
};

export const marketMessage = (code) => MARKET_ERRORS[code] || MARKET_ERRORS.market_unavailable;
