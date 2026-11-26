import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const hud = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
const bag = readFileSync(new URL('../src/ui/bag.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('item hotbar hold opens inventory assignment and lock is persisted in settings', () => {
  assert.match(hud, /buildHotbar\(items, onSelect, onHold\)/);
  assert.match(hud, /onHold\(i\)/);
  assert.match(hud, /HOTBAR_HOLD_MS/);
  assert.match(hud, /set-item-hotbar-lock/);
  assert.match(hud, /mg-hotbar-items-locked/);
});

test('inventory exposes carried items as hotbar assignment choices', () => {
  assert.match(bag, /let tab = 'bag'/);
  assert.doesNotMatch(bag, /\['carried', 'Hotbar'\]/);
  assert.match(bag, /Assign to hotbar slot/);
  assert.match(bag, /slotIndex: i/);
  assert.match(main, /assignHotbarItem\(slot, item, sourceSlot\)/);
});

test('toast notifications are capped at 1.5 seconds', () => {
  assert.match(hud, /toast\(msg, ms = 1500\)/);
  assert.match(hud, /Math\.min\(1500/);
});
