import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { cursorSpecForHeld, equippedHeldKind } from '../src/ui/weaponCursor.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => readFileSync(join(root, rel), 'utf8');

test('cursor resolves the exact forged weapon model rather than its weapon family', () => {
  assert.deepEqual(cursorSpecForHeld('budgeblade'), { kind: 'weapon', id: 'budgeblade' });
  assert.deepEqual(cursorSpecForHeld('darkscythe'), { kind: 'weapon', id: 'darkscythe' });
  assert.deepEqual(cursorSpecForHeld('yetigreatsword'), { kind: 'weapon', id: 'yetigreatsword' });
});

test('base held items and empty hands have safe cursor render specs', () => {
  assert.deepEqual(cursorSpecForHeld('blade'), { kind: 'held', id: 'blade' });
  assert.deepEqual(cursorSpecForHeld('bow'), { kind: 'held', id: 'bow' });
  assert.equal(cursorSpecForHeld(null), null);
  assert.equal(equippedHeldKind({ progress: { weaponItem: { held: 'budgeblade' } } }), 'budgeblade');
});

test('weapon cursor uses a cached rendered model image with the SVG family cursor as fallback', () => {
  const cursor = src('src/ui/weaponCursor.js');
  const catalog = src('src/ui/catalog.js');
  assert.match(cursor, /renderThumbNow\(spec, px\)\.toDataURL\('image\/png'\)/);
  assert.match(cursor, /cursorImageForHeld\(held, 64\)/);
  assert.ok(cursor.includes("'url(\"' + image + '\") 4 4, '));
  assert.match(catalog, /thumbNow\(spec, px = 64\)/);
  assert.match(catalog, /export function renderThumbNow/);
});
