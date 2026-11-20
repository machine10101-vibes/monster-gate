import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parsePhotoFlag } from '../src/debug/flags.js';

const src = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

test('photo=1 is independent of debug and does not touch MMO or saves', () => {
  assert.equal(parsePhotoFlag('?photo=1'), true);
  assert.equal(parsePhotoFlag('?debug=1&photo=1'), true);
  assert.equal(parsePhotoFlag('?mmo=1&photo=1'), true);
  assert.equal(parsePhotoFlag('?photo=true'), false);
  assert.equal(parsePhotoFlag(''), false);
  const main = src('src/main.js');
  const flags = src('src/debug/flags.js');
  const mmo = src('src/net/mmo.js');
  assert.match(main, /setPhotoMode/);
  assert.match(main, /parsePhotoFlag/);
  assert.match(flags, /export function parsePhotoFlag/);
  assert.doesNotMatch(mmo, /photoMode|parsePhotoFlag/);
  assert.doesNotMatch(src('src/systems/saveio.js'), /photoMode/);
});

test('H toggles photo mode and the HUD chrome hides', () => {
  const input = src('src/engine/input.js');
  const theme = src('src/ui/theme.css');
  const html = src('index.html');
  assert.match(input, /case 'KeyH':\s*this\.press\('photo'\)/);
  assert.doesNotMatch(input, /case 'KeyH':\s*this\.press\('panel:stats'\)/);
  assert.match(theme, /body\.photo-mode #hud/);
  assert.match(theme, /body\.photo-mode #nameplates/);
  assert.match(theme, /body\.photo-mode #build-id/);
  assert.match(theme, /body\.photo-mode #banner/);
  assert.match(src('src/engine/fx.js'), /this\.photoMode \? 0/);
  assert.match(html, /data-panel="stats"/);
  assert.doesNotMatch(html, /data-panel="stats"[^>]*>[\s\S]*<kbd>H<\/kbd>/);
});
