import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FISH, GOODS, ROCKS } from '../src/data/gathering.js';
import { QUESTS, questById } from '../src/data/quests.js';
import { Journal } from '../src/systems/journal.js';
import { trainingSpots } from '../src/world/gatherSite.js';
import { originOf, TILES } from '../src/world/tiles.js';

const MINE = ['coalbed', 'mithrilvein', 'adamitevein', 'cindermetal', 'frostmetal', 'minecap'];
const FISH_CHAIN = ['troutline', 'silverminnow', 'salmonrun', 'tunadock', 'icepike', 'flatfish', 'sturgeonhole', 'sharkline', 'fishcap'];

function stub(levels = {}, goods = {}) {
  return {
    data: { journal: null },
    good(id) {
      return goods[id] || 0;
    },
    takeGood() {
      return true;
    },
    level(id) {
      return levels[id] ?? 1;
    },
    save() {},
  };
}

function done(journal, id) {
  journal.state.quests[id] = { started: true, done: true, step: 9, n: 0, pages: [], unseen: false, choice: null };
}

test('quest ids stay unique with the skill ladders added', () => {
  const ids = QUESTS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(questById('deepdig').requires, ['pit']);
  assert.deepEqual(questById('burntpan').requires, ['lira']);
});

test('mining quests walk every rock after iron, then the skill cap', () => {
  const rocks = Object.values(ROCKS)
    .filter((r) => r.level > 15)
    .sort((a, b) => a.level - b.level);
  assert.equal(rocks.length, MINE.length - 1);
  let prev = 'deepdig';
  for (let i = 0; i < rocks.length; i++) {
    const q = questById(MINE[i]);
    const rock = rocks[i];
    assert.equal(q.series, 'mining');
    assert.equal(q.giver, 'Bram');
    assert.deepEqual(q.requires, [prev]);
    const level = q.steps.find((s) => s.kind === 'level');
    const hold = q.steps.find((s) => s.kind === 'hold');
    assert.equal(level.skill, 'mining');
    assert.equal(level.level, rock.level);
    assert.equal(hold.goods[0].id, rock.ore);
    assert.ok(GOODS[rock.ore], rock.ore);
    assert.ok(q.steps.findIndex((s) => s.kind === 'level') < q.steps.findIndex((s) => s.kind === 'hold'));
    assert.equal(q.steps[0].kind, 'talk');
    assert.equal(q.steps[0].npc, 'smith');
    prev = q.id;
  }
  const cap = questById('minecap');
  assert.deepEqual(cap.requires, ['frostmetal']);
  assert.equal(cap.steps.find((s) => s.kind === 'level').level, 99);
  assert.equal(cap.steps.some((s) => s.kind === 'hold'), false);
  assert.equal(cap.steps.at(-1).npc, 'smith');
});

test('fishing quests walk every catch after shrimp, then the skill cap', () => {
  const fish = Object.values(FISH)
    .filter((f) => f.level > 1)
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
  assert.equal(fish.length, FISH_CHAIN.length - 1);
  let prev = 'burntpan';
  for (let i = 0; i < fish.length; i++) {
    const q = questById(FISH_CHAIN[i]);
    const f = fish[i];
    assert.equal(q.series, 'fishing');
    assert.equal(q.giver, 'Lira');
    assert.deepEqual(q.requires, [prev]);
    const level = q.steps.find((s) => s.kind === 'level');
    const hold = q.steps.find((s) => s.kind === 'hold');
    assert.equal(level.skill, 'fishing');
    assert.equal(level.level, f.level);
    assert.equal(hold.goods[0].id, f.id);
    assert.ok(GOODS[f.id], f.id);
    assert.ok(q.steps.findIndex((s) => s.kind === 'level') < q.steps.findIndex((s) => s.kind === 'hold'));
    assert.equal(q.steps[0].npc, 'alchemist');
    prev = q.id;
  }
  const cap = questById('fishcap');
  assert.deepEqual(cap.requires, ['sharkline']);
  assert.equal(cap.steps.find((s) => s.kind === 'level').level, 99);
  assert.equal(cap.steps.some((s) => s.kind === 'hold'), false);
});

