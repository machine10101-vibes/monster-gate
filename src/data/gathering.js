/** Skill levels, rocks, trees, fishing spots and the goods they yield. */

export const MAX_LEVEL = 99;

const XP_AT = [0];
{
  let points = 0;
  for (let l = 1; l < MAX_LEVEL; l++) {
    points += Math.floor(l + 300 * Math.pow(2, l / 7));
    XP_AT[l] = Math.floor(points / 4);
  }
}

/** Total XP needed to reach `level` (level 1 needs 0). */
export function xpForLevel(level) {
  return XP_AT[Math.max(0, Math.min(MAX_LEVEL, level) - 1)];
}

export function levelForXp(xp) {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= XP_AT[lvl]) lvl++;
  return lvl;
}

export const SKILL_ORDER = ['strength', 'agility', 'stamina', 'mining', 'fishing', 'woodcutting', 'firemaking'];

export const LEVEL_SKILLS = {
  strength: {
    id: 'strength',
    name: 'Strength',
    color: '#ff6a5a',
    blurb: 'Trained by landing melee blows. Every level adds 1% to melee damage.',
    effect: (lvl) => `+${lvl - 1}% melee damage`,
    unlocks: [
      [1, 'Hunter strength'],
      [10, '+9% melee damage'],
      [25, '+24% melee damage'],
      [50, '+49% melee damage'],
      [99, '+98% melee damage'],
    ],
  },
  agility: {
    id: 'agility',
    name: 'Agility',
    color: '#7cdc6a',
    blurb: 'Trained by running and evading. Every level adds 0.3% to move speed.',
    effect: (lvl) => `+${((lvl - 1) * 0.3).toFixed(1)}% move speed`,
    unlocks: [
      [1, 'Light feet'],
      [10, '+2.7% move speed'],
      [25, '+7.2% move speed'],
      [50, '+14.7% move speed'],
      [99, '+29.4% move speed'],
    ],
  },
  stamina: {
    id: 'stamina',
    name: 'Stamina',
    color: '#f2c542',
    blurb: 'Trained by spending stamina in fights. Every level adds 1 maximum stamina.',
    effect: (lvl) => `+${lvl - 1} max stamina`,
    unlocks: [
      [1, 'Steady lungs'],
      [10, '+9 max stamina'],
      [25, '+24 max stamina'],
      [50, '+49 max stamina'],
      [99, '+98 max stamina'],
    ],
  },
  mining: {
    id: 'mining',
    name: 'Mining',
    color: '#d98a3d',
    blurb: 'Swing a pickaxe in the Greyrock Pit. Higher levels find ore faster and strike more often.',
    effect: (lvl) => `${Math.round(mineChance(ROCKS.copper.base, lvl) * 100)}% ore strike chance`,
    unlocks: [
      [1, 'Copper ore'],
      [1, 'Tin ore'],
      [10, 'Faster strikes'],
      [30, 'Seams run richer'],
    ],
  },
  fishing: {
    id: 'fishing',
    name: 'Fishing',
    color: '#4ec8ff',
    blurb: 'Fish Mirrormere from the dock. Nets catch shrimp, poles land trout.',
    effect: (lvl) => `${Math.round(fishChance(FISH.shrimp, lvl) * 100)}% shrimp catch chance`,
    unlocks: [
      [1, 'Shrimp (small net)'],
      [3, 'Trout (fishing pole)'],
      [15, 'Quicker bites'],
      [30, 'Keener line work'],
    ],
  },
  woodcutting: {
    id: 'woodcutting',
    name: 'Woodcutting',
    color: '#7dcc4a',
    blurb: 'Chop the groves west of Oakhollow with the woodcutter axe. Birch and oak from the start, maple once you are practised.',
    effect: (lvl) => `${Math.round(chopChance(TREES.birch, lvl) * 100)}% birch chop chance`,
    unlocks: [
      [1, 'Birch logs'],
      [1, 'Oak logs'],
      [10, 'Maple logs'],
      [25, 'Quicker chops'],
    ],
  },
  firemaking: {
    id: 'firemaking',
    name: 'Firemaking',
    color: '#ff7a22',
    blurb: 'A tinderbox and logs make a campfire. Light logs from the inventory. Higher levels catch more often.',
    effect: (lvl) => `${Math.round(lightChance(TREES.birch, lvl) * 100)}% birch light chance`,
    unlocks: [
      [1, 'Birch fires'],
      [1, 'Oak fires'],
      [10, 'Maple fires'],
      [25, 'Surer flames'],
    ],
  },
};

export const MINING_SWING = 2.1;
export const FISHING_TICK = 2.6;
export const CHOP_SWING = 2.15;
export const LIGHT_TIME = 2.35;

export const ROCKS = {
  copper: {
    id: 'copper',
    name: 'Copper rock',
    ore: 'copper_ore',
    level: 1,
    xp: 17.5,
    base: 0.5,
    respawn: 11,
    color: 0xe0823a,
    spark: [0xffb066, 0xff8a3a, 0xffe0b0],
  },
  tin: {
    id: 'tin',
    name: 'Tin rock',
    ore: 'tin_ore',
    level: 1,
    xp: 17.5,
    base: 0.5,
    respawn: 11,
    color: 0xc8d4e8,
    spark: [0xe8f2ff, 0xb8c8e0, 0xffffff],
  },
};

