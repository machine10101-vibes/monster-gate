import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('menu buttons split into left character and right world columns', () => {
  const html = src('../index.html');
  const theme = src('../src/ui/theme.css');
  assert.match(html, /id="menu-col-left"/);
  assert.match(html, /id="menu-col-right"/);
  assert.match(html, /id="hud-corner-right"/);
  assert.doesNotMatch(html, /id="menu-buttons"/);
  assert.match(html, /menu-col-left[\s\S]*data-panel="bag"[\s\S]*data-panel="catalog"/);
  assert.match(html, /menu-col-right[\s\S]*data-panel="quest"[\s\S]*data-panel="settings"/);
  assert.match(html, /hud-corner-right[\s\S]*id="clock"[\s\S]*btn-fs[\s\S]*btn-snd/);
  const corner = html.match(/id="hud-corner-right"[\s\S]*?<nav id="menu-col-left"/);
  assert.ok(corner, 'columns follow the status cluster');
  assert.doesNotMatch(corner[0], /data-panel=/);
  assert.match(theme, /#menu-col-left/);
  assert.match(theme, /#menu-col-right/);
  assert.match(theme, /\.menu-col \{[\s\S]*flex-direction:\s*column-reverse/);
  assert.match(theme, /\.mbtn \{[\s\S]*min-width:\s*44px/);
  assert.match(theme, /body\.touch #menu-col-left/);
  assert.match(theme, /body\.touch #menu-col-right/);
  assert.match(theme, /@media \(max-height: 500px\) \{[\s\S]*flex-flow:\s*row wrap-reverse/);
});
