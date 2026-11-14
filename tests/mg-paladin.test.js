import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CLASS_LIST, CLASSES, SKILLS } from '../src/data/skills.js';
import { buildProjectileMesh } from '../src/systems/skillfx.js';
import { castSkill, skillMods, skillOnHit } from '../src/systems/skillcast.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const ACTIVES = ['layhands', 'smite', 'consecration', 'crusader', 'judgment', 'divinestorm', 'faithshield', 'avengershield', 'divineprotection'];

test('paladin can be created with holy, juggernaut, and defender trees', () => {
  const pal = CLASSES.paladin;
  assert.equal(CLASS_LIST.length, 4);
  assert.ok(CLASS_LIST.includes(pal));
  assert.equal(pal.name, 'Paladin');
  assert.equal(pal.resource, 'mana');
  assert.deepEqual(pal.paths.map((p) => p.name), ['Holy', 'Juggernaut', 'Defender']);
  assert.equal(Object.keys(SKILLS).length, 60);
  for (const path of pal.paths) {
    assert.equal(path.skills.length, 5);
    assert.deepEqual(path.skills.map((s) => s.kind), ['passive', 'active', 'special', 'passive', 'special']);
    for (const skill of path.skills) {
      assert.equal(SKILLS[skill.id].classId, 'paladin');
      assert.equal(SKILLS[skill.id].res, 'mana');
      assert.equal(SKILLS[skill.id].pathId, path.id);
    }
  }
  assert.deepEqual(pal.weapons.map((w) => w.id), ['swordshield', 'twohand', 'smitearm']);
  assert.deepEqual(pal.attributes.map((a) => a.id), ['faith', 'grace', 'valor', 'resolve']);
});

test('paladin actives have casts, holy projectiles, and body animations', () => {
  const cast = src('../src/systems/skillcast.js');
  const fx = src('../src/systems/skillfx.js');
  const pose = src('../src/entities/player.js');
  for (const id of ACTIVES) assert.match(cast, new RegExp(`case '${id}':`));
  for (const name of ACTIVES) assert.match(fx, new RegExp(`${name}\\(game`));
  for (const anim of ['heal', 'smite', 'cleave', 'guard']) assert.match(pose, new RegExp(`castAnim === '${anim}'`));
  const bolt = buildProjectileMesh({ skill: 'smite', kind: 'holybolt' });
  const shield = buildProjectileMesh({ skill: 'avengershield', kind: 'holyshield' });
  assert.ok(bolt.children.length >= 2);
  assert.ok(shield.children.length >= 4);
  const tree = src('../src/ui/skilltree.js');
  assert.match(tree, /cross:/);
  assert.match(tree, /hammer:/);
  assert.match(tree, /smitearm: 'hammer'/);
  const css = src('../src/style.css');
  assert.match(css, /\.cs-classes \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.sk-pick \{\s*display: grid;\s*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
});

function paladinGame(learned, extra = {}) {
  const floats = [];
  const spawned = [];
  const casts = [];
  const added = [];
  const vfx = {
    density: 1,
    n: () => 4,
    glow() {},
    glowNow() {},
    ring() {},
    sparks() {},
    spark() {},
    prism() {},
    flash() {},
    streak() {},
    slashArc() {},
    dome() {},
    add() {},
    scorch() {},
  };
  const player = {
    dead: false,
    state: 'idle',
    cds: {},
    mana: 200,
    maxMana: 200,
    hp: 30,
    maxHp: 100,
    fury: 0,
    stamina: 80,
    shielding: !!extra.shielding,
    pos: { x: 0, y: 0, z: 0 },
    facing: { x: 0, y: 0, z: 1 },
    faithT: 0,
    faithDr: 0,
    faithHeal: 0,
    playCast(kind) { casts.push(kind); },
    heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); },
  };
  const game = {
    player,
    monsters: extra.monsters || [],
    items: extra.items || [null],
    sel: extra.sel ?? null,
    rank: 0,
    time: 1,
    vfx,
    fx: { emit() {}, dust() {} },
    scene: { add(mesh) { added.push(mesh); }, remove() {} },
    world: { heightAt: () => 0 },
    audio: { tone() {} },
    hud: { toast() {}, floatText(_x, _y, text) { floats.push(text); } },
    screenOf: () => [0, 0],
    shake() {},
    strikeMonster(mon, dmg) {
      mon.hp -= dmg;
      if (mon.hp <= 0) mon.dead = true;
    },
    spawnProjectile(o) { spawned.push(o); },
    progress: {
      classId: 'paladin',
      hasSkill: (id) => learned.has(id),
      level: () => 1,
      attrRank: (id) => (extra.attrs && extra.attrs[id]) || 0,
      weaponRank: (id) => (extra.weapons && extra.weapons[id]) || 0,
      gearBonus: { stamina: 0, spell: 0, ranged: 0, crit: 0 },
      bookWorn: false,
      skillPoints: () => ({ spent: extra.spent || 0 }),
    },
    floats,
    spawned,
    casts,
    added,
  };
  return game;
}

