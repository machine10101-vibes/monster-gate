import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { LOOK_SWIPE_RAD, inStickZone, lookRadiansPerPixel } from '../src/engine/input.js';

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
