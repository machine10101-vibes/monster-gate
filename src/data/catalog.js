/** Everything the Hunter Catalog knows about: monsters, their parts, and what the parts make. */

export const MATERIALS = {
  budgescale: { name: 'Budge Scale', desc: 'Overlapping green plate. Tougher than boiled leather.' },
  budgefang: { name: 'Budge Fang', desc: 'A cream-white fang with a wicked curve.' },
  budgeclaw: { name: 'Budge Claw', desc: 'Hooked, sharp, and still warm.' },
  budgehorn: { name: 'Budge Horn', desc: 'Ridged horn. Rings like a bell when struck.' },
  budgehide: { name: 'Budge Hide', desc: 'Thick scaled hide, supple enough to stitch.' },
  budgemembrane: { name: 'Budge Wing Membrane', desc: 'Warm green wing skin. Light as silk and nearly as soft.' },
  duskscale: { name: 'Dusk Scale', desc: 'Indigo plate that drinks the light. Cold to the touch.' },
  duskclaw: { name: 'Dusk Talon', desc: 'A silver-tipped talon, curved like a new moon.' },
  scythehorn: { name: 'Scythe Horn', desc: 'A sickle-bladed horn. It is sharp enough to part a shadow.' },
  gloommembrane: { name: 'Gloom Membrane', desc: 'Wing skin the colour of dusk, laced with violet veins.' },
  duskhide: { name: 'Dusk Hide', desc: 'Supple indigo hide with a faint violet sheen. It takes a stitch well.' },
  gloomcore: { name: 'Gloom Core', desc: 'A fist-sized crystal of condensed dusk. It hums when it is near its owner.' },
};

export const MATERIAL_ORDER = ['budgescale', 'budgefang', 'budgeclaw', 'budgehorn', 'budgehide', 'budgemembrane', 'duskscale', 'duskclaw', 'scythehorn', 'gloommembrane', 'duskhide', 'gloomcore'];

/** chance is 0..1 per kill, qty is [min, max]. */
export const DROPS = {
  budgedragon: [
    { id: 'budgescale', chance: 1, qty: [2, 4], rate: 'Common' },
    { id: 'budgehide', chance: 0.6, qty: [1, 1], rate: 'Common' },
    { id: 'budgeclaw', chance: 0.5, qty: [1, 2], rate: 'Uncommon' },
    { id: 'budgefang', chance: 0.55, qty: [1, 1], rate: 'Uncommon' },
    { id: 'budgemembrane', chance: 0.6, qty: [1, 2], rate: 'Common' },
    { id: 'budgehorn', chance: 0.35, qty: [1, 1], rate: 'Rare' },
  ],
  darksycledragon: [
    { id: 'duskscale', chance: 1, qty: [3, 5], rate: 'Common' },
    { id: 'gloommembrane', chance: 0.65, qty: [1, 2], rate: 'Common' },
    { id: 'duskhide', chance: 0.6, qty: [1, 1], rate: 'Common' },
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
    id: 'orcscout', name: 'Orc Scout', level: 4, temper: 'Mean', style: 'Melee', habitat: 'The spiked camp in northwest Brookside, west of Oakhollow',
    desc: 'A tusked scout in hide and fur. They keep to their camp and the ground around it, and they swing a notched blade.',
  },
  {
    id: 'darksycledragon', name: 'Darksycle Dragon', level: 7, temper: 'Calculating', style: 'Ranged', habitat: 'The cave in Southford, south of Oakhollow',
    desc: 'A dusk-scaled dragon with sickle blades for horns, wings and tail. It hovers out of reach and hurls spinning crescents, then follows up with a homing gloom orb. Corner it and it blinks back with a tail slash. Hit its wind-up hard to stagger it.',
  },
];

