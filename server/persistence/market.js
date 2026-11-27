import { randomUUID } from 'node:crypto';
import { PersistenceError } from './errors.js';
import { requireUserId } from './ids.js';

/**
 * The Gilantre Exchange store. The Supabase adapter calls the transactional SQL functions in
 * supabase/migrations/20261127180000_gilantre_exchange.sql; the memory adapter below mirrors
 * them step for step so the World 1 server and its tests behave the same without a database.
 */

export const MARKET_CODES = ['market_invalid', 'market_limit', 'market_not_owned', 'market_gone', 'market_own', 'market_gold', 'market_have_gear', 'market_full', 'character_not_found', 'spend_invalid'];

export const marketError = (code) => new PersistenceError(code, code);

/** Maps a database exception message onto one of the market codes. */
export function marketCodeOf(err) {
  const text = String(err?.message || err?.code || '');
  return MARKET_CODES.find((c) => text.includes(c)) || null;
}

const ID_RE = /^[a-z0-9_]{1,48}$/;
const BAG = { good: 'goods', material: 'materials' };

/** A listing as the server and client see it (snake_case columns to camelCase). */
export function listingView(r) {
  if (!r) return null;
  return {
    id: r.id,
    sellerId: r.seller_id,
    sellerName: r.seller_name,
    kind: r.kind,
    itemId: r.item_id,
    qty: r.qty,
    price: r.price,
    fee: r.fee,
    status: r.status,
    createdAt: Date.parse(r.created_at) || 0,
    expiresAt: Date.parse(r.expires_at) || 0,
    buyerName: r.buyer_name || null,
    soldAt: r.sold_at ? Date.parse(r.sold_at) : 0,
    settled: !!r.settled,
  };
}

/** Sorts and pages listing rows the same way for both stores. */
export function sortRows(rows, sort) {
  const by = {
    price: (a, b) => a.price - b.price || a.created_at.localeCompare(b.created_at),
    price_desc: (a, b) => b.price - a.price || a.created_at.localeCompare(b.created_at),
    unit: (a, b) => a.price / a.qty - b.price / b.qty || a.price - b.price,
    new: (a, b) => b.created_at.localeCompare(a.created_at),
  }[sort] || ((a, b) => a.price - b.price);
  return rows.slice().sort(by);
}

/**
 * In-memory market, sharing the memory adapter's character rows.
 * getRow(userId) -> row; writeState(userId, state) bumps the version.
 */
