import { createBucket } from './limits.js';
import { MARKET, listingProblem, matchItems, tradeable, CATEGORIES, SORTS } from '../src/data/market.js';
import { marketCodeOf } from './persistence/market.js';

/**
 * The Gilantre Exchange on World 1.
 *
 * Every trade runs through the persistence market (transactional SQL in production), so items
 * leave a seller the moment they are listed, a listing sells once, buyers pay from the gold the
 * server holds for them, and sellers collect proceeds (less the fee) and expired lots exactly
 * once. Browsing works anywhere; listing, buying, cancelling and collecting need the hunter to be
 * at the Exchange outside Gilantre. Seller account ids never leave the server.
 */

export const MARKET_TYPES = new Set(['market_search', 'market_list', 'market_buy', 'market_cancel', 'market_collect', 'market_mine', 'inv_spend']);
const TRADES = new Set(['market_list', 'market_buy', 'market_cancel', 'market_collect']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_RE = /^[a-z0-9_]{1,48}$/;

class MarketError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const int = (v, lo, hi, d = 0) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
};

/** What a client may see of a listing. */
function publicListing(l, userId) {
  const t = tradeable(l.kind, l.itemId);
  return {
    id: l.id,
    kind: l.kind,
    itemId: l.itemId,
    name: t?.name || l.itemId,
    qty: l.qty,
    price: l.price,
    fee: l.fee,
    seller: l.sellerName,
    status: l.status,
    createdAt: l.createdAt,
    expiresAt: l.expiresAt,
    buyer: l.buyerName || null,
    settled: l.settled,
    mine: !!userId && l.sellerId === userId,
  };
}

/** Counts a hunter holds on World 1 that the Exchange can draw on. */
function vaultOf(state = {}) {
  const pick = (m) => Object.fromEntries(Object.entries(m || {}).filter(([, n]) => Number(n) > 0).map(([k, n]) => [k, Number(n)]));
  return {
    gold: Number(state.gold) || 0,
    goods: pick(state.goods),
    materials: pick(state.materials),
    gear: Object.entries(state.crafted || {}).filter(([id, on]) => on === true && tradeable('gear', id)).map(([id]) => id),
  };
}

export class WorldMarket {
  constructor(world) {
    this.world = world;
    this.buckets = new WeakMap();
    this.chain = Promise.resolve();
    /** listing id -> seller account, for listings opened since this process started (sale notices). */
    this.sellers = new Map();
  }

  get store() {
    return this.world.persist?.market || null;
  }

  isMarketType(type) {
    return MARKET_TYPES.has(type);
  }

