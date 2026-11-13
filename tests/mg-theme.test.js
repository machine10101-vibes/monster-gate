import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('MG-UI panels share the journal theme tokens and classes', () => {
  const html = src('../index.html');
  const theme = src('../src/ui/theme.css');
  const helper = src('../src/ui/theme.js');
  const hud = src('../src/ui/hud.js');
  const main = src('../src/main.js');
  const style = src('../src/style.css');
  const view = src('../src/net/worldView.js');

  assert.match(main, /ui\/theme\.css/);
  assert.match(theme, /--mg-navy:\s*#0b1524/);
  assert.match(theme, /--mg-gold:\s*#c6a15a/);
  assert.match(theme, /\.mg-frame/);
  assert.match(theme, /\.mg-btn/);
  assert.match(theme, /#hud-corner-right/);
  assert.match(theme, /flex-direction:\s*column-reverse/);
  assert.match(theme, /#world-chat \.wc-toggle \{[\s\S]*min-height:\s*44px/);
  assert.match(helper, /export function decorateFrame/);
  assert.match(hud, /decorateFrame/);
  assert.match(html, /panel-card mg-frame/);
  assert.match(html, /account-panel mg-frame/);
  assert.match(html, /id="hud-corner-right"/);
  assert.match(view, /name_taken/);
  assert.match(view, /wn-in/);

  assert.match(style, /#title \.account-choices \.start \{[\s\S]*animation: none/);
  assert.match(style, /min\(320px, 86vw\)/);
  assert.match(html, /account-pass-hint/);
  assert.match(html, /id="btn-guest"[^>]*>Play as guest/);
});