export function createMemoryMarket({ getRow, writeState, now = () => Date.now() }) {
  const listings = new Map();
  const iso = (t) => new Date(t).toISOString();
  const open = (l) => l.status === 'active' && Date.parse(l.expires_at) > now();
  const stateOf = (userId) => {
    const row = getRow(requireUserId(userId));
    if (!row) throw marketError('character_not_found');
    return JSON.parse(JSON.stringify(row.state || {}));
  };
  const credit = (state, kind, id, qty) => {
    if (kind === 'gear') {
      state.crafted = { ...(state.crafted || {}), [id]: true };
      return;
    }
    const bag = BAG[kind];
    state[bag] = { ...(state[bag] || {}) };
    state[bag][id] = Math.min(99999, (Number(state[bag][id]) || 0) + qty);
  };

  return {
    async list({ sellerId, sellerName, kind, itemId, qty, price, hours, maxActive, feeBp }) {
      if (!['good', 'material', 'gear'].includes(kind) || !ID_RE.test(itemId || '') || !(qty >= 1 && qty <= 9999) || (kind === 'gear' && qty !== 1)
        || !(price >= 1 && price <= 1_000_000) || !(hours >= 1 && hours <= 168) || !(feeBp >= 0 && feeBp <= 2000) || !(maxActive >= 1 && maxActive <= 100)) throw marketError('market_invalid');
      const state = stateOf(sellerId);
      const active = [...listings.values()].filter((l) => l.seller_id === sellerId && open(l)).length;
      if (active >= maxActive) throw marketError('market_limit');
      if (kind === 'gear') {
        if (state.crafted?.[itemId] !== true) throw marketError('market_not_owned');
        delete state.crafted[itemId];
      } else {
        const have = Number(state[BAG[kind]]?.[itemId]) || 0;
        if (have < qty) throw marketError('market_not_owned');
        state[BAG[kind]] = { ...state[BAG[kind]], [itemId]: have - qty };
      }
      const version = writeState(sellerId, state);
      const id = randomUUID();
      const t = now();
      listings.set(id, {
        id, seller_id: sellerId, seller_name: sellerName, kind, item_id: itemId, qty, price,
        fee: Math.floor((price * feeBp) / 10000), status: 'active', created_at: iso(t), expires_at: iso(t + hours * 3600_000),
        buyer_id: null, buyer_name: null, sold_at: null, settled: false,
      });
      return { listingId: id, version };
    },

    async buy({ listingId, buyerId, buyerName }) {
      const l = listings.get(listingId);
      if (!l || !open(l)) throw marketError('market_gone');
      if (l.seller_id === buyerId) throw marketError('market_own');
      const state = stateOf(buyerId);
      const gold = Number(state.gold) || 0;
      if (gold < l.price) throw marketError('market_gold');
      if (l.kind === 'gear' && state.crafted?.[l.item_id] === true) throw marketError('market_have_gear');
      if (l.kind !== 'gear' && (Number(state[BAG[l.kind]]?.[l.item_id]) || 0) + l.qty > 99999) throw marketError('market_full');
      state.gold = gold - l.price;
      credit(state, l.kind, l.item_id, l.qty);
      const version = writeState(buyerId, state);
      Object.assign(l, { status: 'sold', buyer_id: buyerId, buyer_name: buyerName, sold_at: iso(now()) });
      return { kind: l.kind, itemId: l.item_id, qty: l.qty, price: l.price, version };
    },

    async cancel({ listingId, sellerId }) {
      const l = listings.get(listingId);
      if (!l || l.seller_id !== sellerId || l.status !== 'active') throw marketError('market_gone');
      const state = stateOf(sellerId);
      credit(state, l.kind, l.item_id, l.qty);
      const version = writeState(sellerId, state);
      Object.assign(l, { status: 'cancelled', settled: true });
      return { kind: l.kind, itemId: l.item_id, qty: l.qty, version };
    },

    async collect({ sellerId }) {
      const state = stateOf(sellerId);
      let gold = 0;
      const items = [];
      for (const l of listings.values()) {
        if (l.seller_id !== sellerId) continue;
        if (l.status === 'sold' && !l.settled) {
          gold += l.price - l.fee;
          l.settled = true;
        } else if (l.status === 'active' && Date.parse(l.expires_at) <= now()) {
          credit(state, l.kind, l.item_id, l.qty);
          items.push({ kind: l.kind, id: l.item_id, qty: l.qty });
          Object.assign(l, { status: 'expired', settled: true });
        }
      }
      if (gold > 0) state.gold = Math.min(1_000_000, (Number(state.gold) || 0) + gold);
      const version = gold > 0 || items.length ? writeState(sellerId, state) : getRow(sellerId).version;
      return { gold, items, version };
    },

    async spend({ userId, gold = 0, goods = {}, materials = {}, gear = [] }) {
      if (!(gold >= 0 && gold <= 1_000_000)) throw marketError('spend_invalid');
      const state = stateOf(userId);
      const lower = (bag, map) => {
        for (const [k, v] of Object.entries(map || {})) {
          if (!ID_RE.test(k) || !(Number(v) >= 0)) throw marketError('spend_invalid');
          const have = Number(state[bag]?.[k]) || 0;
          if (have > 0) state[bag] = { ...state[bag], [k]: Math.max(0, have - Number(v)) };
        }
      };
      if (gold > 0) state.gold = Math.max(0, (Number(state.gold) || 0) - gold);
      lower('goods', goods);
      lower('materials', materials);
      for (const g of gear || []) {
        if (!ID_RE.test(g)) throw marketError('spend_invalid');
        if (state.crafted) delete state.crafted[g];
      }
      return { version: writeState(userId, state) };
    },

    async search({ items = null, minPrice = 0, maxPrice = 0, sort = 'price', offset = 0, limit = 24, excludeSeller = null }) {
      const allow = items ? new Set(items.map((t) => t.kind + ':' + t.id)) : null;
      let rows = [...listings.values()].filter((l) => open(l)
        && (!allow || allow.has(l.kind + ':' + l.item_id))
        && (!minPrice || l.price >= minPrice) && (!maxPrice || l.price <= maxPrice)
        && (!excludeSeller || l.seller_id !== excludeSeller));
      rows = sortRows(rows, sort);
      return { total: rows.length, rows: rows.slice(offset, offset + limit).map(listingView) };
    },

    async mine({ sellerId }) {
      const rows = [...listings.values()].filter((l) => l.seller_id === sellerId && (l.status === 'active' || !l.settled))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return rows.map(listingView);
    },

    /** Test hook: move a listing's expiry into the past. */
    _expire(listingId) {
      const l = listings.get(listingId);
      if (l) l.expires_at = iso(now() - 1000);
    },
  };
}

