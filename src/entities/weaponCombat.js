/** Weapon handling profiles shared by player animation, grip posing and audio. */
import { METALS } from '../data/metals.js';

const has = (value, pattern) => pattern.test(String(value || '').toLowerCase());
const ONE_HANDED_HAMMERS = new Set([
  'hammer', 'ironhammer', 'squirehammer',
  'budgemaul', 'darkhammer', 'yetihammer', 'volchammer', 'rexhammer', 'holyhammer',
  'tigerhammer', 'raptorhammer', 'piratehammer', 'cursedhammer',
  'sandwormhammer', 'scorpionhammer', 'orcwarhammer', 'demonhammer', 'wardenhammer',
  ...METALS.map((metal) => `${metal.id}hammer`),
]);

export function weaponFamily(item = {}, heldKind = item.held || '') {
  const held = String(heldKind || item.held || item.id || '').toLowerCase();
  const style = String(item.style || '').toLowerCase();
  if (has(held, /crossbow/) || style === 'crossbow') return 'crossbow';
  if (has(held, /bow/) || style.includes('bow')) return 'bow';
  if (style === 'staff' || has(held, /staff/)) return 'staff';
  if (has(held, /wand|tome|book/)) return 'magic';
  if (has(held, /scythe/)) return 'scythe';
  if (has(held, /spear|pike|lance/)) return 'spear';
  if (/dual|claws/.test(held) || style === 'dual') return 'dual';
  if (has(held, /hammer|maul/) && (style === 'swordshield' || ONE_HANDED_HAMMERS.has(held))) return 'hammer';
  if (has(held, /hammer|maul|greatsword|cleaver/) || style === 'twohand') return 'heavy';
  if (style === 'swordshield' || has(held, /sword|blade|cutlass|saber/)) return 'sword';
  if (item.kind === 'ranged') return 'magic';
  return item.kind === 'throw' ? 'throw' : 'tool';
}

export function isTwoHandedFamily(family) {
  return ['heavy', 'spear', 'scythe', 'bow', 'crossbow', 'staff'].includes(family);
}
