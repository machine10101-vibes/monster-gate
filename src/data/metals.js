/**
 * Seven smithable metal tiers, in rank order.
 * Mining, smithing, armor, weapons, tints and save aliases all read from here.
 */

export const METAL_ORDER = ['copper', 'iron', 'steel', 'mithril', 'adamite', 'titanium', 'platinum'];

/** Old gathered-good ids fold into the closest living good on load. */
export const GOOD_ALIASES = {
  tin_ore: 'copper_ore',
  bronze_ore: 'copper_ore',
  bronze_bar: 'copper_bar',
  adamant_ore: 'adamite_ore',
  adamant_bar: 'adamite_bar',
};

const ARMOR_SLOTS = [
  { slot: 'helm', noun: 'Helm', body: 'a nasal helm', bars: 'helmBars', smithOff: 0 },
  { slot: 'chest', noun: 'Platebody', body: 'a hammered cuirass', bars: 'chestBars', smithOff: 5 },
  { slot: 'arms', noun: 'Gauntlets', body: 'gauntlets and a short vambrace', bars: 'armsBars', smithOff: 1 },
  { slot: 'legs', noun: 'Platelegs', body: 'banded platelegs', bars: 'legsBars', smithOff: 3 },
  { slot: 'boots', noun: 'Boots', body: 'sabatons', bars: 'bootsBars', smithOff: 2 },
  { slot: 'shield', noun: 'Shield', body: 'a square shield with a raised boss', bars: 'shieldBars', smithOff: 4 },
];

const WEAPON_KINDS = [
  { kind: 'sword', wtype: 'onesword', noun: 'Sword', bars: 'swordBars', smithOff: 0, style: 'swordshield', reach: 2.4, arc: 2.0, dur: 0.4, hit: 0.16, stam: 8, knock: 4 },
  { kind: 'greatsword', wtype: 'twosword', noun: 'Greatsword', bars: 'greatBars', smithOff: 4, style: 'twohand', reach: 2.7, arc: 2.4, dur: 0.58, hit: 0.26, stam: 13, knock: 7 },
  { kind: 'spear', wtype: 'spear', noun: 'Spear', bars: 'spearBars', smithOff: 2, style: 'twohand', reach: 3.1, arc: 1.0, dur: 0.46, hit: 0.2, stam: 10, knock: 4 },
  { kind: 'hammer', wtype: 'hammer', noun: 'Hammer', bars: 'hammerBars', smithOff: 5, style: 'twohand', reach: 2.5, arc: 2.3, dur: 0.7, hit: 0.32, stam: 15, knock: 9 },
];

function cap99(n) {
  return Math.max(1, Math.min(99, n | 0));
}

function hearts(hp) {
  const n = hp / 2;
  return n === 1 ? '1 heart' : `${n} hearts`;
}

function metal(row) {
  const Name = row.name;
  const setId = row.id === 'iron' ? 'iron' : row.id;
  const barId = `${row.id}_bar`;
  const oreId = row.ore ? `${row.id}_ore` : null;
  const hp = row.setHp;
  const stam = row.setStam || 0;
  const bonusBits = [`+${hp} max health (${hearts(hp)})`];
  if (stam) bonusBits.push(`+${stam} max stamina`);
  const theme = row.theme;
  return {
    ...row,
    setId,
    barId,
    oreId,
    Name,
    adj: row.id,
    bonus: `Full set: ${bonusBits.join(' and ')}.`,
    armorPal: {
      plate: theme.plate,
      plateLo: theme.plateLo,
      plateHi: theme.plateHi,
      trim: theme.trim,
      trimDk: theme.trimDk,
      accent: theme.accent,
    },
    weaponTheme: {
      wrap: 0x6a4325,
      wrapLo: 0x4a2c16,
      wrapHi: 0x8a5a30,
      blade: theme.plate,
      edge: theme.plateHi,
      dark: theme.plateLo,
      guard: theme.trim,
      guardHi: theme.accent,
      glow: theme.accent,
      glow2: theme.plateHi,
      wood: 0x7a4e2c,
      string: 0xe8e0c8,
      membrane: theme.trim,
      membraneHi: theme.plate,
      claw: theme.plateHi,
      horn: theme.plate,
      hornDark: theme.plateLo,
    },
    detailPal: {
      a: theme.plateHi,
      b: theme.plateLo,
      g: theme.trim,
      gd: theme.trimDk,
      glow: null,
      hot: theme.accent,
      edge: theme.accent,
      base: theme.plate,
    },
    oreLook: row.ore
      ? {
          vein: theme.vein,
          hi: theme.plateHi,
          lo: theme.plateLo,
          patina: theme.trim,
          spark: theme.spark,
        }
      : null,
  };
}

