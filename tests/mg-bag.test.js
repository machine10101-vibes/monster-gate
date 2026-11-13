import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { GEAR } from '../src/data/catalog.js';
import { Progress, STORAGE_SLOTS } from '../src/systems/progress.js';
import { BAG_HOLD_MS, BAG_TOSS_DIST, bagHoldChoices, tossFrom } from '../src/systems/bagDrop.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => readFileSync(join(root, rel), 'utf8');

function hunt(over = {}) {
  const p = new Progress();
  p.sessionOnly = true;
  p.loadRaw({
    goods: {},
    materials: {},
    crafted: { knife: true },
    storage: Array.from({ length: STORAGE_SLOTS }, () => null),
    ...over,
  });
  return p;
}

test('MG-UI-41: holding a bag cell opens Use or Drop', () => {
  assert.equal(BAG_HOLD_MS, 450);
  const eat = bagHoldChoices({
    name: 'Raw Trout',
    action: 'Eat',
    run: () => {},
    drop: { k: 'good', id: 'trout', n: 2 },
  });
  assert.equal(eat.use.label, 'Eat');
  assert.equal(eat.drop.k, 'good');
  const part = bagHoldChoices({
    name: 'Budge Scale',
    drop: { k: 'part', id: 'budgescale', n: 1 },
  });
  assert.equal(part.use, null);
  assert.equal(part.drop.k, 'part');
  const bag = src('src/ui/bag.js');
  assert.match(bag, /bindBagHold/);
  assert.match(bag, /openBagMenu/);
  assert.match(bag, /Hold an item to Use or Drop it/);
  assert.match(bag, /bag-ask-drop/);
  assert.match(src('src/main.js'), /dropBagItem\(/);
});

test('MG-UI-41: a drop tosses in front of the hunter', () => {
  const at = tossFrom({ x: 10, z: 4 }, 0);
  assert.equal(at.x, 10);
  assert.ok(Math.abs(at.z - (4 + BAG_TOSS_DIST)) < 1e-9);
});

test('MG-UI-41: crafted gear can leave the bag, the knife cannot', () => {
  const blade = GEAR.find((g) => g.id === 'orcblade');
  assert.ok(blade);
  const p = hunt({ crafted: { knife: true, orcblade: true }, weapon: 'orcblade' });
  assert.equal(p.worn('orcblade'), true);
  assert.equal(p.releaseCrafted('knife'), false);
  assert.equal(p.crafted('knife'), true);
  assert.equal(p.releaseCrafted('orcblade'), true);
  assert.equal(p.crafted('orcblade'), false);
  assert.equal(p.worn('orcblade'), false);
  assert.equal(p.releaseCrafted('orcblade'), false);
});
