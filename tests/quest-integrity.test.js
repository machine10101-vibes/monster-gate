import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { QUESTS, questById } from '../src/data/quests.js';
import { GOODS } from '../src/data/gathering.js';
import { MONSTER_BUILDERS } from '../src/entities/monsters.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/** Every id a person in the world answers to: Oakhollow folk and Gilantre's people. */
function npcIds() {
  const ids = new Set();
  for (const file of ['src/entities/ambient.js', 'src/world/gilantre.js']) {
    for (const m of src(file).matchAll(/\bid: '([a-z_]+)'/g)) ids.add(m[1]);
  }
  return ids;
}

/** Places the journal checks for "visit" steps, read from the pulse map in main.js. */
function questSpots() {
  const main = src('src/main.js');
  const at = main.indexOf('this.journal.pulse(this.player.pos, {');
  assert.ok(at > 0, 'the journal pulse map is wired');
  const block = main.slice(at, main.indexOf('}));', at));
  return new Set([...block.matchAll(/^\s*([a-z]+):/gm)].map((m) => m[1]));
}

test('every quest step points at something that exists in the world', () => {
  const npcs = npcIds();
  const spots = questSpots();
  const problems = [];
  for (const q of QUESTS) {
    for (const r of q.requires || []) if (!questById(r)) problems.push(`${q.id}: requires unknown quest ${r}`);
    q.steps.forEach((s, i) => {
      const where = `${q.id} step ${i + 1} (${s.kind})`;
      if (!s.objective) problems.push(`${where}: no objective text`);
      if (s.kind === 'talk' && !npcs.has(s.npc)) problems.push(`${where}: nobody called ${s.npc}`);
      if (s.kind === 'visit' && !spots.has(s.spot)) problems.push(`${where}: no place called ${s.spot}`);
      if (s.kind === 'kill') {
        if (!(s.count > 0)) problems.push(`${where}: kill count`);
        for (const t of s.types || []) if (!MONSTER_BUILDERS[t]) problems.push(`${where}: no monster ${t}`);
        for (const t of s.exclude || []) if (!MONSTER_BUILDERS[t]) problems.push(`${where}: excludes unknown ${t}`);
      }
      if (s.kind === 'hold') {
        if (!s.goods?.length) problems.push(`${where}: nothing to hold`);
        for (const g of [...(s.goods || []), ...(s.also || [])]) if (!GOODS[g.id]) problems.push(`${where}: no item ${g.id}`);
      }
      for (const d of [s.deliver, s.alsoDeliver].filter(Boolean)) {
        if (!GOODS[d.id]) problems.push(`${where}: delivers unknown ${d.id}`);
        if (!s.lack) problems.push(`${where}: no line for when the hunter lacks ${d.id}`);
      }
      if (s.choices) for (const c of s.choices) if (!c.id) problems.push(`${where}: choice without id`);
    });
  }
  assert.deepEqual(problems, []);
});

test('every quest can be reached: requirements form a chain back to the opening quest', () => {
  const done = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const q of QUESTS) {
      if (done.has(q.id)) continue;
      if ((q.requires || []).every((r) => done.has(r))) {
        done.add(q.id);
        grew = true;
      }
    }
  }
  assert.deepEqual(QUESTS.filter((q) => !done.has(q.id)).map((q) => q.id), [], 'no quest is locked behind a missing or circular requirement');
  assert.ok(QUESTS.some((q) => !(q.requires || []).length), 'at least one quest starts without requirements');
});