/**
 * Rank 0..6. Mining / smithing / equip are a rising curve, not a linear step.
 * Steel has no ore: iron ore plus coal. Defense and sword damage grow smoothly
 * so the next tier is a step up, not a replacement that dumps the last one.
 */
export const METALS = [
  metal({
    id: 'copper', name: 'Copper', rank: 0,
    mine: 1, smith: 1, equip: 1,
    ore: true, coal: 0,
    mineXp: 17.5, mineBase: 0.52, respawn: 10, barXp: 12.5, barPrice: 6, orePrice: 4,
    swordDmg: 11, greatDmg: 13, spearDmg: 10, hammerDmg: 14,
    def: { helm: 1, chest: 1, arms: 1, legs: 1, boots: 1, shield: 1 },
    helmBars: 1, chestBars: 3, armsBars: 1, legsBars: 2, bootsBars: 1, shieldBars: 2,
    swordBars: 2, greatBars: 3, spearBars: 2, hammerBars: 3,
    setHp: 2, setStam: 0,
    zone: 'Greyrock Pit, east of Oakhollow',
    desc: 'Orange starter metal from the Greyrock Pit.',
    theme: {
      plate: 0xc56a28, plateLo: 0x8a3e14, plateHi: 0xf0a050, trim: 0x6a3410, trimDk: 0x3e1e0a,
      accent: 0xe09040, vein: 0xe0823a, spark: [0xffb066, 0xff8a3a, 0xffe0b0], rock: 0xe0823a,
    },
  }),
  metal({
    id: 'iron', name: 'Iron', rank: 1,
    mine: 15, smith: 15, equip: 4,
    ore: true, coal: 0,
    mineXp: 35, mineBase: 0.45, respawn: 16, barXp: 25, barPrice: 12, orePrice: 8,
    swordDmg: 14, greatDmg: 16, spearDmg: 13, hammerDmg: 18,
    def: { helm: 1, chest: 2, arms: 1, legs: 1, boots: 1, shield: 2 },
    helmBars: 2, chestBars: 5, armsBars: 2, legsBars: 3, bootsBars: 2, shieldBars: 3,
    swordBars: 2, greatBars: 4, spearBars: 3, hammerBars: 4,
    setHp: 2, setStam: 0,
    zone: 'Greyrock Pit and the Deepwell dig',
    desc: 'Honest grey iron. Heavier than copper, and it holds an edge.',
    theme: {
      plate: 0xb7c0c8, plateLo: 0x8d969e, plateHi: 0xd7dee6, trim: 0x5e6770, trimDk: 0x3c444c,
      accent: 0xc9a24a, vein: 0x8a6a5a, spark: [0xc8a090, 0x6a5048, 0xe8d0c0], rock: 0x8a6a5a,
    },
  }),
  metal({
    id: 'steel', name: 'Steel', rank: 2,
    mine: 0, smith: 30, equip: 8,
    ore: false, coal: 1,
    mineXp: 0, mineBase: 0, respawn: 0, barXp: 37.5, barPrice: 28, orePrice: 0,
    swordDmg: 17, greatDmg: 20, spearDmg: 16, hammerDmg: 22,
    def: { helm: 1, chest: 2, arms: 1, legs: 2, boots: 1, shield: 2 },
    helmBars: 2, chestBars: 5, armsBars: 2, legsBars: 3, bootsBars: 2, shieldBars: 3,
    swordBars: 2, greatBars: 4, spearBars: 3, hammerBars: 4,
    setHp: 4, setStam: 0,
    zone: 'Smelted at the smithy from iron ore and coal',
    desc: 'Blue-grey steel. Iron and coal, folded until it sings.',
    theme: {
      plate: 0x8a9aac, plateLo: 0x5a6a7c, plateHi: 0xc4d0dc, trim: 0x3a4a5c, trimDk: 0x243040,
      accent: 0xb8c8d8, vein: 0x6a7a8c, spark: [0xb8c8d8, 0x6a7a8c, 0xe8f0f8], rock: 0x8a9aac,
    },
  }),
  metal({
    id: 'mithril', name: 'Mithril', rank: 3,
    mine: 45, smith: 50, equip: 12,
    ore: true, coal: 2,
    mineXp: 80, mineBase: 0.34, respawn: 32, barXp: 50, barPrice: 72, orePrice: 28,
    swordDmg: 21, greatDmg: 24, spearDmg: 19, hammerDmg: 27,
    def: { helm: 1, chest: 3, arms: 1, legs: 2, boots: 1, shield: 2 },
    helmBars: 3, chestBars: 6, armsBars: 2, legsBars: 4, bootsBars: 2, shieldBars: 4,
    swordBars: 3, greatBars: 5, spearBars: 4, hammerBars: 5,
    setHp: 4, setStam: 0,
    zone: 'Deepwell, south of Southford',
    desc: 'Pale blue metal from the Deepwell seams. Light for how hard it hits.',
    theme: {
      plate: 0x9ec8ee, plateLo: 0x4a7ab0, plateHi: 0xd8eeff, trim: 0x2a5080, trimDk: 0x163050,
      accent: 0x8ec4ff, vein: 0x4a7ab0, spark: [0x8ec4ff, 0x2a5080, 0xd0e8ff], rock: 0x4a7ab0,
    },
  }),
  metal({
    id: 'adamite', name: 'Adamite', rank: 4,
    mine: 60, smith: 65, equip: 16,
    ore: true, coal: 3,
    mineXp: 110, mineBase: 0.3, respawn: 42, barXp: 75, barPrice: 140, orePrice: 52,
    swordDmg: 26, greatDmg: 30, spearDmg: 24, hammerDmg: 33,
    def: { helm: 2, chest: 3, arms: 1, legs: 2, boots: 1, shield: 2 },
    helmBars: 3, chestBars: 7, armsBars: 3, legsBars: 4, bootsBars: 3, shieldBars: 4,
    swordBars: 3, greatBars: 6, spearBars: 4, hammerBars: 6,
    setHp: 6, setStam: 0,
    zone: 'The deepest Deepwell seams',
    desc: 'Green adamite from the deepest desert seams. It does not like to bend.',
    theme: {
      plate: 0x4aaa5a, plateLo: 0x246034, plateHi: 0x8ee0a0, trim: 0x1a4024, trimDk: 0x0e2816,
      accent: 0x7ad090, vein: 0x3a8a4a, spark: [0x7ad090, 0x246034, 0xc8f0d0], rock: 0x3a8a4a,
    },
  }),
  metal({
    id: 'titanium', name: 'Titanium', rank: 5,
    mine: 75, smith: 80, equip: 20,
    ore: true, coal: 4,
    mineXp: 150, mineBase: 0.26, respawn: 54, barXp: 112.5, barPrice: 220, orePrice: 88,
    swordDmg: 32, greatDmg: 37, spearDmg: 29, hammerDmg: 41,
    def: { helm: 2, chest: 3, arms: 2, legs: 2, boots: 1, shield: 2 },
    helmBars: 4, chestBars: 8, armsBars: 3, legsBars: 5, bootsBars: 3, shieldBars: 5,
    swordBars: 4, greatBars: 7, spearBars: 5, hammerBars: 7,
    setHp: 6, setStam: 10,
    zone: 'Cinderfall, the smoking mountain',
    desc: 'Silver-white metal from the volcano. Light, and it does not scar.',
    theme: {
      plate: 0xe8eef4, plateLo: 0xa8b0b8, plateHi: 0xffffff, trim: 0x6a727c, trimDk: 0x3a424c,
      accent: 0xd0d8e0, vein: 0xc8d0d8, spark: [0xffffff, 0xc8d0d8, 0x8a929a], rock: 0xc8d0d8,
    },
  }),
  metal({
    id: 'platinum', name: 'Platinum', rank: 6,
    mine: 90, smith: 90, equip: 24,
    ore: true, coal: 6,
    mineXp: 210, mineBase: 0.22, respawn: 70, barXp: 150, barPrice: 360, orePrice: 140,
    swordDmg: 38, greatDmg: 44, spearDmg: 35, hammerDmg: 48,
    def: { helm: 2, chest: 3, arms: 2, legs: 2, boots: 2, shield: 2 },
    helmBars: 5, chestBars: 10, armsBars: 4, legsBars: 6, bootsBars: 4, shieldBars: 6,
    swordBars: 5, greatBars: 8, spearBars: 6, hammerBars: 8,
    setHp: 8, setStam: 12,
    zone: 'Glimmerfrost glacier',
    desc: 'Bright white-gold platinum. The last metal a pick can open.',
    theme: {
      plate: 0xf4e6b0, plateLo: 0xc4a05a, plateHi: 0xfff6d8, trim: 0x8a6a28, trimDk: 0x4a3810,
      accent: 0xffe9a0, vein: 0xe8d080, spark: [0xfff6d8, 0xffe9a0, 0xffffff], rock: 0xe8d080,
    },
  }),
];

