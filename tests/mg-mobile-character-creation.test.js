import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const charselect = readFileSync(new URL('../src/ui/charselect.js', import.meta.url), 'utf8');
const camp = readFileSync(new URL('../src/world/camp.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('mobile character creation exposes a working centered minimize control', () => {
  assert.match(html, /id="cs-form-minimize"/);
  assert.match(charselect, /toggleFormMinimized\(\)/);
  assert.match(charselect, /aria-expanded/);
  assert.match(charselect, /addEventListener\('click', \(\) => this\.toggleFormMinimized\(\)\)/);
  assert.match(css, /#charselect form\.cs-form\.minimized/);
  assert.match(css, /position: fixed/);
  assert.match(css, /translate3d\(-50%, -50%, 0\)/);
  assert.match(css, /#charselect form\.cs-form \.cs-form-title\s*\{[^}]*display: flex/s);
  assert.match(css, /#charselect form\.cs-form \.cs-form-minimize\s*\{[^}]*pointer-events: auto/s);
});

test('two-pointer pinch gestures adjust preview camera zoom without rotating the hunter', () => {
  assert.match(charselect, /const pointers = new Map\(\)/);
  assert.match(charselect, /pointerDistance\(\)/);
  assert.match(charselect, /setCreateZoom\(pinchStart\.zoom \* pinchStart\.distance \/ distance\)/);
  assert.match(charselect, /if \(!drag \|\| pointers\.size !== 1\) return/);
  assert.match(camp, /setCreateZoom\(value\)/);
  assert.match(camp, /baseDist \* this\.createZoom/);
  assert.match(camp, /this\.createZoom = 1/);
});

test('character roster panel has its own minimize control', () => {
  assert.match(html, /id="cs-panel-minimize"/);
  assert.match(charselect, /togglePanelMinimized\(\)/);
  assert.match(charselect, /addEventListener\('click', \(\) => this\.togglePanelMinimized\(\)\)/);
  assert.match(css, /\.cs-panel\.minimized > :not\(\.cs-panel-head\)/);
});

test('pinch zoom stays active until both contacts are released and zooms in on outward pinch', () => {
  assert.match(charselect, /this\.stage\.setCreateZoom\(pinchStart\.zoom \* pinchStart\.distance \/ distance\)/);
  assert.doesNotMatch(charselect, /addEventListener\('lostpointercapture', end\)/);
});
