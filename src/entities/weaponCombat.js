/** Weapon handling profiles shared by player animation, grip posing and audio. */
const has = (value, pattern) => pattern.test(String(value || '').toLowerCase());

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
  if (has(held, /hammer|maul|greatsword|cleaver/) || style === 'twohand') return 'heavy';
  if (style === 'swordshield' || has(held, /sword|blade|cutlass|saber/)) return 'sword';
  if (item.kind === 'ranged') return 'magic';
  return item.kind === 'throw' ? 'throw' : 'tool';
}

export function isTwoHandedFamily(family) {
  return ['heavy', 'spear', 'scythe', 'bow', 'crossbow', 'staff'].includes(family);
}
