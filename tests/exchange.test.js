import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { W, generateTile } from '../src/world/terrain.js';
import { generateSouthford, openSouthPass } from '../src/world/southford.js';
import { openSouthfordDesert } from '../src/world/desert.js';
import { generateRing, openRingPasses, openValeSides } from '../src/world/ring.js';
import { EXCHANGE, exchangeEdge, exchangeShape, exchangeAreaName } from '../src/world/exchange.js';
import { MARKET, TRADEABLE, tradeable, matchItems, listingProblem, feeFor, payoutFor } from '../src/data/market.js';
import { atExchange, sellable } from '../src/ui/exchange.js';
import { Progress } from '../src/systems/progress.js';
import { DEBUG_SPOTS } from '../src/debug/flags.js';

let cached = null;
function ring() {
  if (cached) return cached;
  const oak = generateTile();
  openSouthPass(oak);
  openRingPasses(oak);
  const northEdge = new Float32Array(W);
  for (let x = 0; x < W; x++) northEdge[x] = oak.H[(W - 1) * W + x];
  const south = generateSouthford(northEdge);
  openValeSides(south);
  openSouthfordDesert(south);
  cached = generateRing(oak, south);
  return cached;
}
function cell(x, z) {
  const l = ring().find((t) => x >= t.x0 && x < t.x0 + W && z >= t.z0 && z < t.z0 + W);
  const i = Math.floor(z - l.z0) * W + Math.floor(x - l.x0);
  return { h: l.data.H[i], path: l.data.pathMask[i], kind: l.kind };
}

test('the Exchange plaza sits on the Gilantre trade centre, flat, cobbled, and inside the trade reach', () => {
  assert.deepEqual([EXCHANGE.x, EXCHANGE.z], [MARKET.plaza.x, MARKET.plaza.z]);
  const c = cell(EXCHANGE.x, EXCHANGE.z);
  assert.equal(c.kind, 'gilantreNe');
  const heights = new Set();
  for (let dz = -18; dz <= 18; dz += 3) {
    for (let dx = -18; dx <= 18; dx += 3) {
      if (Math.hypot(dx, dz) > EXCHANGE.flat - 2) continue;
      const k = cell(EXCHANGE.x + dx, EXCHANGE.z + dz);
      heights.add(k.h);
      assert.equal(k.path, 1, `cobbles at ${dx},${dz}`);
    }
  }
  assert.equal(heights.size, 1, 'the plaza is level');
  const h = EXCHANGE.hall;
  assert.equal(cell(h.x, h.z).h, c.h, 'the hall stands on the plaza level');
  // Every stall ring and the hall front sit inside the server's trade reach.
  assert.ok(Math.hypot(0, EXCHANGE.flat) < MARKET.reach);
  assert.ok(Math.hypot(h.x - MARKET.plaza.x, h.z + h.hd - MARKET.plaza.z) < MARKET.reach);
});

test('the Exchange road leaves the east road and climbs onto the plaza without cliffs', () => {
  const R = EXCHANGE.road;
  let last = cell(R.ax, R.az).h;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const x = R.ax + (R.bx - R.ax) * t;
    const z = R.az + (R.bz - R.az) * t;
    const c = cell(x, z);
    assert.equal(c.path, 1, `road paved at t=${t.toFixed(2)}`);
    assert.ok(Math.abs(c.h - last) <= 1, `gentle step at t=${t.toFixed(2)}: ${last} -> ${c.h}`);
    last = c.h;
  }
});

test('exchangeShape: cobbles inside, a road band, a grass blend, prairie beyond', () => {
  assert.deepEqual(exchangeShape(EXCHANGE.x, EXCHANGE.z, 9, 4), { h: 4, tag: 'cobble' });
  assert.equal(exchangeEdge(EXCHANGE.hall.x, EXCHANGE.hall.z), 0);
  const blend = exchangeShape(EXCHANGE.x + EXCHANGE.flat + 3, EXCHANGE.z, 8, 4);
  assert.equal(blend.tag, 'grass');
  assert.ok(blend.h > 4 && blend.h < 8);
  assert.equal(exchangeShape(EXCHANGE.x + 60, EXCHANGE.z - 40, 8, 4), null);
  const road = exchangeShape(EXCHANGE.road.ax, EXCHANGE.road.az, 6, 4, 5);
  assert.deepEqual([road.tag, road.h], ['path', 5]);
});

