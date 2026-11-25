import test from 'node:test';
import assert from 'node:assert/strict';
import { hitReactionPose } from '../src/entities/monsters.js';

test('enemy hit reactions lean away from the incoming impact direction', () => {
  const front = hitReactionPose(0, 1, 0, 1);
  assert.ok(front.pitch < 0);
  assert.equal(front.roll, 0);
  const right = hitReactionPose(1, 0, 0, 1);
  assert.ok(right.roll < 0);
  assert.ok(right.twist > 0);
});

test('enemy hit reactions scale with impact weight and normalize direction', () => {
  const light = hitReactionPose(2, 0, 0, 0.5);
  const heavy = hitReactionPose(2, 0, 0, 1);
  assert.ok(Math.abs(heavy.roll) > Math.abs(light.roll));
  const unit = hitReactionPose(1, 0, 0, 1);
  const doubled = hitReactionPose(2, 0, 0, 1);
  assert.deepEqual(doubled, unit);
});

test('enemy hit reactions stay finite for zero-direction impacts', () => {
  const pose = hitReactionPose(0, 0, 1.2, 1);
  for (const value of Object.values(pose)) assert.ok(Number.isFinite(value));
});
