/** Hunter paths. Each path is three skills: a passive, an active, and a special. */

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
      ],
    },
  ],
};

export const CLASSES = { warrior, ranger, mage };

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
