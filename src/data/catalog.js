/** Everything the Hunter Catalog knows about: monsters, their parts, and what the parts make. */
import { KNIGHT_LORE, GEAR_DROPS } from './knights.js';
export { GEAR_DROPS };

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
  rimefur: { name: 'Rime Fur', desc: 'Shaggy blue-white fur stiff with frost. It crackles when you bend it.' },
  yetihide: { name: 'Yeti Hide', desc: 'Thick hide matted with ice. Warm on the inside, tough as a drum on the outside.' },
  glacierclaw: { name: 'Glacier Claw', desc: 'A curved claw the length of a forearm, cold enough to numb the hand that holds it.' },
  yetifang: { name: 'Yeti Fang', desc: 'A cream-white fang with a rime of frost along the root.' },
  frostshard: { name: 'Frost Shard', desc: 'A spike of living ice from a yeti\'s back. It never melts.' },
  frostheart: { name: 'Frostheart', desc: 'A palm-sized crystal that beats once a minute, long after its owner is gone.' },
};

export const MATERIAL_ORDER = ['budgescale', 'budgefang', 'budgeclaw', 'budgehorn', 'budgehide', 'budgemembrane', 'duskscale', 'duskclaw', 'scythehorn', 'gloommembrane', 'duskhide', 'gloomcore', 'rimefur', 'yetihide', 'glacierclaw', 'yetifang', 'frostshard', 'frostheart'];

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
  snowyeti: [
    { id: 'rimefur', chance: 1, qty: [3, 5], rate: 'Common' },
    { id: 'yetihide', chance: 0.65, qty: [1, 2], rate: 'Common' },
    { id: 'frostshard', chance: 0.6, qty: [1, 3], rate: 'Common' },
    { id: 'glacierclaw', chance: 0.55, qty: [1, 2], rate: 'Uncommon' },
    { id: 'yetifang', chance: 0.5, qty: [1, 2], rate: 'Uncommon' },
    { id: 'frostheart', chance: 0.25, qty: [1, 1], rate: 'Rare' },
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
    desc: 'A graphite-scaled dragon with violet wings, a blue crystal crest and a glowing chest core. It hovers out of reach and hurls spinning crescents, then follows up with a homing gloom orb. Every so often it beats its wings and climbs high for about four seconds, raining crescents, gloom and crystal strikes from the air before diving at your position. Melee cannot reach it up there, so dodge the marked circles and use ranged attacks. Hit its wind-up hard to stagger it.',
  },
  {
    id: 'snowyeti', name: 'Ravenous Snow Yeti', level: 9, temper: 'Ravenous', style: 'Brawler', habitat: 'The flat-topped mountain of Rimecrown, high in the Arctic north',
    desc: 'A hulking beast of ice-crystal fur with glowing blue eyes and a mouth full of fangs. It rakes in a fast double swipe, exhales a cone of frost that slows you, leaps and slams the ground so ice spikes burst up around you, and hurls boulders of ice from range. Below half health it bellows and goes into a feeding frenzy, chaining attacks with barely a breath between them. Roll out of the marked ground and strike during its recovery.',
  },
  {
    id: 'demonknight', name: 'Demon Knight', level: 11, temper: 'Merciless', style: 'Brawler', habitat: 'The obsidian fortress on tile 14, in the volcanic wasteland',
    desc: 'A towering knight in jagged black plate, crowned with spikes, red-eyed and wreathed in smoke. It cleaves with a serrated greatsword, charges behind a spiked shield and drives its blade into the ground to send a line of hellfire. It drops no parts, only whole pieces of its own gear, and rarely.',
    lore: KNIGHT_LORE.demonknight,
  },
  {
    id: 'holyknight', name: 'Holy Knight', level: 11, temper: 'Righteous', style: 'Brawler', habitat: 'The white castle on tile 23, in the volcanic wasteland',
    desc: 'A giant knight in white and gold plate with glowing blue crosses and a ragged gold-trimmed cape. It smashes the ground with a rune-lit stone war hammer and calls pillars of holy light down on wherever you stand. It drops no parts, only whole pieces of its own gear, and rarely.',
    lore: KNIGHT_LORE.holyknight,
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

  weapon('yetisword', 'onesword', 'Frostfang Saber', 'snowyeti', 'A curved saber of yeti fang, rimed white along the spine, with a claw-hooked guard and a fur-wrapped grip.', { yetifang: 3, rimefur: 2, glacierclaw: 1 }, M('swordshield', 19, 2.6, 2.1, 0.36, 0.15, 9, 6, 'Sword and shield. Frostbitten fang steel.')),
  weapon('yetigreatsword', 'twosword', 'Glacierfall Greatsword', 'snowyeti', 'A slab of blue ice-steel with a serrated fang edge and a pair of claw quillons. It leaves a trail of frost.', { yetifang: 4, frostshard: 2, rimefur: 3, yetihide: 1 }, M('twohand', 27, 3.0, 2.6, 0.6, 0.27, 14, 9, 'Two-handed. A glacier of a blade.')),
  weapon('yetidual', 'dual', 'Twin Icefangs', 'snowyeti', 'Two hooked fang blades crusted with frost. Each swing sheds a spray of ice crystals.', { yetifang: 3, glacierclaw: 2, rimefur: 1 }, M('dual', 12, 2.3, 1.9, 0.27, 0.11, 6, 4, 'Dual swords. Hooked icefang blades.')),
  weapon('yetihammer', 'hammer', 'Avalanche Maul', 'snowyeti', 'A lump of packed rime fur and ice with frost spikes on every face. It lands like a falling slope.', { frostshard: 3, rimefur: 5, frostheart: 1 }, M('twohand', 30, 2.6, 2.4, 0.76, 0.36, 17, 12, 'Two-handed. Buries what it hits.')),
  weapon('yetispear', 'spear', 'Icicle Lance', 'snowyeti', 'A long frost-shard head with fang barbs and a tuft of rime fur at the collar.', { frostshard: 2, yetifang: 1, rimefur: 2, yetihide: 1 }, M('twohand', 20, 3.5, 1.0, 0.44, 0.19, 10, 5, 'Two-handed. Long, cold reach.')),
  weapon('yetistaff', 'staff', 'Frostheart War Staff', 'snowyeti', 'Claws cradle a frostheart crystal ringed by floating ice shards. It fires chilling bolts that slow what they hit.', { frostheart: 1, frostshard: 2, rimefur: 3, glacierclaw: 1 }, R('staff', 12, 0.6, 6, 'A war staff. Chilling frost bolts.', { spell: true, proj: 'frost', shotLabel: 'Frost' })),
  weapon('yetiwand', 'wand', 'Rimeshard Wand', 'snowyeti', 'A fur-wrapped grip holding a shard of frost that spits ice bolts.', { frostshard: 2, glacierclaw: 1, rimefur: 1 }, R('wand', 10, 0.32, 4, 'A wand. Rapid frost bolts.', { spell: true, proj: 'frost', shotLabel: 'Frost' })),
  weapon('yetishortbow', 'shortbow', 'Hoarfrost Shortbow', 'snowyeti', 'A compact claw-and-hide bow strung with frozen sinew. It throws small shards of ice.', { yetihide: 2, glacierclaw: 1, frostshard: 1 }, R('shortbow', 11, 0.36, 5, 'A short bow. Quick ice shards.', { proj: 'icicle', shotLabel: 'Icicle' })),
  weapon('yetilongbow', 'longbow', 'Glacierhorn Longbow', 'snowyeti', 'Two great claws lashed to a hide-wrapped grip, strung with frozen sinew. Its shafts are frost shards and they hit like hail.', { frostshard: 2, yetihide: 2, glacierclaw: 1 }, R('longbow', 15, 0.5, 8, 'A longbow. Icicles that chill.', { proj: 'icicle', shotLabel: 'Icicle' })),
  weapon('yeticrossbow', 'crossbow', 'Rimelock Crossbow', 'snowyeti', 'A fur-stocked crossbow with claw prod arms. Each bolt is a frost shard that bursts on impact.', { frostshard: 1, rimefur: 3, yetihide: 2, glacierclaw: 1 }, R('crossbow', 18, 0.64, 8, 'A crossbow. Frost-shard bolts.')),
  weapon('yetiscythe', 'scythe', 'Whiteout Scythe', 'snowyeti', 'A great ice-claw blade on a fur-bound haft, with a frostheart-blue glow where the blade meets the shaft. It sweeps wide.', { frostshard: 3, rimefur: 2, glacierclaw: 1 }, M('twohand', 21, 2.9, 2.7, 0.56, 0.24, 12, 7, 'Two-handed. Long reach, wide sweep.')),
);

