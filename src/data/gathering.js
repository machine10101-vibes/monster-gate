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

export const SKILL_ORDER = ['strength', 'agility', 'stamina', 'mining', 'fishing', 'cooking', 'woodcutting', 'firemaking'];

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
    blurb: 'Swing a pickaxe in the Greyrock Pit, then the Deepwell dig south of Southford. Higher levels open iron, coal, mithril and adamant, and find ore faster.',
    effect: (lvl) => `${Math.round(mineChance(ROCKS.copper.base, lvl) * 100)}% ore strike chance`,
    unlocks: [
      [1, 'Copper ore'],
      [1, 'Tin ore'],
      [15, 'Iron ore'],
      [30, 'Coal'],
      [50, 'Mithril ore'],
      [70, 'Adamant ore'],
    ],
  },
  fishing: {
    id: 'fishing',
    name: 'Fishing',
    color: '#4ec8ff',
    blurb: 'Fish Mirrormere from the dock and work the Silverrun river with a net or pole. Ice holes on the Glimmerfrost lake give up pike and sturgeon, and the long pirate dock on the jungle coast gives up tuna, stingray and tiger shark. Cook a catch on a campfire for Cooking experience and a stronger meal.',
    effect: (lvl) => `${Math.round(fishChance(FISH.shrimp, lvl) * 100)}% shrimp catch chance`,
    unlocks: [
      [1, 'Shrimp (small net)'],
      [3, 'Trout (fishing pole)'],
      [8, 'Pike minnow (small net, river)'],
      [12, 'Salmon (fishing pole, river)'],
      [15, 'Quicker bites'],
      [20, 'Pike (ice fishing hole)'],
      [18, 'Tuna (fishing pole, pirate dock)'],
      [26, 'Stingray (fishing pole, pirate dock)'],
      [30, 'Sturgeon (ice fishing hole)'],
      [34, 'Tiger shark (fishing pole, pirate dock)'],
      [30, 'Keener line work'],
    ],
  },
  cooking: {
    id: 'cooking',
    name: 'Cooking',
    color: '#f0a04a',
    blurb: 'Cook a raw catch on a campfire. A cooked fish heals more than it did raw. Higher Cooking burns less and finishes sooner. Lower-level fish burn least, though a little chance always remains.',
    effect: (lvl) => `${Math.round(burnChance(FISH.shrimp, lvl) * 100)}% chance to burn a shrimp`,
    unlocks: [
      [1, 'Cook any catch on a fire'],
      [10, 'Quicker cooking'],
      [25, 'Fewer burnt fish'],
      [50, 'A steady hand at the fire'],
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
  iron: {
    id: 'iron',
    name: 'Iron rock',
    ore: 'iron_ore',
    level: 15,
    xp: 35,
    base: 0.42,
    respawn: 16,
    color: 0x8a6a5a,
    spark: [0xc8a090, 0x6a5048, 0xe8d0c0],
  },
  coal: {
    id: 'coal',
    name: 'Coal rock',
    ore: 'coal',
    level: 30,
    xp: 50,
    base: 0.4,
    respawn: 22,
    color: 0x2a2a32,
    spark: [0x5a5a66, 0x1a1a20, 0x9a9aaa],
  },
  mithril: {
    id: 'mithril',
    name: 'Mithril rock',
    ore: 'mithril_ore',
    level: 50,
    xp: 80,
    base: 0.34,
    respawn: 36,
    color: 0x4a7ab0,
    spark: [0x8ec4ff, 0x2a5080, 0xd0e8ff],
  },
  adamant: {
    id: 'adamant',
    name: 'Adamant rock',
    ore: 'adamant_ore',
    level: 70,
    xp: 95,
    base: 0.3,
    respawn: 48,
    color: 0x3a8a4a,
    spark: [0x7ad090, 0x246034, 0xc8f0d0],
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
    odds: 1,
    catchText: 'You catch some shrimp.',
    cooked: 'cooked_shrimp',
    cookHeal: 5,
    cookPrice: 7,
    cookXp: 8,
  },
  trout: {
    id: 'trout',
    name: 'Trout',
    tool: 'rod',
    toolName: 'fishing pole',
    level: 3,
    xp: 50,
    base: 0.32,
    odds: 1,
    catchText: 'You catch a trout.',
    cooked: 'cooked_trout',
    cookHeal: 12,
    cookPrice: 18,
    cookXp: 20,
  },
  pikeminnow: {
    id: 'pikeminnow',
    name: 'Pike minnow',
    tool: 'net',
    toolName: 'small net',
    level: 8,
    xp: 34,
    base: 0.42,
    odds: 1,
    catchText: 'You scoop up a pike minnow.',
    cooked: 'cooked_pikeminnow',
    cookHeal: 9,
    cookPrice: 14,
    cookXp: 14,
  },
  salmon: {
    id: 'salmon',
    name: 'Salmon',
    tool: 'rod',
    toolName: 'fishing pole',
    level: 12,
    xp: 95,
    base: 0.3,
    odds: 1,
    catchText: 'You land a salmon.',
    cooked: 'cooked_salmon',
    cookHeal: 18,
    cookPrice: 34,
    cookXp: 35,
  },
  pike: {
    id: 'pike',
    name: 'Pike',
    tool: 'rod',
    toolName: 'fishing pole',
    level: 20,
    xp: 150,
    base: 0.28,
    odds: 0.68,
    catchText: 'You haul a pike out of the hole.',
    cooked: 'cooked_pike',
    cookHeal: 24,
    cookPrice: 48,
    cookXp: 55,
  },
  sturgeon: {
    id: 'sturgeon',
    name: 'Sturgeon',
    tool: 'rod',
    toolName: 'fishing pole',
    level: 30,
    xp: 280,
    base: 0.2,
    odds: 0.32,
    catchText: 'You haul a sturgeon out of the hole!',
    cooked: 'cooked_sturgeon',
    cookHeal: 36,
    cookPrice: 90,
    cookXp: 90,
  },
  tuna: {
    id: 'tuna',
    name: 'Tuna',
    tool: 'rod',
    toolName: 'fishing pole',
    level: 18,
    xp: 130,
    base: 0.28,
    odds: 1,
    catchText: 'You reel in a tuna.',
    cooked: 'cooked_tuna',
    cookHeal: 26,
    cookPrice: 52,
    cookXp: 48,
  },
  stingray: {
    id: 'stingray',
    name: 'Stingray',
    tool: 'rod',
    toolName: 'fishing pole',
    level: 26,
    xp: 210,
    base: 0.24,
    odds: 0.6,
    catchText: 'You haul in a stingray.',
    cooked: 'cooked_stingray',
    cookHeal: 32,
    cookPrice: 72,
    cookXp: 72,
  },
  tigershark: {
    id: 'tigershark',
    name: 'Tiger shark',
    tool: 'rod',
    toolName: 'fishing pole',
    level: 34,
    xp: 340,
    base: 0.18,
    odds: 0.3,
    catchText: 'You wrestle a tiger shark onto the dock!',
    cooked: 'cooked_tigershark',
    cookHeal: 46,
    cookPrice: 118,
    cookXp: 115,
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
  shrimp: { id: 'shrimp', name: 'Shrimp', desc: 'Netted in Mirrormere. Eat for 2 health, or cook it on a fire.', price: 3, heal: 2, kind: 'fish' },
  trout: { id: 'trout', name: 'Trout', desc: 'Pole-caught in Mirrormere. Eat for 6 health, or cook it on a fire.', price: 9, heal: 6, kind: 'fish' },
  pikeminnow: { id: 'pikeminnow', name: 'Pike minnow', desc: 'Netted in the Silverrun river. Eat for 4 health, or cook it on a fire.', price: 7, heal: 4, kind: 'fish' },
  salmon: { id: 'salmon', name: 'Salmon', desc: 'Pole-caught in the Silverrun river. Eat for 10 health, or cook it on a fire.', price: 18, heal: 10, kind: 'fish' },
  pike: { id: 'pike', name: 'Pike', desc: 'Hauled through the Glimmerfrost ice. Eat for 14 health, or cook it on a fire.', price: 28, heal: 14, kind: 'fish' },
  sturgeon: { id: 'sturgeon', name: 'Sturgeon', desc: 'An armoured giant from under the Glimmerfrost ice. Eat for 20 health, or cook it on a fire.', price: 52, heal: 20, kind: 'fish' },
  cooked_shrimp: { id: 'cooked_shrimp', name: 'Cooked shrimp', desc: 'Grilled over a campfire. Eat to restore 5 health.', price: 7, heal: 5, kind: 'fish' },
  cooked_trout: { id: 'cooked_trout', name: 'Cooked trout', desc: 'Grilled over a campfire. Eat to restore 12 health.', price: 18, heal: 12, kind: 'fish' },
  cooked_pikeminnow: { id: 'cooked_pikeminnow', name: 'Cooked pike minnow', desc: 'Grilled over a campfire. Eat to restore 9 health.', price: 14, heal: 9, kind: 'fish' },
  cooked_salmon: { id: 'cooked_salmon', name: 'Cooked salmon', desc: 'Grilled over a campfire. Eat to restore 18 health.', price: 34, heal: 18, kind: 'fish' },
  cooked_pike: { id: 'cooked_pike', name: 'Cooked pike', desc: 'Grilled over a campfire. Eat to restore 24 health.', price: 48, heal: 24, kind: 'fish' },
  cooked_sturgeon: { id: 'cooked_sturgeon', name: 'Cooked sturgeon', desc: 'Grilled over a campfire. Eat to restore 36 health.', price: 90, heal: 36, kind: 'fish' },
  tuna: { id: 'tuna', name: 'Tuna', desc: 'Pole-caught off the pirate fishing dock. Eat for 16 health, or cook it on a fire.', price: 30, heal: 16, kind: 'fish' },
  stingray: { id: 'stingray', name: 'Stingray', desc: 'A flat, barbed catch from the pirate coast. Eat for 22 health, or cook it on a fire.', price: 44, heal: 22, kind: 'fish' },
  tigershark: { id: 'tigershark', name: 'Tiger shark', desc: 'A striped giant from the deep water off the pirate dock. Eat for 30 health, or cook it on a fire.', price: 75, heal: 30, kind: 'fish' },
  cooked_tuna: { id: 'cooked_tuna', name: 'Cooked tuna', desc: 'Grilled over a campfire. Eat to restore 26 health.', price: 52, heal: 26, kind: 'fish' },
  cooked_stingray: { id: 'cooked_stingray', name: 'Cooked stingray', desc: 'Grilled over a campfire. Eat to restore 32 health.', price: 72, heal: 32, kind: 'fish' },
  cooked_tigershark: { id: 'cooked_tigershark', name: 'Cooked tiger shark', desc: 'Grilled over a campfire. Eat to restore 46 health.', price: 118, heal: 46, kind: 'fish' },
  burnt_fish: { id: 'burnt_fish', name: 'Burnt fish', desc: 'Left on the fire too long. It sells for a coin, and nobody will eat it.', price: 1, kind: 'fish' },
};

/** One burnt good per catch, so a burnt shrimp stays a shrimp and a burnt tuna stays a tuna. */
for (const fish of Object.values(FISH)) {
  const id = `burnt_${fish.id}`;
  GOODS[id] = {
    id,
    name: `Burnt ${fish.name.toLowerCase()}`,
    desc: `A ${fish.name.toLowerCase()} left on the fire too long. It sells for a coin, and nobody will eat it.`,
    price: 1,
    kind: 'fish',
    burnt: true,
  };
}

Object.assign(GOODS, {
  birch_logs: { id: 'birch_logs', name: 'Birch logs', desc: 'Pale wood from the meadow west of Oakhollow. Light it with a tinderbox, or shave it into birch arrow shafts.', price: 4, kind: 'log', tree: 'birch' },
  oak_logs: { id: 'oak_logs', name: 'Oak logs', desc: 'Heavy timber from the oak grove. Light it with a tinderbox, or shave it into oak arrow shafts.', price: 8, kind: 'log', tree: 'oak' },
  maple_logs: { id: 'maple_logs', name: 'Maple logs', desc: 'Red maple wood. Light it with a tinderbox once Firemaking is 10, or shave it into maple arrow shafts.', price: 16, kind: 'log', tree: 'maple' },
  iron_ore: { id: 'iron_ore', name: 'Iron ore', desc: 'A heavy rust-brown lump from Greyrock and Deepwell. Smelt it alone into an iron bar, or with coal into steel.', price: 8, kind: 'ore' },
  coal: { id: 'coal', name: 'Coal', desc: 'Black fuel from the Deepwell dig. The smithy burns it to make steel, mithril and adamant.', price: 10, kind: 'ore' },
  mithril_ore: { id: 'mithril_ore', name: 'Mithril ore', desc: 'Blue-veined ore from Deepwell. Two coal and one ore make a mithril bar.', price: 28, kind: 'ore' },
  adamant_ore: { id: 'adamant_ore', name: 'Adamant ore', desc: 'Green-veined ore from the deepest Deepwell seams. Three coal and one ore make an adamant bar.', price: 52, kind: 'ore' },
  iron_bar: { id: 'iron_bar', name: 'Iron bar', desc: 'Smelted from one copper ore and one tin ore, or from a single iron ore. The stock of every iron piece.', price: 12, kind: 'bar' },
  steel_bar: { id: 'steel_bar', name: 'Steel bar', desc: 'Smelted from one iron ore and one coal. Heavier than iron, and it sells for more.', price: 28, kind: 'bar' },
  mithril_bar: { id: 'mithril_bar', name: 'Mithril bar', desc: 'Smelted from one mithril ore and two coal. Light blue steel from Deepwell.', price: 72, kind: 'bar' },
  adamant_bar: { id: 'adamant_bar', name: 'Adamant bar', desc: 'Smelted from one adamant ore and three coal. Green metal from the deepest seams.', price: 140, kind: 'bar' },
  arrowhead: { id: 'arrowhead', name: 'Iron arrowhead', desc: 'Forged at the blacksmith. One bar makes fifteen. Fits any arrow shaft, then a feather finishes the arrow.', price: 2, kind: 'part' },
  feather: { id: 'feather', name: 'Feather', desc: 'Plucked from a chicken. One feather fletches one arrow shaft.', price: 2, kind: 'part' },
  birch_shaft: { id: 'birch_shaft', name: 'Birch arrow shaft', desc: 'Shaved from a birch log with the carving knife. One log makes fifteen. Fletch it with a feather at the forge.', price: 1, kind: 'part', wood: 'birch' },
  oak_shaft: { id: 'oak_shaft', name: 'Oak arrow shaft', desc: 'Shaved from an oak log with the carving knife. One log makes fifteen. Fletch it with a feather at the forge.', price: 2, kind: 'part', wood: 'oak' },
  maple_shaft: { id: 'maple_shaft', name: 'Maple arrow shaft', desc: 'Shaved from a maple log with the carving knife. One log makes fifteen. Fletch it with a feather at the forge.', price: 3, kind: 'part', wood: 'maple' },
  iron_arrow: { id: 'iron_arrow', name: 'Iron arrow', desc: 'An iron head on a wooden shaft. A quiver holds 99.', price: 3, kind: 'arrow' },
});
const FISH_GOODS = Object.keys(FISH).flatMap((id) => [id, `cooked_${id}`, `burnt_${id}`]);
export const GOODS_ORDER = [
  'copper_ore', 'tin_ore', 'iron_ore', 'coal', 'mithril_ore', 'adamant_ore',
  'iron_bar', 'steel_bar', 'mithril_bar', 'adamant_bar',
  'arrowhead', 'feather', 'birch_shaft', 'oak_shaft', 'maple_shaft', 'iron_arrow',
  ...FISH_GOODS, 'burnt_fish', 'birch_logs', 'oak_logs', 'maple_logs',
];

/** Named smithy recipes. `ins` is [good, count] pairs. `n` is bars produced. */
export const SMELTS = {
  iron: { id: 'iron', name: 'Iron bar', ins: [['copper_ore', 1], ['tin_ore', 1]], out: 'iron_bar', n: 1, hint: 'Copper and tin from Greyrock Pit.' },
  iron_ore: { id: 'iron_ore', name: 'Iron bar', ins: [['iron_ore', 1]], out: 'iron_bar', n: 1, hint: 'One iron ore, no coal.' },
  steel: { id: 'steel', name: 'Steel bar', ins: [['iron_ore', 1], ['coal', 1]], out: 'steel_bar', n: 1, hint: 'Iron ore and coal from Deepwell.' },
  mithril: { id: 'mithril', name: 'Mithril bar', ins: [['mithril_ore', 1], ['coal', 2]], out: 'mithril_bar', n: 1, hint: 'Mithril ore and two coal.' },
  adamant: { id: 'adamant', name: 'Adamant bar', ins: [['adamant_ore', 1], ['coal', 3]], out: 'adamant_bar', n: 1, hint: 'Adamant ore and three coal.' },
};

/** True for a raw catch, its grilled form, or its burnt form. */
export function isFishGood(id) {
  if (!id) return false;
  if (FISH[id]) return true;
  if (id === 'burnt_fish') return true;
  const raw = id.startsWith('cooked_') ? id.slice(7) : id.startsWith('burnt_') ? id.slice(6) : '';
  return !!FISH[raw];
}

/** The good id produced when this catch burns. */
export function burntGoodId(fishId) {
  return `burnt_${fishId}`;
}

/** Arrow goods a quiver can be told to carry. */
export const ARROW_TYPES = ['iron_arrow'];
export const QUIVER_MAX = 99;
export const HEADS_PER_BAR = 15;
export const SHAFTS_PER_LOG = 15;
/** Each log shaves into its own shaft. */
export const SHAFT_FROM_LOG = {
  birch_logs: 'birch_shaft',
  oak_logs: 'oak_shaft',
  maple_logs: 'maple_shaft',
};
export const SHAFT_LOGS = Object.keys(SHAFT_FROM_LOG);
export const SHAFT_IDS = Object.values(SHAFT_FROM_LOG);

export const TOOLS = [
  { id: 'pickaxe', held: 'pick', name: 'Iron Pickaxe', desc: 'Used on rocks in the Greyrock Pit and the Deepwell dig.' },
  { id: 'fishrod', held: 'fishrod', name: 'Fishing Pole', desc: 'Used at pole spots and ice fishing holes to land trout, salmon, pike, sturgeon, tuna, stingray and tiger shark.' },
  { id: 'fishnet', held: 'fishnet', name: 'Small Net', desc: 'Used at net spots on the dock and the river to scoop shrimp and pike minnow.' },
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

/**
 * Chance one fish burns on the fire. At the fish's own cooking level this is 26%.
 * Each Cooking level above that cuts 1.5%. It never drops under 5%, and being
 * under-level never pushes it past 40%.
 */
export function burnChance(fish, cookingLevel) {
  const gap = cookingLevel - fish.level;
  return Math.max(0.05, Math.min(0.4, 0.26 - gap * 0.015));
}

/** Partial cooking XP when a catch burns. */
export function burnXp(fish) {
  return Math.max(1, Math.round((fish.cookXp || 1) * 0.4));
}

export function cookTime(level) {
  return Math.max(1.4, 2.6 - (level - 1) * 0.014);
}

export function fishChance(fish, level) {
  return Math.min(0.95, lerp(fish.base, 0.9, Math.min(1, (level - fish.level) / 50 + 0.0)));
}

/** The fish a spot can give a hunter of this level, picked by odds. Null when none are unlocked yet. */
export function pickFish(ids, level, roll = Math.random()) {
  const open = ids.map((id) => FISH[id]).filter((f) => f && f.level <= level);
  if (!open.length) return null;
  const total = open.reduce((a, f) => a + f.odds, 0);
  let r = roll * total;
  for (const f of open) {
    r -= f.odds;
    if (r < 0) return f;
  }
  return open[open.length - 1];
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