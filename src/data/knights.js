/** Colours, lore and drop tables for the Demon Knight and the Holy Knight. */
export const HOLY = {
  plate: [0xdfe1e6, 0xd0d3da, 0xc2c6ce, 0xb3b8c1, 0xa4aab6],
  plateLo: 0xa4abb8,
  plateDeep: 0x7d8696,
  gold: 0xe3b23b,
  goldHi: 0xf9dc78,
  goldLo: 0xb98a22,
  goldDeep: 0x7f5d14,
  mail: 0x42454c,
  mailHi: 0x62666f,
  mailLo: 0x25272c,
  stone: [0xa0a2a7, 0x8f9196, 0x7d7f84, 0x6c6e73, 0xaeb0b4],
  stoneLo: 0x5f6166,
  stoneDeep: 0x45474b,
  haft: 0x6b4a30,
  haftLo: 0x47301f,
  haftHi: 0x8c6c4a,
  glow: 0x2f8cff,
  glowMid: 0x58b4ff,
  glowHi: 0x9ad8ff,
  glowCore: 0xe6f7ff,
  eye: 0xffffff,
};

export const DEMON = {
  plate: [0x34343a, 0x2a2a2f, 0x40404a, 0x4c4c56, 0x212126],
  plateHi: 0x56565f,
  edge: 0x5a5a65,
  deep: 0x0f0f12,
  spike: [0x3c3c44, 0x303037, 0x5a5a66, 0x26262b],
  steel: [0x3a3a41, 0x2f2f35, 0x45454c, 0x26262b, 0x505058],
  steelHi: 0x6c6c77,
  leather: 0x4a2c22,
  leatherHi: 0x6c3d2e,
  leatherLo: 0x2c1912,
  glow: 0xff2a14,
  glowMid: 0xff5a22,
  glowHi: 0xff8c44,
  glowCore: 0xffd79a,
  crack: 0xd01a0c,
  smoke: 0xa4a4ae,
  eye: 0xff3018,
};

export const KNIGHT_LORE = {
  demonknight:
    'Bound in black iron and hellfire, the Demon Knight has marched at the head of the dark since before the first torch was lit. Its whole purpose is the war: every blow it lands answers a blow that was struck against it ten thousand years ago.',
  holyknight:
    'Sworn in light and sealed in gold, the Holy Knight has held the line against the dark since before the first torch was lit. Its whole purpose is the war: every blow it lands answers a blow that was struck against it ten thousand years ago.',
  war: 'The Demon Knight and the Holy Knight are locked in one continuous battle that has raged through all of eternity: good against evil, neither able to fall for good. The Embergate wasteland is the ground they fight on.',
  keepwarden:
    'The Keep Warden is what the eternal war leaves in the dirt between Hellspire and Dawnspire: a knight that has worn both colours long enough to fight as both. It is not the war. It is the war\'s doorman.',
};

/** Whole pieces only. Each is its own 1 to 2 percent roll when the knight falls. */
export const GEAR_DROPS = {
  demonknight: [
    { id: 'demonhelm', chance: 0.02 },
    { id: 'demonchest', chance: 0.015 },
    { id: 'demonarms', chance: 0.02 },
    { id: 'demonlegs', chance: 0.015 },
    { id: 'demonboots', chance: 0.02 },
    { id: 'demonsword', chance: 0.01 },
    { id: 'demonshield', chance: 0.01 },
  ],
  holyknight: [
    { id: 'holyhelm', chance: 0.02 },
    { id: 'holychest', chance: 0.015 },
    { id: 'holyarms', chance: 0.02 },
    { id: 'holylegs', chance: 0.015 },
    { id: 'holyboots', chance: 0.02 },
    { id: 'holyhammer', chance: 0.01 },
  ],
  keepwarden: [
    { id: 'ashenbrand', chance: 0.12 },
  ],
};

export const KNIGHT_TYPES = new Set(['demonknight', 'holyknight', 'keepwarden']);
