import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const charselect = readFileSync(new URL('../src/ui/charselect.js', import.meta.url), 'utf8');
const camp = readFileSync(new URL('../src/world/camp.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('mobile character creation is centered and can be minimized and restored', () => {
  assert.match(html, /id="cs-form-minimize"/);
  assert.match(charselect, /toggleFormMinimized\(\)/);
  assert.match(charselect, /aria-expanded/);
  assert.match(css, /#charselect form\.cs-form\.minimized/);
  assert.match(css, /left: 50%/);
  assert.match(css, /translate\(-50%, -50%\)/);
});

test('two-finger pinch adjusts the character preview camera zoom', () => {
  assert.match(charselect, /touchstart/);
  assert.match(charselect, /touchmove/);
  assert.match(charselect, /touchDistance\(e\.touches\)/);
  assert.match(charselect, /setCreateZoom\(pinchStart\.zoom \* pinchStart\.distance \/ distance\)/);
  assert.match(camp, /setCreateZoom\(value\)/);
  assert.match(camp, /baseDist \* this\.createZoom/);
  assert.match(camp, /this\.createZoom = 1/);
});
