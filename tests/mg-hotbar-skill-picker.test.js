import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HOTBAR_HOLD_MS, availableHotbarSkills, readHotbarLocked, writeHotbarLocked } from '../src/ui/skillHotbar.js';
import { readFileSync } from 'node:fs';

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
});