test('holy, juggernaut, and defender skills cast with the right motions', () => {
  const learned = new Set(['layhands', 'smite', 'consecration', 'crusader', 'judgment', 'divinestorm', 'faithshield', 'avengershield', 'divineprotection', 'beacon', 'reckoning', 'zeal']);
  const foe = { dead: false, x: 0, z: 1.3, y: 0, radius: 0.4, hp: 400, maxHp: 400, afflict(kind, t) { this[kind] = t; } };
  const game = paladinGame(learned, {
    monsters: [foe],
    items: [{ style: 'twohand' }],
    sel: 0,
  });
  assert.equal(castSkill(game, 'devotion'), false);
  const before = game.player.hp;
  assert.equal(castSkill(game, 'layhands'), true);
  assert.ok(game.player.hp > before + 20);
  assert.deepEqual(game.casts.at(-1), 'heal');

  assert.equal(castSkill(game, 'smite'), true);
  assert.equal(game.spawned.at(-1).kind, 'holybolt');
  assert.equal(game.spawned.at(-1).skill, 'smite');
  assert.equal(game.casts.at(-1), 'smite');

  assert.equal(castSkill(game, 'consecration'), true);
  assert.equal(game.added.length, 1);
  assert.equal(game.casts.at(-1), 'heal');

  const hp = foe.hp;
  assert.equal(castSkill(game, 'crusader'), true);
  assert.ok(foe.hp < hp);
  assert.equal(game.casts.at(-1), 'cleave');

  const mid = foe.hp;
  assert.equal(castSkill(game, 'judgment'), true);
  assert.ok(foe.hp < mid);
  assert.equal(game.casts.at(-1), 'smite');

  const low = foe.hp;
  assert.equal(castSkill(game, 'divinestorm'), true);
  assert.ok(foe.hp < low);
  assert.equal(game.casts.at(-1), 'spin');

  assert.equal(castSkill(game, 'faithshield'), true);
  assert.ok(game.player.faithT >= 4);
  assert.ok(game.player.faithDr >= 0.28);
  assert.equal(game.casts.at(-1), 'guard');

  assert.equal(castSkill(game, 'avengershield'), true);
  assert.equal(game.spawned.at(-1).kind, 'holyshield');
  assert.equal(game.casts.at(-1), 'bash');

  assert.equal(castSkill(game, 'divineprotection'), true);
  assert.ok(game.player.faithT >= 6);
  assert.ok(game.player.faithDr >= 0.4);
  assert.ok(game.player.faithHeal >= 3);
  assert.equal(game.casts.at(-1), 'guard');
});

test('smite mends the paladin and the holy passives raise spell, melee, and guard', () => {
  const learned = new Set(['devotion', 'beacon', 'zeal', 'aegis', 'sanctuary', 'smite']);
  const game = paladinGame(learned, { weapons: { smitearm: 2 }, attrs: { faith: 1, grace: 1, resolve: 1 }, shielding: true });
  const mods = skillMods(game);
  assert.ok(mods.spell > 1.3);
  assert.ok(mods.melee > 1.15);
  assert.ok(mods.dr > 0.15);
  assert.ok(mods.hp >= 20);
  assert.ok(mods.mana >= 14);
  const before = game.player.hp;
  skillOnHit(game, { skill: 'smite', spell: true, dmg: 20, mesh: { position: { x: 1, y: 1, z: 1 } } }, { dead: false, afflict() {} });
  assert.ok(game.player.hp > before);
  let stun = 0;
  skillOnHit(game, { skill: 'avengershield', spell: true, dmg: 11, mesh: { position: { x: 0, y: 1, z: 0 } } }, {
    dead: false,
    afflict(kind, t) { if (kind === 'stun') stun = t; },
  });
  assert.ok(stun > 1.2);
});
