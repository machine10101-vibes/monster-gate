import { test } from 'node:test';
import assert from 'node:assert/strict';

// A small in-memory localStorage so the roster can save characters.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
  clear: () => store.clear(),
};

const { Roster } = await import('../src/systems/roster.js');
const { CLASS_STARTER_ARMOR, starterLook, GEAR } = await import('../src/data/catalog.js');
const { painterFor } = await import('../src/entities/armorSets.js');

test('each class starts dressed for its role', () => {
  const r = new Roster('starter-test', 'tester');
  const want = { warrior: 'recruitplate', paladin: 'squiremail', ranger: 'noviceleather', mage: 'novicecloth' };
  for (const [classId, set] of Object.entries(want)) {
    const c = r.create({ name: `Hunter ${classId}`, look: {}, classId });
    const armor = r.summary(c.id).armor;
    for (const slot of ['chest', 'arms', 'legs', 'boots']) assert.equal(armor[slot], set, `${classId} ${slot}`);
  }
});

test('starter pieces are issued gear with a painter, and the preview matches', () => {
  for (const [classId, ids] of Object.entries(CLASS_STARTER_ARMOR)) {
    const look = starterLook(classId);
    for (const id of ids) {
      const g = GEAR.find((x) => x.id === id);
      assert.ok(g && g.starter && g.found, id);
      assert.equal(look[g.slot], g.set);
      assert.ok(painterFor(g.set), `${g.set} has a painter`);
    }
  }
});

test('new characters receive their class weapon and ranger ammunition', () => {
  const r = new Roster('starter-weapons-test', 'tester');
  for (const [classId, held] of Object.entries({ paladin: 'ironhammer', mage: 'wand', ranger: 'bow', warrior: 'blade' })) {
    const c = r.create({ name: 'New ' + classId, look: {}, classId });
    assert.equal(r.summary(c.id).held, held);
  }
});
