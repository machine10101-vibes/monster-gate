import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemoryAdapter } from '../adapters/memory.js';

const S = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

async function setup() {
  const a = createMemoryAdapter();
  await a.create(S, 'Seller', { state: { gold: 50, goods: { copper_ore: 10 }, materials: { budgescale: 5 }, crafted: { knife: true, budgehelm: true } } });
  await a.create(B, 'Buyer', { state: { gold: 500, goods: {}, materials: {}, crafted: { knife: true } } });
  return a;
}
const rules = { hours: 72, maxActive: 20, feeBp: 500 };
const code = async (p) => {
  try {
    await p;
    return null;
  } catch (e) {
    return e.code;
  }
};

test('listing takes the items into escrow; overselling is refused', async () => {
  const a = await setup();
  const { listingId } = await a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'good', itemId: 'copper_ore', qty: 4, price: 100, ...rules });
  assert.ok(listingId);
  assert.equal((await a.load(S)).state.goods.copper_ore, 6);
  assert.equal(await code(a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'good', itemId: 'copper_ore', qty: 99, price: 10, ...rules })), 'market_not_owned');
});

test('a listing sells once: gold and items move, a second buy and own buy fail', async () => {
  const a = await setup();
  const { listingId } = await a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'good', itemId: 'copper_ore', qty: 4, price: 100, ...rules });
  assert.equal(await code(a.market.buy({ listingId, buyerId: S, buyerName: 'Seller' })), 'market_own');
  const r = await a.market.buy({ listingId, buyerId: B, buyerName: 'Buyer' });
  assert.deepEqual([r.kind, r.itemId, r.qty, r.price], ['good', 'copper_ore', 4, 100]);
  const buyer = (await a.load(B)).state;
  assert.equal(buyer.gold, 400);
  assert.equal(buyer.goods.copper_ore, 4);
  assert.equal(await code(a.market.buy({ listingId, buyerId: B, buyerName: 'Buyer' })), 'market_gone');
});

test('collect pays the seller once, less the 5% fee', async () => {
  const a = await setup();
  const { listingId } = await a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'good', itemId: 'copper_ore', qty: 4, price: 100, ...rules });
  await a.market.buy({ listingId, buyerId: B, buyerName: 'Buyer' });
  assert.deepEqual(await a.market.collect({ sellerId: S }).then((r) => [r.gold, r.items.length]), [95, 0]);
  assert.equal((await a.load(S)).state.gold, 145);
  assert.equal((await a.market.collect({ sellerId: S })).gold, 0);
});

test('gear lists one piece, cancel returns it, buyers cannot double-own or overspend', async () => {
  const a = await setup();
  assert.equal(await code(a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'gear', itemId: 'budgehelm', qty: 2, price: 300, ...rules })), 'market_invalid');
  const { listingId } = await a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'gear', itemId: 'budgehelm', qty: 1, price: 300, ...rules });
  assert.equal((await a.load(S)).state.crafted.budgehelm, undefined);
  await a.market.cancel({ listingId, sellerId: S });
  assert.equal((await a.load(S)).state.crafted.budgehelm, true);
  const pricey = await a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'material', itemId: 'budgescale', qty: 3, price: 1000, ...rules });
  assert.equal(await code(a.market.buy({ listingId: pricey.listingId, buyerId: B, buyerName: 'Buyer' })), 'market_gold');
  assert.equal((await a.load(B)).state.gold, 500);
});

test('expired listings cannot be bought and come back on collect; the open-listing limit holds', async () => {
  const a = await setup();
  const { listingId } = await a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'material', itemId: 'budgescale', qty: 3, price: 10, ...rules });
  a.market._expire(listingId);
  assert.equal(await code(a.market.buy({ listingId, buyerId: B, buyerName: 'Buyer' })), 'market_gone');
  const back = await a.market.collect({ sellerId: S });
  assert.deepEqual(back.items, [{ kind: 'material', id: 'budgescale', qty: 3 }]);
  assert.equal((await a.load(S)).state.materials.budgescale, 5);
  await a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'good', itemId: 'copper_ore', qty: 1, price: 5, ...rules, maxActive: 1 });
  assert.equal(await code(a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'good', itemId: 'copper_ore', qty: 1, price: 5, ...rules, maxActive: 1 })), 'market_limit');
});

test('spend only lowers counts, never below zero, and rejects negatives', async () => {
  const a = await setup();
  await a.market.spend({ userId: S, gold: 80, goods: { copper_ore: 3, tin_ore: 9 }, gear: ['budgehelm'] });
  const st = (await a.load(S)).state;
  assert.equal(st.gold, 0);
  assert.equal(st.goods.copper_ore, 7);
  assert.equal(st.crafted.budgehelm, undefined);
  assert.equal(await code(a.market.spend({ userId: S, goods: { copper_ore: -5 } })), 'spend_invalid');
});

test('search filters by item, price and seller, sorts and pages; mine shows open and unsettled', async () => {
  const a = await setup();
  for (const [q, p] of [[1, 30], [2, 20], [3, 90]]) await a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'good', itemId: 'copper_ore', qty: q, price: p, ...rules });
  await a.market.list({ sellerId: S, sellerName: 'Seller', kind: 'material', itemId: 'budgescale', qty: 1, price: 50, ...rules });
  const ore = await a.market.search({ items: [{ kind: 'good', id: 'copper_ore' }], sort: 'price' });
  assert.deepEqual(ore.rows.map((r) => r.price), [20, 30, 90]);
  const unit = await a.market.search({ items: [{ kind: 'good', id: 'copper_ore' }], sort: 'unit' });
  assert.deepEqual(unit.rows.map((r) => r.price / r.qty), [10, 30, 30]);
  assert.equal((await a.market.search({ minPrice: 25, maxPrice: 60 })).total, 2);
  assert.equal((await a.market.search({ excludeSeller: S })).total, 0);
  assert.equal((await a.market.search({ limit: 2, offset: 2 })).rows.length, 2);
  assert.equal((await a.market.mine({ sellerId: S })).length, 4);
});
