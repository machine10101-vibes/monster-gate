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

test('equipped gear is drawn immediately in the selected hotbar slot', () => {
  const skin = readFileSync(new URL('../src/ui/skin.css', import.meta.url), 'utf8');
  assert.match(hud, /b\.appendChild\(renderThumbNow\(/);
  assert.match(hud, /if \(!renderedGear\) \{/);
  assert.match(skin, /:root \.slot\.sel \{[^}]*border-image-source: var\(--rs-socket\)/);
  assert.match(skin, /outline: 2px solid #edc874/);
});

test('entering a character restores slot one from the saved hunt before drawing the bar', () => {
  const defaults = [{ id: 'blade', kind: 'melee' }, { id: 'potion', kind: 'use' }];
  const method = (name) => {
    const body = main.match(new RegExp(`  ${name}\\(\\) \\{[\\s\\S]*?\\n  \\}`))?.[0];
    assert.ok(body, `${name} method exists`);
    return Function('ITEMS', 'gearById', 'GOODS', `return ({${body}}).${name}`)(
      defaults, () => null, {},
    );
  };
  let rendered;
  const game = {
    progress: { gold: 0, data: { itemHotbar: [{ id: 'potion' }, { id: 'blade', equipped: true }] }, hasStock: () => false },
    journal: { rebind() {} }, bounties: { rebind() {} },
    applyGear() { this.items[0] = { ...this.items[0], _equippedWeapon: true }; },
    restoreItemHotbar: method('restoreItemHotbar'),
    hud: { buildHotbar(items) { rendered = items.map((item) => item.id); } },
    selectInitialHotbarSlot() {}, refreshHud() {},
  };
  const rebind = method('rebindFromProgress');
  rebind.call(game);
  assert.deepEqual(rendered, ['potion', 'blade']);
});
