import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ACTION_GAP,
  CLOCK_GAP,
  HUD_CLEAR_PAIRS,
  HUD_VIEWPORTS,
  MENU_COUNT,
  QUEST_KEY,
  QUEST_MAX_W,
  applyHudLayout,
  dialogClearance,
  fitMenuButtons,
  hudRects,
  touchActionRects,
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
  assert.match(theme, /body\.touch #touch-btns[\s\S]*--hud-action-right/);
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
      const gap = rects.menu.x - (rects.bubbles.x + rects.bubbles.w);
      assert.ok(gap >= ACTION_GAP - 0.01, `${vp.name} action gap ${gap}`);
    }
    assert.equal(overlap(rects.quest, rects.minimap), false, `${vp.name} quest vs minimap`);
    const clockGap = rects.menu.x - (rects.clock.x + rects.clock.w);
    assert.ok(clockGap >= CLOCK_GAP - 0.01, `${vp.name} clock vs menu ${clockGap}`);
    assert.ok(rects.menu.x - (rects.debug.x + rects.debug.w) >= CLOCK_GAP - 0.01, `${vp.name} debug vs menu`);
    assert.equal(overlap(rects.debug, rects.clock), false, `${vp.name} debug vs clock`);
  }
});

test('MG-UI-23 clock chip has 8px clearance from the menu at 844x390', () => {
  const vp = { name: 'phone-landscape', w: 844, h: 390, touch: true };
  const rects = hudRects(vp);
  assert.ok(rects.clock);
  assert.equal(overlap(rects.clock, rects.menu), false);
  assert.ok(rects.menu.x - (rects.clock.x + rects.clock.w) >= 8);
  assert.ok(rects.menu.x - (rects.debug.x + rects.debug.w) >= 8);
  assert.equal(overlap(rects.debug, rects.clock), false);
  assert.equal(overlap(rects.debug, rects.menu), false);
});

test('MG-UI-17 844x390 action-button bounding rects leave at least 8px from #menu-col', () => {
  const vp = { name: 'phone-landscape', w: 844, h: 390, touch: true };
  const measured = touchActionRects(vp);
  assert.ok(measured.gap >= ACTION_GAP - 0.01, `attack vs menu gap ${measured.gap}`);
  assert.ok(measured.menu.x - (measured.attack.x + measured.attack.w) >= 8, 'attack button vs menu');
  assert.ok(measured.menu.x - (measured.cluster.x + measured.cluster.w) >= 8, 'cluster vs menu');
  assert.equal(overlap(measured.attack, measured.menu), false);
  const theme = src('../src/ui/theme.css');
  assert.match(theme, /--hud-action-right:\s*calc\(var\(--hud-menu-inset\) \+ var\(--menu-col-w\) \+ var\(--hud-action-gap\)/);
  assert.match(theme, /@media \(max-height: 500px\) \{[\s\S]*#touch-btns \{[\s\S]*right:\s*var\(--hud-action-right\)/);
});

test('talk button stays inside the 844x390 landscape action cluster', () => {
  const vp = { name: 'phone-landscape', w: 844, h: 390, touch: true };
  const measured = touchActionRects(vp);
  const talk = measured.talk;
  const box = measured.cluster;
  assert.ok(talk, 'talk rect');
  assert.ok(talk.x >= box.x - 0.01, `talk left ${talk.x} vs cluster ${box.x}`);
  assert.ok(talk.y >= box.y - 0.01, `talk top ${talk.y} vs cluster ${box.y}`);
  assert.ok(talk.x + talk.w <= box.x + box.w + 0.01, 'talk right inside cluster');
  assert.ok(talk.y + talk.h <= box.y + box.h + 0.01, 'talk bottom inside cluster');
  assert.ok(talk.x + talk.w <= vp.w, 'talk on screen');
  assert.ok(talk.y >= 0, 'talk below top of screen');
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
  assert.equal(props['--hud-clock-gap'], '8px');
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

test('MG-UI-16 expanded quest stays in frame at 844x390 and 1280x800', () => {
  for (const vp of [
    { name: 'phone-landscape', w: 844, h: 390, touch: true },
    { name: 'laptop', w: 1280, h: 800, touch: false },
  ]) {
    const rects = hudRects(vp, { questOpen: true });
    const cap = Math.min(QUEST_MAX_W, Math.floor(vp.w * 0.45));
    assert.ok(rects.quest.w <= cap + 0.01, `${vp.name} width ${rects.quest.w}`);
    assert.ok(rects.quest.w >= 96, `${vp.name} min ${rects.quest.w}`);
    assert.ok(rects.quest.x + rects.quest.w <= vp.w - rects.menu.w, `${vp.name} inside viewport`);
    assert.equal(overlap(rects.quest, rects.minimap), false, vp.name);
  }
  const theme = src('../src/ui/theme.css');
  assert.match(theme, /#quest\.open \{[\s\S]*max-width:\s*min\(340px,\s*45vw/);
  assert.match(theme, /overflow-wrap:\s*anywhere/);
});
