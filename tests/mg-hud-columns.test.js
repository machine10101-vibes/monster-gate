import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('menu buttons sit in one right-edge column, not left/right rails', () => {
  const html = src('../index.html');
  const theme = src('../src/ui/theme.css');
  assert.match(html, /id="menu-col"/);
  assert.match(html, /id="hud-corner-right"/);
  assert.doesNotMatch(html, /id="menu-col-left"/);
  assert.doesNotMatch(html, /id="menu-col-right"/);
  assert.doesNotMatch(html, /id="menu-buttons"/);
  assert.match(html, /menu-col[\s\S]*data-panel="bag"[\s\S]*data-panel="catalog"[\s\S]*data-panel="settings"/);
  assert.match(html, /menu-col[\s\S]*data-panel="friends"/);
  const corner = html.match(/id="hud-corner-right"[\s\S]*?<nav id="menu-col"/);
  assert.ok(corner, 'column follows the status cluster');
  assert.doesNotMatch(corner[0], /data-panel=/);
  assert.match(theme, /#menu-col/);
  assert.match(theme, /#menu-col \{[\s\S]*flex-direction:\s*column-reverse/);
  assert.match(theme, /\.mbtn \{[\s\S]*min-width:\s*var\(--menu-btn\)/);
  assert.match(theme, /body\.touch #touch-btns[\s\S]*--hud-action-right/);
  assert.doesNotMatch(theme, /#menu-col-left/);
  assert.doesNotMatch(theme, /flex-flow:\s*row wrap-reverse/);
});
