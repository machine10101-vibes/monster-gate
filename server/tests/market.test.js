import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encode } from '../protocol.js';
import { MARKET } from '../../src/data/market.js';
import { ANN, BEA, collect, hello, open, startWorld, waitUntil } from './lib/helpers.js';

/** Two hunters on a real World 1 socket: Ann sells, Bea buys. */
async function market() {
  const srv = await startWorld();
  await srv.persist.createCharacter(ANN, 'Ann', { state: { gold: 10, goods: { copper_ore: 10 }, materials: { budgescale: 4 }, crafted: { knife: true, budgehelm: true } } });
  await srv.persist.createCharacter(BEA, 'Bea', { state: { gold: 500, goods: {}, materials: {}, crafted: { knife: true } } });
  const a = await open(srv.url);
  const b = await open(srv.url);
  const am = [];
  const bm = [];
  collect(a, am);
  collect(b, bm);
  await hello(a, 'ann', { name: 'Ann' });
  await hello(b, 'bea', { name: 'Bea' });
  let n = 0;
  const ask = async (ws, box, type, body = {}) => {
    const request_id = `r${++n}`;
    ws.send(encode(type, { ...body, request_id }));
    await waitUntil(() => box.some((m) => m.type === 'market_result' && m.request_id === request_id), 3000);
    return box.find((m) => m.type === 'market_result' && m.request_id === request_id);
  };
  const place = (userId, at) => {
    const s = srv.world.byUser.get(userId);
    s.x = at.x;
    s.z = at.z;
  };
  return { srv, a, b, am, bm, ask, place, close: async () => { a.close(); b.close(); await srv.close(); } };
}

const AT = { x: MARKET.plaza.x, z: MARKET.plaza.z };
const FAR = { x: 72, z: 72 };

test('the Exchange trades only at the plaza, browses anywhere, and sells a listing exactly once', async () => {
  const m = await market();
  m.place(ANN, FAR);
  const far = await m.ask(m.a, m.am, 'market_list', { kind: 'good', itemId: 'copper_ore', qty: 4, price: 100 });
  assert.deepEqual([far.ok, far.code], [false, 'market_far']);

  m.place(ANN, AT);
  const listed = await m.ask(m.a, m.am, 'market_list', { kind: 'good', itemId: 'copper_ore', qty: 4, price: 100 });
  assert.equal(listed.ok, true, listed.code);
  assert.equal((await m.srv.persist.loadCharacter(ANN)).state.goods.copper_ore, 6);

  m.place(BEA, FAR);
  const found = await m.ask(m.b, m.bm, 'market_search', { q: 'copper', category: 'good', sort: 'price' });
  assert.equal(found.ok, true);
  assert.equal(found.total, 1);
  const row = found.listings[0];
  assert.deepEqual([row.name, row.qty, row.price, row.seller, row.mine], ['Copper ore', 4, 100, 'Ann', false]);
  assert.equal(row.sellerId, undefined, 'seller account ids stay on the server');

  const farBuy = await m.ask(m.b, m.bm, 'market_buy', { listingId: row.id });
  assert.equal(farBuy.code, 'market_far');
  m.place(BEA, AT);
  const bought = await m.ask(m.b, m.bm, 'market_buy', { listingId: row.id });
  assert.equal(bought.ok, true, bought.code);
  assert.deepEqual([bought.itemId, bought.qty, bought.price], ['copper_ore', 4, 100]);
  const bea = (await m.srv.persist.loadCharacter(BEA)).state;
  assert.equal(bea.gold, 400);
  assert.equal(bea.goods.copper_ore, 4);
  await waitUntil(() => m.am.some((x) => x.type === 'market_notice' && x.kind === 'sold'));
  assert.equal(m.am.find((x) => x.type === 'market_notice').payout, 95);

  const again = await m.ask(m.b, m.bm, 'market_buy', { listingId: row.id });
  assert.deepEqual([again.ok, again.code], [false, 'market_gone']);

  const mine = await m.ask(m.a, m.am, 'market_mine');
  assert.equal(mine.due, 95);
  assert.equal(mine.vault.goods.copper_ore, 6);
  const paid = await m.ask(m.a, m.am, 'market_collect');
  assert.deepEqual([paid.ok, paid.gold], [true, 95]);
  assert.equal((await m.srv.persist.loadCharacter(ANN)).state.gold, 105);
  assert.equal((await m.ask(m.a, m.am, 'market_collect')).gold, 0);
  await m.close();
});

