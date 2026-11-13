import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  HUD_CLEAR_PAIRS,
  HUD_VIEWPORTS,
  MENU_COUNT,
  QUEST_KEY,
  applyHudLayout,
  dialogClearance,
  fitMenuButtons,
  hudRects,
  overlap,
  overlapsOf,
  readQuestOpen,
  writeQuestOpen,
} from '../src/ui/hudLayout.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('MG-UI-12: one right-edge menu column and a collapsed quest dropdown', () => {
  const html = src('../index.html');
  const theme = src('../src/ui/theme.css');
  assert.match(html, /id="menu-col"/);
  assert.doesNotMatch(html, /id="menu-col-left"/);
  assert.doesNotMatch(html, /id="menu-col-right"/);
  assert.match(html, /id="quest-toggle"/);
  assert.match(html, /id="q-track"/);
  assert.match(html, />Quest</);
  assert.match(html, /q-arrow/);
  assert.match(theme, /#menu-col/);
  assert.match(theme, /flex-direction:\s*column-reverse/);
  assert.match(theme, /body\.touch #touch-btns \{[\s\S]*--menu-col-w/);
  assert.match(theme, /#quest:not\(\.open\) \.q-track \{ display: none/);
  assert.match(theme, /#quest \.q-head/);
  const hud = src('../src/ui/hud.js');
  assert.match(hud, /bindQuestToggle/);
  assert.match(hud, /QUEST_KEY|writeQuestOpen|readQuestOpen/);
});

test('menu buttons shrink to fit the viewport and stay at least 32px on touch', () => {
  for (const vp of HUD_VIEWPORTS) {
    const fit = fitMenuButtons(vp.h, { touch: vp.touch, count: MENU_COUNT });
    assert.ok(fit.size * MENU_COUNT + fit.gap * (MENU_COUNT - 1) <= vp.h - 12, vp.name);
    if (vp.touch) assert.ok(fit.size >= 32, vp.name);
    assert.ok(fit.size <= 44, vp.name);
  }
});

test('HUD rects do not collide at 844x390, 390x844, 1280x800, 1920x1080', () => {
  for (const vp of HUD_VIEWPORTS) {
    const rects = hudRects(vp);
    const hits = overlapsOf(rects, HUD_CLEAR_PAIRS);
    assert.deepEqual(hits, [], vp.name);
    assert.ok(rects.menu.x + rects.menu.w <= vp.w + 0.01, vp.name);
    assert.ok(rects.menu.y >= 0, vp.name);
    if (vp.touch) {
      assert.ok(rects.bubbles, vp.name);
      assert.ok(rects.bubbles.x + rects.bubbles.w <= rects.menu.x + 0.5, `${vp.name} bubbles left of column`);
    }
    assert.equal(overlap(rects.quest, rects.minimap), false, `${vp.name} quest vs minimap`);
  }
});

test('expanded quest tracker still misses the minimap', () => {
  for (const vp of HUD_VIEWPORTS) {
    const rects = hudRects(vp, { questOpen: true });
    assert.equal(overlap(rects.quest, rects.minimap), false, vp.name);
  }
});

test('quest open state persists in localStorage, default collapsed', () => {
  const mem = new Map();
  const store = {
    getItem(k) { return mem.has(k) ? mem.get(k) : null; },
    setItem(k, v) { mem.set(k, String(v)); },
  };
  assert.equal(readQuestOpen(store), false);
  writeQuestOpen(true, store);
  assert.equal(store.getItem(QUEST_KEY), '1');
  assert.equal(readQuestOpen(store), true);
  writeQuestOpen(false, store);
  assert.equal(readQuestOpen(store), false);
});

test('applyHudLayout writes CSS variables', () => {
  const props = {};
  const el = { style: { setProperty(k, v) { props[k] = v; } } };
  const fit = applyHudLayout(el, { w: 844, h: 390, touch: true });
  assert.equal(props['--menu-btn'], `${fit.size}px`);
  assert.equal(props['--menu-col-w'], `${fit.colW}px`);
  assert.ok(Number.parseInt(props['--hud-clear-bottom'], 10) >= dialogClearance({ w: 844, h: 390, touch: true }));
  assert.ok(fit.size >= 32);
});

test('dialogue clearance sits above the hotbar and action bubbles', () => {
  for (const vp of HUD_VIEWPORTS) {
    const rects = hudRects(vp);
    const clear = dialogClearance(vp);
    assert.ok(clear >= vp.h - rects.hotbar.y + 16, `${vp.name} hotbar`);
    if (rects.bubbles) {
      assert.ok(clear >= vp.h - rects.bubbles.y + 12, `${vp.name} bubbles`);
    }
  }
});

test('MG-UI-15 expanded quest is ~220px on a desktop-size touch screen', () => {
  const rects = hudRects({ name: 'touch-desktop', w: 1280, h: 800, touch: true }, { questOpen: true });
  assert.ok(rects.quest.w >= 200, rects.quest.w);
  assert.ok(rects.quest.w <= 220, rects.quest.w);
  const theme = src('../src/ui/theme.css');
  assert.match(theme, /#quest\.open \{[\s\S]*min-width:\s*min\(220px/);
});
