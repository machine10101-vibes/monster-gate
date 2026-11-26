import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('login screen has a compact scrollable layout on short landscape phones', () => {
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 600px\) and \(max-width: 1100px\)/);
  assert.match(css, /#title \.title-inner[\s\S]*?max-height: var\(--mg-viewport-height, 100dvh\)/);
  assert.match(css, /#title \.title-inner[\s\S]*?overflow-y: auto/);
  assert.match(css, /#world-auth[\s\S]*?overflow-y: auto/);
});

test('visible viewport is refreshed on resize and phone orientation changes before gameplay', () => {
  assert.match(main, /const syncViewport = \(\) =>/);
  assert.match(main, /--mg-viewport-height/);
  assert.match(main, /window\.visualViewport\?\.addEventListener\?\.\('resize', syncViewport\)/);
  assert.match(main, /window\.addEventListener\('orientationchange'/);
  assert.match(main, /setTimeout\(syncViewport, 320\)/);
});
