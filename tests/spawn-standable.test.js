import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { Spawner, STAND_MAX_H } from '../src/entities/monsters.js';
import { ZONE } from '../src/world/terrain.js';

/** A peak at height 10 around (118, 60) inside open meadow at height 3. */
function world() {
  return {
    playable: () => true,
    heightAt: (x, z) => (Math.hypot(x - 118, z - 60) < 3 ? 10 : 3),
    zoneAt: () => ZONE.FIELD,
  };
}
const spawner = () => Object.assign(Object.create(Spawner.prototype), { game: { world: world() } });

test('a fixed spawn on ground a monster cannot walk is moved to the nearest walkable spot', () => {
  const s = spawner();
  assert.ok(STAND_MAX_H < 9, 'below the step-up cap in groundOk');
  assert.equal(s.standable(118, 60), false, 'the peak is above the climb cap');
  assert.equal(s.standable(130, 60), true);
  const at = s.nearestStandable(118, 60);
  assert.ok(at, 'a nearby spot exists');
  assert.equal(s.standable(at.x, at.z), true);
  const d = Math.hypot(at.x - 118, at.z - 60);
  assert.ok(d >= 3 && d <= 4, `closest ring off the peak (${d.toFixed(2)})`);
});

test('populate checks each fixed spot before spawning there', () => {
  const src = readFileSync(new URL('../src/entities/monsters.js', import.meta.url), 'utf8');
  assert.match(src, /const at = this\.standable\(x, z\) \? \{ x, z \} : this\.nearestStandable\(x, z\) \|\| \{ x, z \};\n\s*this\.spawn\(t, at\.x, at\.z, false\);/);
});
