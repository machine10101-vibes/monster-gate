import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GEAR, WEAPON_ORDER } from '../src/data/catalog.js';
import { minimapArrowAngle } from '../src/ui/hud.js';
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
  assert.match(theme, /body\.touch #dialog \{[\s\S]*max-height:\s*calc\(100dvh/);
  assert.match(theme, /#dialog \{[\s\S]*--hud-clear-bottom/);
  assert.match(theme, /body\.touch #dialog \{[\s\S]*--hud-clear-bottom/);
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
  assert.match(theme, /body\.touch #touch-btns \{[\s\S]*--menu-col-w/);
});

test('MG-UI-13 nameplates sit below windows and hide while a window is open', () => {
  const theme = src('src/ui/theme.css');
  assert.match(theme, /#nameplates \{[\s\S]*z-index:\s*8/);
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