export const FISH = {
  shrimp: {
    id: 'shrimp',
    name: 'Shrimp',
    tool: 'net',
    toolName: 'small net',
    level: 1,
    xp: 10,
    base: 0.45,
  },
  trout: {
    id: 'trout',
    name: 'Trout',
    tool: 'rod',
    toolName: 'fishing pole',
    level: 3,
    xp: 50,
    base: 0.32,
  },
};

export const TREES = {
  birch: {
    id: 'birch',
    name: 'Birch',
    log: 'birch_logs',
    level: 1,
    xp: 25,
    base: 0.62,
    respawn: 9,
    fireLevel: 1,
    fireXp: 40,
    burn: 48,
    chip: [0xf4efe4, 0xe4dcc4, 0xc6dc6a],
  },
  oak: {
    id: 'oak',
    name: 'Oak',
    log: 'oak_logs',
    level: 1,
    xp: 37.5,
    base: 0.4,
    respawn: 15,
    fireLevel: 1,
    fireXp: 60,
    burn: 64,
    chip: [0x6a4529, 0xd9b27a, 0x3f9f47],
  },
  maple: {
    id: 'maple',
    name: 'Maple',
    log: 'maple_logs',
    level: 10,
    xp: 100,
    base: 0.28,
    respawn: 24,
    fireLevel: 10,
    fireXp: 135,
    burn: 80,
    chip: [0x7a4030, 0xe0b070, 0xe24a22],
  },
};

export const GOODS = {
  copper_ore: { id: 'copper_ore', name: 'Copper ore', desc: 'Orange-veined ore from the Greyrock Pit.', price: 4, kind: 'ore' },
  tin_ore: { id: 'tin_ore', name: 'Tin ore', desc: 'Silvery ore from the Greyrock Pit.', price: 4, kind: 'ore' },
  shrimp: { id: 'shrimp', name: 'Shrimp', desc: 'Netted in Mirrormere. Eat to restore 2 health.', price: 3, heal: 2, kind: 'fish' },
  trout: { id: 'trout', name: 'Trout', desc: 'Pole-caught in Mirrormere. Eat to restore 6 health.', price: 9, heal: 6, kind: 'fish' },
  birch_logs: { id: 'birch_logs', name: 'Birch logs', desc: 'Pale wood from the meadow west of Oakhollow. Light it with a tinderbox.', price: 4, kind: 'log', tree: 'birch' },
  oak_logs: { id: 'oak_logs', name: 'Oak logs', desc: 'Heavy timber from the oak grove. Light it with a tinderbox.', price: 8, kind: 'log', tree: 'oak' },
  maple_logs: { id: 'maple_logs', name: 'Maple logs', desc: 'Red maple wood. Light it with a tinderbox once Firemaking is 10.', price: 16, kind: 'log', tree: 'maple' },
};
export const GOODS_ORDER = ['copper_ore', 'tin_ore', 'shrimp', 'trout', 'birch_logs', 'oak_logs', 'maple_logs'];

export const TOOLS = [
  { id: 'pickaxe', held: 'pick', name: 'Iron Pickaxe', desc: 'Used on rocks in the Greyrock Pit.' },
  { id: 'fishrod', held: 'fishrod', name: 'Fishing Pole', desc: 'Used at pole spots off the dock to land trout.' },
  { id: 'fishnet', held: 'fishnet', name: 'Small Net', desc: 'Used at net spots off the dock to scoop shrimp.' },
  { id: 'tinderbox', held: 'tinder', name: 'Tinderbox', desc: 'Lights a campfire from logs in the bag.' },
];

const lerp = (a, b, t) => a + (b - a) * t;

/** Chance that one pickaxe swing strikes ore. */
export function mineChance(base, level) {
  return Math.min(0.97, lerp(base, 0.95, Math.min(1, (level - 1) / 60)));
}

export function mineSwingTime(level) {
  return Math.max(1.3, MINING_SWING - (level - 1) * 0.012);
}

export function fishChance(fish, level) {
  return Math.min(0.95, lerp(fish.base, 0.9, Math.min(1, (level - fish.level) / 50 + 0.0)));
}

export function fishTickTime(level) {
  return Math.max(1.5, FISHING_TICK - (level - 1) * 0.015);
}

/** Chance that one axe swing fells the tree. */
export function chopChance(tree, level) {
  return Math.min(0.95, lerp(tree.base, 0.92, Math.min(1, Math.max(0, level - tree.level) / 45)));
}

export function chopSwingTime(level) {
  return Math.max(1.2, CHOP_SWING - (level - 1) * 0.012);
}

/** Chance the tinderbox catches. Below the log's level this is never called. */
export function lightChance(tree, level) {
  return Math.min(0.96, lerp(0.48, 0.94, Math.min(1, Math.max(0, level - tree.fireLevel) / 35)));
}

export function lightTime(level) {
  return Math.max(1.15, LIGHT_TIME - (level - 1) * 0.014);
}

export function treeByLog(id) {
  return Object.values(TREES).find((t) => t.log === id) || null;
}