test('brokers open the Exchange; the debug teleport lands at the hall steps', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /service === 'exchange'[\s\S]{0,60}this\.openExchange\(\)/);
  const hud = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  assert.match(hud, /name === 'exchange'[\s\S]{0,120}mountExchange\(body, game\)/);
  const spot = DEBUG_SPOTS.exchange;
  assert.ok(Math.hypot(spot.x - MARKET.plaza.x, spot.z - MARKET.plaza.z) < MARKET.reach - 1);
});

test('atExchange matches the server reach', () => {
  const at = (x, z) => atExchange({ player: { pos: { x, z } } });
  assert.equal(at(MARKET.plaza.x, MARKET.plaza.z), true);
  assert.equal(at(MARKET.plaza.x + MARKET.reach - 2, MARKET.plaza.z), true);
  assert.equal(at(MARKET.plaza.x + MARKET.reach + 1, MARKET.plaza.z), false);
  assert.equal(atExchange({}), false);
});

test('sellable lists only what both the hunter and World 1 hold, never more than either', () => {
  const p = new Progress();
  p.addGood('copper_ore', 10);
  const mat = TRADEABLE.find((t) => t.kind === 'material');
  p.addPart(mat.id, 3);
  const rows = sellable({ progress: p }, { goods: { copper_ore: 4 }, materials: {}, gear: [] });
  const ore = rows.find((r) => r.t.id === 'copper_ore');
  assert.deepEqual([ore.local, ore.server, ore.max], [10, 4, 4]);
  const part = rows.find((r) => r.t.id === mat.id);
  assert.equal(part.max, 0, 'parts World 1 does not hold cannot be listed');
  assert.ok(!rows.some((r) => r.t.id === 'knife'), 'starter knife is never tradeable');
});

test('spending in the hunter\'s own game is reported so World 1 never sells what is gone', () => {
  const p = new Progress();
  const seen = [];
  p.onSpend = (kind, id, n) => seen.push([kind, id, n]);
  p.addGood('copper_ore', 5);
  p.takeGood('copper_ore', 2);
  const mat = TRADEABLE.find((t) => t.kind === 'material');
  p.addPart(mat.id, 4);
  p.takePart(mat.id, 1);
  p.setGold(100);
  p.setGold(60);
  p.setGold(80);
  assert.deepEqual(seen.filter((r) => r[0] !== 'gold'), [['good', 'copper_ore', 2], ['material', mat.id, 1]]);
  assert.deepEqual(seen.at(-1), ['gold', 'gold', 40], 'only gold going down is reported');
});

test('catalog search, listing rules and the 5% fee', () => {
  assert.ok(matchItems({ q: 'copper' }).some((t) => t.id === 'copper_ore'));
  assert.ok(matchItems({ category: 'weapon' }).every((t) => t.category === 'weapon'));
  assert.equal(tradeable('gear', 'knife'), null);
  assert.equal(listingProblem({ kind: 'good', id: 'copper_ore', qty: 1, price: 0 }), 'market_price');
  assert.equal(listingProblem({ kind: 'good', id: 'copper_ore', qty: 3, price: 10 }), null);
  assert.deepEqual([feeFor(100), payoutFor(100)], [5, 95]);
  assert.equal(feeFor(1) + payoutFor(1), 1);
});

test('the Exchange names itself in the HUD and marks the minimap', () => {
  assert.equal(exchangeAreaName(EXCHANGE.x, EXCHANGE.z), 'Gilantre Exchange');
  assert.equal(exchangeAreaName(EXCHANGE.hall.x, EXCHANGE.hall.z), 'Gilantre Exchange');
  assert.equal(exchangeAreaName(EXCHANGE.x + EXCHANGE.flat + EXCHANGE.blend - 1, EXCHANGE.z), 'Gilantre Exchange');
  assert.equal(exchangeAreaName(EXCHANGE.x + 60, EXCHANGE.z), null);
  assert.equal(exchangeAreaName(432, 144), null, 'Gilantre itself keeps its quarter names');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /oasisAreaName\(P\.x, P\.z\) \|\| exName/);
  assert.match(main, /exName \? 'Market Square' : 'The Living Water'/);
  const hud = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  assert.match(hud, /if \(world\.exchange && inView\(world\.exchange\.x, world\.exchange\.z\)\)/);
});
