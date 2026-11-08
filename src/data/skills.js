/** Hunter paths. Each path runs five skills deep, and each class can raise four attributes. */

export const RESOURCE_NAME = { fury: 'Fury', stamina: 'Stamina', mana: 'Spirit' };

const warrior = {
  id: 'warrior',
  name: 'Warrior',
  blurb: 'Steel, fury, and the willingness to be hit first.',
  resource: 'fury',
  color: '#e23b3b',
  paths: [
    {
      id: 'tank',
      name: 'Tank',
      color: '#7ec8ff',
      skills: [
        { id: 'fortify', name: 'Fortify', kind: 'passive', cost: 1, shape: 'shield', desc: 'Damage taken drops by 10%, or 22% while your shield is up. +10 health.' },
        { id: 'shieldbash', name: 'Shield Bash', kind: 'active', cost: 1, shape: 'bash', resource: 18, cd: 5, power: 9, reach: 2.3, dot: 0.35, knock: 8, stun: 0.9, desc: 'Slam the shield in a cone. Stuns and knocks foes back.' },
        { id: 'bulwark', name: 'Bulwark', kind: 'special', cost: 2, shape: 'wall', resource: 30, cd: 12, dur: 4, desc: 'For 4 seconds almost nothing gets through. Stacks with Fortify.' },
        { id: 'brace', name: 'Brace', kind: 'passive', cost: 1, shape: 'shield', desc: 'Shield Bash hits harder and stuns longer, and costs less Fury. +6 health.' },
        { id: 'ironcitadel', name: 'Iron Citadel', kind: 'special', cost: 2, shape: 'wall', resource: 26, cd: 16, desc: 'For 6 seconds, the next three hits that land deal 1 damage.' },
      ],
    },
    {
      id: 'fury',
      name: 'Fury',
      color: '#ff7a3a',
      skills: [
        { id: 'bloodlust', name: 'Bloodlust', kind: 'passive', cost: 1, shape: 'drop', desc: 'Melee hits harder as Fury rises, and those hits build Fury faster.' },
        { id: 'whirlwind', name: 'Whirlwind', kind: 'active', cost: 1, shape: 'whirl', resource: 28, cd: 7, power: 11, radius: 2.6, desc: 'Spin and cut everything around you.' },
        { id: 'execute', name: 'Execute', kind: 'special', cost: 2, shape: 'execute', resource: 24, cd: 8, power: 8, reach: 2.5, dot: 0.4, desc: 'A heavy chop. Much harder, and a critical, on foes under 40% health.' },
        { id: 'rampage', name: 'Rampage', kind: 'passive', cost: 1, shape: 'drop', desc: 'Whirlwind reaches farther. Execute catches foes under half health. Melee +10%, and those skills cost less Fury.' },
        { id: 'bloodstorm', name: 'Bloodstorm', kind: 'special', cost: 2, shape: 'whirl', resource: 20, cd: 12, desc: 'A storm around you. It hits harder the more Fury you are holding.' },
      ],
    },
    {
      id: 'barbarian',
      name: 'Barbarian',
      color: '#e23b4a',
      skills: [
        { id: 'savage', name: 'Savage', kind: 'passive', cost: 1, shape: 'axe', desc: 'Melee damage +20% and +8 health.' },
        { id: 'leap', name: 'Leap', kind: 'active', cost: 1, shape: 'leap', resource: 22, cd: 7, power: 14, radius: 2.4, desc: 'Hurl yourself forward and slam the ground.' },
        { id: 'warcry', name: 'War Cry', kind: 'special', cost: 2, shape: 'cry', resource: 30, cd: 14, radius: 5, stun: 0.7, dur: 5, desc: 'Stun nearby foes and swing harder for 5 seconds.' },
        { id: 'thickhide', name: 'Thick Hide', kind: 'passive', cost: 1, shape: 'axe', desc: '+12 health. Leap slams harder and wider.' },
        { id: 'earthquake', name: 'Earthquake', kind: 'special', cost: 2, shape: 'leap', resource: 28, cd: 12, desc: 'Slam the ground where you stand. The shock stuns and throws foes back.' },
      ],
    },
  ],
};