  /** One write at a time on this World 1 process, on top of the database's own row locks. */
  serial(fn) {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => {});
    return run;
  }

  allow(session, cost = 1) {
    let b = this.buckets.get(session);
    if (!b) {
      b = createBucket(3, 8, this.world.now);
      this.buckets.set(session, b);
    }
    return b.take(cost);
  }

  near(session) {
    return Math.hypot((Number(session.x) || 0) - MARKET.plaza.x, (Number(session.z) || 0) - MARKET.plaza.z) <= MARKET.reach;
  }

  reply(session, msg, ok, data = {}, code = '') {
    this.world.sendTo(session, 'market_result', { request_id: String(msg.request_id || ''), op: msg.type, ok, code, ...data });
  }

  async handle(session, msg) {
    try {
      if (!session.userId || session.guest) throw new MarketError('market_offline');
      if (!this.store) throw new MarketError('market_unavailable');
      if (!this.allow(session, msg.type === 'inv_spend' ? 0.5 : 1)) throw new MarketError('market_busy');
      if (TRADES.has(msg.type) && !this.near(session)) throw new MarketError('market_far');
      const op = msg.type === 'inv_spend' ? 'op_spend' : msg.type.replace('market_', 'op_');
      const data = await this[op](session, msg);
      if (msg.type !== 'inv_spend') this.reply(session, msg, true, data || {});
    } catch (err) {
      const code = err instanceof MarketError ? err.code : marketCodeOf(err) || 'market_unavailable';
      if (!(err instanceof MarketError) && !marketCodeOf(err)) console.warn('market', msg.type, err?.message || err);
      if (msg.type !== 'inv_spend') this.reply(session, msg, false, {}, code);
    }
  }

  async op_search(session, msg) {
    const f = {
      q: String(msg.q || '').slice(0, 60),
      category: CATEGORIES.some((c) => c.id === msg.category) ? msg.category : 'all',
      sub: ID_RE.test(String(msg.sub || '')) ? msg.sub : '',
      family: ID_RE.test(String(msg.family || '')) ? msg.family : '',
      minLevel: int(msg.minLevel, 0, 999),
      maxLevel: int(msg.maxLevel, 0, 999),
    };
    const filtered = f.q || f.category !== 'all' || f.sub || f.family || f.minLevel || f.maxLevel;
    const items = filtered ? matchItems(f).map((t) => ({ kind: t.kind, id: t.id })) : null;
    const sort = SORTS.some((s) => s.id === msg.sort) ? msg.sort : 'price';
    const page = int(msg.page, 0, 500);
    const res = await this.store.search({
      items,
      minPrice: int(msg.minPrice, 0, MARKET.maxPrice),
      maxPrice: int(msg.maxPrice, 0, MARKET.maxPrice),
      sort,
      offset: page * MARKET.pageSize,
      limit: MARKET.pageSize,
    });
    return { total: res.total, page, pageSize: MARKET.pageSize, listings: res.rows.map((l) => publicListing(l, session.userId)) };
  }

  async op_mine(session) {
    const [rows, row] = await Promise.all([this.store.mine({ sellerId: session.userId }), this.world.persist.loadCharacter(session.userId)]);
    const now = this.world.now();
    const listings = rows.map((l) => publicListing(l, session.userId));
    const due = rows.reduce((a, l) => a + (l.status === 'sold' && !l.settled ? l.price - l.fee : 0), 0);
    const expired = rows.filter((l) => l.status === 'active' && l.expiresAt <= now).length;
    return { listings, due, expired, vault: vaultOf(row?.state), rules: { feeBp: MARKET.feeBp, maxActive: MARKET.maxActive, hours: MARKET.hours } };
  }

  async op_list(session, msg) {
    const kind = String(msg.kind || '');
    const itemId = String(msg.itemId || '');
    const qty = Number(msg.qty);
    const price = Number(msg.price);
    const problem = listingProblem({ kind, id: itemId, qty, price });
    if (problem) throw new MarketError(problem);
    const r = await this.serial(() => this.store.list({
      sellerId: session.userId,
      sellerName: String(session.name || 'Hunter').slice(0, 24),
      kind,
      itemId,
      qty,
      price,
      hours: MARKET.hours,
      maxActive: MARKET.maxActive,
      feeBp: MARKET.feeBp,
    }));
    if (r.listingId) this.sellers.set(r.listingId, session.userId);
    return { listingId: r.listingId, kind, itemId, qty, price };
  }

  async op_buy(session, msg) {
    const id = String(msg.listingId || '');
    if (!UUID.test(id)) throw new MarketError('market_gone');
    const r = await this.serial(() => this.store.buy({ listingId: id, buyerId: session.userId, buyerName: String(session.name || 'Hunter').slice(0, 24) }));
    this.notifySeller(id, r);
    return { listingId: id, kind: r.kind, itemId: r.itemId, qty: r.qty, price: r.price };
  }

  async op_cancel(session, msg) {
    const id = String(msg.listingId || '');
    if (!UUID.test(id)) throw new MarketError('market_gone');
    const r = await this.serial(() => this.store.cancel({ listingId: id, sellerId: session.userId }));
    return { listingId: id, kind: r.kind, itemId: r.itemId, qty: r.qty };
  }

  async op_collect(session) {
    const r = await this.serial(() => this.store.collect({ sellerId: session.userId }));
    return { gold: r.gold, items: r.items || [] };
  }

  /** Mirrors spending from the hunter's own game. Only ever lowers what World 1 holds. */
  async op_spend(session, msg) {
    const map = (m) => {
      const out = {};
      for (const [k, v] of Object.entries(m && typeof m === 'object' ? m : {}).slice(0, 60)) if (ID_RE.test(k)) out[k] = int(v, 0, 99999);
      return out;
    };
    const gear = (Array.isArray(msg.gear) ? msg.gear : []).filter((g) => ID_RE.test(String(g))).slice(0, 30);
    const spend = { userId: session.userId, gold: int(msg.gold, 0, 1_000_000), goods: map(msg.goods), materials: map(msg.materials), gear };
    if (!spend.gold && !Object.keys(spend.goods).length && !Object.keys(spend.materials).length && !gear.length) return null;
    await this.serial(() => this.store.spend(spend));
    return null;
  }

  /** Tells an online seller their listing sold. They collect the gold at the Exchange. */
  notifySeller(listingId, r) {
    const sellerId = this.sellers.get(listingId);
    this.sellers.delete(listingId);
    if (!sellerId) return;
    const s = this.world.byUser?.get(sellerId);
    if (!s) return;
    const t = tradeable(r.kind, r.itemId);
    this.world.sendTo(s, 'market_notice', { kind: 'sold', listingId, itemId: r.itemId, name: t?.name || r.itemId, qty: r.qty, price: r.price, payout: r.price - Math.floor((r.price * MARKET.feeBp) / 10000) });
  }
}

