import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const charselect = readFileSync(new URL('../src/ui/charselect.js', import.meta.url), 'utf8');
const roster = readFileSync(new URL('../src/systems/roster.js', import.meta.url), 'utf8');
const hud = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('new characters require an explicit class choice and save that class to their own hunt', () => {
  assert.match(charselect, /classId: null/);
  assert.match(charselect, /Choose a class before creating your character/);
  assert.match(charselect, /aria-pressed/);
  assert.match(roster, /p\.setClass\(classId\)/);
});

test('settings prominently expose both persistent hotbar locks', () => {
  assert.match(hud, /set-hotbar-controls/);
  assert.match(hud, /Lock skill hot buttons/);
  assert.match(hud, /Lock item hotbar/);
  assert.match(hud, /set-skill-lock/);
  assert.match(hud, /set-item-hotbar-lock/);
  assert.match(hud, /writeHotbarLocked\(locked\)/);
  assert.match(hud, /writeItemHotbarLocked\(this\.itemHotbarLocked\)/);
});

test('return-to-character-selection saves progress and keeps the current account signed in', () => {
  assert.match(hud, /set-character-select/);
  assert.match(hud, /returnToCharacterSelect/);
  assert.match(main, /returnToCharacterSelect\(\)/);
  assert.match(main, /this\.captureHunter\(\)/);
  assert.match(main, /this\.leaveOnlineInPlace\(\)/);
  assert.match(main, /this\.charSelect\?\.open\?\.\(\)/);
  assert.doesNotMatch(main.slice(main.indexOf('returnToCharacterSelect()'), main.indexOf('/** Put the chosen character')), /signOut\(/);
});