const ranger = {
  id: 'ranger',
  name: 'Ranger',
  blurb: 'A wolf, a poisoned edge, or one careful shot.',
  resource: 'stamina',
  color: '#7dce4a',
  paths: [
    {
      id: 'companion',
      name: 'Companion',
      color: '#d2b48c',
      skills: [
        { id: 'bond', name: 'Bond', kind: 'passive', cost: 1, shape: 'heart', desc: 'Your wolf bites harder, and each bite mends you a little.' },
        { id: 'callwolf', name: 'Call Wolf', kind: 'active', cost: 1, shape: 'wolf', resource: 18, cd: 16, dur: 30, desc: 'Summon a wolf for 30 seconds. It bites whatever you are fighting.' },
        { id: 'packtactics', name: 'Pack Tactics', kind: 'special', cost: 2, shape: 'pack', resource: 16, cd: 10, dur: 5, desc: 'You and your wolf hit harder for 5 seconds. The wolf lunges in.' },
        { id: 'alpha', name: 'Alpha', kind: 'passive', cost: 1, shape: 'heart', desc: 'The wolf stays longer, bites harder, and mends you more with each bite.' },
        { id: 'howl', name: 'Howl', kind: 'special', cost: 2, shape: 'cry', resource: 18, cd: 12, desc: 'You and the wolf cry out. Nearby foes take a hit, and you catch your breath.' },
      ],
    },
    {
      id: 'poison',
      name: 'Poison',
      color: '#7dff5a',
      skills: [
        { id: 'venom', name: 'Venom Coating', kind: 'passive', cost: 1, shape: 'poison', desc: 'Weapon hits poison for 4 damage a second, for 4 seconds.' },
        { id: 'poisonvolley', name: 'Poison Volley', kind: 'active', cost: 1, shape: 'arrow', resource: 14, cd: 6, power: 6, desc: 'Loose three poisoned arrows.' },
        { id: 'toxiccloud', name: 'Toxic Cloud', kind: 'special', cost: 2, shape: 'cloud', resource: 20, cd: 11, radius: 2.2, dur: 5, dps: 5, slow: 0.55, desc: 'Leave a poison mist ahead of you. It slows anything standing in it.' },
        { id: 'concentrated', name: 'Concentrated Venom', kind: 'passive', cost: 1, shape: 'poison', desc: 'Every poison you apply lasts longer and deals 3 more damage a second.' },
        { id: 'plaguearrow', name: 'Plague Arrow', kind: 'special', cost: 2, shape: 'arrow', resource: 16, cd: 8, power: 12, desc: 'One heavy arrow. It poisons much harder than a coated blade.' },
      ],
    },
    {
      id: 'sniper',
      name: 'Sniper',
      color: '#e8d48a',
      skills: [
        { id: 'deadeye', name: 'Deadeye', kind: 'passive', cost: 1, shape: 'eye', desc: 'Stand still a moment and your next ranged shot is aimed: a critical with extra damage.' },
        { id: 'aimedshot', name: 'Aimed Shot', kind: 'active', cost: 1, shape: 'shot', resource: 16, cd: 5, power: 18, desc: 'A heavy arrow that punches through.' },
        { id: 'markedprey', name: 'Marked Prey', kind: 'special', cost: 2, shape: 'mark', resource: 12, cd: 10, range: 16, dur: 6, amp: 0.4, desc: 'Mark the nearest foe. It takes 40% more damage for 6 seconds.' },
        { id: 'killshot', name: 'Kill Shot', kind: 'passive', cost: 1, shape: 'mark', desc: 'Marks cut deeper, and your ranged shots hurt a marked foe even more.' },
        { id: 'snipe', name: 'Snipe', kind: 'special', cost: 2, shape: 'shot', resource: 18, cd: 8, desc: 'A piercing shot that marks whatever it hits. Standing still makes it deadly.' },
      ],
    },
  ],
};