export const METAL_BY_ID = Object.fromEntries(METALS.map((m) => [m.id, m]));
export const METAL_SET_IDS = METALS.map((m) => m.setId);

export const COAL_ROCK = {
  id: 'coal',
  name: 'Coal rock',
  ore: 'coal',
  level: 30,
  xp: 50,
  base: 0.4,
  respawn: 22,
  color: 0x2a2a32,
  spark: [0x5a5a66, 0x1a1a20, 0x9a9aaa],
};

export function aliasGoodId(id) {
  return GOOD_ALIASES[id] || id;
}

/** Gear ids that no longer exist fold onto the closest living piece. */
export const GEAR_ALIASES = (() => {
  const out = {};
  const slots = ['helm', 'chest', 'arms', 'legs', 'boots', 'shield', 'sword', 'greatsword', 'spear', 'hammer'];
  for (const slot of slots) {
    out[`bronze${slot}`] = `copper${slot === 'sword' || slot === 'greatsword' || slot === 'spear' || slot === 'hammer' ? slot : slot}`;
    out[`adamant${slot}`] = `adamite${slot}`;
  }
  out.bronzesword = 'coppersword';
  out.bronzeblade = 'coppersword';
  out.adamantsword = 'adamitesword';
  return out;
})();

export function aliasGearId(id) {
  return GEAR_ALIASES[id] || id;
}

