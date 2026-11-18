import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Spawner } from '../src/entities/monsters.js';

function makeSpawner() {
  const game = {
    world: {
      chickenNests: [],
      realm: 'over',
      volcanumLair: { x: 120, z: 88 },
    },
    player: { pos: { x: 120, z: 88 } },
    monsters: [],
  };
  const spawner = new Spawner(game);
  spawner.fillChickens = () => {};
  spawner.spawn = (type, x, z) => {
    const monster = { type, x, z, dead: false, home: null };
    game.monsters.push(monster);
    return monster;
  };
  return { game, spawner };
}

test('lightweight startup spawns Volcanum on the first world update, even at his lair', () => {
  const { game, spawner } = makeSpawner();

  spawner.populate(true);
  assert.equal(game.monsters.some((m) => m.type === 'volcanum'), false);

  spawner.fillVolcanum();
  const dragon = game.monsters.find((m) => m.type === 'volcanum');
  assert.ok(dragon, 'Volcanum should not be omitted by the lightweight startup path');
  assert.deepEqual(dragon.home, { x: 120, z: 88 });
});

test('Volcanum keeps the delayed, safe respawn after he has first spawned', () => {
  const { game, spawner } = makeSpawner();
  spawner.volcanumSpawned = true;
  const corpse = { type: 'volcanum', dead: true };
  game.monsters.push(corpse);

  for (let i = 0; i < 90; i++) spawner.fillVolcanum();
  assert.equal(game.monsters.filter((m) => m.type === 'volcanum' && !m.dead).length, 0);

  game.player.pos.x = 160;
  game.player.pos.z = 88;
  spawner.fillVolcanum();
  assert.equal(game.monsters.filter((m) => m.type === 'volcanum' && !m.dead).length, 1);
});
