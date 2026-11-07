/** Everything the Hunter Catalog knows about: monsters, their parts, and what the parts make. */

export const MATERIALS = {
  budgescale: { name: 'Budge Scale', desc: 'Overlapping green plate. Tougher than boiled leather.' },
  budgefang: { name: 'Budge Fang', desc: 'A cream-white fang with a wicked curve.' },
  budgeclaw: { name: 'Budge Claw', desc: 'Hooked, sharp, and still warm.' },
  budgehorn: { name: 'Budge Horn', desc: 'Ridged horn. Rings like a bell when struck.' },
  budgehide: { name: 'Budge Hide', desc: 'Thick scaled hide, supple enough to stitch.' },
};

export const MATERIAL_ORDER = ['budgescale', 'budgefang', 'budgeclaw', 'budgehorn', 'budgehide'];

/** chance is 0..1 per kill, qty is [min, max]. */
export const DROPS = {
  budgedragon: [
    { id: 'budgescale', chance: 1, qty: [2, 4], rate: 'Common' },
    { id: 'budgehide', chance: 0.6, qty: [1, 1], rate: 'Common' },
    { id: 'budgeclaw', chance: 0.5, qty: [1, 2], rate: 'Uncommon' },
    { id: 'budgefang', chance: 0.55, qty: [1, 1], rate: 'Uncommon' },
    { id: 'budgehorn', chance: 0.35, qty: [1, 1], rate: 'Rare' },
  ],
};

export const MONSTERS = [
  {
    id: 'slime', name: 'Gate Slime', level: 1, temper: 'Bouncy', habitat: 'Around the Monster Gate',
    desc: 'A wobbling green blob that the gate spits out by the dozen. Harmless until it lands on you.',
  },
  {
    id: 'voidslime', name: 'Void Slime', level: 2, temper: 'Jumpy', habitat: 'Beside the Monster Gate',
    desc: 'Slimes that soaked up too much gate-glow. They hop faster and hit harder.',
  },
  {
    id: 'boar', name: 'Thorn Boar', level: 3, temper: 'Stubborn', habitat: 'Fields and forest edge',
    desc: 'It will paw the dirt, stare you down, and then charge in a straight line. Sidestep it.',
  },
  {
    id: 'wraith', name: 'Gate Wraith', level: 3, temper: 'Spiteful', habitat: 'Near the Monster Gate, after dark',
    desc: 'A hooded shade that keeps its distance and hurls spirit orbs.',
  },
  {
    id: 'budgedragon', name: 'Green Budge Dragon', level: 4, temper: 'Mean', habitat: 'Open fields and forest edge',
    desc: 'A stocky, short-fused young dragon with more attitude than altitude. It snaps at anything that moves, spits embers when you back off, and flies into a rage when hurt.',
  },
];

export const ARMOR_SLOTS = ['helm', 'chest', 'arms', 'legs', 'boots'];
export const SLOT_LABEL = { helm: 'Helm', chest: 'Chest', arms: 'Gauntlets', legs: 'Greaves', boots: 'Boots' };

export const GEAR = [
  {
    id: 'budgeblade', type: 'weapon', name: 'Budgefang Blade', monster: 'budgedragon', held: 'budgeblade',
    desc: 'A sword grown from a single dragon fang, veined with ember-green light. Quick, balanced, and it never dulls.',
    recipe: { budgefang: 3, budgescale: 2, budgeclaw: 1 },
    item: { id: 'budgeblade', icon: 'budgeblade', name: 'Budgefang Blade', kind: 'melee', dmg: 13, reach: 2.5, arc: 2.0, dur: 0.38, hit: 0.16, stam: 9, knock: 5, held: 'budgeblade', desc: 'Dragon-fang steel. Fast three-hit rhythm.' },
    stats: [['Damage', 13], ['Reach', '2.5'], ['Speed', 'Fast']],
  },
  {
    id: 'budgemaul', type: 'weapon', name: 'Horn Maul', monster: 'budgedragon', held: 'budgemaul',
    desc: 'Scale-banded head, a tusk of budge horn on each side and a spike up front. It hits like a tantrum.',
    recipe: { budgehorn: 2, budgescale: 4, budgehide: 1 },
    item: { id: 'budgemaul', icon: 'budgemaul', name: 'Horn Maul', kind: 'melee', dmg: 22, reach: 2.5, arc: 2.4, dur: 0.72, hit: 0.34, stam: 16, knock: 9, held: 'budgemaul', desc: 'Slow, brutal, and tusked.' },
    stats: [['Damage', 22], ['Reach', '2.5'], ['Speed', 'Slow']],
  },
  {
    id: 'budgebow', type: 'weapon', name: 'Wyrmhorn Bow', monster: 'budgedragon', held: 'budgebow',
    desc: 'Horn limbs, a scale-wrapped grip and claw-tipped ends. Arrows leave it faster and hit harder.',
    recipe: { budgehorn: 1, budgehide: 2, budgeclaw: 2 },
    item: { id: 'budgebow', icon: 'budgebow', name: 'Wyrmhorn Bow', kind: 'ranged', dmg: 12, dur: 0.46, stam: 7, held: 'budgebow', desc: 'Horn limbs, hide grip.' },
    stats: [['Damage', 12], ['Range', 'Long'], ['Speed', 'Medium']],
  },
  {
    id: 'budgehelm', type: 'armor', slot: 'helm', name: 'Budgescale Helm', monster: 'budgedragon', def: 1,
    desc: 'A snarling dragon-skull cap with swept horns and a gilded brow plate.',
    recipe: { budgescale: 3, budgehorn: 1, budgefang: 1 },
  },
  {
    id: 'budgechest', type: 'armor', slot: 'chest', name: 'Budgescale Cuirass', monster: 'budgedragon', def: 3,
    desc: 'Layered green scales over a gold-banded belly plate.',
    recipe: { budgescale: 8, budgehide: 3 },
  },
  {
    id: 'budgearms', type: 'armor', slot: 'arms', name: 'Budgescale Gauntlets', monster: 'budgedragon', def: 1,
    desc: 'Scaled vambraces and a horn-spiked pauldron. The knuckles come with claws.',
    recipe: { budgescale: 4, budgeclaw: 2, budgehide: 1 },
  },
  {
    id: 'budgelegs', type: 'armor', slot: 'legs', name: 'Budgescale Greaves', monster: 'budgedragon', def: 2,
    desc: 'Banded thigh plates with a spiked knee guard.',
    recipe: { budgescale: 5, budgehide: 2 },
  },
  {
    id: 'budgeboots', type: 'armor', slot: 'boots', name: 'Budgescale Boots', monster: 'budgedragon', def: 1,
    desc: 'Clawed toes grip the dirt. They look better than they smell.',
    recipe: { budgescale: 3, budgeclaw: 1, budgehide: 1 },
  },
];

export const SET = {
  id: 'budgeset',
  name: 'Budgescale Set',
  monster: 'budgedragon',
  hp: 4,
  bonus: 'Full set: +4 max health (2 hearts).',
};

export const DEF_PER_POINT = 0.04;

export const gearById = (id) => GEAR.find((g) => g.id === id);
export const monsterById = (id) => MONSTERS.find((m) => m.id === id);
export const armorPieces = () => GEAR.filter((g) => g.type === 'armor');
export const weapons = () => GEAR.filter((g) => g.type === 'weapon');