export function forgeXpFor(bars, metal) {
  return Math.round(bars * metal.barXp * 0.8 * 10) / 10;
}

export function metalArmorPieces(metal) {
  const Name = metal.name;
  const bar = metal.barId;
  return ARMOR_SLOTS.map((s) => {
    const bars = metal[s.bars];
    const noun = s.slot === 'chest' ? `${Name} Platebody` : `${Name} ${s.noun}`;
    return {
      id: `${metal.id}${s.slot}`,
      type: 'armor',
      slot: s.slot,
      name: noun,
      monster: 'smith',
      set: metal.setId,
      metal: metal.id,
      def: metal.def[s.slot],
      reqLevel: metal.equip,
      reqSmith: cap99(metal.smith + s.smithOff),
      forgeXp: forgeXpFor(bars, metal),
      desc: `${metal.desc} ${s.body[0].toUpperCase()}${s.body.slice(1)}.`,
      recipe: { [bar]: bars },
    };
  });
}

export function metalWeapons(metal) {
  const Name = metal.name;
  const bar = metal.barId;
  const dmgOf = { sword: metal.swordDmg, greatsword: metal.greatDmg, spear: metal.spearDmg, hammer: metal.hammerDmg };
  const blurbOf = {
    sword: `Sword and shield. Forged ${metal.id}.`,
    greatsword: `Two-handed. Heavy ${metal.id}.`,
    spear: `Two-handed. A long ${metal.id} thrust.`,
    hammer: `Two-handed. A smith's hammer, scaled up.`,
  };
  const lookOf = {
    sword: `A plain ${metal.id} blade with a straight crossguard.`,
    greatsword: `A long ${metal.id} blade on a two-hand grip. Slow, and it cleaves.`,
    spear: `A leaf-shaped ${metal.id} head on an ash shaft. It reaches past a sword.`,
    hammer: `A block of ${metal.id} on a short haft. It is slow and it knocks things down.`,
  };
  return WEAPON_KINDS.map((w) => {
    const bars = metal[w.bars];
    const dmg = dmgOf[w.kind];
    const id = `${metal.id}${w.kind}`;
    return {
      id,
      wtype: w.wtype,
      name: `${Name} ${w.noun}`,
      desc: lookOf[w.kind],
      recipe: { [bar]: bars },
      reqLevel: metal.equip,
      reqSmith: cap99(metal.smith + w.smithOff),
      forgeXp: forgeXpFor(bars, metal),
      metal: metal.id,
      melee: {
        style: w.style,
        dmg,
        reach: w.reach,
        arc: w.arc,
        dur: w.dur,
        hit: w.hit,
        stam: w.stam,
        knock: w.knock,
        blurb: blurbOf[w.kind],
      },
    };
  });
}