/** Supabase market: thin calls onto the SQL functions, plus the browse query. */
export function createSupabaseMarket(db) {
  const call = async (fn, args) => {
    const { data, error } = await db.rpc(fn, args);
    if (error) {
      const code = marketCodeOf(error);
      if (code) throw marketError(code);
      throw new PersistenceError('unavailable', error.message || 'Market unavailable.');
    }
    return Array.isArray(data) ? data[0] : data;
  };
  return {
    async list({ sellerId, sellerName, kind, itemId, qty, price, hours, maxActive, feeBp }) {
      const r = await call('market_list', { p_seller: sellerId, p_seller_name: sellerName, p_kind: kind, p_item_id: itemId, p_qty: qty, p_price: price, p_hours: hours, p_max_active: maxActive, p_fee_bp: feeBp });
      return { listingId: r?.listing_id, version: Number(r?.version) || undefined };
    },
    async buy({ listingId, buyerId, buyerName }) {
      const r = await call('market_buy', { p_listing: listingId, p_buyer: buyerId, p_buyer_name: buyerName });
      return { kind: r.kind, itemId: r.item_id, qty: r.qty, price: r.price, version: Number(r.version) || undefined };
    },
    async cancel({ listingId, sellerId }) {
      const r = await call('market_cancel', { p_listing: listingId, p_seller: sellerId });
      return { kind: r.kind, itemId: r.item_id, qty: r.qty, version: Number(r.version) || undefined };
    },
    async collect({ sellerId }) {
      const r = await call('market_collect', { p_seller: sellerId });
      return { gold: Number(r?.gold) || 0, items: Array.isArray(r?.items) ? r.items : [], version: Number(r?.version) || undefined };
    },
    async spend({ userId, gold = 0, goods = {}, materials = {}, gear = [] }) {
      const r = await call('inventory_spend', { p_user: userId, p_gold: gold, p_goods: goods, p_materials: materials, p_gear: gear });
      return { version: Number(r?.version) || undefined };
    },
    async search({ items = null, minPrice = 0, maxPrice = 0, sort = 'price', offset = 0, limit = 24, excludeSeller = null }) {
      let q = db.from('market_listings').select('*', { count: 'exact' }).eq('status', 'active').gt('expires_at', new Date().toISOString());
      if (items) {
        if (!items.length) return { total: 0, rows: [] };
        q = q.in('item_id', [...new Set(items.map((t) => t.id))].slice(0, 400));
      }
      if (minPrice) q = q.gte('price', minPrice);
      if (maxPrice) q = q.lte('price', maxPrice);
      if (excludeSeller) q = q.neq('seller_id', excludeSeller);
      const unit = sort === 'unit';
      if (sort === 'new') q = q.order('created_at', { ascending: false });
      else q = q.order('price', { ascending: sort !== 'price_desc' });
      q = unit ? q.range(0, 299) : q.range(offset, offset + limit - 1);
      const { data, error, count } = await q;
      if (error) throw new PersistenceError('unavailable', error.message || 'Market unavailable.');
      const allow = items ? new Set(items.map((t) => t.kind + ':' + t.id)) : null;
      let rows = (data || []).filter((r) => !allow || allow.has(r.kind + ':' + r.item_id));
      if (unit) rows = sortRows(rows, 'unit').slice(offset, offset + limit);
      return { total: count ?? rows.length, rows: rows.map(listingView) };
    },
    async mine({ sellerId }) {
      const { data, error } = await db.from('market_listings').select('*').eq('seller_id', sellerId)
        .or('status.eq.active,settled.eq.false').order('created_at', { ascending: false }).limit(100);
      if (error) throw new PersistenceError('unavailable', error.message || 'Market unavailable.');
      return (data || []).map(listingView);
    },
  };
}
