import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseMapLabelsFlag, parsePhotoFlag } from '../src/debug/flags.js';

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

test('photo mode still opens the world map with M', () => {
  const input = src('src/engine/input.js');
  const theme = src('src/ui/theme.css');
  const main = src('src/main.js');
  const hud = src('src/ui/hud.js');
  assert.match(input, /case 'KeyM':\s*this\.press\('panel:map'\)/);
  assert.match(theme, /body\.photo-mode #panel:not\(\.map-open\)/);
  assert.match(theme, /body\.photo-mode #panel\.map-open/);
  assert.doesNotMatch(theme, /body\.photo-mode #panel,/);
  assert.match(hud, /classList\.toggle\('map-open', name === 'map'\)/);
  assert.match(main, /name\.startsWith\('panel:'\)/);
  assert.doesNotMatch(main, /photoMode[\s\S]{0,180}panel:map/);
  assert.doesNotMatch(src('src/net/mmo.js'), /map-open|setMapLabels/);
});

test('L and maplabels=0 hide world map names', () => {
  assert.equal(parseMapLabelsFlag(''), true);
  assert.equal(parseMapLabelsFlag('?photo=1'), true);
  assert.equal(parseMapLabelsFlag('?maplabels=0'), false);
  assert.equal(parseMapLabelsFlag('?debug=1&maplabels=0'), false);
  assert.equal(parseMapLabelsFlag('?maplabels=1'), true);
  const input = src('src/engine/input.js');
  const main = src('src/main.js');
  const hud = src('src/ui/hud.js');
  const style = src('src/style.css');
  assert.match(input, /case 'KeyL':\s*this\.press\('maplabels'\)/);
  assert.match(main, /parseMapLabelsFlag/);
  assert.match(main, /inp\.take\('maplabels'\)/);
  assert.match(main, /hud\.setMapLabels\(!hud\.mapLabels\)/);
  assert.match(hud, /setMapLabels\(on\)/);
  assert.match(hud, /this\.mapLabels = !!on/);
  assert.doesNotMatch(hud, /on !== false/);
  assert.match(hud, /labels-off/);
  assert.match(style, /\.playmap\.labels-off \.playmap-label/);
  assert.match(style, /#panel\.labels-off \.playmap-leads/);
  assert.match(style, /body\.map-labels-off \.playmap-label/);
  assert.doesNotMatch(src('src/systems/saveio.js'), /mapLabels|parseMapLabelsFlag/);
  assert.doesNotMatch(src('src/net/mmo.js'), /mapLabels|parseMapLabelsFlag/);
});
