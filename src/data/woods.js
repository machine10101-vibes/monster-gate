/**
 * Choppable woods beyond birch, oak and maple.
 * Tier 1 is common softwood. Tier 4 grows only in high-level monster country.
 * Visual fields feed the same voxel trunk-and-canopy builders as the older trees.
 */

const wood = (row) => row;

export const WOODS = [
  wood({
    id: 'pine', name: 'Pine', tier: 1, level: 1, xp: 25, base: 0.58, respawn: 10, price: 5, scatter: 12,
    form: 'conifer', silhouette: 'wide', mark: 'plate',
    bark: 0x8d4f28, barkHi: 0xc47a3e, barkDark: 0x5a3016, limb: 0x6b3d1e,
    cut: 0xe8c890, heart: 0xd7a45c, ring: 0x6e4324,
    leaves: [0x1c6234, 0x2a7e44, 0x143f24, 0x4ea45c], tip: 0x8fd48a, cones: 0xc46a28,
    chip: [0x8d4f28, 0xe8c890, 0x2a7e44], ink: '#4ea45c',
    flavor: 'Orange bark plates and a wide green crown.',
  }),
  wood({
    id: 'spruce', name: 'Spruce', tier: 1, level: 5, xp: 34, base: 0.54, respawn: 12, price: 6, scatter: 11,
    form: 'conifer', silhouette: 'narrow', mark: 'furrow',
    bark: 0x6e6258, barkHi: 0x8e8478, barkDark: 0x3e3832, limb: 0x5a5048,
    cut: 0xe2d2b0, heart: 0xcbb88a, ring: 0x6a5e52,
    leaves: [0x1e4e48, 0x2f6e66, 0x3f8e86, 0x8fd0c8], tip: 0xc8eee8, cones: 0x8a6840,
    chip: [0x6e6258, 0xe2d2b0, 0x3f8e86], ink: '#8fd0c8',
    flavor: 'A narrow blue-green spire with grey furrowed bark.',
  }),
  wood({
    id: 'fir', name: 'Fir', tier: 1, level: 8, xp: 44, base: 0.5, respawn: 14, price: 7, scatter: 10,
    form: 'conifer', silhouette: 'classic', mark: 'smooth',
    bark: 0x8a8680, barkHi: 0xb2aea6, barkDark: 0x5c5854, limb: 0x6a5840,
    cut: 0xf0e2c0, heart: 0xe0c898, ring: 0x7a7068,
    leaves: [0x2f8a38, 0x46b04c, 0x1f6e28, 0xb6ee7a], tip: 0xdef8b0, cones: 0x6a8a40,
    chip: [0x8a8680, 0xf0e2c0, 0x46b04c], ink: '#8fd46a',
    flavor: 'Silver bark and a bright, even crown.',
  }),
  wood({
    id: 'aspen', name: 'Aspen', tier: 1, level: 12, xp: 56, base: 0.46, respawn: 16, price: 8, scatter: 10,
    form: 'broad', crown: 'round', trunk: 'slender', mark: 'eyes',
    bark: 0xf4f1e6, barkHi: 0xfffaf0, barkDark: 0xc8c2b0, limb: 0xe4dfd0,
    cut: 0xf8f0d8, heart: 0xf0e0b0, ring: 0x1a1612,
    leaves: [0xb6d85a, 0xd4ee78, 0x8fbe40, 0xe8f6a0],
    chip: [0xf4f1e6, 0xf0e0b0, 0xd4ee78], ink: '#f4f0e4',
    flavor: 'A white trunk marked with black eyes, under a round pale crown.',
  }),
  wood({
    id: 'poplar', name: 'Poplar', tier: 1, level: 15, xp: 68, base: 0.42, respawn: 18, price: 9, scatter: 9,
    form: 'broad', crown: 'column', trunk: 'tall', mark: 'smooth',
    bark: 0x8a9470, barkHi: 0xb4c090, barkDark: 0x5c6450, limb: 0x6a6848,
    cut: 0xe6deb0, heart: 0xd2c48a, ring: 0x6a6848,
    leaves: [0xc2d25a, 0xdce67a, 0x9ab44a, 0xeef6a4],
    chip: [0x8a9470, 0xe6deb0, 0xdce67a], ink: '#d6e27a',
    flavor: 'A tall column of yellow-green leaves.',
  }),
  wood({
    id: 'beech', name: 'American Beech', tier: 1, level: 18, xp: 82, base: 0.39, respawn: 20, price: 11, scatter: 8,
    form: 'broad', crown: 'oval', trunk: 'standard', mark: 'smooth',
    bark: 0xb8b4ac, barkHi: 0xd8d4cc, barkDark: 0x7a766e, limb: 0x8a8070,
    cut: 0xf0d8b0, heart: 0xe0c090, ring: 0x8a8074,
    leaves: [0x3e7a32, 0x5aa048, 0x2a5c24, 0x7ec060],
    chip: [0xb8b4ac, 0xf0d8b0, 0x5aa048], ink: '#8fb86a',
    flavor: 'Smooth pewter bark and a dense oval crown.',
  }),
  wood({
    id: 'softmaple', name: 'Soft Maple', tier: 1, level: 21, xp: 105, base: 0.36, respawn: 22, price: 14, scatter: 8,
    form: 'broad', crown: 'full', trunk: 'standard', mark: 'smooth',
    bark: 0xa8a49c, barkHi: 0xc8c4ba, barkDark: 0x6e6a64, limb: 0x7a6858,
    cut: 0xf2d8a8, heart: 0xe4c080, ring: 0x7a6854,
    leaves: [0xc6d46a, 0xdcea86, 0xa4be50, 0xe8f4a8],
    chip: [0xa8a49c, 0xf2d8a8, 0xdcea86], ink: '#d6e27a',
    flavor: 'Pale grey bark and a light yellow-green crown. Not the red maple.',
  }),
  wood({
    id: 'redoak', name: 'Red Oak', tier: 2, level: 28, xp: 125, base: 0.32, respawn: 28, price: 20, scatter: 8,
    form: 'broad', crown: 'full', trunk: 'standard', mark: 'heartwood',
    bark: 0x5c3824, barkHi: 0x7a4c30, barkDark: 0x3a2216, limb: 0x5a3420,
    cut: 0xe0a070, heart: 0xc45030, ring: 0x6a3824,
    leaves: [0x2f6e32, 0x4a9240, 0x8a3a28, 0xc45a38],
    chip: [0x5c3824, 0xe0a070, 0xc45a38], ink: '#c45a3a',
    flavor: 'Dark furrows with a reddish heart, and russet in the crown.',
  }),
  wood({
    id: 'whiteoak', name: 'White Oak', tier: 2, level: 34, xp: 150, base: 0.29, respawn: 32, price: 26, scatter: 7,
    form: 'broad', crown: 'full', trunk: 'standard', mark: 'furrow',
    bark: 0xc8c2b4, barkHi: 0xe4ded2, barkDark: 0x8a8478, limb: 0xa89880,
    cut: 0xf0e0b8, heart: 0xe0c898, ring: 0x9a8c74,
    leaves: [0x8aaa62, 0xa8c47a, 0x6e9250, 0xc6dea0],
    chip: [0xc8c2b4, 0xf0e0b8, 0xa8c47a], ink: '#e4ded2',
    flavor: 'Light blocky bark and a pale sage crown.',
  }),
  wood({
    id: 'hardmaple', name: 'Hard Maple', tier: 2, level: 40, xp: 180, base: 0.26, respawn: 36, price: 32, scatter: 7,
    form: 'broad', crown: 'oval', trunk: 'standard', mark: 'furrow',
    bark: 0x6a645c, barkHi: 0x8a847a, barkDark: 0x3e3a34, limb: 0x5a5044,
    cut: 0xf0d090, heart: 0xe0b060, ring: 0x6a5840,
    leaves: [0xd4b03a, 0xe8c85a, 0xa88828, 0xf2e090],
    chip: [0x6a645c, 0xf0d090, 0xe8c85a], ink: '#e2b23a',
    flavor: 'A dense gold crown. Sugar maple, heavier than the soft maple.',
  }),
  wood({
    id: 'ash', name: 'Ash', tier: 2, level: 46, xp: 215, base: 0.24, respawn: 40, price: 40, scatter: 6,
    form: 'broad', crown: 'open', trunk: 'tall', mark: 'diamond',
    bark: 0x9a947c, barkHi: 0xc8c2a4, barkDark: 0x5c5848, limb: 0x7a745c,
    cut: 0xf2e6c0, heart: 0xe0d0a0, ring: 0x7a7458,
    leaves: [0xd8e6a0, 0xeaf6c0, 0xb4cc78, 0xf4fad8],
    chip: [0x9a947c, 0xf2e6c0, 0xeaf6c0], ink: '#eaf6c0',
    flavor: 'Diamond-pattern bark and an open, airy crown.',
  }),
  wood({
    id: 'cherry', name: 'Cherry', tier: 2, level: 52, xp: 250, base: 0.22, respawn: 46, price: 48, scatter: 6,
    form: 'broad', crown: 'full', trunk: 'standard', mark: 'lenticel',
    bark: 0x6a3030, barkHi: 0xd8c8b8, barkDark: 0x3a1818, limb: 0x5a2824,
    cut: 0xe8b090, heart: 0xc47058, ring: 0x6a3830,
    leaves: [0x3a8a40, 0x5aaa58, 0x2a6a30, 0x7ec868],
    blossom: { at: 0.62, colors: [0xf6c2d4, 0xffe4ee, 0xe890b0] },
    chip: [0x6a3030, 0xe8b090, 0xf6c2d4], ink: '#f2b6c8',
    flavor: 'Dark bark crossed with pale lenticels, and a blossom-flecked crown.',
  }),
  wood({
    id: 'walnut', name: 'Black Walnut', tier: 3, level: 60, xp: 300, base: 0.2, respawn: 54, price: 64, scatter: 5,
    form: 'broad', crown: 'open', trunk: 'gnarled', mark: 'furrow',
    bark: 0x3a2a22, barkHi: 0x5a4034, barkDark: 0x1a120e, limb: 0x3a2a20,
    cut: 0xc49462, heart: 0x6a3e28, ring: 0x3a281c,
    leaves: [0xa8b85a, 0xc6d474, 0x7a9440, 0xdce698],
    chip: [0x3a2a22, 0xc49462, 0xc6d474], ink: '#c49462',
    flavor: 'Nearly black furrowed bark and an open yellow-green crown.',
  }),
  wood({
    id: 'mahogany', name: 'Honduran Mahogany', tier: 3, level: 66, xp: 345, base: 0.18, respawn: 60, price: 82, scatter: 5,
    form: 'broad', crown: 'spread', trunk: 'buttress', mark: 'furrow',
    bark: 0x7a4030, barkHi: 0xa45a40, barkDark: 0x4a2418, limb: 0x6a3828,
    cut: 0xe09060, heart: 0xc45a38, ring: 0x6a3424,
    leaves: [0x1e5a30, 0x2e7a40, 0x144422, 0x3e9450],
    chip: [0x7a4030, 0xe09060, 0x2e7a40], ink: '#c45a38',
    flavor: 'A red-brown trunk with buttress roots and a wide dark crown.',
  }),
  wood({
    id: 'teak', name: 'Teak', tier: 3, level: 72, xp: 390, base: 0.16, respawn: 68, price: 100, scatter: 4,
    form: 'broad', crown: 'spread', trunk: 'tall', mark: 'smooth',
    bark: 0xc8b898, barkHi: 0xe4d8b8, barkDark: 0x8a7c64, limb: 0xa89070,
    cut: 0xf0d8a0, heart: 0xd8b060, ring: 0x8a7048,
    leaves: [0xc8d070, 0xe0e890, 0xa4b858, 0xf0f4b8],
    chip: [0xc8b898, 0xf0d8a0, 0xe0e890], ink: '#e4d8b8',
    flavor: 'Pale straight timber under a broad yellow-green crown.',
  }),
  wood({
    id: 'purpleheart', name: 'Purpleheart', tier: 4, level: 76, xp: 430, base: 0.15, respawn: 76, price: 120, scatter: 4,
    form: 'broad', crown: 'full', trunk: 'standard', mark: 'heartwood',
    bark: 0x5a4638, barkHi: 0x7a6250, barkDark: 0x3a2c22, limb: 0x5a3a40,
    cut: 0xc080d0, heart: 0x9a28c0, ring: 0x4a2060,
    leaves: [0x2a6a38, 0x3e8a4c, 0x1e5228, 0x68b060],
    flush: { at: 0.8, color: 0xb44ad4 },
    chip: [0x9a28c0, 0xc080d0, 0x3e8a4c], ink: '#b44ad4',
    flavor: 'The bark splits and shows a vivid purple heart.',
  }),
  wood({
    id: 'padauk', name: 'Padauk', tier: 4, level: 80, xp: 470, base: 0.145, respawn: 82, price: 140, scatter: 4,
    form: 'broad', crown: 'full', trunk: 'standard', mark: 'heartwood',
    bark: 0x4a3024, barkHi: 0x6a4030, barkDark: 0x2a1810, limb: 0x5a3018,
    cut: 0xff7840, heart: 0xff4a14, ring: 0x8a3018,
    leaves: [0x1a5230, 0x246840, 0x103820, 0x3a8450],
    chip: [0xff4a14, 0xff7840, 0x246840], ink: '#ff5a22',
    flavor: 'Vivid orange-red wood showing through dark bark.',
  }),
  wood({
    id: 'wenge', name: 'Wenge', tier: 4, level: 84, xp: 510, base: 0.14, respawn: 88, price: 160, scatter: 4,
    form: 'broad', crown: 'tight', trunk: 'gnarled', mark: 'stripe',
    bark: 0x1c140e, barkHi: 0xe4d4b4, barkDark: 0x100c08, limb: 0x2a2016,
    cut: 0xd8c8a8, heart: 0x2a1c12, ring: 0xc8b898,
    leaves: [0x3a4428, 0x4e5c34, 0x2a321c, 0x6a7848],
    chip: [0x1c140e, 0xe4d4b4, 0x4e5c34], ink: '#e6d2b0',
    flavor: 'Black wood cut with thin pale streaks.',
  }),
  wood({
    id: 'bocote', name: 'Bocote', tier: 4, level: 87, xp: 545, base: 0.135, respawn: 94, price: 175, scatter: 4,
    form: 'broad', crown: 'full', trunk: 'standard', mark: 'stripe',
    bark: 0x3a2814, barkHi: 0xe2c05a, barkDark: 0x241808, limb: 0x6a5018,
    cut: 0xf0d080, heart: 0xc4983a, ring: 0x3a2814,
    leaves: [0x8aaa44, 0xb4cc62, 0x6e9228, 0xd8ea8a],
    chip: [0xe2c05a, 0xf0d080, 0xb4cc62], ink: '#e2c05a',
    flavor: 'Bold gold and dark-brown stripes from root to crown.',
  }),
  wood({
    id: 'blackwood', name: 'African Blackwood', tier: 4, level: 90, xp: 580, base: 0.13, respawn: 100, price: 190, scatter: 4,
    form: 'broad', crown: 'tight', trunk: 'gnarled', mark: 'furrow',
    bark: 0x241610, barkHi: 0x4a3028, barkDark: 0x100806, limb: 0x2a1610,
    cut: 0x5a3830, heart: 0x2a1210, ring: 0x6a4038,
    leaves: [0x1a3218, 0x244422, 0x102010, 0x3a5a30],
    chip: [0x241610, 0x5a3830, 0x244422], ink: '#c4a090',
    flavor: 'A twisted near-black trunk and a small dark crown.',
  }),
  wood({
    id: 'cocobolo', name: 'Cocobolo', tier: 4, level: 93, xp: 620, base: 0.125, respawn: 108, price: 200, scatter: 4,
    form: 'broad', crown: 'full', trunk: 'standard', mark: 'swirl',
    bark: 0x4a2414, barkHi: 0xd24a1c, barkDark: 0x2a1008, limb: 0x6a2810,
    cut: 0xff7040, heart: 0xd23818, ring: 0x3a140c,
    leaves: [0x14381c, 0x1e5228, 0x0e2814, 0x2e7040],
    chip: [0xd24a1c, 0xff7040, 0x1e5228], ink: '#e25828',
    flavor: 'Red-orange and dark brown swirl through the trunk.',
  }),
  wood({
    id: 'ebony', name: 'Ebony', tier: 4, level: 96, xp: 660, base: 0.12, respawn: 120, price: 220, scatter: 4,
    form: 'broad', crown: 'tight', trunk: 'gnarled', mark: 'sheen',
    bark: 0x100e0c, barkHi: 0x4a463c, barkDark: 0x070605, limb: 0x1a1814,
    cut: 0x2a2824, heart: 0x141210, ring: 0x3a3834,
    leaves: [0x121c12, 0x1c2c1a, 0x0c140c, 0x2a4030],
    chip: [0x4a463c, 0x2a2824, 0x1c2c1a], ink: '#d8d4e8',
    flavor: 'Jet black timber. It grows where the strongest monsters hunt.',
  }),
];

