import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { GOODS_ORDER } from '../src/data/gathering.js';
import { Progress, BAG_SLOTS, STORAGE_SLOTS } from '../src/systems/progress.js';
import {
  MAX_STACK,
  bagSlotsFrom,
  roomForCount,
  splitStacks,
  stackSlots,
  storageVisual,
  STORAGE_MAX_STACK,
  splitStorageStacks,
  storageStackMax,
} from '../src/systems/stacks.js';

function hunt(over = {}) {
  const p = new Progress();
  p.sessionOnly = true;
  p.loadRaw({
    goods: {},
    materials: {},
    crafted: {},
    storage: Array.from({ length: STORAGE_SLOTS }, () => null),
    ...over,
  });
  return p;
}

test('45 of one item splits into 20/20/5 and uses three slots', () => {
  assert.equal(MAX_STACK, 20);
  assert.deepEqual(splitStacks(45), [20, 20, 5]);
  assert.equal(stackSlots(45), 3);
  assert.equal(bagSlotsFrom({ goods: { copper_ore: 45 } }), 3);
});

test('slot math is ceil(total/20) per stackable item, plus one per gear', () => {
  assert.equal(stackSlots(0), 0);
  assert.equal(stackSlots(1), 1);
  assert.equal(stackSlots(20), 1);
  assert.equal(stackSlots(21), 2);
  assert.equal(bagSlotsFrom({
    goods: { copper_ore: 45, tin_ore: 1 },
    materials: { budgescale: 20 },
    crafted: { orcblade: true, knife: true },
  }), 3 + 1 + 1 + 1);
});

test('room fills the partial stack before taking another slot', () => {
  assert.equal(roomForCount(19, 0), 1);
  assert.equal(roomForCount(20, 0), 0);
  assert.equal(roomForCount(20, 1), 20);
  assert.equal(roomForCount(0, 1), 20);
  assert.equal(roomForCount(45, 0), 15);
});

test('the hunt save keeps one total per item, with no count cap', () => {
  const p = hunt({ goods: { copper_ore: 5000 } });
  assert.equal(p.good('copper_ore'), 5000);
  assert.equal(p.bagSlotsUsed(), 250);
  assert.equal(p.addGood('tin_ore', 1), 0);
  assert.equal(p.addGood('copper_ore', 1), 0);
  p.data.goods.copper_ore = 4999;
  assert.equal(p.addGood('copper_ore', 2), 1);
  assert.equal(p.good('copper_ore'), 5000);
});

test('a full 40-slot bag rejects new stacks and leftover harvest', () => {
  assert.equal(BAG_SLOTS, 40);
  const ids = GOODS_ORDER.slice(0, BAG_SLOTS);
  assert.equal(ids.length, BAG_SLOTS);
  const goods = Object.fromEntries(ids.map((id) => [id, 1]));
  const p = hunt({ goods });
  assert.equal(p.bagSlotsUsed(), BAG_SLOTS);
  assert.equal(p.addGood(GOODS_ORDER[BAG_SLOTS], 1), 0);
  assert.equal(p.roomFor('good', ids[0]), 19);
  assert.equal(p.addGood(ids[0], 100), 19);
  assert.equal(p.good(ids[0]), 20);
  assert.equal(p.grantFound('orcblade'), false);

  const stuffed = hunt({ goods: Object.fromEntries(ids.map((id) => [id, 20])) });
  assert.equal(stuffed.bagSlotsUsed(), BAG_SLOTS);
  const drops = stuffed.harvest('chicken');
  assert.equal(drops.got.length, 0);
  assert.ok(drops.leftover.length >= 1);
  assert.equal(drops.leftover[0].id, 'feather');
  assert.equal(stuffed.good('feather'), 20);
});

test('saves and the hunter function still store one total per item', () => {
  const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
  const progress = src('../src/systems/progress.js');
  const hunter = src('../supabase/functions/hunter/index.ts');
  assert.match(progress, /this\.data\.goods\[id\] = this\.good\(id\) \+ add/);
  assert.doesNotMatch(progress, /goods\[id\]\s*=\s*\[/);
  assert.match(hunter, /from\("hunter_accounts"\)/);
  assert.doesNotMatch(hunter, /splitStacks/);
});

test('storage has three 40-slot pages and 99-item stacks, separate from the 20-item bag cap', () => {
  assert.equal(STORAGE_SLOTS, 120);
  assert.equal(STORAGE_MAX_STACK, 99);
  assert.equal(storageStackMax('good'), 99);
  assert.equal(storageStackMax('part'), 99);
  assert.equal(storageStackMax('potion'), 20);
  assert.deepEqual(splitStorageStacks(205), [99, 99, 7]);
  assert.deepEqual(splitStorageStacks(45, storageStackMax('potion')), [20, 20, 5]);

  const p = hunt();
  assert.equal(p.putStorage('good', 'copper_ore', 45), true);
  assert.equal(p.storageUsed(), 1);
  const cells = storageVisual(p.data.storage, STORAGE_SLOTS).filter(Boolean);
  assert.deepEqual(cells.map((c) => c.n), [45]);
  assert.equal(p.data.storage.filter(Boolean).length, 1);

  const larger = hunt();
  assert.equal(larger.putStorage('good', 'copper_ore', 160), true);
  assert.equal(larger.storageUsed(), 2);
  assert.deepEqual(larger.data.storage.filter(Boolean).map((s) => s.n), [99, 61]);
  assert.equal(larger.pullStorage(0, 99).n, 99);
  assert.equal(larger.data.storage[0], null);

  const full = hunt();
  assert.equal(full.putStorage('good', 'copper_ore', 120 * 99), true);
  assert.equal(full.storageUsed(), 120);
  assert.equal(full.canFitStorage('good', 'copper_ore', 1), false);
  assert.equal(full.canFitStorage('good', 'tin_ore', 1), false);
});