/** Core slots make up a set; shield and book are extras worn alongside any set. */
export const CORE_SLOTS = ['helm', 'chest', 'arms', 'legs', 'boots'];
export const ARMOR_SLOTS = [...CORE_SLOTS, 'shield', 'book'];
export const SLOT_LABEL = { helm: 'Helm', chest: 'Chest', arms: 'Gloves', legs: 'Legs', boots: 'Boots', shield: 'Shield', book: 'Spell Book' };
export const WEAPON_ORDER = ['onesword', 'twosword', 'dual', 'hammer', 'spear', 'staff', 'wand', 'shortbow', 'longbow', 'crossbow', 'scythe'];
export const WEAPON_LABEL = {
  onesword: 'One-Hand Sword', twosword: 'Two-Hand Sword', dual: 'Dual Swords', hammer: 'War Hammer', spear: 'Spear', staff: 'War Staff', wand: 'Wand',
  shortbow: 'Short Bow', longbow: 'Long Bow', crossbow: 'Crossbow', scythe: 'Scythe',
};
export const TIER_LABEL = { metal: 'Metal', leather: 'Leather', cloth: 'Cloth' };

export const GEAR = [
  {
    id: 'orcblade', type: 'weapon', wtype: 'onesword', name: 'Orc Scout Blade', monster: 'orcscout', held: 'orcblade', found: true,
    desc: 'A notched iron blade on a hide-wrapped grip. Orc scouts carry them point-down. Rough, heavy, and sharp enough.',
    recipe: {},
    item: { id: 'orcblade', icon: 'orcblade', name: 'Orc Scout Blade', kind: 'melee', style: 'swordshield', dmg: 11, reach: 2.4, arc: 2.0, dur: 0.4, hit: 0.16, stam: 8, knock: 4, held: 'orcblade', desc: 'Sword and shield. A notched orc blade.' },
    stats: [['Damage', 11], ['Reach', '2.4'], ['Style', 'Sword & Shield']],
  },
  {
    id: 'budgeblade', type: 'weapon', wtype: 'onesword', name: 'Budgefang Blade', monster: 'budgedragon', held: 'budgeblade',
    desc: 'A sword grown from a single dragon fang, veined with ember-green light. Quick, balanced, and it never dulls.',
    recipe: { budgefang: 3, budgescale: 2, budgeclaw: 1 },
    item: { id: 'budgeblade', icon: 'budgeblade', name: 'Budgefang Blade', kind: 'melee', style: 'swordshield', dmg: 13, reach: 2.5, arc: 2.0, dur: 0.38, hit: 0.16, stam: 9, knock: 5, held: 'budgeblade', desc: 'Sword and shield. Dragon-fang steel.' },
    stats: [['Damage', 13], ['Reach', '2.5'], ['Style', 'Sword & Shield']],
  },
  {
    id: 'budgemaul', type: 'weapon', wtype: 'hammer', name: 'Horn Maul', monster: 'budgedragon', held: 'budgemaul',
    desc: 'Scale-banded head, a tusk of budge horn on each side and a spike up front. It hits like a tantrum.',
    recipe: { budgehorn: 2, budgescale: 4, budgehide: 1 },
    item: { id: 'budgemaul', icon: 'budgemaul', name: 'Horn Maul', kind: 'melee', style: 'twohand', dmg: 22, reach: 2.5, arc: 2.4, dur: 0.72, hit: 0.34, stam: 16, knock: 9, held: 'budgemaul', desc: 'Two-handed. Slow, brutal, and tusked.' },
    stats: [['Damage', 22], ['Reach', '2.5'], ['Style', 'Two-Handed']],
  },
  {
    id: 'budgebow', type: 'weapon', wtype: 'longbow', name: 'Wyrmhorn Bow', monster: 'budgedragon', held: 'budgebow',
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
    id: 'darkscythe', type: 'weapon', wtype: 'scythe', name: 'Darksycle Scythe', monster: 'darksycledragon', held: 'darkscythe',
    desc: 'A horn-blade scythe on a scale-wrapped haft, with a gloom crystal set where the blade meets the shaft. Long reach, wide sweep.',
    recipe: { scythehorn: 3, duskscale: 2, duskclaw: 1 },
    item: { id: 'darkscythe', icon: 'darkscythe', name: 'Darksycle Scythe', kind: 'melee', style: 'twohand', dmg: 17, reach: 2.9, arc: 2.7, dur: 0.56, hit: 0.24, stam: 12, knock: 6, held: 'darkscythe', desc: 'Two-handed. Long reach, wide sweep.' },
    stats: [['Damage', 17], ['Reach', '2.9'], ['Style', 'Two-Handed']],
  },
  {
    id: 'darkbow', type: 'weapon', wtype: 'longbow', name: 'Crescent Wingbow', monster: 'darksycledragon', held: 'darkbow',
    desc: 'Bowed from two scythe horns and strung with membrane. It does not shoot arrows. It throws spinning crescents that slice through everything in a line.',
    recipe: { scythehorn: 2, gloommembrane: 2, duskclaw: 1 },
    item: { id: 'darkbow', icon: 'darkbow', name: 'Crescent Wingbow', kind: 'ranged', style: 'longbow', proj: 'crescent', dmg: 14, dur: 0.5, stam: 8, held: 'darkbow', desc: 'A longbow that throws piercing crescents.' },
    stats: [['Damage', 14], ['Shot', 'Piercing'], ['Style', 'Longbow']],
  },
  {
    id: 'darkstaff', type: 'weapon', wtype: 'staff', name: 'Gloomcore Staff', monster: 'darksycledragon', held: 'darkstaff',
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

const STYLE_LABEL = { swordshield: 'Sword & Shield', twohand: 'Two-Handed', dual: 'Dual Wield', shortbow: 'Short Bow', longbow: 'Longbow', crossbow: 'Crossbow', staff: 'Staff', wand: 'Wand', tome: 'Spell Book' };

/** Builds a forged weapon entry. `shot` names the projectile for ranged weapons. */
function weapon(id, wtype, name, monster, desc, recipe, it) {
  const ranged = it.kind === 'ranged';
  const third = ranged ? ['Shot', it.shotLabel || 'Arrow'] : ['Reach', it.reach.toFixed(1)];
  const { shotLabel: _shot, ...rest } = it;
  return {
    id, type: 'weapon', wtype, name, monster, held: id, desc, recipe,
    item: { id, icon: id, name, held: id, ...rest, desc: rest.blurb },
    stats: [['Damage', it.dmg], third, ['Style', STYLE_LABEL[it.style]]],
  };
}

const M = (style, dmg, reach, arc, dur, hit, stam, knock, blurb) => ({ kind: 'melee', style, dmg, reach, arc, dur, hit, stam, knock, blurb });
const R = (style, dmg, dur, stam, blurb, extra = {}) => ({ kind: 'ranged', style, dmg, dur, stam, blurb, ...extra });

GEAR.push(
  weapon('budgegreatsword', 'twosword', 'Fangreaver Greatsword', 'budgedragon', 'A broadsword of fused dragon fang with a serrated back edge, tusked crossguard and an ember vein down the fuller.', { budgefang: 4, budgehorn: 1, budgescale: 3, budgehide: 1 }, M('twohand', 20, 2.8, 2.5, 0.62, 0.28, 14, 8, 'Two-handed. Heavy fang steel.')),
  weapon('budgedual', 'dual', 'Twin Fangs', 'budgedragon', 'A matched pair of curved fang blades with scale-wrapped grips. Fast, wicked, and never apart.', { budgefang: 4, budgeclaw: 2, budgescale: 2 }, M('dual', 9, 2.2, 1.8, 0.28, 0.12, 6, 3, 'Dual swords. Rapid fang strikes.')),
  weapon('budgespear', 'spear', 'Horncollar Spear', 'budgedragon', 'A fang spearhead above a horn collar and a hide-wrapped shaft. Nothing out-reaches it.', { budgefang: 2, budgehorn: 1, budgescale: 2, budgehide: 2 }, M('twohand', 15, 3.3, 1.0, 0.46, 0.2, 10, 4, 'Two-handed. Long, narrow thrust.')),
  weapon('budgestaff', 'staff', 'Emberhorn War Staff', 'budgedragon', 'Two swept horns cradle a glowing ember orb on a scale-banded staff. It spits fire in a straight line.', { budgehorn: 2, budgehide: 2, budgescale: 2, budgemembrane: 1 }, R('staff', 11, 0.6, 6, 'A war staff. Fires embers.', { spell: true, proj: 'ember', shotLabel: 'Ember' })),
  weapon('budgewand', 'wand', 'Fangtip Wand', 'budgedragon', 'A slim wand carved from a budge fang with a living ember caught in the tip. Quick to cast.', { budgefang: 1, budgehorn: 1, budgemembrane: 1 }, R('wand', 8, 0.34, 4, 'A wand. Rapid embers.', { spell: true, proj: 'ember', shotLabel: 'Ember' })),
  weapon('budgeshortbow', 'shortbow', 'Scalebound Shortbow', 'budgedragon', 'A compact hide-and-claw bow made for fast, close shooting.', { budgehide: 2, budgefang: 1, budgeclaw: 1 }, R('shortbow', 9, 0.34, 5, 'A short bow. Quick draws.')),
  weapon('budgecrossbow', 'crossbow', 'Hornlock Crossbow', 'budgedragon', 'A scale-plated stock, a horn prod and a claw trigger. It lands a bolt like a thrown anvil.', { budgehorn: 1, budgescale: 3, budgehide: 2, budgeclaw: 1 }, R('crossbow', 14, 0.66, 8, 'A crossbow. Slow and heavy.')),

  weapon('darksword', 'onesword', 'Duskblade Saber', 'darksycledragon', 'A swept saber of scythe horn with a violet rune burning along the spine and wing-shaped guards.', { scythehorn: 2, duskscale: 2, duskclaw: 1 }, M('swordshield', 16, 2.6, 2.1, 0.36, 0.15, 9, 5, 'Sword and shield. Curved dusk steel.')),
  weapon('darkgreatsword', 'twosword', 'Gloomreaver Greatsword', 'darksycledragon', 'A sickle-curved greatsword with a glowing notch where the blade begins to bend.', { scythehorn: 4, duskscale: 3, gloommembrane: 1 }, M('twohand', 24, 3.0, 2.6, 0.6, 0.27, 14, 8, 'Two-handed. A curved greatsword of dusk.')),
  weapon('darkdual', 'dual', 'Twin Crescents', 'darksycledragon', 'Two hooked crescent blades that sing as they cut. Their edges drink the light.', { scythehorn: 3, duskscale: 1, duskclaw: 2 }, M('dual', 11, 2.3, 1.9, 0.27, 0.11, 6, 3, 'Dual swords. Hooked crescent blades.')),
  weapon('darkhammer', 'hammer', 'Duskbreaker War Hammer', 'darksycledragon', 'A dusk-scale head with a blade spike on both faces and a gloom core humming at its centre.', { scythehorn: 1, duskscale: 5, gloomcore: 1 }, M('twohand', 27, 2.6, 2.4, 0.76, 0.36, 17, 11, 'Two-handed. Shatters armor and bone.')),
  weapon('darkspear', 'spear', 'Scytheleaf Spear', 'darksycledragon', 'A double-bladed horn head with a trailing membrane pennant. It strikes before the target sees it.', { scythehorn: 2, duskscale: 2, gloommembrane: 1, duskclaw: 1 }, M('twohand', 18, 3.5, 1.0, 0.44, 0.19, 10, 4, 'Two-handed. Longest reach of any blade.')),
  weapon('darkwand', 'wand', 'Gloomshard Wand', 'darksycledragon', 'A scale-wrapped grip holding a shard of gloom core that spits violet orbs.', { gloomcore: 1, duskclaw: 1, gloommembrane: 1 }, R('wand', 9, 0.32, 4, 'A wand. Rapid gloom orbs.', { spell: true, proj: 'orb', shotLabel: 'Orb' })),
  weapon('darkshortbow', 'shortbow', 'Crescent Shortbow', 'darksycledragon', 'A compact horn bow that throws small piercing crescents in quick succession.', { gloommembrane: 2, duskclaw: 1, duskscale: 1 }, R('shortbow', 10, 0.36, 5, 'A short bow. Piercing crescents.', { proj: 'crescent', shotLabel: 'Piercing' })),
  weapon('darkcrossbow', 'crossbow', 'Gloomlock Crossbow', 'darksycledragon', 'Blade-tipped prod arms, a dusk-scale stock and a rune that lights the bolt as it leaves.', { scythehorn: 1, duskscale: 3, gloommembrane: 2, duskclaw: 1 }, R('crossbow', 16, 0.64, 8, 'A crossbow. Rune-lit bolts.')),
);

const BUDGE_ARMOR = 'budgedragon';
const DARK_ARMOR = 'darksycledragon';
function armorSet(monster, set, defs) {
  for (const [slot, id, name, def, desc, recipe, bonus] of defs) {
    GEAR.push({ id, type: 'armor', slot, name, monster, set, def, desc, recipe, ...(bonus ? { bonus } : {}) });
  }
}

GEAR.push(
  { id: 'budgeshield', type: 'armor', slot: 'shield', name: 'Budgescale Shield', monster: BUDGE_ARMOR, set: 'budgeset', def: 2, desc: 'A scale-faced kite shield with a horn boss and a gold-banded rim.', recipe: { budgescale: 5, budgehorn: 1, budgehide: 1 } },
  { id: 'darkshield', type: 'armor', slot: 'shield', name: 'Duskscale Shield', monster: DARK_ARMOR, set: 'darksyceset', def: 2, desc: 'An indigo scale shield with a gloom gem and a silver blade fin on each side.', recipe: { duskscale: 5, scythehorn: 1, gloommembrane: 1 } },
);

armorSet(BUDGE_ARMOR, 'budgeleather', [
  ['helm', 'budgeleatherhelm', 'Budgehide Cap', 1, 'A stitched hide cap with two short horn studs and a scale brow.', { budgehide: 3, budgescale: 1 }],
  ['chest', 'budgeleatherchest', 'Budgehide Jerkin', 2, 'Laced green hide over a scale-trimmed collar. Light enough to run in.', { budgehide: 6, budgescale: 3 }],
  ['arms', 'budgeleathergloves', 'Budgehide Gloves', 1, 'Supple hide gloves with a claw-bone bracer on each wrist.', { budgehide: 2, budgeclaw: 1 }],
  ['legs', 'budgeleatherlegs', 'Budgehide Leggings', 1, 'Strapped hide leggings with scale knee patches.', { budgehide: 4, budgescale: 2 }],
  ['boots', 'budgeleatherboots', 'Budgehide Boots', 1, 'Soft-soled hide boots with a folded cuff and claw-bone toes.', { budgehide: 2, budgeclaw: 1 }],
]);
armorSet(BUDGE_ARMOR, 'budgecloth', [
  ['helm', 'budgeclothhood', 'Emberweave Hood', 1, 'A deep green hood with a gold-edged brim and a horn-tipped point.', { budgemembrane: 2, budgehide: 1 }],
  ['chest', 'budgeclothrobe', 'Emberweave Robe', 2, 'Flowing wing-silk robes with a gold sash and ember trim.', { budgemembrane: 5, budgehide: 2 }],
  ['arms', 'budgeclothgloves', 'Emberweave Gloves', 0, 'Silk gloves under wide cuffs edged in gold thread.', { budgemembrane: 2, budgeclaw: 1 }],
  ['legs', 'budgeclothlegs', 'Emberweave Trousers', 1, 'Light silk trousers tied at the knee with golden cord.', { budgemembrane: 3, budgehide: 1 }],
  ['boots', 'budgeclothboots', 'Emberweave Slippers', 0, 'Soft silk slippers with curled toes.', { budgemembrane: 2, budgehide: 1 }],
  ['book', 'budgebook', 'Budgefang Grimoire', 0, 'A scale-bound spellbook with a fang clasp. Its pages smell of smoke.', { budgemembrane: 2, budgehorn: 1, budgefang: 1, budgehide: 1 }, { mana: 12, spell: 0.04 }],
]);
armorSet(DARK_ARMOR, 'darkleather', [
  ['helm', 'darkleatherhelm', 'Duskhide Cowl', 1, 'A close-fitting indigo cowl with a swept violet fin.', { duskhide: 3, duskclaw: 1 }],
  ['chest', 'darkleatherchest', 'Duskhide Jerkin', 2, 'Indigo hide with violet lacing and a scale collar. Quiet as a shadow.', { duskhide: 6, duskscale: 3 }],
  ['arms', 'darkleathergloves', 'Duskhide Gloves', 1, 'Dark hide gloves with silver talon-bone bracers.', { duskhide: 2, duskclaw: 1 }],
  ['legs', 'darkleatherlegs', 'Duskhide Leggings', 1, 'Fitted dark leggings with violet-stitched straps and scale knee patches.', { duskhide: 4, duskscale: 2 }],
  ['boots', 'darkleatherboots', 'Duskhide Boots', 1, 'Soft-soled boots with a silver talon toe cap.', { duskhide: 2, duskclaw: 1 }],
]);
armorSet(DARK_ARMOR, 'darkcloth', [
  ['helm', 'darkclothhood', 'Gloomweave Hood', 1, 'A deep violet hood with a glowing brow gem and a trailing point.', { gloommembrane: 2, duskhide: 1 }],
  ['chest', 'darkclothrobe', 'Gloomweave Robe', 2, 'Dusk-silk robes with a gloom core clasp and glowing hem stitching.', { gloommembrane: 5, duskhide: 2, gloomcore: 1 }],
  ['arms', 'darkclothgloves', 'Gloomweave Gloves', 0, 'Violet silk gloves under flared cuffs with glowing thread.', { gloommembrane: 2, duskclaw: 1 }],
  ['legs', 'darkclothlegs', 'Gloomweave Trousers', 1, 'Dusk-silk trousers with a violet sash at each knee.', { gloommembrane: 3, duskhide: 1 }],
  ['boots', 'darkclothboots', 'Gloomweave Slippers', 0, 'Silent silk slippers that glow faintly at the heel.', { gloommembrane: 2, duskhide: 1 }],
  ['book', 'darkbook', 'Gloomcore Grimoire', 0, 'A membrane-bound tome that hums with a caged gloom core.', { gloomcore: 1, gloommembrane: 2, scythehorn: 1, duskhide: 1 }, { mana: 20, spell: 0.06 }],
]);

const set = (id, name, monster, tier, role, stats, bonus) => ({ id, name, monster, tier, role, hp: 0, mana: 0, stamina: 0, spell: 0, ranged: 0, crit: 0, ...stats, bonus });
export const SETS = [
  set('budgeset', 'Budgescale Plate', BUDGE_ARMOR, 'metal', 'Warrior', { hp: 4 }, 'Full set: +4 max health (2 hearts).'),
  set('budgeleather', 'Budgehide Leathers', BUDGE_ARMOR, 'leather', 'Ranger', { stamina: 20, ranged: 0.06 }, 'Full set: +20 max stamina and +6% ranged damage.'),
  set('budgecloth', 'Emberweave Robes', BUDGE_ARMOR, 'cloth', 'Mage', { mana: 20, spell: 0.06 }, 'Full set: +20 max mana and +6% spell damage.'),
  set('darksyceset', 'Duskscale Plate', DARK_ARMOR, 'metal', 'Warrior', { hp: 2, mana: 20 }, 'Full set: +2 max health (1 heart) and +20 max mana.'),
  set('darkleather', 'Duskhide Leathers', DARK_ARMOR, 'leather', 'Ranger', { stamina: 20, crit: 0.04 }, 'Full set: +20 max stamina and +4% critical chance.'),
  set('darkcloth', 'Gloomweave Robes', DARK_ARMOR, 'cloth', 'Mage', { mana: 30, spell: 0.08 }, 'Full set: +30 max mana and +8% spell damage.'),
];

export const DEF_PER_POINT = 0.04;

export const gearById = (id) => GEAR.find((g) => g.id === id);
export const monsterById = (id) => MONSTERS.find((m) => m.id === id);
export const setById = (id) => SETS.find((x) => x.id === id);
export const armorPieces = (setId) => GEAR.filter((g) => g.type === 'armor' && (!setId || g.set === setId));
export const corePieces = (setId) => armorPieces(setId).filter((g) => CORE_SLOTS.includes(g.slot));
export const weapons = (monster) =>
  GEAR.filter((g) => g.type === 'weapon' && (!monster || g.monster === monster)).sort((a, b) => WEAPON_ORDER.indexOf(a.wtype) - WEAPON_ORDER.indexOf(b.wtype));