export const WOOD_BY_ID = Object.fromEntries(WOODS.map((w) => [w.id, w]));

export const WOOD_INK = {
  birch: '#f4efe4',
  oak: '#3f9f47',
  maple: '#e24a22',
};
for (const w of WOODS) WOOD_INK[w.id] = w.ink;

export function treeRecord(w) {
  return {
    id: w.id,
    name: w.name,
    log: `${w.id}_logs`,
    level: w.level,
    xp: w.xp,
    base: w.base,
    respawn: w.respawn,
    fireLevel: w.level,
    fireXp: Math.round(w.xp * 1.45),
    burn: Math.round(46 + w.level * 0.55),
    chip: w.chip,
    tier: w.tier,
  };
}

export function logGood(w) {
  const id = `${w.id}_logs`;
  return {
    id,
    name: `${w.name} logs`,
    desc: `${w.flavor} Light with a tinderbox at Firemaking ${w.level}, or shave into ${w.name.toLowerCase()} arrow shafts.`,
    price: w.price,
    kind: 'log',
    tree: w.id,
  };
}

export function shaftGood(w) {
  const id = `${w.id}_shaft`;
  return {
    id,
    name: `${w.name} arrow shaft`,
    desc: `Shaved from a ${w.name.toLowerCase()} log with the carving knife. One log makes fifteen. Fletch it with a feather at the forge.`,
    price: Math.max(1, Math.round(w.price / 5)),
    kind: 'part',
    wood: w.id,
  };
}
