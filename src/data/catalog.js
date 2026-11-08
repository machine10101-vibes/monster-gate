/** Everything the Hunter Catalog knows about: monsters, their parts, and what the parts make. */

export const MATERIALS = {
  budgescale: { name: 'Budge Scale', desc: 'Overlapping green plate. Tougher than boiled leather.' },
  budgefang: { name: 'Budge Fang', desc: 'A cream-white fang with a wicked curve.' },
  budgeclaw: { name: 'Budge Claw', desc: 'Hooked, sharp, and still warm.' },
  budgehorn: { name: 'Budge Horn', desc: 'Ridged horn. Rings like a bell when struck.' },
  budgehide: { name: 'Budge Hide', desc: 'Thick scaled hide, supple enough to stitch.' },
  duskscale: { name: 'Dusk Scale', desc: 'Indigo plate that drinks the light. Cold to the touch.' },
  duskclaw: { name: 'Dusk Talon', desc: 'A silver-tipped talon, curved like a new moon.' },
  scythehorn: { name: 'Scythe Horn', desc: 'A sickle-bladed horn. It is sharp enough to part a shadow.' },
  gloommembrane: { name: 'Gloom Membrane', desc: 'Wing skin the colour of dusk, laced with violet veins.' },
  gloomcore: { name: 'Gloom Core', desc: 'A fist-sized crystal of condensed dusk. It hums when it is near its owner.' },
};

export const MATERIAL_ORDER = ['budgescale', 'budgefang', 'budgeclaw', 'budgehorn', 'budgehide', 'duskscale', 'duskclaw', 'scythehorn', 'gloommembrane', 'gloomcore'];

/** chance is 0..1 per kill, qty is [min, max]. */
export const DROPS = {
  budgedragon: [
    { id: 'budgescale', chance: 1, qty: [2, 4], rate: 'Common' },
    { id: 'budgehide', chance: 0.6, qty: [1, 1], rate: 'Common' },
    { id: 'budgeclaw', chance: 0.5, qty: [1, 2], rate: 'Uncommon' },
    { id: 'budgefang', chance: 0.55, qty: [1, 1], rate: 'Uncommon' },
    { id: 'budgehorn', chance: 0.35, qty: [1, 1], rate: 'Rare' },
  ],
  darksycledragon: [
    { id: 'duskscale', chance: 1, qty: [3, 5], rate: 'Common' },
    { id: 'gloommembrane', chance: 0.65, qty: [1, 2], rate: 'Common' },
    { id: 'duskclaw', chance: 0.6, qty: [1, 2], rate: 'Uncommon' },
    { id: 'scythehorn', chance: 0.45, qty: [1, 2], rate: 'Uncommon' },
    { id: 'gloomcore', chance: 0.3, qty: [1, 1], rate: 'Rare' },
  ],
};

export const MONSTERS = [
  {
    id: 'slime', name: 'Gate Slime', level: 1, temper: 'Bouncy', style: 'Melee', habitat: 'Around the Monster Gate',
    desc: 'A wobbling green blob that the gate spits out by the dozen. Harmless until it lands on you.',
  },
  {
    id: 'voidslime', name: 'Void Slime', level: 2, temper: 'Jumpy', style: 'Melee', habitat: 'Beside the Monster Gate',
    desc: 'Slimes that soaked up too much gate-glow. They hop faster and hit harder.',
  },
  {
    id: 'boar', name: 'Thorn Boar', level: 3, temper: 'Stubborn', style: 'Charger', habitat: 'Fields and forest edge',
    desc: 'It will paw the dirt, stare you down, and then charge in a straight line. Sidestep it.',
  },
  {
    id: 'wraith', name: 'Gate Wraith', level: 3, temper: 'Spiteful', style: 'Ranged', habitat: 'Near the Monster Gate, after dark',
    desc: 'A hooded shade that keeps its distance and hurls spirit orbs.',
  },
  {
    id: 'budgedragon', name: 'Green Budge Dragon', level: 4, temper: 'Mean', style: 'Brawler', habitat: 'Open fields and forest edge',
    desc: 'A stocky, short-fused young dragon with more attitude than altitude. It snaps at anything that moves, spits embers when you back off, and flies into a rage when hurt.',
  },
  {
    id: 'darksycledragon', name: 'Darksycle Dragon', level: 7, temper: 'Calculating', style: 'Ranged', habitat: 'Open fields, hovering above the grass',
    desc: 'A dusk-scaled dragon with sickle blades for horns, wings and tail. It hovers out of reach and hurls spinning crescents, then follows up with a homing gloom orb. Corner it and it blinks back with a tail slash. Hit its wind-up hard to stagger it.',
  },
];

