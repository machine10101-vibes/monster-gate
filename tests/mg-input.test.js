import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { readTabCamera, writeTabCamera, Input, LOOK_SWIPE_RAD, STRAFE_STORAGE_KEY, inStickZone, lookRadiansPerPixel, readStrafeSetting, writeStrafeSetting } from '../src/engine/input.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => readFileSync(join(root, rel), 'utf8');

test('touch look is 180deg per full-width swipe and does not eat the empty 3D view', () => {
  const phone = { w: 844, h: 390 };
  const gain = lookRadiansPerPixel(phone.w, { touch: true });
  assert.equal(LOOK_SWIPE_RAD, Math.PI);
  assert.ok(Math.abs(gain * phone.w - Math.PI) < 1e-9, 'full-width swipe is 180deg');
  assert.ok(lookRadiansPerPixel(1920, { touch: false }) === 0.006, 'desktop middle-drag keep 0.006');
  assert.equal(inStickZone(80, 300, phone), true, 'bottom-left well is the stick');
  assert.equal(inStickZone(400, 180, phone), false, 'empty center of the 3D view looks');
  assert.equal(inStickZone(100, 40, phone), false, 'upper-left 3D view looks, not stick');
  assert.equal(inStickZone(700, 300, phone), false, 'right side looks / buttons');
  const input = src('src/engine/input.js');
  assert.match(input, /inStickZone/);
  assert.match(input, /lookRadiansPerPixel/);
  assert.doesNotMatch(input, /clientX < w \* 0\.42/);
  assert.doesNotMatch(input, /dx \* 0\.008/);
  assert.match(input, /if \(this\.touch\) return/);
});

test('mouse wheel zooms from the window so HUD overlays do not swallow it', () => {
  const input = src('src/engine/input.js');
  const main = src('src/main.js');
  assert.match(input, /window\.addEventListener\('wheel'/);
  assert.match(input, /#panel, #dialog, #title/);
  assert.match(main, /clamp\(this\.cam\.targetDist \+ inp\.zoomDelta \* 1\.6, 8, 52\)/);
  assert.match(input, /Math\.abs\(e\.deltaY\) \/ 100/);
});


test('strafe preference persists and movement/facing use independent references', () => {
  const values = new Map();
  const store = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(readStrafeSetting(store), false, 'strafe is off by default');
  assert.equal(writeStrafeSetting(true, store), true);
  assert.equal(values.get(STRAFE_STORAGE_KEY), '1');
  assert.equal(readStrafeSetting(store), true);
  assert.equal(writeStrafeSetting(false, store), false);
  assert.equal(readStrafeSetting(store), false);

  const player = src('src/entities/player.js');
  const hud = src('src/ui/hud.js');
  assert.match(player, /const moveYaw = cy;/);
  assert.doesNotMatch(player, /const moveYaw = inp\.strafe/);
  assert.match(player, /addScaledVector\(right, inp\.moveX\)\.addScaledVector\(fwd, -inp\.moveY\)/);
  assert.match(player, /!inp\.touch && inp\.strafe && !inp\.aim\?\.has/);
  assert.match(player, /!inp\.touch && inp\.aim\?\.has && this\.aimDir/);
  assert.match(hud, /id="set-strafe"/);
  assert.match(hud, /writeStrafeSetting\(!game\.input\.strafe\)/);
});


test('teleport interaction waits for release and requires explicit destination confirmation', () => {
  const input = src('src/engine/input.js');
  const tome = src('src/ui/teleport.js');
  assert.match(input, /!\['bolt', 'skill', 'fury', 'talk'\]\.includes\(act\)/);
  assert.match(input, /e\.type === 'pointerup' && act === 'talk'/);
  assert.doesNotMatch(tome, /b\.onclick = \(\) => game\.travelTo/);
  assert.match(tome, /confirm\.disabled = true/);
  assert.match(tome, /if \(!selected\) return/);
  assert.match(tome, /selected = dest/);
});


test('focus loss releases movement, combat and queued actions', () => {
  const input = Object.assign(Object.create(Input.prototype), {
    keys: new Set(['KeyW', 'ShiftLeft']), pressed: new Set(['attack', 'evade']),
    attackHeld: true, shieldBtn: true, drag: true,
    stick: { id: 1, x: 1, y: -1 }, look: { id: 2 },
    moveX: 1, moveY: -1, rotateDelta: 2, zoomDelta: 3, slotSelect: 4,
    resetStick() { this.reset = true; },
  });
  input.releaseControls();
  input.update();
  assert.equal(input.keys.size, 0);
  assert.equal(input.pressed.size, 0);
  assert.equal(input.attackHeld, false);
  assert.equal(input.shieldHeld, false);
  assert.equal(input.drag, false);
  assert.equal(input.stick.id, null);
  assert.equal(input.look.id, null);
  assert.equal(input.moveX, 0);
  assert.equal(input.moveY, 0);
  assert.equal(input.rotateDelta, 0);
  assert.equal(input.zoomDelta, 0);
  assert.equal(input.slotSelect, -1);
  assert.equal(input.reset, true);
});

test('Tab camera preference persists and shares R action only during gameplay', () => {
  const map = new Map();
  const store = { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v) };
  assert.equal(readTabCamera(store), true);
  assert.equal(writeTabCamera(false, store), false);
  assert.equal(readTabCamera(store), false);
  assert.equal(writeTabCamera(true, store), true);
  assert.equal(readTabCamera(store), true);
  assert.match(src('src/engine/input.js'), /if \(!e\.repeat\) this\.press\('rotateR'\)/);
  assert.match(src('src/main.js'), /canTabCamera = \(\) => this\.started/);
  assert.match(src('src/ui/hud.js'), /writeTabCamera\(!game\.input\.tabCamera\)/);
});
