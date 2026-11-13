import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GEAR, WEAPON_ORDER } from '../src/data/catalog.js';
import { bindPanelClose, minimapArrowAngle, stackNameplates } from '../src/ui/hud.js';
import { HUD_HOTBAR_FADE, HUD_SAFE_PAD, PLATE_STACK_GAP, VIEWPORT_PLATE_INSET, hudSafeMargin, nameplateHitsHud, nameplateOutsideViewport, nudgeAnchorOffRects, overlap, padHudSafeRects, plateAnchorRect, platesCollide } from '../src/ui/hudLayout.js';
import {
  CURSOR_KINDS,
  WTYPE_TO_KIND,
  cursorKindForHeld,
  cursorTierForHeld,
  equippedHeldKind,
} from '../src/ui/weaponCursor.js';
import { parseMmoFlags, REMOTE_PREFIX, WorldView, normalizePlayer } from '../src/net/worldView.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => readFileSync(join(root, rel), 'utf8');
const TAU = Math.PI * 2;
const wrap = (a) => ((a % TAU) + TAU) % TAU;
const close = (got, want, msg) => {
  const d = Math.min(Math.abs(wrap(got) - wrap(want)), TAU - Math.abs(wrap(got) - wrap(want)));
  assert.ok(d < 1e-9, msg || `angle ${got} ~ ${want}`);
};

