import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildVolcanumDragon } from '../src/entities/volcanum.js';

test('Volcanum exposes independent neck, skull, jaw and articulated limb pivots', () => {
  const model = buildVolcanumDragon();
  const { neck, head, jaw, legs, knees, wings, wingsOuter, tail } = model.parts;

  assert.ok(neck && head && jaw);
  assert.equal(head.parent, neck, 'the skull should pivot independently on the neck');
  assert.equal(jaw.parent, head, 'the jaw should remain independently articulated');
  assert.equal(legs.length, 4, 'Volcanum should have four shoulder/hip pivots');
  assert.equal(knees.length, 4, 'each limb should have a separate elbow/knee pivot');
  assert.equal(wings.length, 2);
  assert.equal(wingsOuter.length, 2, 'each wing should have an independently moving wrist section');
  assert.ok(tail.length >= 4, 'the tail should remain segmented');

  model.root.traverse((object) => {
    if (object.isMesh) {
      assert.ok(object.geometry, 'all voxel mesh parts should have geometry');
    }
  });
});
