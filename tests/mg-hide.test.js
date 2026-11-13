import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { hideRadiusPx } from '../src/engine/materials.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => readFileSync(join(root, rel), 'utf8');

test('MG-UI-40: occlusion hole hugs the hero instead of a screen-sized dither blob', () => {
  const phone = hideRadiusPx(844, 390);
  const desk = hideRadiusPx(1280, 800);
  const retina = hideRadiusPx(2560, 1440, 400);
  assert.ok(phone <= 390 * 0.12, `844 landscape ${phone}`);
  assert.ok(desk <= 800 * 0.12, `1280 desk ${desk}`);
  assert.ok(retina <= 1440 * 0.12, `retina zoomed ${retina}`);
  assert.ok(phone >= 28 && desk >= 28);
  // Old formula punched a 180px+ Bayer circle (~42% of the short side).
  assert.ok(phone < 180 && desk < 180);
  assert.ok(phone < Math.min(844, 390) * 0.42);
  assert.ok(desk < Math.min(1280, 800) * 0.42);
  assert.equal(hideRadiusPx(1280, 800, 80), Math.min(80 * 1.2, 800 * 0.12));
});

test('MG-UI-40: terrain stays solid; hide only punches solid and cover', () => {
  const world = src('src/world/world.js');
  const main = src('src/main.js');
  const mats = src('src/engine/materials.js');
  assert.match(world, /terrain:\s*toonMaterial\(/);
  assert.doesNotMatch(world, /terrain:\s*patchHide\(/);
  assert.match(world, /solid:\s*patchHide\(/);
  assert.match(world, /cover:\s*patchHide\(/);
  assert.match(main, /hideRadiusPx\(/);
  assert.doesNotMatch(main, /Math\.max\(180,\s*Math\.min\(cw,\s*ch\)\s*\*\s*0\.42\)/);
  assert.doesNotMatch(mats, /floor\(gl_FragCoord\.xy \/ 2\.0\)/);
  assert.doesNotMatch(mats, /dlt\.y \*= 0\.62/);
});