test('listing rules: unknown items, gear quantities, prices and unheld stock are refused; cancel returns gear', async () => {
  const m = await market();
  m.place(ANN, AT);
  assert.equal((await m.ask(m.a, m.am, 'market_list', { kind: 'gear', itemId: 'nosuchthing', qty: 1, price: 5 })).code, 'market_item');
  assert.equal((await m.ask(m.a, m.am, 'market_list', { kind: 'gear', itemId: 'budgehelm', qty: 2, price: 5 })).code, 'market_qty');
  assert.equal((await m.ask(m.a, m.am, 'market_list', { kind: 'good', itemId: 'copper_ore', qty: 1, price: 0 })).code, 'market_price');
  assert.equal((await m.ask(m.a, m.am, 'market_list', { kind: 'good', itemId: 'copper_ore', qty: 50, price: 5 })).code, 'market_not_owned');
  assert.equal((await m.ask(m.a, m.am, 'market_list', { kind: 'gear', itemId: 'knife', qty: 1, price: 5 })).code, 'market_item');
  const helm = await m.ask(m.a, m.am, 'market_list', { kind: 'gear', itemId: 'budgehelm', qty: 1, price: 300 });
  assert.equal(helm.ok, true, helm.code);
  assert.equal((await m.srv.persist.loadCharacter(ANN)).state.crafted.budgehelm, undefined);
  const own = await m.ask(m.a, m.am, 'market_buy', { listingId: helm.listingId });
  assert.equal(own.code, 'market_own');
  const back = await m.ask(m.a, m.am, 'market_cancel', { listingId: helm.listingId });
  assert.equal(back.ok, true);
  assert.equal((await m.srv.persist.loadCharacter(ANN)).state.crafted.budgehelm, true);
  await m.close();
});

test('a buyer cannot spend more World 1 gold than they hold, and spending reports only ever lower it', async () => {
  const m = await market();
  m.place(ANN, AT);
  m.place(BEA, AT);
  const big = await m.ask(m.a, m.am, 'market_list', { kind: 'material', itemId: 'budgescale', qty: 2, price: 900 });
  assert.equal(big.ok, true);
  assert.equal((await m.ask(m.b, m.bm, 'market_buy', { listingId: big.listingId })).code, 'market_gold');
  m.b.send(encode('inv_spend', { gold: 450, goods: { copper_ore: -3 }, materials: {} }));
  await waitUntil(async () => (await m.srv.persist.loadCharacter(BEA)).state.gold === 50);
  m.b.send(encode('inv_spend', { gold: -999 }));
  await new Promise((r) => setTimeout(r, 150));
  assert.equal((await m.srv.persist.loadCharacter(BEA)).state.gold, 50, 'negative spend never adds gold');
  await m.close();
});

test('two buyers racing for one listing: exactly one wins', async () => {
  const m = await market();
  m.place(ANN, AT);
  m.place(BEA, AT);
  const l = await m.ask(m.a, m.am, 'market_list', { kind: 'good', itemId: 'copper_ore', qty: 1, price: 10 });
  const c = await open(m.srv.url);
  const cm = [];
  collect(c, cm);
  await m.srv.persist.createCharacter('33333333-3333-4333-8333-333333333333', 'Cal', { state: { gold: 500, goods: {}, materials: {}, crafted: {} } });
  await hello(c, 'cal', { name: 'Cal' });
  m.place('33333333-3333-4333-8333-333333333333', AT);
  const [r1, r2] = await Promise.all([m.ask(m.b, m.bm, 'market_buy', { listingId: l.listingId }), m.ask(c, cm, 'market_buy', { listingId: l.listingId })]);
  assert.deepEqual([r1.ok, r2.ok].sort(), [false, true]);
  assert.equal([r1, r2].find((r) => !r.ok).code, 'market_gone');
  c.close();
  await m.close();
});
