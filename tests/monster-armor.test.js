import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VoxelModel } from '../src/engine/voxel.js';
import { painterFor } from '../src/entities/armorSets.js';
import { BEAST_SETS, PLATE_SIGNATURES } from '../src/entities/armorBeasts.js';

const MONSTER_SOFT = ['budgeleather', 'budgecloth', 'darkleather', 'darkcloth', 'volcanumleather', 'volcanumcloth', 'yetileather', 'yeticloth', 'raptorleather', 'raptorcloth', 'rexleather', 'rexcloth'];
const MONSTER_PLATE = ['budgeset', 'darksyceset', 'volcanumset', 'yetiset', 'rexset'];

/** The set of filled voxels each painter produces on an empty canvas, as a string key set. */
function shapes(id) {
  const p = painterFor(id);
  const H = new VoxelModel(20, 24, 20);
  p.paintHelm(H, (r) => r + 1);
  const T = new VoxelModel(26, 56, 18);
  p.paintChest(T, (y) => y + 16);
  const A = new VoxelModel(14, 30, 14);
  p.paintArm(A, (x, y, z, c, g) => A.set(x, y, z, c, g));
  const L = new VoxelModel(14, 30, 16);
  p.paintLeg((x, y, z, c, g) => L.set(x, y, z, c, g), { legs: true, boots: true });
  const keys = (M) => {
    const s = new Set();
    for (let z = 0; z < M.sz; z++) for (let y = 0; y < M.sy; y++) for (let x = 0; x < M.sx; x++) if (M.has(x, y, z)) s.add(`${x},${y},${z}`);
    return s;
  };
  return { helm: keys(H), chest: keys(T), arm: keys(A), leg: keys(L) };
}

const diff = (a, b) => {
  let d = 0;
  for (const k of a) if (!b.has(k)) d++;
  for (const k of b) if (!a.has(k)) d++;
  return d;
};

test('every monster leather, cloth and plate set has its own painter', () => {
  for (const id of [...MONSTER_SOFT, 'rexset']) assert.ok(BEAST_SETS.includes(id), `${id} is bespoke`);
  for (const id of ['budgeset', 'darksyceset', 'volcanumset', 'yetiset']) assert.ok(PLATE_SIGNATURES[id], `${id} has a signature`);
  for (const id of [...MONSTER_SOFT, ...MONSTER_PLATE]) assert.ok(painterFor(id), id);
});

test('no two monster sets share a silhouette: helm, chest and arm shapes all differ', () => {
  const all = [...MONSTER_SOFT, ...MONSTER_PLATE];
  const S = Object.fromEntries(all.map((id) => [id, shapes(id)]));
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const a = S[all[i]];
      const b = S[all[j]];
      for (const part of ['helm', 'chest', 'arm']) {
        assert.ok(diff(a[part], b[part]) >= 40, `${all[i]} and ${all[j]} ${part} differ by ${diff(a[part], b[part])} voxels`);
      }
    }
});

test('bespoke sets never paint black holes and cover the hunter belt, sleeves and boots', () => {
  for (const id of BEAST_SETS) {
    const p = painterFor(id);
    const T = new VoxelModel(26, 56, 18);
    p.paintChest(T, (y) => y + 16);
    const A = new VoxelModel(14, 30, 14);
    p.paintArm(A, (x, y, z, c, g) => A.set(x, y, z, c, g));
    const L = new VoxelModel(14, 30, 16);
    p.paintLeg((x, y, z, c, g) => L.set(x, y, z, c, g), { legs: true, boots: true });
    for (const M of [T, A, L])
      for (let i = 0; i < M.data.length; i++) if (M.data[i]) assert.notEqual(M.data[i] & 0xffffff, 0, `${id} painted pure black at ${i}`);
    // Belt band, upper arm and shin are all painted by the set itself.
    assert.ok(T.has(12, 16 + 2, 15), `${id} covers the belt buckle`);
    assert.ok(A.has(2, 18, 6) && A.has(1, 24, 6), `${id} covers the sleeve and shoulder`);
    assert.ok(L.has(2, 8, 6) && L.has(2, 18, 6), `${id} covers shin and thigh`);
  }
});
