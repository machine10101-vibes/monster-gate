import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { World, LEDGE_DROP } from '../src/world/world.js';

/** A one-step terrace: height 3 for x < 10, height 2 beyond. */
const terrace = { heightAt: (x) => (x < 10 ? 3 : 2) };
const overLedge = (x, z, r) => World.prototype.overLedge.call(terrace, x, z, r);

test('a prop whose base would hang over a terrace step is detected; one fully on top is not', () => {
  assert.equal(LEDGE_DROP, 0.6);
  assert.equal(overLedge(8, 5, 0.5), false, 'well back from the edge');
  assert.equal(overLedge(9.7, 5, 0.5), true, 'half the base over the step');
  assert.equal(overLedge(10.4, 5, 0.5), false, 'on the lower terrace, its base is supported');
  // A shallow slope (less than LEDGE_DROP) is fine.
  const slope = { heightAt: (x) => x * 0.2 };
  assert.equal(World.prototype.overLedge.call(slope, 5, 5, 0.6), false);
});

test('scattered detail, trees, rocks and regional dressing all leave a ledge spot empty', () => {
  const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  const world = src('src/world/world.js');
  assert.match(world, /if \(this\.overLedge\(x, z, 0\.45 \* scale\)\) return;\n\s*this\.putAt\(parts, x, z, rot, scale\);/, 'trees');
  assert.match(world, /if \(this\.overLedge\(x, z, 0\.45 \* s\)\) return;\n\s*this\.putAt\(pick, x, z, rot, s\);/, 'rocks');
  assert.ok((world.match(/this\.putOnGround\(/g) || []).length >= 20, 'ground cover and detail');
  // A skipped bush or stump leaves no invisible collider behind.
  assert.match(world, /if \(this\.putOnGround\(pickOf\(m\.bushes\), x, z, rot, 1\.1\)\) \{\n\s*this\.occupy/);
  for (const f of ['src/world/jungle.js', 'src/world/arctic.js', 'src/world/volcanic.js', 'src/world/desert.js', 'src/world/ring.js', 'src/world/southford.js']) {
    assert.match(src(f), /world\.overLedge\(/, f);
  }
});