test('MG-UI-8: north-up arrow follows character yaw, not the camera', () => {
  // yaw 0 faces +Z. Minimap +Z is down, so the sprite tip (local -Y) must point down.
  close(minimapArrowAngle(0), Math.PI, 'south');
  close(minimapArrowAngle(Math.PI), 0, 'north');
  close(minimapArrowAngle(Math.PI / 2), Math.PI / 2, 'east');
  close(minimapArrowAngle(-Math.PI / 2), (3 * Math.PI) / 2, 'west');
  const ne = Math.atan2(1, -1);
  close(minimapArrowAngle(ne), Math.PI / 4, 'northeast');
  close(minimapArrowAngle(0, { rotateMap: true, cameraYaw: Math.PI / 2 }), Math.PI / 2, 'rotating map');
  const main = src('src/main.js');
  assert.match(main, /drawMinimap\(this\.world, this\.player\.pos\.x, this\.player\.pos\.z, this\.player\.yaw/);
  assert.match(main, /drawMinimap\(this\.world, P\.pos\.x, P\.pos\.z, P\.yaw/);
  assert.doesNotMatch(main, /drawMinimap\([^)]*this\.cam\.yaw/);
});

test('minimap remotes use snapshot yaw/heading as the arrow angle', () => {
  const hud = src('src/ui/hud.js');
  assert.match(hud, /paintMinimapArrow\(ctx, toX\(r\.x\), toZ\(r\.z\), r\.yaw/);
  const p = normalizePlayer({ id: 'b', name: 'Bea', heading: Math.PI / 2, x: 1, z: 1 });
  assert.equal(p.yaw, Math.PI / 2);
});

test('MG-UI-10 dialogue stays absolutely positioned and clamped on screen', () => {
  const theme = src('src/ui/theme.css');
  assert.match(theme, /#dialog \{[\s\S]*position:\s*absolute/);
  assert.match(theme, /#dialog \{[\s\S]*max-height:\s*calc\(100dvh/);
  assert.match(theme, /body\.touch #dialog \{[\s\S]*max-height:\s*min\(58vh/);
  assert.match(theme, /#dialog \{[\s\S]*--hud-clear-bottom/);
  assert.match(theme, /#dialog \{[\s\S]*flex-direction:\s*column/);
});

test('MG-UI-9 landscape chat stays off the quest HUD and the page cannot scroll', () => {
  const theme = src('src/ui/theme.css');
  assert.match(theme, /@media \(max-height: 500px\) \{[\s\S]*overflow:\s*hidden/);
  assert.match(theme, /@media \(max-height: 500px\) \{[\s\S]*#world-chat[\s\S]*max-height/);
  assert.match(theme, /html, body \{[\s\S]*overflow:\s*hidden/);
});

test('MG-UI-MENU-2 chat uses gold journal chrome, not cyan', () => {
  const theme = src('src/ui/theme.css');
  assert.match(theme, /#world-chat \.wc-send/);
  assert.match(theme, /#world-chat \.wc-tabs button\.on \{[\s\S]*--mg-gold-hi/);
  assert.doesNotMatch(theme, /#world-chat[\s\S]{0,400}#7ef6ff/);
  assert.doesNotMatch(theme, /#world-chat \.wc-send[\s\S]{0,200}#3ec8d4/);
});

test('MG-UI-21 title panel fits short landscape and DEBUG stays off the tagline', () => {
  const theme = src('src/ui/theme.css');
  const style = src('src/style.css');
  assert.match(theme, /#debug-badge \{[\s\S]*right:\s*calc\(10px/);
  assert.match(theme, /#debug-badge \{[\s\S]*left:\s*auto/);
  assert.match(style, /#debug-badge \{[\s\S]*right:\s*calc\(10px/);
  assert.match(theme, /#title \.title-inner \{[\s\S]*max-height:\s*calc\(100dvh - 16px\)/);
  assert.match(theme, /@media \(max-height: 500px\) \{[\s\S]*#title \.title-inner \{[\s\S]*padding:\s*16px 18px 16px/);
  assert.match(theme, /#title \.touch-only \{[\s\S]*padding:\s*0 8px 8px/);
  assert.match(theme, /@media \(max-height: 500px\) \{[\s\S]*#title \.touch-only \{[\s\S]*padding:\s*8px 8px 12px/);
});

test('MG-UI-25 DEBUG sits under open Menu and Settings panels', () => {
  const theme = src('src/ui/theme.css');
  const style = src('src/style.css');
  assert.match(theme, /#debug-badge \{[\s\S]*z-index:\s*20/);
  assert.match(style, /#debug-badge \{[\s\S]*z-index:\s*20/);
  assert.match(theme, /html\.panel-open #debug-badge/);
  assert.match(style, /html\.panel-open #debug-badge/);
  assert.match(theme, /html:has\(#panel:not\(\.hidden\)\) #debug-badge/);
  assert.match(style, /#panel \{[\s\S]*z-index:\s*20/);
  assert.match(theme, /#panel \{[\s\S]*z-index:\s*50/);
  const flags = src('src/debug/flags.js');
  assert.match(flags, /getElementById\('app'\)/);
});

test('MG-UI-26 short-landscape title does not overlap Play as guest', () => {
  const theme = src('src/ui/theme.css');
  const html = src('index.html');
  assert.match(theme, /@media \(max-height: 500px\) \{[\s\S]*#title \.wallet-status \{[\s\S]*display:\s*none/);
  assert.match(theme, /@media \(max-height: 500px\) \{[\s\S]*body\.touch #title \.start \{[\s\S]*min-height:\s*30px/);
  assert.match(html, /class="touch-only"/);
  assert.doesNotMatch(html, /Play as a guest or sign in/);
  assert.match(html, /Guest or sign in, pick a hunter upright/);
});

test('MG-UI-23 DEBUG sits under the clock while hunting, 8px off the menu', () => {
  const theme = src('src/ui/theme.css');
  const style = src('src/style.css');
  const hud = src('src/ui/hud.js');
  assert.match(theme, /body\.hunting #debug-badge \{[\s\S]{0,220}--hud-clock-gap/);
  assert.match(style, /body\.hunting #debug-badge \{[\s\S]{0,220}--hud-clock-gap/);
  assert.match(theme, /--hud-clock-gap:\s*8px/);
  assert.match(theme, /#hud-corner-right \{[\s\S]*--hud-clock-gap/);
  assert.match(hud, /set-debug-flag/);
});

test('MG-UI-24 close fires on click, pointerup, and touchend', () => {
  const hits = [];
  const listeners = {};
  const btn = {
    dataset: {},
    addEventListener(type, fn) { listeners[type] = fn; },
  };
  bindPanelClose(btn, () => hits.push('close'));
  listeners.click({ preventDefault() {}, stopPropagation() {} });
  listeners.pointerup({ preventDefault() {}, stopPropagation() {} });
  listeners.touchend({ preventDefault() {}, stopPropagation() {} });
  assert.equal(hits.length, 3);
  bindPanelClose(btn, () => hits.push('again'));
  assert.equal(hits.length, 3);
});

test('MG-UI-24 inventory close is 44px and handles click plus pointer/touch', () => {
  const theme = src('src/ui/theme.css');
  const style = src('src/style.css');
  const hud = src('src/ui/hud.js');
  const html = src('index.html');
  assert.match(html, /id="panel-close"[^>]*type="button"/);
  assert.match(theme, /#panel-close \{[\s\S]*min-width:\s*44px/);
  assert.match(theme, /#panel-close \{[\s\S]*min-height:\s*44px/);
  assert.match(theme, /#panel-close \{[\s\S]*z-index:\s*40/);
  assert.match(style, /body\.touch #panel-close \{[\s\S]*min-width:\s*44px/);
  assert.match(theme, /#panel \{[\s\S]*pointer-events:\s*auto/);
  assert.match(hud, /bindPanelClose/);
  assert.match(hud, /pointerup/);
  assert.match(hud, /touchend/);
});

test('MG-UI-MENU-3 title and character select use the journal gold', () => {
  const theme = src('src/ui/theme.css');
  assert.match(theme, /#title \{[\s\S]*#070d16/);
  assert.match(theme, /\.cs-brand em \{[\s\S]*--mg-gold-hi/);
  assert.match(theme, /\.start,[\s\S]*--mg-gold-hi/);
});

test('MG-UI-MMO-4 online counter shares a row with fullscreen and sound', () => {
  const html = src('index.html');
  assert.match(html, /class="hud-status-row"/);
  assert.match(html, /id="world-status-slot"/);
  assert.match(html, /hud-status-row[\s\S]*btn-fs[\s\S]*btn-snd/);
  assert.match(src('src/net/worldView.js'), /world-status-slot/);
});

test('MG-UI-11 oasis landing is labeled Oasis and the water bed tint varies', () => {
  const desert = src('src/world/desert.js');
  assert.match(desert, /banner: \['The Living Water', 'Oasis'\]/);
  assert.match(desert, /hash2\(wx, wz/);
  assert.match(src('src/world/tiles.js'), /'Oasis'/);
  assert.doesNotMatch(src('src/world/tiles.js'), /'Greenbowl'/);
  assert.match(src('src/world/world.js'), /macro \* 2\.4/);
});

test('menu buttons sit in one right-edge column', () => {
  const html = src('index.html');
  const theme = src('src/ui/theme.css');
  assert.match(html, /id="menu-col"/);
  assert.match(html, /id="hud-corner-right"/);
  assert.match(html, /data-panel="bag"/);
  assert.match(html, /data-panel="settings"/);
  assert.doesNotMatch(html, /id="menu-buttons"/);
  assert.doesNotMatch(html, /id="menu-col-left"/);
  assert.match(theme, /#menu-col/);
  assert.match(theme, /flex-direction:\s*column-reverse/);
  assert.match(theme, /\.mbtn \{[\s\S]*min-width:\s*var\(--menu-btn\)/);
  assert.match(theme, /body\.touch #touch-btns[\s\S]*--hud-action-right/);
});

test('MG-UI-13 nameplates sit below windows and hide while a window is open', () => {
  const theme = src('src/ui/theme.css');
  const style = src('src/style.css');
  assert.match(theme, /#nameplates \{[\s\S]*z-index:\s*4/);
  assert.match(style, /#hud \{[\s\S]*z-index:\s*10/);
  assert.match(style, /#nameplates \{[\s\S]*z-index:\s*4/);
  assert.match(theme, /html\.windows-open #nameplates/);
  assert.match(src('src/ui/hud.js'), /syncWindows/);
});

test('MG-UI-14 character select panel stays absolutely placed in the viewport', () => {
  const theme = src('src/ui/theme.css');
  assert.match(theme, /#charselect \.cs-panel,[\s\S]*position:\s*absolute/);
  assert.match(theme, /#charselect \.cs-panel,[\s\S]*max-width:\s*calc\(100vw/);
});

test('MG-UI-15 expanded quest dropdown has a 220px min-width clamped to the viewport', () => {
  const theme = src('src/ui/theme.css');
  assert.match(theme, /#quest\.open \{[\s\S]*min-width:\s*min\(220px/);
  assert.match(theme, /body\.touch #quest\.open \{[\s\S]*min-width:\s*min\(220px/);
});

test('MG-UI-16 expanded quest wraps inside a viewport-clamped frame', () => {
  const theme = src('src/ui/theme.css');
  assert.match(theme, /#quest\.open \{[\s\S]*max-width:\s*min\(340px,\s*45vw/);
  assert.match(theme, /#quest\.open \{[\s\S]*max-height:\s*min\(42vh/);
  assert.match(theme, /#quest\.open \.q-body \{[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(theme, /#quest\.open #q-text \{[\s\S]*text-overflow:\s*unset/);
  assert.doesNotMatch(theme, /#quest\.open \.q-body \{[\s\S]*white-space:\s*nowrap/);
});

test('MG-UI-17 action cluster keeps a gap from the menu column', () => {
  const theme = src('src/ui/theme.css');
  const style = src('src/style.css');
  assert.match(theme, /--hud-action-right:\s*calc\(var\(--hud-menu-inset\) \+ var\(--menu-col-w\) \+ var\(--hud-action-gap\)/);
  assert.match(theme, /body\.touch #touch-btns[\s\S]*right:\s*var\(--hud-action-right\)/);
  assert.match(theme, /@media \(max-height: 500px\) \{[\s\S]*#touch-btns \{[\s\S]*right:\s*var\(--hud-action-right\)/);
  assert.match(style, /#touch-btns \{[\s\S]*--hud-action-right/);
  assert.match(theme, /#hints \{[\s\S]*--hud-clear-bottom/);
});

test('MG-UI-19 an open window hides the NPC dialogue', () => {
  const theme = src('src/ui/theme.css');
  assert.match(theme, /html\.panel-open #dialog/);
  assert.match(src('src/ui/hud.js'), /panel-open/);
  assert.match(theme, /#panel \{[\s\S]*z-index:\s*50/);
});

test('build id is shown in Settings', () => {
  assert.match(src('src/ui/hud.js'), /set-build/);
  assert.match(src('src/ui/buildId.js'), /VITE_BUILD_ID/);
  assert.match(src('index.html'), /id="build-id"/);
  assert.match(src('vite.config.js'), /VITE_BUILD_ID/);
});

test('fullscreen is requested only from a user tap', () => {
  const main = src('src/main.js');
  assert.match(main, /if \(!isFullscreen\(\) && !this\.fsPending && gesture\)/);
  assert.doesNotMatch(main, /gesture \|\| \(!tablet && cooled\)/);
});

test('graphics default to Medium on desktop when nothing is saved', () => {
  const main = src('src/main.js');
  assert.match(main, /isDesktopGraphics/);
  assert.match(main, /if \(isDesktopGraphics\(\)\) return QUALITIES\[1\]/);
});

test('weapon cursor maps each weapon type and dusk-tints Duskbreaker', () => {
  assert.equal(cursorKindForHeld(null), 'default');
  assert.equal(cursorKindForHeld('blade'), 'sword');
  assert.equal(cursorKindForHeld('axe'), 'axe');
  assert.equal(cursorKindForHeld('hammer'), 'hammer');
  assert.equal(cursorKindForHeld('bow'), 'bow');
  assert.equal(cursorKindForHeld('crossbow'), 'crossbow');
  assert.equal(cursorKindForHeld('wand'), 'wand');
  assert.equal(cursorKindForHeld('tome'), 'tome');
  assert.equal(cursorKindForHeld('pick'), 'pick');
  assert.equal(cursorKindForHeld('dual'), 'dual');
  assert.equal(cursorKindForHeld('darkhammer'), 'hammer');
  assert.equal(cursorTierForHeld('darkhammer'), 'dusk');
  assert.equal(cursorTierForHeld('blade'), 'base');
  for (const wtype of WEAPON_ORDER) {
    assert.ok(WTYPE_TO_KIND[wtype], wtype);
    assert.ok(CURSOR_KINDS.includes(WTYPE_TO_KIND[wtype]), wtype);
  }
  for (const g of GEAR.filter((x) => x.type === 'weapon')) {
    const kind = cursorKindForHeld(g.held || g.id);
    assert.ok(CURSOR_KINDS.includes(kind), `${g.id} -> ${kind}`);
  }
  for (const kind of CURSOR_KINDS) {
    for (const tier of ['base', 'dusk']) {
      for (const size of [32, 64]) {
        assert.ok(existsSync(join(root, 'public/cursors', `${kind}-${tier}-${size}.svg`)), `${kind}-${tier}-${size}`);
      }
    }
  }
  const hud = src('src/ui/hud.js');
  assert.match(hud, /set-wcur/);
  assert.match(src('src/ui/theme.css'), /body\.weapon-cursor-on/);
});

test('mockwake=90 lasts ninety seconds', () => {
  const flags = parseMmoFlags('?mmo=1&mockwake=90');
  assert.equal(flags.mockwake, true);
  assert.equal(flags.wakeSeconds, 90);
  assert.equal(parseMmoFlags('?mmo=1&mockwake=1').wakeSeconds, 30);
});

test('offline cursor uses local gear; mmo uses snapshot held for the local id', () => {
  assert.equal(equippedHeldKind({ progress: { weaponItem: { held: 'bow' } } }), 'bow');
  assert.equal(equippedHeldKind({
    mmo: { you: { id: 'me' } },
    worldView: { localHeld: 'darkhammer' },
    progress: { weaponItem: { held: 'bow' } },
  }), 'darkhammer');
  const remotes = new Map();
  const game = {
    time: 0,
    remotes,
    mmo: { you: { id: 'me' } },
    player: { pos: { x: 1, y: 3, z: 1 }, yaw: 0, heldKind: 'blade', sheathKind: 'blade' },
    hud: { plate() {}, placePlate() {}, removePlate() {} },
    world: { heightAt: () => 3 },
  };
  const view = new WorldView(game, {
    spawnRemote: (id, name) => ({
      id, name, ready: false, x: 0, z: 0, yaw: 0,
      setAppearance() {}, present(p) { Object.assign(this, p); this.ready = true; }, dispose() {}, update() {},
    }),
  });
  game.worldView = view;
  view.applySnapshot([
    { id: 'me', name: 'You', x: 2, z: 2, yaw: 1, held: 'darkscythe' },
    { id: 'them', name: 'Ann', x: 4, z: 4, yaw: Math.PI, heading: Math.PI, held: 'bow' },
  ]);
  assert.equal(view.localHeld, 'darkscythe');
  assert.equal(game.remotes.get(REMOTE_PREFIX + 'me'), undefined);
  assert.ok(game.remotes.get(REMOTE_PREFIX + 'them'));
  assert.equal(game.remotes.get(REMOTE_PREFIX + 'them').yaw, Math.PI);
  view.applyDelta({ upsert: [{ id: 'me', held: 'darkhammer', yaw: 0.2 }] });
  assert.equal(view.localHeld, 'darkhammer');
  assert.equal(equippedHeldKind(game), 'darkhammer');
});

test('MG-UI-27 hit glow is small and on the monster, player swing stays subtle', () => {
  const vfx = src('src/engine/vfx.js');
  const hit = vfx.slice(vfx.indexOf('hit(x, y, z'), vfx.indexOf('/* ----------------------------- update'));
  assert.match(hit, /Math\.min\(0\.48/);
  assert.match(hit, /0xffffff,\s*0\.14 \+ p \* 0\.05/);
  assert.doesNotMatch(hit, /0\.9 \+ power \* 0\.5/);
  const swing = src('src/systems/skillfx.js');
  const melee = swing.slice(swing.indexOf('export function meleeSwing'), swing.indexOf('/* ------------------------------------------------------------------ */\n/* skills'));
  assert.match(melee, /spec\.c,\s*0\.42,\s*0\.1/);
  assert.doesNotMatch(melee, /1\.3,\s*0\.14/);
  const monsters = src('src/entities/monsters.js');
  assert.match(monsters, /emissive\.setRGB\(0\.38, 0\.32, 0\.22\)/);
  const player = src('src/entities/player.js');
  assert.match(player, /fx\.burst\([\s\S]{0,180}3,\s*1\.05,\s*0\.045/);
  assert.match(player, /emissive\.setRGB\(0\.26 \* k, 0\.04 \* k, 0\.03 \* k\)/);
  assert.match(player, /fx\.impact\([\s\S]{0,160}0\.22\)/);
  const style = src('src/style.css');
  assert.match(style, /#hurt-flash \{[\s\S]*transparent 68%/);
  assert.match(style, /#hurt-flash\.show \{[\s\S]*opacity:\s*0\.85/);
  assert.match(style, /#toast \{[\s\S]*z-index:\s*80/);
});

test('MG-UI-28 dialogue is a bottom sheet with scrollable text and sticky choices', () => {
  const theme = src('src/ui/theme.css');
  const style = src('src/style.css');
  const hud = src('src/ui/hud.js');
  assert.match(theme, /#dialog \{[\s\S]*flex-direction:\s*column/);
  assert.match(theme, /#dialog p \{[\s\S]*overflow-y:\s*auto/);
  assert.match(theme, /#dlg-choices \{[\s\S]*flex:\s*0 0 auto/);
  assert.match(theme, /html\.dialog-open #quest/);
  assert.match(theme, /#app:has\(#dialog:not\(\.hidden\)\) #quest/);
  assert.match(hud, /classList\.toggle\('dialog-open'/);
  assert.match(style, /#dialog \{[\s\S]*flex-direction:\s*column/);
  assert.match(style, /@media \(max-height: 520px\) \{[\s\S]*body\.touch #dialog \{[\s\S]*max-height:\s*min\(62vh/);
});

test('MG-UI-29 overlapping nameplates stack using measured CSS-px rects', () => {
  const mira = { id: 'npc-guild', x: 420, y: 180, d: 2.1, w: 236, h: 42 };
  const crate = { id: 'storage', x: 428, y: 182, d: 4.8, w: 188, h: 38 };
  const out = stackNameplates([mira, crate]);
  const keep = out.filter((r) => r.visible);
  assert.equal(keep.length, 2);
  assert.notEqual(keep[0].y, keep[1].y);
  const ra = plateAnchorRect(keep[0].x, keep[0].y, keep[0].w, keep[0].h);
  const rb = plateAnchorRect(keep[1].x, keep[1].y, keep[1].w, keep[1].h);
  assert.equal(overlap(ra, rb, -4), false, 'stacked labels must not share a line');
  const phone = stackNameplates([
    { ...mira, x: 210, y: 168 },
    { ...crate, x: 218, y: 170 },
  ]);
  const phoneKeep = phone.filter((r) => r.visible);
  assert.equal(phoneKeep.length, 2);
  assert.equal(
    overlap(
      plateAnchorRect(phoneKeep[0].x, phoneKeep[0].y, phoneKeep[0].w, phoneKeep[0].h),
      plateAnchorRect(phoneKeep[1].x, phoneKeep[1].y, phoneKeep[1].w, phoneKeep[1].h),
      -4,
    ),
    false,
    '844-wide labels still stack',
  );
  const hidden = stackNameplates(
    [mira, crate, { id: 'market', x: 422, y: 181, d: 9, w: 200, h: 36 }],
    { maxLift: 1, dy: 8 },
  );
  assert.ok(hidden.some((r) => !r.visible), 'far labels drop when they still overlap');
  const hud = src('src/ui/hud.js');
  assert.match(hud, /layoutInteractPlates/);
  assert.match(hud, /getBoundingClientRect/);
  assert.match(hud, /cullPlatesOverHud/);
  assert.doesNotMatch(hud, /dx \?\? 170/);
});

test('MG-UI-30 nameplates that hit HUD safe rects are culled and sit below the HUD', () => {
  const minimap = { id: 'minimap-wrap', x: 8, y: 6, w: 110, h: 110 };
  const hearts = { id: 'center-bottom', x: 220, y: 300, w: 400, h: 86 };
  const menu = { id: 'menu-col', x: 808, y: 20, w: 32, h: 360 };
  const tobin = plateAnchorRect(70, 90, 160, 36);
  const lira = plateAnchorRect(420, 330, 180, 40);
  const pip = plateAnchorRect(400, 318, 150, 36);
  const mira = plateAnchorRect(420, 180, 220, 42);
  assert.equal(nameplateHitsHud(tobin, [minimap, hearts, menu]), true, 'Tobin on minimap');
  assert.equal(nameplateHitsHud(lira, [minimap, hearts, menu]), true, 'Lira on hearts/hotbar');
  assert.equal(nameplateHitsHud(pip, [minimap, hearts, menu]), true, 'Pip on hearts');
  assert.equal(nameplateHitsHud(mira, [minimap, hearts, menu]), false, 'Mira in the open stays');
  const style = src('src/style.css');
  const theme = src('src/ui/theme.css');
  const hud = src('src/ui/hud.js');
  assert.match(style, /#hud \{[\s\S]*z-index:\s*10/);
  assert.match(style, /#nameplates \{[\s\S]*z-index:\s*4/);
  assert.match(theme, /#nameplates \{[\s\S]*z-index:\s*4/);
  assert.match(style, /\.nameplate\.hud-occluded/);
  assert.match(hud, /measureHudSafeRects/);
  assert.match(hud, /nameplateHitsHud/);
});

test('MG-UI-30 pads HUD rects so a label in the hotbar fade band is culled', () => {
  const hearts = { id: 'center-bottom', x: 220, y: 310, w: 400, h: 76 };
  const pip = { id: 'npc-child', x: 328, y: 268, w: 124, h: 32 };
  assert.equal(pip.y + pip.h, 300);
  assert.ok(hearts.y - (pip.y + pip.h) >= 10, 'sits about 10px above the hearts');
  assert.equal(nameplateHitsHud(pip, [hearts]), false, 'unpadded hearts miss the fade band');
  const padded = padHudSafeRects([hearts], HUD_SAFE_PAD);
  assert.equal(nameplateHitsHud(pip, padded), true, '16px pad plus hotbar fade catches Pip');
  assert.ok(padded[0].y <= hearts.y - HUD_SAFE_PAD - HUD_HOTBAR_FADE);
  assert.equal(hudSafeMargin(390), 16);
  assert.equal(hudSafeMargin(800), 14);
  const talk = { id: 'tb-talk', x: 620, y: 140, w: 48, h: 48 };
  const nearTalk = { x: 668, y: 128, w: 110, h: 30 };
  assert.equal(nameplateHitsHud(nearTalk, [talk]), false);
  assert.equal(nameplateHitsHud(nearTalk, padHudSafeRects([talk], 16)), true);
  const hud = src('src/ui/hud.js');
  const layout = src('src/ui/hudLayout.js');
  assert.match(layout, /HUD_SAFE_PAD = 16/);
  assert.match(layout, /tb-talk/);
  assert.match(layout, /padHudSafeRects/);
  assert.match(hud, /measureHudSafeRects/);
});

test('MG-UI-31 hides world labels that cross the viewport edges', () => {
  const vp = { w: 844, h: 390 };
  const inset = VIEWPORT_PLATE_INSET;
  const open = { x: 320, y: 140, w: 160, h: 32 };
  assert.equal(nameplateOutsideViewport(open, vp, inset), false, 'label in the open stays');
  const tobin = { x: 280, y: -2, w: 168, h: 32 };
  assert.equal(nameplateOutsideViewport(tobin, vp, inset), true, 'Old Tobin clipped by the top edge');
  assert.equal(nameplateOutsideViewport({ x: 300, y: 1, w: 140, h: 30 }, vp, inset), true, 'inside the 4px top inset');
  assert.equal(nameplateOutsideViewport({ x: 300, y: 4, w: 140, h: 30 }, vp, inset), false, 'flush with the inset stays');
  assert.equal(nameplateOutsideViewport({ x: -6, y: 160, w: 120, h: 30 }, vp, inset), true, 'left edge');
  assert.equal(nameplateOutsideViewport({ x: 800, y: 160, w: 50, h: 30 }, vp, inset), true, 'right edge');
  assert.equal(nameplateOutsideViewport({ x: 300, y: 360, w: 140, h: 36 }, vp, inset), true, 'bottom edge');
  const hud = src('src/ui/hud.js');
  const layout = src('src/ui/hudLayout.js');
  assert.match(layout, /VIEWPORT_PLATE_INSET = 4/);
  assert.match(layout, /nameplateOutsideViewport/);
  assert.match(hud, /nameplateOutsideViewport/);
  assert.match(hud, /cullPlatesOverHud/);
});

test('MG-UI-33 stacks the full name+subtitle box and culls labels that hug the clock', () => {
  const pipName = { id: 'npc-child', x: 400, y: 140, d: 3.2, w: 124, h: 16 };
  const alcName = { id: 'alchemy', x: 410, y: 138, d: 5.5, w: 220, h: 16 };
  const short = stackNameplates([pipName, alcName], { gap: 10 });
  const shortVis = short.filter((r) => r.visible);
  assert.equal(shortVis.length, 2);
  const shortFull = shortVis.map((t) => plateAnchorRect(t.x, t.y, t.w, 32));
  assert.equal(overlap(shortFull[0], shortFull[1], -4), true, 'name-only height leaves subtitles overlapping');

  const pip = { ...pipName, h: 32 };
  const alc = { ...alcName, h: 32 };
  const full = stackNameplates([pip, alc], { gap: PLATE_STACK_GAP });
  const vis = full.filter((r) => r.visible);
  assert.equal(vis.length, 2);
  assert.equal(
    overlap(
      plateAnchorRect(vis[0].x, vis[0].y, vis[0].w, vis[0].h),
      plateAnchorRect(vis[1].x, vis[1].y, vis[1].w, vis[1].h),
      -8,
    ),
    false,
    'full two-line boxes stay a few px apart',
  );
  const dropped = stackNameplates([pip, alc], { gap: 10, maxLift: 0 });
  assert.ok(dropped.some((r) => !r.visible), 'farther label hides when it still collides');

  const clock = { id: 'clock', x: 700, y: 8, w: 78, h: 34 };
  const hug = { x: 566, y: 10, w: 124, h: 32 };
  assert.equal(hug.x + hug.w, 690);
  assert.ok(clock.x - (hug.x + hug.w) <= 10, 'about 10px left of the clock');
  assert.equal(nameplateHitsHud(hug, [clock]), false, 'unpadded clock misses a hugging label');
  assert.equal(nameplateHitsHud(hug, padHudSafeRects([clock], 16)), true, 'padded clock culls it');
  const hud = src('src/ui/hud.js');
  const layout = src('src/ui/hudLayout.js');
  assert.match(layout, /PLATE_STACK_GAP = 16/);
  assert.match(layout, /measurePlateSize/);
  assert.match(layout, /platesCollide/);
  assert.match(layout, /debug-badge/);
  assert.match(layout, /btn-fs/);
  assert.match(layout, /btn-snd/);
  assert.match(layout, /'clock'/);
  assert.match(hud, /measurePlateSize/);
});

test('MG-UI-33 side-by-side plates within the gap stack or hide', () => {
  const left = { id: 'npc-child', x: 400, y: 140, d: 3.2, w: 124, h: 32 };
  const leftBox = plateAnchorRect(left.x, left.y, left.w, left.h);
  const sameRow = (gapPx) => {
    const w = 220;
    const x = leftBox.x + leftBox.w + gapPx + w / 2;
    return { id: 'market', x, y: 140, d: 6.1, w, h: 32 };
  };
  const touchBox = plateAnchorRect(sameRow(0).x, 140, 220, 32);
  assert.equal(Math.abs(touchBox.x - (leftBox.x + leftBox.w)) < 0.01, true);
  assert.equal(platesCollide(leftBox, touchBox, 10), true, 'touching side-by-side collides');
  assert.equal(platesCollide(leftBox, plateAnchorRect(sameRow(4).x, 140, 220, 32), 10), true, '4px horizontal gap collides');
  assert.equal(platesCollide(leftBox, plateAnchorRect(sameRow(9).x, 140, 220, 32), 10), true, '9px horizontal gap collides');
  assert.equal(platesCollide(leftBox, plateAnchorRect(sameRow(11).x, 140, 220, 32), 10), false, 'beyond the 10px gap stays');

  const touch = stackNameplates([left, sameRow(0)], { gap: 10 });
  const touchVis = touch.filter((r) => r.visible);
  assert.equal(touchVis.length, 2);
  assert.notEqual(touchVis[0].y, touchVis[1].y, 'touching row stacks vertically');
  const near = stackNameplates([left, sameRow(4)], { gap: 10 });
  const nearVis = near.filter((r) => r.visible);
  assert.equal(nearVis.length, 2);
  assert.notEqual(nearVis[0].y, nearVis[1].y, 'near-touching row stacks vertically');
  const pipDalla = stackNameplates([left, sameRow(13)]);
  const pipDallaVis = pipDalla.filter((r) => r.visible);
  assert.equal(pipDallaVis.length, 2);
  assert.notEqual(pipDallaVis[0].y, pipDallaVis[1].y, '12–13px Pip/Dalla row still stacks at the default gap');
  const hide = stackNameplates([left, sameRow(0)], { gap: 10, maxLift: 0 });
  assert.ok(hide.some((r) => !r.visible), 'farther side-by-side label hides when it cannot lift');
});

test('MG-UI-34 chat bubbles use padded HUD cull including the Online counter', () => {
  const layout = src('src/ui/hudLayout.js');
  const hud = src('src/ui/hud.js');
  const style = src('src/style.css');
  assert.match(layout, /world-status/);
  assert.match(layout, /world-status-slot/);
  const online = { id: 'world-status', x: 620, y: 8, w: 120, h: 28 };
  const bubble = { x: 580, y: 10, w: 160, h: 36 };
  assert.equal(nameplateHitsHud(bubble, [online]), true, 'bubble over Online hits the raw chip');
  const hug = { x: 530, y: 10, w: 80, h: 28 };
  assert.equal(hug.x + hug.w, 610);
  assert.equal(nameplateHitsHud(hug, [online]), false, '10px left of Online misses the raw chip');
  assert.equal(nameplateHitsHud(hug, padHudSafeRects([online], 16)), true, 'padded Online culls a nearby bubble');
  assert.match(style, /\.nameplate \.say \{[\s\S]*line-height:\s*1\.45/);
  assert.match(style, /\.nameplate \.say \{[\s\S]*overflow:\s*visible/);
  assert.match(style, /#nameplates \{[\s\S]*overflow:\s*visible/);
  assert.match(hud, /cullPlatesOverHud/);
});

test('MG-UI-35 hunter plates join NPC declutter and large touch panels stay centered', () => {
  const hud = src('src/ui/hud.js');
  const style = src('src/style.css');
  const mock = src('src/net/worldMock.js');
  assert.match(hud, /if \(el\.classList\.contains\('mon'\)\) continue/);
  assert.doesNotMatch(hud, /contains\('hunter'\)/);
  assert.match(mock, /name: 'Sera'/);
  assert.match(mock, /name: 'Corvin'/);
  assert.match(mock, /name: 'Tamsin'/);
  assert.doesNotMatch(mock, /name: 'Lira'/);
  assert.doesNotMatch(mock, /name: 'Dalla'/);
  assert.doesNotMatch(mock, /name: 'Mira'/);
  assert.match(style, /@media \(min-width: 1024px\) and \(min-height: 640px\) \{[\s\S]*body\.touch #panel \{[\s\S]*align-items:\s*center/);
  assert.match(style, /@media \(min-width: 1024px\) and \(min-height: 640px\) \{[\s\S]*max-width:\s*min\(560px/);
  assert.match(style, /#panel \{[\s\S]*align-items:\s*center[\s\S]*justify-content:\s*center/);
  assert.match(style, /p\.wc-you/);
});

test('MG-UI-36 own bubble nudges off the open chat panel', () => {
  const layout = src('src/ui/hudLayout.js');
  const hud = src('src/ui/hud.js');
  const wv = src('src/net/worldView.js');
  const style = src('src/style.css');
  assert.match(layout, /'world-chat'/);
  assert.match(hud, /nudgeAnchorOffRects/);
  assert.match(hud, /classList.contains\('you'\)/);
  assert.match(wv, /LOCAL_PIN_S = 15/);
  assert.match(wv, /setTimeout/);
  assert.match(wv, /wc-pin/);
  assert.match(style, /\.wc-pin/);
  const chat = { id: 'world-chat', x: 127, y: 126, w: 280, h: 168 };
  const vp = { w: 844, h: 390 };
  const w = 90;
  const h = 28;
  const ax = 200;
  const ay = 180;
  const padded = padHudSafeRects([chat], 16);
  assert.equal(nameplateHitsHud(plateAnchorRect(ax, ay, w, h), padded), true, 'bubble over the open chat hits the padded panel');
  const moved = nudgeAnchorOffRects(ax, ay, w, h, padded, vp);
  assert.equal(moved.moved, true);
  const after = plateAnchorRect(moved.x, moved.y, w, h);
  assert.equal(nameplateHitsHud(after, padded), false, 'nudged bubble misses the chat panel');
  assert.equal(nameplateOutsideViewport(after, vp), false, 'nudged bubble stays on screen');
});