test('a mining level step waits, then the ore in the bag finishes the tier', () => {
  const spots = trainingSpots();
  const low = new Journal(stub({ mining: 12 }));
  done(low, 'deepdig');
  assert.ok(low.start('coalbed'));
  assert.equal(low.finishTalk('coalbed').ok, true);
  const visit = low.pulse(spots.deepwell, spots);
  assert.ok(visit.some((e) => e.advance));
  assert.equal(questById('coalbed').steps[low.row('coalbed').step].kind, 'level');
  assert.equal(low.pulse(spots.deepwell, spots).length, 0);
  const obj = low.objective('coalbed');
  assert.equal(obj.n, 12);
  assert.equal(obj.total, 30);
  assert.match(obj.text, /Mining level 30/);

  const high = new Journal(stub({ mining: 30 }, { coal: 1 }));
  done(high, 'deepdig');
  high.start('coalbed');
  high.finishTalk('coalbed');
  high.pulse(spots.deepwell, spots);
  const q = questById('coalbed');
  assert.equal(q.steps[high.row('coalbed').step].kind, 'talk');
  assert.equal(high.objective('coalbed').text, 'Return to Bram');
});

test('standing at any titanium seam counts, and a far slope does not', () => {
  const spots = trainingSpots();
  const journal = new Journal(stub());
  done(journal, 'deepdig');
  done(journal, 'coalbed');
  done(journal, 'mithrilvein');
  done(journal, 'adamitevein');
  journal.start('cindermetal');
  journal.finishTalk('cindermetal');
  const far = { x: spots.cinderfall[0].x + 80, z: spots.cinderfall[0].z };
  assert.equal(journal.pulse(far, spots).length, 0);
  const hit = journal.pulse(spots.cinderfall[1], spots);
  assert.ok(hit.some((e) => e.advance));
});

test('the tracker keeps the story line, then shows the skill closest to its next level', () => {
  const story = new Journal(stub({ mining: 29, fishing: 33 }));
  done(story, 'deepdig');
  done(story, 'burntpan');
  story.start('coalbed');
  story.finishTalk('coalbed');
  const line = story.tracker({ text: 'board', n: 0, total: 1 });
  assert.match(line.text, /Gate|gate|creature|Mira|guild|slay|Slay|board/i);
  assert.equal(line.text.includes('Mining'), false);

  const grind = new Journal(stub({ mining: 20, fishing: 33 }));
  for (const id of ['restless', 'board', 'pit', 'lira', 'fence', 'shiny', 'mark', 'deepdig', 'burntpan', 'keepassault']) done(grind, id);
  for (const id of MINE.slice(0, -1)) done(grind, id);
  for (const id of FISH_CHAIN.slice(0, -2)) done(grind, id);
  grind.start('minecap');
  grind.finishTalk('minecap');
  grind.start('sharkline');
  grind.finishTalk('sharkline');
  const spots = trainingSpots();
  grind.pulse(spots.pirate, spots);
  const shown = grind.tracker({ text: 'board', n: 0, total: 1 });
  assert.match(shown.text, /Fishing level 34/);
  assert.equal(shown.n, 33);
  assert.equal(shown.total, 34);
});

test('training spots sit on the tiles that hold those rocks and fish', () => {
  const spots = trainingSpots();
  const box = (kind, point) => {
    const tile = TILES.find((t) => t.kind === kind);
    assert.ok(tile, kind);
    const o = originOf(tile);
    const pts = Array.isArray(point) ? point : [point];
    assert.ok(pts.length > 0, kind);
    for (const s of pts) {
      assert.ok(Number.isFinite(s.x) && Number.isFinite(s.z), kind);
      assert.ok(s.x >= o.x && s.x < o.x + 144, `${kind} x ${s.x}`);
      assert.ok(s.z >= o.z && s.z < o.z + 144, `${kind} z ${s.z}`);
    }
  };
  box('deepwell', spots.deepwell);
  box('cinderfall', spots.cinderfall);
  box('glimmerfrost', spots.platinum);
  box('glimmerfrost', spots.icehole);
  box('oakhollow', spots.lake);
  box('pirateshore', spots.pirate);
  assert.ok(Number.isFinite(spots.river.x) && spots.river.z > 144);
});
