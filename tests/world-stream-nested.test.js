import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { World } from '../src/world/world.js';

// A mesh inside a placed group (like a rune gate) must come back near the hunter
// once it was parked, even though its parent is detached while it waits.
test('parked children of a placed group are revealed where the group stands', () => {
  const ctx = { group: new THREE.Group(), cave: null, rift: null, parked: [] };
  const gate = new THREE.Group();
  gate.position.set(104, 3, 188);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshBasicMaterial());
  gate.add(mesh);
  ctx.group.add(gate);

  World.prototype.parkBeyond.call(ctx, 800, 800, 100);
  assert.equal(gate.children.length, 0, 'far gate part is parked');

  World.prototype.revealAround.call(ctx, 96, 188, 24);
  assert.equal(gate.children.length, 1, 'gate part returns when the hunter walks up');
});