export const ARMOR_SLOTS = ['helm', 'chest', 'arms', 'legs', 'boots'];
export const SLOT_LABEL = { helm: 'Helm', chest: 'Chest', arms: 'Gauntlets', legs: 'Greaves', boots: 'Boots' };

export const GEAR = [
  {
    id: 'budgeblade', type: 'weapon', name: 'Budgefang Blade', monster: 'budgedragon', held: 'budgeblade',
    desc: 'A sword grown from a single dragon fang, veined with ember-green light. Quick, balanced, and it never dulls.',
    recipe: { budgefang: 3, budgescale: 2, budgeclaw: 1 },
    item: { id: 'budgeblade', icon: 'budgeblade', name: 'Budgefang Blade', kind: 'melee', style: 'swordshield', dmg: 13, reach: 2.5, arc: 2.0, dur: 0.38, hit: 0.16, stam: 9, knock: 5, held: 'budgeblade', desc: 'Sword and shield. Dragon-fang steel.' },
    stats: [['Damage', 13], ['Reach', '2.5'], ['Style', 'Sword & Shield']],
  },
  {
    id: 'budgemaul', type: 'weapon', name: 'Horn Maul', monster: 'budgedragon', held: 'budgemaul',
    desc: 'Scale-banded head, a tusk of budge horn on each side and a spike up front. It hits like a tantrum.',
    recipe: { budgehorn: 2, budgescale: 4, budgehide: 1 },
    item: { id: 'budgemaul', icon: 'budgemaul', name: 'Horn Maul', kind: 'melee', style: 'twohand', dmg: 22, reach: 2.5, arc: 2.4, dur: 0.72, hit: 0.34, stam: 16, knock: 9, held: 'budgemaul', desc: 'Two-handed. Slow, brutal, and tusked.' },
    stats: [['Damage', 22], ['Reach', '2.5'], ['Style', 'Two-Handed']],
  },
  {
    id: 'budgebow', type: 'weapon', name: 'Wyrmhorn Bow', monster: 'budgedragon', held: 'budgebow',
    desc: 'Horn limbs, a scale-wrapped grip and claw-tipped ends. Arrows leave it faster and hit harder.',
    recipe: { budgehorn: 1, budgehide: 2, budgeclaw: 2 },
    item: { id: 'budgebow', icon: 'budgebow', name: 'Wyrmhorn Bow', kind: 'ranged', style: 'longbow', dmg: 12, dur: 0.46, stam: 7, held: 'budgebow', desc: 'A longbow of horn and hide.' },
    stats: [['Damage', 12], ['Range', 'Long'], ['Style', 'Longbow']],
  },
  {
    id: 'budgehelm', type: 'armor', slot: 'helm', name: 'Budgescale Helm', monster: 'budgedragon', set: 'budgeset', def: 1,
    desc: 'A snarling dragon-skull cap with swept horns and a gilded brow plate.',
    recipe: { budgescale: 3, budgehorn: 1, budgefang: 1 },
  },
  {
    id: 'budgechest', type: 'armor', slot: 'chest', name: 'Budgescale Cuirass', monster: 'budgedragon', set: 'budgeset', def: 3,
    desc: 'Layered green scales over a gold-banded belly plate.',
    recipe: { budgescale: 8, budgehide: 3 },
  },
  {
    id: 'budgearms', type: 'armor', slot: 'arms', name: 'Budgescale Gauntlets', monster: 'budgedragon', set: 'budgeset', def: 1,
    desc: 'Scaled vambraces and a horn-spiked pauldron. The knuckles come with claws.',
    recipe: { budgescale: 4, budgeclaw: 2, budgehide: 1 },
  },
  {
    id: 'budgelegs', type: 'armor', slot: 'legs', name: 'Budgescale Greaves', monster: 'budgedragon', set: 'budgeset', def: 2,
    desc: 'Banded thigh plates with a spiked knee guard.',
    recipe: { budgescale: 5, budgehide: 2 },
  },
  {
    id: 'budgeboots', type: 'armor', slot: 'boots', name: 'Budgescale Boots', monster: 'budgedragon', set: 'budgeset', def: 1,
    desc: 'Clawed toes grip the dirt. They look better than they smell.',
    recipe: { budgescale: 3, budgeclaw: 1, budgehide: 1 },
  },
  {
    id: 'darkscythe', type: 'weapon', name: 'Darksycle Scythe', monster: 'darksycledragon', held: 'darkscythe',
    desc: 'A horn-blade scythe on a scale-wrapped haft, with a gloom crystal set where the blade meets the shaft. Long reach, wide sweep.',
    recipe: { scythehorn: 3, duskscale: 2, duskclaw: 1 },
    item: { id: 'darkscythe', icon: 'darkscythe', name: 'Darksycle Scythe', kind: 'melee', style: 'twohand', dmg: 17, reach: 2.9, arc: 2.7, dur: 0.56, hit: 0.24, stam: 12, knock: 6, held: 'darkscythe', desc: 'Two-handed. Long reach, wide sweep.' },
    stats: [['Damage', 17], ['Reach', '2.9'], ['Style', 'Two-Handed']],
  },
  {
    id: 'darkbow', type: 'weapon', name: 'Crescent Wingbow', monster: 'darksycledragon', held: 'darkbow',
    desc: 'Bowed from two scythe horns and strung with membrane. It does not shoot arrows. It throws spinning crescents that slice through everything in a line.',
    recipe: { scythehorn: 2, gloommembrane: 2, duskclaw: 1 },
    item: { id: 'darkbow', icon: 'darkbow', name: 'Crescent Wingbow', kind: 'ranged', style: 'longbow', proj: 'crescent', dmg: 14, dur: 0.5, stam: 8, held: 'darkbow', desc: 'A longbow that throws piercing crescents.' },
    stats: [['Damage', 14], ['Shot', 'Piercing'], ['Style', 'Longbow']],
  },
  {
    id: 'darkstaff', type: 'weapon', name: 'Gloomcore Staff', monster: 'darksycledragon', held: 'darkstaff',
    desc: 'A staff crowned with a gloom crystal between two sickle blades. It fires dark orbs that curve toward the nearest monster.',
    recipe: { gloomcore: 1, scythehorn: 1, duskscale: 3, gloommembrane: 1 },
    item: { id: 'darkstaff', icon: 'darkstaff', name: 'Gloomcore Staff', kind: 'ranged', style: 'staff', spell: true, proj: 'gloom', dmg: 11, dur: 0.62, stam: 6, held: 'darkstaff', desc: 'A staff. Homing gloom orbs.' },
    stats: [['Damage', 11], ['Shot', 'Homing'], ['Style', 'Staff']],
  },
  {
    id: 'darkhelm', type: 'armor', slot: 'helm', name: 'Duskscale Helm', monster: 'darksycledragon', set: 'darksyceset', def: 1,
    desc: 'A sleek dragon-skull helm with two sickle horns sweeping back and a glowing magenta visor.',
    recipe: { duskscale: 3, scythehorn: 2 },
  },
  {
    id: 'darkchest', type: 'armor', slot: 'chest', name: 'Duskscale Cuirass', monster: 'darksycledragon', set: 'darksyceset', def: 3,
    desc: 'Indigo scale plate with a gloom core burning at the sternum and blade fins down the spine.',
    recipe: { duskscale: 8, gloommembrane: 3, gloomcore: 1 },
  },
  {
    id: 'darkarms', type: 'armor', slot: 'arms', name: 'Duskscale Gauntlets', monster: 'darksycledragon', set: 'darksyceset', def: 1,
    desc: 'Rune-lit vambraces under a pauldron that carries a curved scythe blade.',
    recipe: { duskscale: 4, duskclaw: 2, scythehorn: 1 },
  },
  {
    id: 'darklegs', type: 'armor', slot: 'legs', name: 'Duskscale Greaves', monster: 'darksycledragon', set: 'darksyceset', def: 2,
    desc: 'Lean scale greaves with a glowing knee rune and a silver knee blade.',
    recipe: { duskscale: 5, gloommembrane: 2 },
  },
  {
    id: 'darkboots', type: 'armor', slot: 'boots', name: 'Duskscale Boots', monster: 'darksycledragon', set: 'darksyceset', def: 1,
    desc: 'Talon-toed boots with a violet glow line along the sole. They make no sound at all.',
    recipe: { duskscale: 3, duskclaw: 2 },
  },
];

export const SETS = [
  { id: 'budgeset', name: 'Budgescale Set', monster: 'budgedragon', hp: 4, mana: 0, bonus: 'Full set: +4 max health (2 hearts).' },
  { id: 'darksyceset', name: 'Duskscale Set', monster: 'darksycledragon', hp: 2, mana: 20, bonus: 'Full set: +2 max health (1 heart) and +20 max mana.' },
];

export const DEF_PER_POINT = 0.04;

export const gearById = (id) => GEAR.find((g) => g.id === id);
export const monsterById = (id) => MONSTERS.find((m) => m.id === id);
export const setById = (id) => SETS.find((x) => x.id === id);
export const armorPieces = (setId) => GEAR.filter((g) => g.type === 'armor' && (!setId || g.set === setId));
export const weapons = (monster) => GEAR.filter((g) => g.type === 'weapon' && (!monster || g.monster === monster));