const mage = {
  id: 'mage',
  name: 'Mage',
  blurb: 'Fire, ice, or the crack of a storm.',
  resource: 'mana',
  color: '#4ec8ff',
  paths: [
    {
      id: 'fire',
      name: 'Fire',
      color: '#ff6a2a',
      skills: [
        { id: 'kindle', name: 'Kindle', kind: 'passive', cost: 1, shape: 'fire', desc: 'Your spells set foes burning. +10 spirit.' },
        { id: 'fireball', name: 'Fireball', kind: 'active', cost: 1, shape: 'fire', resource: 12, cd: 4, power: 8, splash: 10, radius: 2.2, desc: 'A bolt that bursts on impact and burns nearby foes.' },
        { id: 'flamewave', name: 'Flame Wave', kind: 'special', cost: 2, shape: 'wave', resource: 16, cd: 8, power: 12, reach: 3.3, dot: 0.25, desc: 'A cone of fire that burns.' },
        { id: 'immolate', name: 'Immolate', kind: 'passive', cost: 1, shape: 'fire', desc: 'Burns deal more damage, and Fireball bursts wider and harder.' },
        { id: 'meteor', name: 'Meteor', kind: 'special', cost: 2, shape: 'fire', resource: 22, cd: 10, desc: 'Call down a slow, heavy fireball. The blast burns everything it catches.' },
      ],
    },
    {
      id: 'ice',
      name: 'Ice',
      color: '#8fd4ff',
      skills: [
        { id: 'hoarfrost', name: 'Hoarfrost', kind: 'passive', cost: 1, shape: 'ice', desc: 'Your spells slow foes.' },
        { id: 'frostbolt', name: 'Frost Bolt', kind: 'active', cost: 1, shape: 'ice', resource: 10, cd: 3, power: 9, desc: 'An ice bolt that chills hard.' },
        { id: 'icenova', name: 'Ice Nova', kind: 'special', cost: 2, shape: 'nova', resource: 18, cd: 9, power: 9, radius: 3.2, desc: 'Frost bursts around you. Foes already chilled are frozen solid.' },
        { id: 'deepfreeze', name: 'Deep Freeze', kind: 'passive', cost: 1, shape: 'ice', desc: 'Your chills last longer and bite harder. Frozen foes stay locked a little longer.' },
        { id: 'glacier', name: 'Glacier', kind: 'special', cost: 2, shape: 'ice', resource: 16, cd: 8, desc: 'A wave of ice ahead of you. It damages and chills hard.' },
      ],
    },
    {
      id: 'lightning',
      name: 'Lightning',
      color: '#d7e4ff',
      skills: [
        { id: 'static', name: 'Static', kind: 'passive', cost: 1, shape: 'spark', desc: 'A spell hit sometimes arcs to a second foe for half damage.' },
        { id: 'spark', name: 'Spark', kind: 'active', cost: 1, shape: 'spark', resource: 8, cd: 2, power: 7, desc: 'A quick, cheap bolt.' },
        { id: 'chainlightning', name: 'Chain Lightning', kind: 'special', cost: 2, shape: 'chain', resource: 16, cd: 7, desc: 'Lightning jumps across up to four foes.' },
        { id: 'overcharge', name: 'Overcharge', kind: 'passive', cost: 1, shape: 'spark', desc: 'Chain Lightning hits harder, and Static arcs more often.' },
        { id: 'thunderclap', name: 'Thunderclap', kind: 'special', cost: 2, shape: 'chain', resource: 18, cd: 9, desc: 'Lightning bursts around you and staggers everything it touches.' },
      ],
    },
  ],
};

warrior.attributes = [
  { id: 'vitality', name: 'Vitality', max: 3, blurb: '+4 health each rank.', rankText: (n) => `+${n * 4} health` },
  { id: 'might', name: 'Might', max: 3, blurb: '+6% melee damage each rank.', rankText: (n) => `+${n * 6}% melee damage` },
  { id: 'guard', name: 'Guard', max: 3, blurb: '+3% damage reduction each rank.', rankText: (n) => `+${n * 3}% damage reduction` },
  { id: 'wrath', name: 'Wrath', max: 3, blurb: 'Fury builds faster each rank.', rankText: (n) => `+${n * 10}% Fury from hits` },
];
ranger.attributes = [
  { id: 'endurance', name: 'Endurance', max: 3, blurb: '+8 stamina each rank.', rankText: (n) => `+${n * 8} stamina` },
  { id: 'precision', name: 'Precision', max: 3, blurb: '+6% ranged damage each rank.', rankText: (n) => `+${n * 6}% ranged damage` },
  { id: 'agility', name: 'Agility', max: 3, blurb: '+3% critical chance each rank.', rankText: (n) => `+${n * 3}% critical chance` },
  { id: 'toxin', name: 'Toxin', max: 3, blurb: '+1 poison damage a second each rank.', rankText: (n) => `Poison +${n} damage a second` },
];
mage.attributes = [
  { id: 'spiritwell', name: 'Spirit', max: 3, blurb: '+6 spirit each rank.', rankText: (n) => `+${n * 6} spirit` },
  { id: 'arcana', name: 'Arcana', max: 3, blurb: '+6% spell damage each rank.', rankText: (n) => `+${n * 6}% spell damage` },
  { id: 'focus', name: 'Focus', max: 3, blurb: 'Spells cost 6% less spirit each rank.', rankText: (n) => `Spell cost -${n * 6}%` },
  { id: 'potency', name: 'Potency', max: 3, blurb: 'Burns, chills, and arcs grow stronger each rank.', rankText: (n) => `Burn +${n}, harder chills, more arcs` },
];

export const CLASSES = { warrior, ranger, mage };

export function attrDef(classId, id) {
  return (CLASSES[classId]?.attributes || []).find((a) => a.id === id) || null;
}

export const SKILLS = {};
export const PATHS = {};

for (const cls of Object.values(CLASSES)) {
  for (const path of cls.paths) {
    PATHS[path.id] = { ...path, classId: cls.id };
    let prev = null;
    for (const skill of path.skills) {
      SKILLS[skill.id] = {
        ...skill,
        classId: cls.id,
        pathId: path.id,
        pathName: path.name,
        color: path.color,
        req: prev,
        res: cls.resource,
      };
      prev = skill.id;
    }
  }
}

export const CLASS_LIST = [warrior, ranger, mage];
