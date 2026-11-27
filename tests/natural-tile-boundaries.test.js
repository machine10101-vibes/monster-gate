import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRing } from '../src/world/ring.js';
import { generateWorld, W } from '../src/world/terrain.js';

test('meadow tile edges do not gain enclosing mountain walls', () => {
  const flat = { H: new Float32Array(W * W).fill(3) };
  const lands = generateRing(flat, flat);
  for (const kind of ['northleas', 'harefield', 'goldmead', 'brookside']) {
    const { H } = lands.find(l => l.kind === kind).data;
    for (let x = 20; x < W - 20; x++) assert.ok(H[x] < 8, `${kind} north rim at ${x}`);
  }
});

test('Oakhollow opens into its southern neighbors while retaining local mountains', () => {
  const { H } = generateWorld();
  assert.ok(Math.max(...H.slice((W - 1) * W)) < 8, 'southern boundary has no mountain wall');
  assert.ok(Math.max(...H) > 15, 'authored mountain shoulders retain relief');
});