export function metalSetDef(metal) {
  const stats = { hp: metal.setHp };
  if (metal.setStam) stats.stamina = metal.setStam;
  return {
    id: metal.setId,
    name: `${metal.name} Plate`,
    monster: 'smith',
    tier: 'metal',
    role: 'Warrior',
    hp: metal.setHp,
    mana: 0,
    stamina: metal.setStam || 0,
    spell: 0,
    ranged: 0,
    crit: 0,
    ...stats,
    bonus: metal.bonus,
  };
}

export function metalRock(metal) {
  if (!metal.ore) return null;
  return {
    id: metal.id,
    name: `${metal.name} rock`,
    ore: metal.oreId,
    level: metal.mine,
    xp: metal.mineXp,
    base: metal.mineBase,
    respawn: metal.respawn,
    color: metal.theme.rock,
    spark: metal.theme.spark,
  };
}

export function metalSmelt(metal) {
  const ins = metal.ore ? [[metal.oreId, 1]] : [['iron_ore', 1]];
  if (metal.coal) ins.push(['coal', metal.coal]);
  const hint = metal.ore
    ? (metal.coal ? `${metal.name} ore and ${metal.coal} coal.` : `One ${metal.id} ore.`)
    : 'One iron ore and one coal from Deepwell.';
  return {
    id: metal.id,
    name: `${metal.name} bar`,
    ins,
    out: metal.barId,
    n: 1,
    level: metal.smith,
    xp: metal.barXp,
    hint,
  };
}

export function metalOreGood(metal) {
  if (!metal.ore) return null;
  return {
    id: metal.oreId,
    name: `${metal.name} ore`,
    desc: metal.desc,
    price: metal.orePrice,
    kind: 'ore',
  };
}

export function metalBarGood(metal) {
  const how = metal.ore
    ? (metal.coal ? `Smelted from one ${metal.id} ore and ${metal.coal} coal.` : `Smelted from one ${metal.id} ore.`)
    : 'Smelted from one iron ore and one coal.';
  return {
    id: metal.barId,
    name: `${metal.name} bar`,
    desc: `${how} The stock of every ${metal.id} piece.`,
    price: metal.barPrice,
    kind: 'bar',
  };
}

export function setBlurb(metal) {
  return `${metal.name} plate tinted ${metal.id}: a nasal helm, hammered cuirass, gauntlets, platelegs and sabatons, with a square shield. ${metal.desc}`;
}

export function miningUnlocks() {
  const rows = [[1, 'Copper ore']];
  for (const m of METALS) {
    if (m.ore && m.mine > 1) rows.push([m.mine, `${m.name} ore`]);
  }
  rows.push([COAL_ROCK.level, 'Coal']);
  rows.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
  return rows;
}

export function smithingUnlocks() {
  return METALS.map((m) => [m.smith, `${m.name} bars`]);
}