const BUDGE_ARMOR = 'budgedragon';
const DARK_ARMOR = 'darksycledragon';
const YETI_ARMOR = 'snowyeti';
function armorSet(monster, set, defs) {
  for (const [slot, id, name, def, desc, recipe, bonus] of defs) {
    GEAR.push({ id, type: 'armor', slot, name, monster, set, def, desc, recipe, ...(bonus ? { bonus } : {}) });
  }
}

GEAR.push(
  { id: 'budgeshield', type: 'armor', slot: 'shield', name: 'Budgescale Shield', monster: BUDGE_ARMOR, set: 'budgeset', def: 2, desc: 'A scale-faced kite shield with a horn boss and a gold-banded rim.', recipe: { budgescale: 5, budgehorn: 1, budgehide: 1 } },
  { id: 'darkshield', type: 'armor', slot: 'shield', name: 'Duskscale Shield', monster: DARK_ARMOR, set: 'darksyceset', def: 2, desc: 'An indigo scale shield with a gloom gem and a silver blade fin on each side.', recipe: { duskscale: 5, scythehorn: 1, gloommembrane: 1 } },
  { id: 'yetishield', type: 'armor', slot: 'shield', name: 'Glacierplate Shield', monster: YETI_ARMOR, set: 'yetiset', def: 3, desc: 'A slab of frost-shard plate in a rime-fur rim, with a frostheart blue boss and a claw fin on each side.', recipe: { frostshard: 4, rimefur: 3, frostheart: 1 } },
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

armorSet(YETI_ARMOR, 'yetiset', [
  ['helm', 'yetihelm', 'Glacierplate Helm', 2, 'A snarling yeti-skull helm of frost-shard plate with a fang-lined maw, swept ice crests and glowing blue eyes.', { frostshard: 3, rimefur: 2, yetifang: 1 }],
  ['chest', 'yetichest', 'Glacierplate Cuirass', 4, 'Blue ice plate under a collar of rime fur, strapped across with brown leather and a frostheart burning at the sternum.', { frostshard: 6, rimefur: 4, yetihide: 2, frostheart: 1 }],
  ['arms', 'yetiarms', 'Glacierplate Gauntlets', 2, 'Fur-cuffed ice vambraces under crystal-spiked pauldrons. The knuckles come with glacier claws.', { frostshard: 3, glacierclaw: 2, rimefur: 2 }],
  ['legs', 'yetilegs', 'Glacierplate Greaves', 3, 'Heavy frost-plate thighs, rime-fur knee guards and a hanging hide faulds with ice shards.', { frostshard: 4, rimefur: 3, yetihide: 1 }],
  ['boots', 'yetiboots', 'Glacierplate Boots', 2, 'Great furred boots with ice-claw toes that bite into the snow.', { frostshard: 2, rimefur: 2, glacierclaw: 2 }],
]);
armorSet(YETI_ARMOR, 'yetileather', [
  ['helm', 'yetileatherhelm', 'Rimehide Hood', 1, 'A fur-trimmed hide hood with frost-bright tufts and a fang clasp.', { yetihide: 3, rimefur: 1 }],
  ['chest', 'yetileatherchest', 'Rimehide Jerkin', 3, 'Frost-stiff yeti hide with a shaggy collar and crossed leather straps.', { yetihide: 5, rimefur: 4 }],
  ['arms', 'yetileathergloves', 'Rimehide Gloves', 1, 'Fur-backed hide gloves with a glacier-claw bracer on each wrist.', { yetihide: 2, glacierclaw: 1 }],
  ['legs', 'yetileatherlegs', 'Rimehide Leggings', 2, 'Thick fur-banded leggings that shrug off the cold.', { yetihide: 4, rimefur: 2 }],
  ['boots', 'yetileatherboots', 'Rimehide Boots', 1, 'Deep-furred boots with claw-bone toe caps.', { yetihide: 2, rimefur: 1 }],
]);
armorSet(YETI_ARMOR, 'yeticloth', [
  ['helm', 'yeticlothhood', 'Frostweave Hood', 1, 'A deep frost-white hood edged in rime fur with a floating ice-shard brow.', { rimefur: 3, yetihide: 1 }],
  ['chest', 'yeticlothrobe', 'Frostweave Robe', 3, 'Layered rime-fur robes with a frostheart clasp and a hem of tiny hanging icicles.', { rimefur: 6, yetihide: 2, frostheart: 1 }],
  ['arms', 'yeticlothgloves', 'Frostweave Gloves', 0, 'Soft fur mitts under flared cuffs of frosted thread.', { rimefur: 3, glacierclaw: 1 }],
  ['legs', 'yeticlothlegs', 'Frostweave Trousers', 1, 'Fur-lined trousers tied with a blue frost-silk sash at each knee.', { rimefur: 4, yetihide: 1 }],
  ['boots', 'yeticlothboots', 'Frostweave Slippers', 0, 'Fur slippers that never leave a footprint in the snow.', { rimefur: 3, yetihide: 1 }],
  ['book', 'yetibook', 'Frostheart Grimoire', 0, 'A hide-bound tome rimed with frost and clasped with a fang. A caged frostheart pulses on its cover.', { frostheart: 1, rimefur: 3, yetifang: 1, yetihide: 1 }, { mana: 24, spell: 0.07 }],
]);


const DEMON_K = 'demonknight';
const HOLY_K = 'holyknight';
function foundSet(monster, set, defs) {
  for (const [slot, id, name, def, desc] of defs) GEAR.push({ id, type: 'armor', slot, name, monster, set, def, desc, recipe: {}, found: true });
}
GEAR.push(
  {
    id: 'demonsword', type: 'weapon', wtype: 'onesword', name: 'Hellrend Greatsword', monster: DEMON_K, held: 'demonsword', found: true,
    desc: 'A tall serrated blade of black iron, its fuller cracked open and glowing red. The Demon Knight carries it point-up.',
    recipe: {},
    item: { id: 'demonsword', icon: 'demonsword', name: 'Hellrend Greatsword', kind: 'melee', style: 'swordshield', dmg: 23, reach: 2.9, arc: 2.3, dur: 0.42, hit: 0.18, stam: 11, knock: 7, held: 'demonsword', desc: 'Sword and shield. A serrated blade of hellfire.' },
    stats: [['Damage', 23], ['Reach', '2.9'], ['Style', 'Sword & Shield']],
  },
  {
    id: 'holyhammer', type: 'weapon', wtype: 'hammer', name: 'Smiterfall War Hammer', monster: HOLY_K, held: 'holyhammer', found: true,
    desc: 'A block of runed stone in a gold frame on a ribbed haft, lit by glowing blue crosses. It lands like a verdict.',
    recipe: {},
    item: { id: 'holyhammer', icon: 'holyhammer', name: 'Smiterfall War Hammer', kind: 'melee', style: 'twohand', dmg: 36, reach: 2.8, arc: 2.5, dur: 0.78, hit: 0.36, stam: 18, knock: 12, held: 'holyhammer', desc: 'Two-handed. A holy stone hammer.' },
    stats: [['Damage', 36], ['Reach', '2.8'], ['Style', 'Two-Handed']],
  },
  { id: 'demonshield', type: 'armor', slot: 'shield', name: 'Hellforged Bulwark', monster: DEMON_K, set: 'demonset', def: 4, desc: 'A tall kite shield of black plate with a spiked rim and a glowing red demon face.', recipe: {}, found: true },
);
foundSet(DEMON_K, 'demonset', [
  ['helm', 'demonhelm', 'Hellforged Crown', 3, 'A black helm crowned with spikes. Two red eyes burn behind the visor.'],
  ['chest', 'demonchest', 'Hellforged Cuirass', 5, 'Layered shards of black plate, cracked and glowing red, with a row of spikes across the back.'],
  ['arms', 'demonarms', 'Hellforged Gauntlets', 3, 'Spiked vambraces under huge jagged pauldrons.'],
  ['legs', 'demonlegs', 'Hellforged Greaves', 4, 'Heavy black thigh plate with spiked knee guards.'],
  ['boots', 'demonboots', 'Hellforged Sabatons', 3, 'Broad black boots with spiked toes.'],
]);
foundSet(HOLY_K, 'holyset', [
  ['helm', 'holyhelm', 'Radiant Helm', 3, 'A white helm with a dark visor, a forehead cross, a gold crest and curved gold horns.'],
  ['chest', 'holychest', 'Radiant Cuirass', 5, 'White plate trimmed in gold, with a glowing blue cross over the heart.'],
  ['arms', 'holyarms', 'Radiant Gauntlets', 3, 'Gold-rimmed pauldrons and vambraces, each with a glowing blue cross.'],
  ['legs', 'holylegs', 'Radiant Greaves', 4, 'White thigh plate in gold diamond frames with blue crosses.'],
  ['boots', 'holyboots', 'Radiant Sabatons', 3, 'Large white sabatons with gold bands.'],
]);

const set = (id, name, monster, tier, role, stats, bonus) => ({ id, name, monster, tier, role, hp: 0, mana: 0, stamina: 0, spell: 0, ranged: 0, crit: 0, ...stats, bonus });
export const SETS = [
  set('budgeset', 'Budgescale Plate', BUDGE_ARMOR, 'metal', 'Warrior', { hp: 4 }, 'Full set: +4 max health (2 hearts).'),
  set('budgeleather', 'Budgehide Leathers', BUDGE_ARMOR, 'leather', 'Ranger', { stamina: 20, ranged: 0.06 }, 'Full set: +20 max stamina and +6% ranged damage.'),
  set('budgecloth', 'Emberweave Robes', BUDGE_ARMOR, 'cloth', 'Mage', { mana: 20, spell: 0.06 }, 'Full set: +20 max mana and +6% spell damage.'),
  set('darksyceset', 'Duskscale Plate', DARK_ARMOR, 'metal', 'Warrior', { hp: 2, mana: 20 }, 'Full set: +2 max health (1 heart) and +20 max mana.'),
  set('darkleather', 'Duskhide Leathers', DARK_ARMOR, 'leather', 'Ranger', { stamina: 20, crit: 0.04 }, 'Full set: +20 max stamina and +4% critical chance.'),
  set('darkcloth', 'Gloomweave Robes', DARK_ARMOR, 'cloth', 'Mage', { mana: 30, spell: 0.08 }, 'Full set: +30 max mana and +8% spell damage.'),
  set('yetiset', 'Glacierplate', YETI_ARMOR, 'metal', 'Warrior', { hp: 4, stamina: 10 }, 'Full set: +4 max health (2 hearts) and +10 max stamina.'),
  set('yetileather', 'Rimehide Leathers', YETI_ARMOR, 'leather', 'Ranger', { stamina: 30, ranged: 0.08 }, 'Full set: +30 max stamina and +8% ranged damage.'),
  set('yeticloth', 'Frostweave Robes', YETI_ARMOR, 'cloth', 'Mage', { mana: 36, spell: 0.1 }, 'Full set: +36 max mana and +10% spell damage.'),
  set('demonset', 'Hellforged Plate', DEMON_K, 'metal', 'Warrior', { hp: 6, stamina: 10 }, 'Full set: +6 max health (3 hearts) and +10 max stamina.'),
  set('holyset', 'Radiant Plate', HOLY_K, 'metal', 'Warrior', { hp: 6, mana: 20 }, 'Full set: +6 max health (3 hearts) and +20 max mana.'),
];

export const DEF_PER_POINT = 0.04;

export const gearById = (id) => GEAR.find((g) => g.id === id);
export const monsterById = (id) => MONSTERS.find((m) => m.id === id);
export const setById = (id) => SETS.find((x) => x.id === id);
export const armorPieces = (setId) => GEAR.filter((g) => g.type === 'armor' && (!setId || g.set === setId));
export const corePieces = (setId) => armorPieces(setId).filter((g) => CORE_SLOTS.includes(g.slot));
export const weapons = (monster) =>
  GEAR.filter((g) => g.type === 'weapon' && (!monster || g.monster === monster)).sort((a, b) => WEAPON_ORDER.indexOf(a.wtype) - WEAPON_ORDER.indexOf(b.wtype));
