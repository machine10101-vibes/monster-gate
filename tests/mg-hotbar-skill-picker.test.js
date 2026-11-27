import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HOTBAR_HOLD_MS, availableHotbarSkills, readHotbarLocked, writeHotbarLocked } from '../src/ui/skillHotbar.js';
import { readFileSync } from 'node:fs';
import { HUD } from '../src/ui/hud.js';

test('skill hotbar picker requires a three-second hold and offers learned active skills only', () => {
  assert.equal(HOTBAR_HOLD_MS, 3000);
  const progress = { data: { skills: { learned: { shieldbash: true, fortify: true, whirlwind: false } } } };
  assert.deepEqual(availableHotbarSkills(progress).map((skill) => skill.id), ['shieldbash']);
});

test('skill hotbar lock persists and can be toggled', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  assert.equal(readHotbarLocked(storage), false);
  assert.equal(writeHotbarLocked(true, storage), true);
  assert.equal(readHotbarLocked(storage), true);
  assert.equal(writeHotbarLocked(false, storage), true);
  assert.equal(readHotbarLocked(storage), false);
});

test('HUD wires hold-to-assign for desktop and touch buttons and exposes the lock setting', () => {
  const hud = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  assert.match(hud, /armLongPress/);
  assert.match(hud, /HOTBAR_HOLD_MS/);
  assert.match(hud, /openSkillPicker/);
  assert.match(hud, /set-skill-lock/);
  assert.match(hud, /skill-locked/);
  assert.match(hud, /setPointerCapture\(pointerId\)/);
  assert.match(hud, /_skillPickerContext/);
  assert.doesNotMatch(hud, /\['pointerup', 'pointercancel', 'pointerleave'\]/);
});

test('skill hold consumes its release and the next locked tap can still cast', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const listeners = new Map();
  const button = {
    dataset: {},
    isConnected: true,
    classList: { add() {}, remove() {}, toggle() {} },
    style: { setProperty() {} },
    querySelector() { return null; },
    setPointerCapture() {},
    addEventListener(type, callback, capture) {
      const handlers = listeners.get(type) || [];
      if (capture) handlers.unshift(callback);
      else handlers.push(callback);
      listeners.set(type, handlers);
    },
  };
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      body: { dataset: {} },
      querySelectorAll: () => [button],
      getElementById: () => null,
    },
  });
  t.after(() => {
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else delete globalThis.document;
  });

  const hud = Object.create(HUD.prototype);
  const open = t.mock.method(hud, 'openSkillPicker', () => true);
  const game = {
    progress: { equipped: () => [] },
    player: { cds: {} },
    castSlot: t.mock.fn(),
  };
  hud.updateSkillbar(game);
  const dispatch = (type) => {
    let stopped = false;
    const event = {
      button: 0,
      pointerId: 1,
      detail: 1,
      preventDefault() {},
      stopImmediatePropagation() { stopped = true; },
    };
    for (const handler of listeners.get(type) || []) {
      handler(event);
      if (stopped) break;
    }
  };

  dispatch('pointerdown');
  t.mock.timers.tick(HOTBAR_HOLD_MS - 1);
  assert.equal(open.mock.callCount(), 0);
  hud.updateSkillbar(game);
  t.mock.timers.tick(1);
  assert.equal(open.mock.callCount(), 1);
  dispatch('pointerup');
  dispatch('click');
  assert.equal(game.castSlot.mock.callCount(), 0);

  dispatch('pointerdown');
  t.mock.timers.tick(HOTBAR_HOLD_MS);
  dispatch('pointercancel'); // Browsers may skip the release click.
  hud.hotbarLocked = true;
  dispatch('pointerdown');
  t.mock.timers.tick(HOTBAR_HOLD_MS);
  dispatch('pointerup');
  dispatch('click');
  assert.equal(open.mock.callCount(), 2);
  assert.equal(game.castSlot.mock.callCount(), 1);
});
